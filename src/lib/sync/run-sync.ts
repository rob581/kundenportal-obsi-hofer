import { batchDelete, batchSoftDelete, batchUpsert, fetchAllIds } from "@/lib/sync/batch";
import { fetchAllDataverseRecords, fetchAllDataverseRecordsForIds } from "@/lib/sync/dataverse-client";
import { getEntityConfig } from "@/lib/sync/entities";
import { SYNC_JOBS, type SyncJob } from "@/lib/sync/jobs";
import { computeMissingIds, exceedsSafetyThreshold } from "@/lib/sync/reconcile";

export type EntitySyncSummary = {
  slug: string;
  fetched: number;
  added: number;
  updated: number;
  deleted: number;
  skippedDueToThreshold: boolean;
};

export type SyncRunResult = {
  // PROJ-16: wofür tatsächlich übertragen wurde (vom Sync selbst gesetzt,
  // nicht aus der Anfrage übernommen) — das Admin-Tool prüft das als zweite
  // Absicherung, dass der Standort-Filter gewirkt hat.
  scope: { firmaId: string; standortId: string | null };
  entities: EntitySyncSummary[];
  warnings: string[];
  errors: string[];
};

// PROJ-12: thrown when a firma-scoped sync is asked for a firmaId that
// Dataverse doesn't recognize — the route maps this to a 404 instead of a
// silent no-op (see spec Acceptance Criteria).
export class FirmaNotFoundError extends Error {
  constructor(firmaId: string) {
    super(`Firma mit ID "${firmaId}" wurde in Dataverse nicht gefunden.`);
    this.name = "FirmaNotFoundError";
  }
}

// QA BUG-1 (Critical): firmaId used to be interpolated unchecked into raw
// OData $filter strings (Firma-Existenzprüfung, Standorte-, Relationen-
// Filter) — a crafted value like "<guid> or 1 eq 1" would make those
// filters match every Firma, defeating both the 404 guard and the whole
// point of scoping the sync to begin with. Validated once, centrally,
// before any Dataverse call is made. Also closes QA BUG-2 (an empty
// `firmaId` query parameter used to silently fall back to a full sync —
// it now fails this same check instead).
export class InvalidFirmaIdError extends Error {
  constructor(firmaId: string) {
    super(`Ungültige firmaId: "${firmaId}" ist keine gültige GUID.`);
    this.name = "InvalidFirmaIdError";
  }
}

const GUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function requireValidFirmaId(firmaId: string): void {
  if (!GUID_PATTERN.test(firmaId)) {
    throw new InvalidFirmaIdError(firmaId);
  }
}

// PROJ-16: gleiche Absicherung für die optionale standortId, bevor sie in
// einen Dataverse-$filter eingesetzt wird (vgl. QA BUG-1 bei firmaId).
export class InvalidStandortIdError extends Error {
  constructor(standortId: string) {
    super(`Ungültige standortId: "${standortId}" ist keine gültige GUID.`);
    this.name = "InvalidStandortIdError";
  }
}

// PROJ-16: Standort existiert in Dataverse nicht oder gehört dort nicht zur
// übergebenen Firma — der Lauf wird abgelehnt, bevor irgendetwas geschrieben wird.
export class StandortNotFoundError extends Error {
  constructor(standortId: string, firmaId: string) {
    super(`Standort mit ID "${standortId}" wurde in Dataverse bei der Firma "${firmaId}" nicht gefunden.`);
    this.name = "StandortNotFoundError";
  }
}

function requireValidStandortId(standortId: string): void {
  if (!GUID_PATTERN.test(standortId)) {
    throw new InvalidStandortIdError(standortId);
  }
}

type MappedRecord = { id: string } & Record<string, unknown>;

// PROJ-12: how a single entity's sync is narrowed to one Firma's data.
// "filter" is for entities with a fixed, known filter value (e.g. Standorte
// directly reference a Firma). "idSet" is for entities whose membership is
// only known via an id list gathered from an earlier step in the same run
// (e.g. Geräte are filtered by the Standort ids found just before) — these
// go through fetchAllDataverseRecordsForIds to stay within Dataverse's
// practical $filter length limits.
type EntityScope =
  | { kind: "filter"; dataverseFilter: string; supabaseWhereIn: { column: string; values: string[] } }
  | { kind: "idSet"; dataverseIdColumn: string; ids: string[]; supabaseWhereIn: { column: string; values: string[] } };

// existingIds: IDs, die vor diesem Lauf im Bereich lagen (PROJ-15 QA BUG-2:
// die Zugänge brauchen auch die Standorte, die nicht mehr aus Dataverse kommen).
type EntitySyncOutcome = { summary: EntitySyncSummary; mappedRecords: MappedRecord[]; existingIds: string[] };

// Each entity is independent (its own table, its own Dataverse entity set),
// so one entity's failure must not prevent the others from syncing. Errors
// are collected and surfaced (route emails them) instead of aborting the
// whole run — the failed entity simply stays as-is until the next run.
//
// `scope` narrows both sides of the sync to one Firma's data (PROJ-12): the
// "existing" side is read from the same table/id subset here as everywhere
// else, so a row that's since moved out of scope (e.g. a Gerät reassigned
// to a different Firma's Standort) is still correctly treated as "missing"
// for this Firma — its stale Supabase foreign key still falls inside the
// scoped id set even though Dataverse no longer returns it.
async function syncOneEntity(job: SyncJob, scope?: EntityScope): Promise<EntitySyncOutcome> {
  const config = getEntityConfig(job.slug);
  if (!config) throw new Error(`No entity config for job "${job.slug}"`);

  // 1. What do we already have (within scope, if any)?
  const existingIds = await fetchAllIds(
    config.table,
    config.softDelete ? "deleted_at" : undefined,
    scope?.supabaseWhereIn
  );

  // 2. What does Dataverse say right now (within scope, if any)?
  const rawRecords =
    scope?.kind === "idSet"
      ? await fetchAllDataverseRecordsForIds(job.entitySet, job.select, scope.dataverseIdColumn, scope.ids)
      : await fetchAllDataverseRecords(job.entitySet, job.select, scope?.kind === "filter" ? scope.dataverseFilter : undefined);

  const mappedRecords = rawRecords.map(job.map).map((record) => {
    const parsed = config.schema.safeParse(record);
    if (!parsed.success) {
      throw new Error(`Mapped record for "${job.slug}" failed validation: ${parsed.error.message}`);
    }
    return parsed.data as MappedRecord;
  });

  // 3. Write what's current.
  await batchUpsert(config.table, mappedRecords);

  // 4. Reconcile: anything we had before (within scope) that didn't come
  //    back (within scope) is gone.
  const existingIdSet = new Set(existingIds);
  const fetchedIds = new Set(mappedRecords.map((r) => r.id));
  const missingIds = computeMissingIds(existingIds, fetchedIds);
  const skippedDueToThreshold =
    !config.ignoreDeleteThreshold && exceedsSafetyThreshold(existingIds.length, missingIds.length);

  let added = 0;
  let updated = 0;
  for (const id of fetchedIds) {
    if (existingIdSet.has(id)) updated += 1;
    else added += 1;
  }

  let deleted = 0;
  if (missingIds.length > 0 && !skippedDueToThreshold) {
    if (config.softDelete) {
      await batchSoftDelete(config.table, missingIds);
    } else {
      await batchDelete(config.table, missingIds);
    }
    deleted = missingIds.length;
  }

  return {
    summary: { slug: job.slug, fetched: mappedRecords.length, added, updated, deleted, skippedDueToThreshold },
    mappedRecords,
    existingIds,
  };
}

function findJob(slug: string): SyncJob {
  const job = SYNC_JOBS.find((j) => j.slug === slug);
  if (!job) throw new Error(`No sync job registered for slug "${slug}"`);
  return job;
}

const THRESHOLD_WARNING = (slug: string) =>
  `"${slug}": mehr als 20% der zuvor bekannten Zeilen fehlen im aktuellen Lauf — ` +
  `Löschung übersprungen, bitte Dataverse-Verbindung prüfen.`;

// PROJ-12: Geräte/Prüfberichte/Kontakte have no direct Firma reference in
// Dataverse (Gerät → Standort → Firma; Kontakt → Relation → Firma), so a
// Firma-scoped run has to walk that chain step by step — Standorte before
// Geräte, Geräte before Prüfberichte, Relationen before Kontakte — each
// step's id set feeding the next. Artikel stays independent and always
// fully synced regardless of scope (Product Decision, small cross-Firma
// master data).
//
// Es gibt bewusst keinen Vollsync über alle Firmen mehr (Decision Log,
// 2026-10-07): firmaId ist Pflicht, damit ein Aufruf, dem sie versehentlich
// fehlt, nicht still alle Firmen synchronisiert.
//
// PROJ-16: Mit standortId läuft derselbe Ablauf, aber jeder Schritt ist auf
// diesen einen Standort verengt (Standorte, Zugänge, Geräte, Prüfberichte);
// die Lösch-Erkennung vergleicht nur innerhalb dieses Bereichs, andere
// Standorte der Firma bleiben unberührt. Relationen entfallen, Kontakte kommen
// nur aus den Zugängen. Ohne standortId: unverändert die ganze Firma.
export async function runDataverseSync(firmaId: string, standortId?: string): Promise<SyncRunResult> {
  // Vor jeder anderen Aktion: IDs müssen wohlgeformte GUIDs sein, bevor sie
  // irgendwo in einen Dataverse-$filter eingesetzt werden (siehe QA BUG-1).
  // Strikt auf undefined geprüft: eine leere standortId ist ungültig, nicht
  // "keine" (sonst fiele ein kaputter Aufruf still auf die ganze Firma zurück).
  requireValidFirmaId(firmaId);
  const standortLauf = standortId !== undefined;
  if (standortLauf) requireValidStandortId(standortId);

  const entities: EntitySyncSummary[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  function record(outcome: EntitySyncOutcome): void {
    entities.push(outcome.summary);
    if (outcome.summary.skippedDueToThreshold) warnings.push(THRESHOLD_WARNING(outcome.summary.slug));
  }

  function recordError(slug: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Firma-Sync (${firmaId}): "${slug}" failed, continuing with remaining entities:`, message);
    errors.push(`"${slug}": ${message}`);
  }

  // Firma-Existenzprüfung: ausserhalb jedes try/catch, da ein Tippfehler in
  // der firmaId den ganzen Lauf mit einem klaren Fehler abbrechen soll statt
  // als "ein Entity ist fehlgeschlagen" durchzurutschen (siehe Spec-AC).
  const firmenJob = findJob("firmen");
  const firmaRaw = await fetchAllDataverseRecords(firmenJob.entitySet, firmenJob.select, `bmvcc_firmaid eq ${firmaId}`);
  if (firmaRaw.length === 0) throw new FirmaNotFoundError(firmaId);

  // PROJ-16: Standort muss in Dataverse existieren UND zur Firma gehören —
  // geprüft vor dem ersten Schreibvorgang, damit ein abgelehnter Aufruf nichts
  // verändert. Derselbe Filter dient unten dem Standorte-Schritt.
  const standorteJob = findJob("standorte");
  const standortFilter = standortLauf
    ? `bmvcc_organizationlocationid eq ${standortId} and _bmvcc_bexiofirma_value eq ${firmaId}`
    : `_bmvcc_bexiofirma_value eq ${firmaId}`;
  if (standortLauf) {
    const standortRaw = await fetchAllDataverseRecords(standorteJob.entitySet, standorteJob.select, standortFilter);
    if (standortRaw.length === 0) throw new StandortNotFoundError(standortId, firmaId);
  }

  try {
    const firmenConfig = getEntityConfig("firmen")!;
    const mappedFirma = firmenConfig.schema.parse(firmenJob.map(firmaRaw[0])) as MappedRecord;
    // Kein Delete-Reconciliation nötig: genau diese eine Zeile existiert per
    // obigem Existenz-Check garantiert.
    const existingIds = await fetchAllIds(firmenConfig.table, undefined, { column: "id", values: [firmaId] });
    await batchUpsert(firmenConfig.table, [mappedFirma]);
    entities.push({
      slug: "firmen",
      fetched: 1,
      added: existingIds.length === 0 ? 1 : 0,
      updated: existingIds.length === 0 ? 0 : 1,
      deleted: 0,
      skippedDueToThreshold: false,
    });
  } catch (error) {
    recordError("firmen", error);
  }

  let standortIds: string[] = [];
  // PROJ-15 QA BUG-2: Standorte, die die Firma vor diesem Lauf im Portal
  // hatte, aber die Dataverse nicht mehr liefert. Ihre Zeilen können wegen
  // der 20-%-Schwelle stehen bleiben — ihre Zugänge dürfen das nicht, sonst
  // bliebe ein gelöschter Standort für den Kunden sichtbar. Bleibt leer,
  // wenn der Standorte-Schritt scheitert (dann wird kein Zugang gelöscht).
  let verschwundeneStandortIds: string[] = [];
  try {
    // Standort-Lauf: Bereich ist nur dieser eine Standort (über seine ID, nicht
    // über die Firma — so wird ein Standort, der im Portal noch bei einer
    // anderen Firma steht, beim Firmenwechsel korrekt umgeschrieben).
    const outcome = await syncOneEntity(standorteJob, {
      kind: "filter",
      dataverseFilter: standortFilter,
      supabaseWhereIn: standortLauf
        ? { column: "id", values: [standortId] }
        : { column: "firma_id", values: [firmaId] },
    });
    record(outcome);
    standortIds = outcome.mappedRecords.map((r) => r.id);
    const geliefert = new Set(standortIds);
    verschwundeneStandortIds = outcome.existingIds.filter((id) => !geliefert.has(id));
  } catch (error) {
    recordError("standorte", error);
  }

  // PROJ-15: Portalzugänge der Standorte dieser Firma. Ihre Kontakte werden
  // unten zusätzlich zu den Relationen-Kontakten synchronisiert, damit sich
  // ein Kontakt mit Zugang auch ohne Relation zur Firma anmelden kann.
  let zugangKontaktIds: string[] = [];
  try {
    // Dataverse: nur die aktuell gelieferten Standorte abfragen; Portal-Seite:
    // zusätzlich die verschwundenen, damit deren Zugänge als "fehlt" gelöscht
    // werden.
    const outcome = await syncOneEntity(findJob("portalzugaenge"), {
      kind: "idSet",
      dataverseIdColumn: "_bmvcc_standort_value",
      ids: standortIds,
      supabaseWhereIn: { column: "standort_id", values: [...standortIds, ...verschwundeneStandortIds] },
    });
    record(outcome);
    zugangKontaktIds = outcome.mappedRecords
      .map((r) => r.kontakt_id)
      .filter((v): v is string => typeof v === "string");
  } catch (error) {
    recordError("portalzugaenge", error);
  }

  let geraetIds: string[] = [];
  try {
    const outcome = await syncOneEntity(findJob("geraete"), {
      kind: "idSet",
      dataverseIdColumn: "_bmvcc_standort_value",
      ids: standortIds,
      supabaseWhereIn: { column: "standort_id", values: standortIds },
    });
    record(outcome);
    geraetIds = outcome.mappedRecords.map((r) => r.id);
  } catch (error) {
    recordError("geraete", error);
  }

  try {
    const outcome = await syncOneEntity(findJob("pruefberichte"), {
      kind: "idSet",
      dataverseIdColumn: "_bmvcc_gearaet_value",
      ids: geraetIds,
      supabaseWhereIn: { column: "geraet_id", values: geraetIds },
    });
    record(outcome);
  } catch (error) {
    recordError("pruefberichte", error);
  }

  let kontaktIds: string[] = [];
  // PROJ-16: Relationen hängen an der Firma, nicht am Standort — im
  // Standort-Lauf bleiben sie unverändert (nächster Firmen-Lauf).
  if (!standortLauf) {
    try {
      const outcome = await syncOneEntity(findJob("relationen"), {
        kind: "filter",
        dataverseFilter: `_bmvcc_firma_value eq ${firmaId}`,
        supabaseWhereIn: { column: "firma_id", values: [firmaId] },
      });
      record(outcome);
      kontaktIds = outcome.mappedRecords
        .map((r) => r.kontakt_id)
        .filter((v): v is string => typeof v === "string");
    } catch (error) {
      recordError("relationen", error);
    }
  }

  // Kontakte aus Relationen UND Portalzugängen (PROJ-15), ohne Doppelte.
  kontaktIds = [...new Set([...kontaktIds, ...zugangKontaktIds])];
  try {
    const outcome = await syncOneEntity(findJob("kontakte"), {
      kind: "idSet",
      dataverseIdColumn: "bmvcc_kontaktid",
      ids: kontaktIds,
      supabaseWhereIn: { column: "id", values: kontaktIds },
    });
    record(outcome);
  } catch (error) {
    recordError("kontakte", error);
  }

  try {
    const outcome = await syncOneEntity(findJob("artikel"));
    record(outcome);
  } catch (error) {
    recordError("artikel", error);
  }

  return { scope: { firmaId, standortId: standortLauf ? standortId : null }, entities, warnings, errors };
}

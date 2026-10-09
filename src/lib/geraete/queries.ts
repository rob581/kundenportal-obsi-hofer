import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getZuPruefenCutoff } from "./zu-pruefen";
import type { Geraet, GeraeteQuery, GeraeteResult, StandortOption } from "./types";
import type { FirmaScope } from "@/lib/auth/current-firma";

const PAGE_SIZE = 25;

function normalizeStatus(status: string | null): string | null {
  if (!status) return null;
  return status.trim().toLowerCase();
}

function dedupeStatusOptions(statuses: (string | null)[]): string[] {
  const seen = new Map<string, string>();
  for (const status of statuses) {
    const key = normalizeStatus(status);
    if (key && !seen.has(key)) seen.set(key, status!.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "de", { sensitivity: "base" }));
}

// PostgREST's .or() reads its argument as a comma-separated filter list, so a
// literal "," or "(" / ")" typed into the search box would otherwise break
// the filter instead of just failing to match.
function escapeOrListValue(value: string): string {
  return value.replace(/[(),]/g, (c) => `\\${c}`);
}

function extractYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

// PostgREST's .in() inlines every ID into the request URL — with a Firma
// that has hundreds of distinct Artikel, that URL can get long enough to
// make the underlying fetch() fail outright (same root cause as the
// PROJ-5 BUG-2 dashboard fix). Chunking keeps each request's URL small.
// A no-op in practice for the paginated getGeraeteList (max 25 Geräte per
// page → at most 25 distinct Artikel-IDs), but required for the
// unpaginated PROJ-8 export.
const ARTIKEL_LOOKUP_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

type GeraetRow = {
  id: string;
  name: string | null;
  seriennummer: string | null;
  barcode: string | null;
  status: string | null;
  letzte_pruefung: string | null;
  ablegereife: string | null;
  herstelljahr: string | null;
  standort_id: string | null;
  artikel_id: string | null;
  lagerort: string | null;
  pruefer: string | null;
  zubehoer: string | null;
  bemerkungen: string | null;
  kunden_id: string | null;
};

type ArtikelInfo = {
  bezeichnung: string | null;
  hersteller: string | null;
  norm: string | null;
  artikeltyp: string | null;
  dimension: string | null;
};

function mapGeraetRow(
  row: GeraetRow,
  standortName: string | null,
  artikel: ArtikelInfo | null,
  pruefBemerkung: string | null
): Geraet {
  return {
    id: row.id,
    name: row.name,
    seriennummer: row.seriennummer,
    barcode: row.barcode,
    status: row.status,
    letztePruefung: row.letzte_pruefung,
    ablegereife: row.ablegereife,
    herstelljahr: extractYear(row.herstelljahr),
    standortName,
    lagerort: row.lagerort,
    pruefer: row.pruefer,
    zubehoer: row.zubehoer,
    bemerkungen: row.bemerkungen,
    artikelBezeichnung: artikel?.bezeichnung ?? null,
    artikelHersteller: artikel?.hersteller ?? null,
    artikelNorm: artikel?.norm ?? null,
    artikelTyp: artikel?.artikeltyp ?? null,
    artikelDimension: artikel?.dimension ?? null,
    kundenId: row.kunden_id,
    pruefBemerkung,
  };
}

const PRUEFBERICHT_GERAET_CHUNK_SIZE = 100;
const PAGE_ROWS = 1000;

type PruefBemerkungRow = { id: string; geraet_id: string; pruefdatum: string | null; bemerkungen: string | null };

// Ist `a` "aktueller" als `b`? Neuestes Prüfdatum gewinnt (undatiert zählt
// als ältestes). Bei gleichem Datum (Altdaten, künftig max. ein Bericht pro
// Tag) gewinnt einer mit Bemerkung, sonst die kleinere ID — damit das
// Ergebnis bei jedem Aufruf gleich ist (PROJ-3 Nachtrag 2026-10-09).
function istAktueller(a: PruefBemerkungRow, b: PruefBemerkungRow): boolean {
  const da = a.pruefdatum ?? "";
  const db = b.pruefdatum ?? "";
  if (da !== db) return da > db;
  const ha = !!a.bemerkungen?.trim();
  const hb = !!b.bemerkungen?.trim();
  if (ha !== hb) return ha;
  return a.id < b.id;
}

// PROJ-3 Nachtrag 2026-10-09: Bemerkung des aktuellen Prüfberichts je Gerät.
// Nur für die übergebenen (bereits auf Firma + freigegebene Standorte
// eingeschränkten) Geräte-IDs; blockweise und seitenweise, weil Supabase pro
// Abfrage höchstens 1000 Zeilen liefert.
export async function getAktuellePruefBemerkungen(geraetIds: string[]): Promise<Map<string, string | null>> {
  const aktuell = new Map<string, PruefBemerkungRow>();
  if (geraetIds.length === 0) return new Map();
  const supabase = getSupabaseAdmin();

  for (const idChunk of chunk(geraetIds, PRUEFBERICHT_GERAET_CHUNK_SIZE)) {
    for (let from = 0; ; from += PAGE_ROWS) {
      const { data, error } = await supabase
        .from("dv_pruefberichte")
        .select("id, geraet_id, pruefdatum, bemerkungen")
        .in("geraet_id", idChunk)
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, from + PAGE_ROWS - 1);

      if (error) throw new Error(`Prüfbericht-Bemerkungen-Lookup fehlgeschlagen: ${error.message}`);
      const rows = (data ?? []) as PruefBemerkungRow[];
      for (const row of rows) {
        const bisher = aktuell.get(row.geraet_id);
        if (!bisher || istAktueller(row, bisher)) aktuell.set(row.geraet_id, row);
      }
      if (rows.length < PAGE_ROWS) break;
    }
  }

  return new Map(
    [...aktuell.entries()].map(([geraetId, row]) => [geraetId, row.bemerkungen?.trim() ? row.bemerkungen : null])
  );
}

// Exportiert seit PROJ-9 — auch die firmenweite Prüfberichte-Übersicht
// braucht Artikel-Infos für ihre "Gerät"-Spalte, batcht dafür aber selbst
// nur eine kleine, bereits paginierte Geräte-Menge (siehe pruefberichte/queries.ts).
export async function getArtikelMapFuerIds(artikelIds: string[]): Promise<Map<string, ArtikelInfo>> {
  if (artikelIds.length === 0) return new Map();

  const supabase = getSupabaseAdmin();
  const chunks = await Promise.all(
    chunk(artikelIds, ARTIKEL_LOOKUP_CHUNK_SIZE).map(async (idChunk) => {
      const { data, error } = await supabase
        .from("dv_artikel")
        .select("id, bezeichnung, hersteller, norm, artikeltyp, dimension")
        .in("id", idChunk);

      if (error) throw new Error(`Artikel-Lookup fehlgeschlagen: ${error.message}`);
      return data ?? [];
    })
  );

  return new Map(
    chunks.flat().map((row) => [
      row.id as string,
      {
        bezeichnung: row.bezeichnung as string | null,
        hersteller: row.hersteller as string | null,
        norm: row.norm as string | null,
        artikeltyp: row.artikeltyp as string | null,
        dimension: row.dimension as string | null,
      },
    ])
  );
}

// PROJ-15: die einzige Stelle, an der Datenabfragen "die Standorte der
// Firma" ermitteln — liefert nur Standorte, die zur Firma gehören UND für
// die der Kunde einen Portalzugang hat. Übersicht, Exporte, Prüfberichte und
// Dashboard bauen alle darauf auf.
export async function getStandorteFuerFirma(scope: FirmaScope) {
  if (scope.standortIds.length === 0) return [];

  const { data, error } = await getSupabaseAdmin()
    .from("dv_standorte")
    .select("id, name")
    .eq("firma_id", scope.firmaId)
    .in("id", scope.standortIds);

  if (error) throw new Error(`Standorte-Lookup fehlgeschlagen: ${error.message}`);
  return (data ?? []) as { id: string; name: string | null }[];
}

// Shared with src/lib/dashboard/queries.ts (see PROJ-5 Tech Design: reuse
// this resolution instead of duplicating it) — just the IDs, no names.
// PROJ-3 Nachtrag 2: Auswahl für den Standort-Filter (alphabetisch) und die
// Einschränkung auf einen gewählten Standort. Ein Wert, der nicht unter den
// freigegebenen Standorten ist, ergibt bewusst eine leere Menge — über die
// Adresse lässt sich so nie ein fremder Standort einblenden.
function toStandortOptions(standorte: { id: string; name: string | null }[]): StandortOption[] {
  return standorte
    .map((s) => ({ id: s.id, name: s.name?.trim() ? s.name : "(ohne Namen)" }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

// PROJ-3 QA BUG-1 (Nachtrag 2): Die Status-Optionen hängen vom gewählten
// Standort ab. Ein aktiver Status-Filter, der dort nicht vorkommt, bleibt
// trotzdem in der Auswahl — sonst sähe das Feld leer aus, obwohl weiter
// danach gefiltert wird.
function mitAktivemStatus(options: string[], aktiv: string | undefined): string[] {
  if (!aktiv || options.some((o) => normalizeStatus(o) === normalizeStatus(aktiv))) return options;
  return [...options, aktiv];
}

function filterStandort<T extends { id: string }>(standorte: T[], standortId: string | undefined): T[] {
  return standortId ? standorte.filter((s) => s.id === standortId) : standorte;
}

export async function getStandortIdsFuerFirma(scope: FirmaScope): Promise<string[]> {
  const standorte = await getStandorteFuerFirma(scope);
  return standorte.map((s) => s.id);
}

// Shared between getGeraeteList (PROJ-3/7) and getGeraeteExportRows (PROJ-8)
// so both apply exactly the same Status-/Suche-/Zu-prüfen-Filter — a future
// fix here (or a new filter) only needs to happen in one place.
function applyGeraeteFilters<T extends { ilike: (...args: any[]) => T; or: (...args: any[]) => T }>(
  geraeteQuery: T,
  filters: Pick<GeraeteQuery, "status" | "suche" | "zuPruefen" | "sucheKundenId">
): T {
  let q = geraeteQuery;
  if (filters.status) {
    q = q.ilike("status", filters.status);
  }
  if (filters.suche) {
    const needle = escapeOrListValue(filters.suche.trim());
    const sucheFelder = ["seriennummer", "barcode", "lagerort"];
    if (filters.sucheKundenId) sucheFelder.push("kunden_id");
    q = q.or(sucheFelder.map((feld) => `${feld}.ilike.%${needle}%`).join(","));
  }
  if (filters.zuPruefen) {
    // Eigene .or()-Gruppe, wird laut bestehendem Supabase-Verhalten (siehe
    // Status+Suche-Kombination) mit den übrigen Filtern UND-verknüpft.
    q = q.or(`letzte_pruefung.is.null,letzte_pruefung.lt.${getZuPruefenCutoff()}`);
  }
  return q;
}

// Two-step lookup by design (see PROJ-3 Tech Design): dv_geraete/dv_standorte
// have no real foreign keys since PROJ-1's BUG-1 fix, so PostgREST can't
// embed the join — we resolve the Firma's Standort-IDs first, then query
// Geräte against that ID list.
export async function getGeraeteList(scope: FirmaScope, query: GeraeteQuery): Promise<GeraeteResult> {
  const freigegeben = await getStandorteFuerFirma(scope);
  const standortOptions = toStandortOptions(freigegeben);
  const standorte = filterStandort(freigegeben, query.standortId);
  const standortIds = standorte.map((s) => s.id);
  const standortNamen = new Map(standorte.map((s) => [s.id, s.name]));

  const page = Math.max(1, query.seite ?? 1);

  if (standortIds.length === 0) {
    return { items: [], total: 0, page, pageSize: PAGE_SIZE, statusOptions: mitAktivemStatus([], query.status), standortOptions };
  }

  const supabase = getSupabaseAdmin();

  // Filter options must reflect every status in use at this Firma, not just
  // the current page/filter — queried unfiltered, deduped case-insensitively
  // (real data has "letzte Freigabe" vs. "Letzte Freigabe").
  const { data: statusRows, error: statusError } = await supabase
    .from("dv_geraete")
    .select("status")
    .in("standort_id", standortIds);

  if (statusError) throw new Error(`Status-Lookup fehlgeschlagen: ${statusError.message}`);
  const statusOptions = mitAktivemStatus(
    dedupeStatusOptions((statusRows ?? []).map((r) => r.status as string | null)),
    query.status
  );

  let geraeteQuery = supabase
    .from("dv_geraete")
    .select(
      "id, name, seriennummer, barcode, status, letzte_pruefung, ablegereife, herstelljahr, standort_id, artikel_id, lagerort, pruefer, zubehoer, bemerkungen, kunden_id",
      { count: "exact" }
    )
    .in("standort_id", standortIds);

  geraeteQuery = applyGeraeteFilters(geraeteQuery, query);

  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data, error, count } = await geraeteQuery
    .order("letzte_pruefung", { ascending: false, nullsFirst: true })
    .range(start, end);

  if (error) throw new Error(`Geräte-Lookup fehlgeschlagen: ${error.message}`);

  // The "Gerät"-Spalte zeigt seit dem PROJ-3-Refinement Artikel-Infos statt
  // des Gerätenamens (siehe formatArtikelInfo), daher werden Artikel jetzt
  // auch für die Liste geladen — als eine Batch-Abfrage über die (max. 25)
  // distinct Artikel-IDs der aktuellen Seite, kein Lookup pro Zeile.
  const rows = (data ?? []) as GeraetRow[];
  const artikelIds = [...new Set(rows.map((row) => row.artikel_id).filter((id): id is string => !!id))];
  const [artikelMap, pruefBemerkungen] = await Promise.all([
    getArtikelMapFuerIds(artikelIds),
    getAktuellePruefBemerkungen(rows.map((row) => row.id)),
  ]);

  const items = rows.map((row) =>
    mapGeraetRow(
      row,
      standortNamen.get(row.standort_id ?? "") ?? null,
      row.artikel_id ? artikelMap.get(row.artikel_id) ?? null : null,
      pruefBemerkungen.get(row.id) ?? null
    )
  );

  return { items, total: count ?? items.length, page, pageSize: PAGE_SIZE, statusOptions, standortOptions };
}

// The scope comes from the caller's own session/cookie (never from the URL),
// so an id that resolves to a device outside that Firma — or, since PROJ-15,
// at a Standort without Portalzugang — is treated exactly like an unknown id
// (null). This is the actual access check, since RLS on dv_geraete denies
// everyone but the service role.
export async function getGeraetById(id: string, scope: FirmaScope): Promise<Geraet | null> {
  const supabase = getSupabaseAdmin();

  const { data: geraet, error } = await supabase
    .from("dv_geraete")
    .select(
      "id, name, seriennummer, barcode, status, letzte_pruefung, ablegereife, herstelljahr, standort_id, artikel_id, lagerort, pruefer, zubehoer, bemerkungen, kunden_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Gerät-Lookup fehlgeschlagen: ${error.message}`);
  if (!geraet) return null;

  const row = geraet as GeraetRow;
  if (!row.standort_id || !scope.standortIds.includes(row.standort_id)) return null;

  const { data: standort, error: standortError } = await supabase
    .from("dv_standorte")
    .select("name, firma_id")
    .eq("id", row.standort_id)
    .maybeSingle();

  if (standortError) throw new Error(`Standort-Lookup fehlgeschlagen: ${standortError.message}`);
  if (!standort || standort.firma_id !== scope.firmaId) return null;

  let artikel: ArtikelInfo | null = null;
  if (row.artikel_id) {
    const { data: artikelRow, error: artikelError } = await supabase
      .from("dv_artikel")
      .select("bezeichnung, hersteller, norm, artikeltyp, dimension")
      .eq("id", row.artikel_id)
      .maybeSingle();

    if (artikelError) throw new Error(`Artikel-Lookup fehlgeschlagen: ${artikelError.message}`);
    artikel = artikelRow as ArtikelInfo | null;
  }

  const pruefBemerkungen = await getAktuellePruefBemerkungen([row.id]);
  return mapGeraetRow(row, standort.name as string | null, artikel, pruefBemerkungen.get(row.id) ?? null);
}

// PROJ-8: liefert ALLE zu den Filtern passenden Geräte einer Firma, ohne
// Paginierung (im Gegensatz zu getGeraeteList) — für den CSV-Export, der
// laut Spec nie auf eine Seite beschränkt sein soll. Nutzt dieselbe
// Firma→Standort-Auflösung und dieselbe Filterlogik wie getGeraeteList
// (siehe applyGeraeteFilters), damit Übersicht und Export nie auseinanderlaufen.
export async function getGeraeteExportRows(
  scope: FirmaScope,
  filters: Pick<GeraeteQuery, "status" | "suche" | "zuPruefen" | "sucheKundenId" | "standortId">
): Promise<Geraet[]> {
  const standorte = filterStandort(await getStandorteFuerFirma(scope), filters.standortId);
  const standortIds = standorte.map((s) => s.id);
  const standortNamen = new Map(standorte.map((s) => [s.id, s.name]));

  if (standortIds.length === 0) return [];

  const supabase = getSupabaseAdmin();

  let geraeteQuery = supabase
    .from("dv_geraete")
    .select(
      "id, name, seriennummer, barcode, status, letzte_pruefung, ablegereife, herstelljahr, standort_id, artikel_id, lagerort, pruefer, zubehoer, bemerkungen, kunden_id"
    )
    .in("standort_id", standortIds);

  geraeteQuery = applyGeraeteFilters(geraeteQuery, filters);

  const { data, error } = await geraeteQuery.order("letzte_pruefung", { ascending: false, nullsFirst: true });

  if (error) throw new Error(`Geräte-Export-Lookup fehlgeschlagen: ${error.message}`);

  const rows = (data ?? []) as GeraetRow[];
  const artikelIds = [...new Set(rows.map((row) => row.artikel_id).filter((id): id is string => !!id))];
  const [artikelMap, pruefBemerkungen] = await Promise.all([
    getArtikelMapFuerIds(artikelIds),
    getAktuellePruefBemerkungen(rows.map((row) => row.id)),
  ]);

  return rows.map((row) =>
    mapGeraetRow(
      row,
      standortNamen.get(row.standort_id ?? "") ?? null,
      row.artikel_id ? artikelMap.get(row.artikel_id) ?? null : null,
      pruefBemerkungen.get(row.id) ?? null
    )
  );
}

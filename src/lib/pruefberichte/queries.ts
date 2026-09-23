import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStandortIdsFuerFirma, getArtikelMapFuerIds } from "@/lib/geraete/queries";
import { formatArtikelInfo } from "@/lib/geraete/artikel-info";
import type { Pruefbericht, PruefberichteFirmaQuery, PruefberichteFirmaResult, PruefberichtMitGeraet } from "./types";

const PAGE_SIZE = 25;

type PruefberichtRow = {
  id: string;
  pruefdatum: string | null;
  ergebnis: string | null;
  bemerkungen: string | null;
  pruefer: string | null;
};

type PruefberichtFirmaRow = PruefberichtRow & { geraet_id: string | null };

// No firmaId parameter here by design (see PROJ-4 Tech Design): the caller
// must only ever pass a geraetId that has already been confirmed — via
// getGeraetById (PROJ-3) — to belong to the current session's Firma. This
// query trusts that ordering and does not re-check ownership itself.
export async function getPruefberichteFuerGeraet(geraetId: string): Promise<Pruefbericht[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("dv_pruefberichte")
    .select("id, pruefdatum, ergebnis, bemerkungen, pruefer")
    .eq("geraet_id", geraetId)
    .is("deleted_at", null)
    .order("pruefdatum", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Prüfberichte-Lookup fehlgeschlagen: ${error.message}`);

  return (data ?? []) as PruefberichtRow[];
}

// Gleiche Ursache/Fix wie PROJ-5 BUG-2 und PROJ-8: eine Firma kann hunderte
// Geräte haben, eine einzelne .in("geraet_id", [...]) mit allen IDs auf
// einmal kann die Anfrage-URL so lang machen, dass fetch() fehlschlägt.
const GERAET_ID_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Nimmt bewusst einen rohen string entgegen (nicht den engeren Zeitraum-Typ):
// Diese Funktion ist die letzte Verteidigungslinie gegen ungültige Werte, die
// direkt über einen URL-Query-Parameter ankommen (z.B. am Export-Endpoint,
// PROJ-10), unabhängig von jeder Validierung auf Seiten-Ebene. Ein
// unbekannter/nicht-numerischer/negativer Wert wird wie "alle" behandelt
// (kein Filter) statt eine Exception zu werfen — behebt PROJ-9 BUG-1.
function zeitraumCutoff(zeitraum?: string): string | null {
  if (!zeitraum || zeitraum === "alle") return null;
  const tage = Number(zeitraum);
  if (!Number.isFinite(tage) || tage <= 0) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - tage);
  return cutoff.toISOString().slice(0, 10);
}

// Geteilt zwischen getPruefberichteFuerFirma (PROJ-9, paginiert) und
// getPruefberichteExportRows (PROJ-10, unpaginiert) — beide brauchen exakt
// dieselbe Firma-Isolation, Chunking- und Sortierlogik, nur die Paginierung
// selbst unterscheidet sich. Da eine gruppierte (gechunkte) Abfrage sich
// nicht direkt in der Datenbank paginieren lässt, werden alle Treffer aller
// Gruppen zusammengeführt und in JS sortiert — bei der erwarteten
// Grössenordnung (im Schnitt ~65 Prüfberichte pro Firma laut
// PROJ-1-Datenfund) unproblematisch.
async function fetchAllePruefberichteFuerFirma(
  firmaId: string,
  zeitraum?: string
): Promise<PruefberichtFirmaRow[]> {
  const standortIds = await getStandortIdsFuerFirma(firmaId);
  if (standortIds.length === 0) return [];

  const supabase = getSupabaseAdmin();

  const { data: geraeteRows, error: geraeteError } = await supabase
    .from("dv_geraete")
    .select("id")
    .in("standort_id", standortIds);

  if (geraeteError) throw new Error(`Geräte-Lookup fehlgeschlagen: ${geraeteError.message}`);

  const geraetIds = (geraeteRows ?? []).map((row) => row.id as string);
  if (geraetIds.length === 0) return [];

  const cutoff = zeitraumCutoff(zeitraum);

  const chunks = await Promise.all(
    chunk(geraetIds, GERAET_ID_CHUNK_SIZE).map(async (idChunk) => {
      let pruefberichteQuery = supabase
        .from("dv_pruefberichte")
        .select("id, geraet_id, pruefdatum, ergebnis, bemerkungen, pruefer")
        .in("geraet_id", idChunk)
        .is("deleted_at", null);

      if (cutoff) {
        pruefberichteQuery = pruefberichteQuery.gte("pruefdatum", cutoff);
      }

      const { data, error } = await pruefberichteQuery;
      if (error) throw new Error(`Prüfberichte-Lookup fehlgeschlagen: ${error.message}`);
      return (data ?? []) as PruefberichtFirmaRow[];
    })
  );

  const alle = chunks.flat();
  // Neuestes Datum zuerst, undatierte Berichte ganz hinten (gleiche
  // Konvention wie getPruefberichteFuerGeraet/PROJ-4: nullsFirst: false).
  alle.sort((a, b) => {
    if (!a.pruefdatum && !b.pruefdatum) return 0;
    if (!a.pruefdatum) return 1;
    if (!b.pruefdatum) return -1;
    return b.pruefdatum.localeCompare(a.pruefdatum);
  });

  return alle;
}

// Ebenfalls geteilt — reichert eine beliebig grosse Zeilen-Menge mit dem
// "Gerät"-Label an. Bei PROJ-9 sind das höchstens 25 Zeilen (eine Seite),
// bei PROJ-10 (Export) potenziell alle Treffer einer Firma — deshalb selbst
// über die Geräte-IDs gechunkt, statt wie ursprünglich in PROJ-9 anzunehmen,
// dass die Menge immer klein genug für eine einzelne .in()-Abfrage ist.
async function anreichernMitGeraetLabel(rows: PruefberichtFirmaRow[]): Promise<PruefberichtMitGeraet[]> {
  const supabase = getSupabaseAdmin();
  const geraetIds = [...new Set(rows.map((row) => row.geraet_id).filter((id): id is string => !!id))];

  const geraeteDetailChunks = await Promise.all(
    chunk(geraetIds, GERAET_ID_CHUNK_SIZE).map(async (idChunk) => {
      if (idChunk.length === 0) return [];
      const { data, error } = await supabase.from("dv_geraete").select("id, name, artikel_id").in("id", idChunk);
      if (error) throw new Error(`Geräte-Detail-Lookup fehlgeschlagen: ${error.message}`);
      return (data ?? []) as { id: string; name: string | null; artikel_id: string | null }[];
    })
  );
  const geraeteDetailRows = geraeteDetailChunks.flat();

  const artikelIds = [
    ...new Set(geraeteDetailRows.map((row) => row.artikel_id).filter((id): id is string => !!id)),
  ];
  const artikelMap = await getArtikelMapFuerIds(artikelIds);

  const geraetLabelMap = new Map(
    geraeteDetailRows.map((row) => {
      const artikel = row.artikel_id ? artikelMap.get(row.artikel_id) ?? null : null;
      const label = formatArtikelInfo({
        name: row.name,
        artikelBezeichnung: artikel?.bezeichnung ?? null,
        artikelNorm: artikel?.norm ?? null,
        artikelTyp: artikel?.artikeltyp ?? null,
        artikelDimension: artikel?.dimension ?? null,
        artikelHersteller: artikel?.hersteller ?? null,
      });
      return [row.id, label];
    })
  );
  const geraetNameMap = new Map(geraeteDetailRows.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    id: row.id,
    pruefdatum: row.pruefdatum,
    ergebnis: row.ergebnis,
    bemerkungen: row.bemerkungen,
    pruefer: row.pruefer,
    geraetId: row.geraet_id ?? "",
    geraetLabel: row.geraet_id ? geraetLabelMap.get(row.geraet_id) ?? "(ohne Angaben)" : "(ohne Angaben)",
    geraetName: row.geraet_id ? geraetNameMap.get(row.geraet_id) ?? null : null,
  }));
}

// PROJ-9: firmenweite Übersicht über alle Geräte hinweg, siehe Tech Design.
// Die Geräte-/Artikel-Anreicherung für die "Gerät"-Spalte erfolgt erst NACH
// der Paginierung, nur für die tatsächlich angezeigte Seite (max. 25 Zeilen).
export async function getPruefberichteFuerFirma(
  firmaId: string,
  query: PruefberichteFirmaQuery
): Promise<PruefberichteFirmaResult> {
  const page = Math.max(1, query.seite ?? 1);
  const alle = await fetchAllePruefberichteFuerFirma(firmaId, query.zeitraum);

  const total = alle.length;
  const start = (page - 1) * PAGE_SIZE;
  const seiteRows = alle.slice(start, start + PAGE_SIZE);

  const items = await anreichernMitGeraetLabel(seiteRows);

  return { items, total, page, pageSize: PAGE_SIZE };
}

// PROJ-10: wie getPruefberichteFuerFirma, aber ohne Paginierung — liefert
// ALLE zum Zeitraum passenden Prüfberichte für den CSV-Export. Nimmt
// `zeitraum` bewusst als rohen string entgegen (nicht den engeren
// Zeitraum-Typ): der Export-Route-Handler liest den Parameter direkt aus der
// URL, ohne die Validierung von pruefberichte/page.tsx zu durchlaufen —
// zeitraumCutoff() fängt ungültige Werte selbst ab (siehe PROJ-9 BUG-1).
export async function getPruefberichteExportRows(
  firmaId: string,
  filters: { zeitraum?: string }
): Promise<PruefberichtMitGeraet[]> {
  const alle = await fetchAllePruefberichteFuerFirma(firmaId, filters.zeitraum);
  return anreichernMitGeraetLabel(alle);
}

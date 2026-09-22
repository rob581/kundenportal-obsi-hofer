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

function zeitraumCutoff(zeitraum?: string): string | null {
  if (!zeitraum || zeitraum === "alle") return null;
  const tage = Number(zeitraum);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - tage);
  return cutoff.toISOString().slice(0, 10);
}

// PROJ-9: firmenweite Übersicht über alle Geräte hinweg, siehe Tech Design.
// Da eine gruppierte (gechunkte) Abfrage sich nicht direkt in der Datenbank
// paginieren lässt, werden alle Treffer aller Gruppen zusammengeführt, dann
// in JS sortiert/paginiert — bei der erwarteten Grössenordnung (im Schnitt
// ~65 Prüfberichte pro Firma laut PROJ-1-Datenfund) unproblematisch. Die
// Geräte-/Artikel-Anreicherung für die "Gerät"-Spalte erfolgt danach nur für
// die tatsächlich angezeigte Seite (max. 25 Zeilen), nicht für alle Treffer.
export async function getPruefberichteFuerFirma(
  firmaId: string,
  query: PruefberichteFirmaQuery
): Promise<PruefberichteFirmaResult> {
  const page = Math.max(1, query.seite ?? 1);
  const standortIds = await getStandortIdsFuerFirma(firmaId);

  if (standortIds.length === 0) {
    return { items: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  const supabase = getSupabaseAdmin();

  const { data: geraeteRows, error: geraeteError } = await supabase
    .from("dv_geraete")
    .select("id")
    .in("standort_id", standortIds);

  if (geraeteError) throw new Error(`Geräte-Lookup fehlgeschlagen: ${geraeteError.message}`);

  const geraetIds = (geraeteRows ?? []).map((row) => row.id as string);
  if (geraetIds.length === 0) {
    return { items: [], total: 0, page, pageSize: PAGE_SIZE };
  }

  const cutoff = zeitraumCutoff(query.zeitraum);

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

  const total = alle.length;
  const start = (page - 1) * PAGE_SIZE;
  const seiteRows = alle.slice(start, start + PAGE_SIZE);

  const seitenGeraetIds = [
    ...new Set(seiteRows.map((row) => row.geraet_id).filter((id): id is string => !!id)),
  ];

  const { data: geraeteDetailRows, error: geraeteDetailError } =
    seitenGeraetIds.length > 0
      ? await supabase.from("dv_geraete").select("id, name, artikel_id").in("id", seitenGeraetIds)
      : { data: [] as { id: string; name: string | null; artikel_id: string | null }[], error: null };

  if (geraeteDetailError) throw new Error(`Geräte-Detail-Lookup fehlgeschlagen: ${geraeteDetailError.message}`);

  const artikelIds = [
    ...new Set((geraeteDetailRows ?? []).map((row) => row.artikel_id).filter((id): id is string => !!id)),
  ];
  const artikelMap = await getArtikelMapFuerIds(artikelIds);

  const geraetLabelMap = new Map(
    (geraeteDetailRows ?? []).map((row) => {
      const artikel = row.artikel_id ? artikelMap.get(row.artikel_id as string) ?? null : null;
      const label = formatArtikelInfo({
        name: row.name as string | null,
        artikelBezeichnung: artikel?.bezeichnung ?? null,
        artikelNorm: artikel?.norm ?? null,
        artikelTyp: artikel?.artikeltyp ?? null,
        artikelDimension: artikel?.dimension ?? null,
        artikelHersteller: artikel?.hersteller ?? null,
      });
      return [row.id as string, label];
    })
  );

  const items: PruefberichtMitGeraet[] = seiteRows.map((row) => ({
    id: row.id,
    pruefdatum: row.pruefdatum,
    ergebnis: row.ergebnis,
    bemerkungen: row.bemerkungen,
    pruefer: row.pruefer,
    geraetId: row.geraet_id ?? "",
    geraetLabel: row.geraet_id ? geraetLabelMap.get(row.geraet_id) ?? "(ohne Angaben)" : "(ohne Angaben)",
  }));

  return { items, total, page, pageSize: PAGE_SIZE };
}

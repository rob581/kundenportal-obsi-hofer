import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStandortIdsFuerFirma } from "@/lib/geraete/queries";
import { getZuPruefenCutoff } from "@/lib/geraete/zu-pruefen";
import type { DashboardKennzahlen } from "./types";

function normalizeStatus(status: string | null): string | null {
  if (!status) return null;
  return status.trim().toLowerCase();
}

// PostgREST's .in() inlines every ID into the request URL — with a Firma
// that has hundreds/thousands of Geräte, that URL can get long enough to
// make the underlying fetch() fail outright (seen live as "TypeError: fetch
// failed", not even a proper HTTP error) instead of returning a clean
// response. Chunking keeps each request's URL to a safe size.
const PRUEFBERICHTE_COUNT_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const EMPTY_KENNZAHLEN: DashboardKennzahlen = {
  totalGeraete: 0,
  statusFreigabe: 0,
  statusKeineFreigabe: 0,
  statusLetzteFreigabe: 0,
  statusKeinStatus: 0,
  totalPruefberichte: 0,
  letztePruefung: null,
  zuPruefen: 0,
};

// Reuses the same Firma→Standort→Geräte-Auflösung as PROJ-3
// (getStandortIdsFuerFirma) instead of duplicating it — see PROJ-5 Tech
// Design. Geräte are fetched with only the three columns needed for the
// aggregation (id/status/letzte_pruefung), then reduced in one pass;
// Prüfberichte use a count-only query (head: true), never loading actual
// report rows, per the spec's performance requirement.
export async function getDashboardKennzahlen(firmaId: string): Promise<DashboardKennzahlen> {
  const standortIds = await getStandortIdsFuerFirma(firmaId);
  if (standortIds.length === 0) return EMPTY_KENNZAHLEN;

  const supabase = getSupabaseAdmin();

  const { data: geraeteRows, error: geraeteError } = await supabase
    .from("dv_geraete")
    .select("id, status, letzte_pruefung")
    .in("standort_id", standortIds);

  if (geraeteError) {
    throw new Error(`Dashboard-Geräte-Lookup fehlgeschlagen: ${geraeteError.message}`);
  }

  const geraete = (geraeteRows ?? []) as {
    id: string;
    status: string | null;
    letzte_pruefung: string | null;
  }[];

  if (geraete.length === 0) return EMPTY_KENNZAHLEN;

  let statusFreigabe = 0;
  let statusKeineFreigabe = 0;
  let statusLetzteFreigabe = 0;
  let statusKeinStatus = 0;
  let letztePruefung: string | null = null;
  let zuPruefen = 0;
  const zuPruefenCutoff = getZuPruefenCutoff();

  for (const geraet of geraete) {
    switch (normalizeStatus(geraet.status)) {
      case "freigabe":
        statusFreigabe++;
        break;
      case "keine freigabe":
        statusKeineFreigabe++;
        break;
      case "letzte freigabe":
        statusLetzteFreigabe++;
        break;
      default:
        statusKeinStatus++;
    }

    if (geraet.letzte_pruefung && (!letztePruefung || geraet.letzte_pruefung > letztePruefung)) {
      letztePruefung = geraet.letzte_pruefung;
    }

    if (!geraet.letzte_pruefung || geraet.letzte_pruefung < zuPruefenCutoff) {
      zuPruefen++;
    }
  }

  const geraetIds = geraete.map((g) => g.id);
  const geraetIdChunks = chunk(geraetIds, PRUEFBERICHTE_COUNT_CHUNK_SIZE);
  const chunkCounts = await Promise.all(
    geraetIdChunks.map(async (idChunk) => {
      const { count, error: pruefberichteError } = await supabase
        .from("dv_pruefberichte")
        .select("id", { count: "exact", head: true })
        .in("geraet_id", idChunk)
        .is("deleted_at", null);

      if (pruefberichteError) {
        throw new Error(`Dashboard-Prüfberichte-Lookup fehlgeschlagen: ${pruefberichteError.message}`);
      }
      return count ?? 0;
    })
  );

  return {
    totalGeraete: geraete.length,
    statusFreigabe,
    statusKeineFreigabe,
    statusLetzteFreigabe,
    statusKeinStatus,
    totalPruefberichte: chunkCounts.reduce((sum, c) => sum + c, 0),
    letztePruefung,
    zuPruefen,
  };
}

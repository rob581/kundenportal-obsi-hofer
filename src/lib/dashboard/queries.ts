import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getStandortIdsFuerFirma } from "@/lib/geraete/queries";
import type { DashboardKennzahlen } from "./types";

function normalizeStatus(status: string | null): string | null {
  if (!status) return null;
  return status.trim().toLowerCase();
}

// "Zu prüfen": kein Prüfdatum, oder älter als das (per Nutzerentscheidung
// akzeptierte) 360-Tage-Intervall. String-Vergleich funktioniert korrekt für
// ISO-Datumsstrings (YYYY-MM-DD), wie sie letzte_pruefung liefert.
const ZU_PRUEFEN_TAGE = 360;

function getZuPruefenCutoff(): string {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ZU_PRUEFEN_TAGE);
  return cutoff.toISOString().slice(0, 10);
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
  const { count, error: pruefberichteError } = await supabase
    .from("dv_pruefberichte")
    .select("id", { count: "exact", head: true })
    .in("geraet_id", geraetIds)
    .is("deleted_at", null);

  if (pruefberichteError) {
    throw new Error(`Dashboard-Prüfberichte-Lookup fehlgeschlagen: ${pruefberichteError.message}`);
  }

  return {
    totalGeraete: geraete.length,
    statusFreigabe,
    statusKeineFreigabe,
    statusLetzteFreigabe,
    statusKeinStatus,
    totalPruefberichte: count ?? 0,
    letztePruefung,
    zuPruefen,
  };
}

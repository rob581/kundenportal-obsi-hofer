import type { DashboardKennzahlen } from "./types";

// Placeholder for /frontend — /backend replaces this with real aggregate
// Supabase queries (Firma→Standort→Geräte-Auflösung wiederverwendet aus
// PROJ-3, plus Zähl-Queries über dv_geraete/dv_pruefberichte), gleiche
// async Signatur. Ignoriert firmaId bewusst wie schon bei PROJ-4s
// Mock-Phase — Geräte-/Firma-Daten sind hier bereits real (PROJ-3/4
// Backend ist fertig), nur diese Aggregation fehlt noch.
const MOCK_KENNZAHLEN: DashboardKennzahlen = {
  statusFreigabe: 14,
  statusKeineFreigabe: 3,
  statusLetzteFreigabe: 1,
  statusKeinStatus: 2,
  totalPruefberichte: 42,
  letztePruefung: "2026-08-12",
};

export async function getDashboardKennzahlen(_firmaId: string): Promise<DashboardKennzahlen> {
  return MOCK_KENNZAHLEN;
}

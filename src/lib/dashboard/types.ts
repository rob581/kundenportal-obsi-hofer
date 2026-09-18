export type DashboardKennzahlen = {
  statusFreigabe: number;
  statusKeineFreigabe: number;
  statusLetzteFreigabe: number;
  statusKeinStatus: number;
  totalPruefberichte: number;
  letztePruefung: string | null; // ISO date, or null if never inspected
};

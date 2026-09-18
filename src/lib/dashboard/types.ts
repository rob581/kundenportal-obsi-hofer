export type DashboardKennzahlen = {
  totalGeraete: number;
  statusFreigabe: number;
  statusKeineFreigabe: number;
  statusLetzteFreigabe: number;
  statusKeinStatus: number;
  totalPruefberichte: number;
  letztePruefung: string | null; // ISO date, or null if never inspected
  zuPruefen: number; // letzte_pruefung > 360 Tage her, oder nie geprüft
};

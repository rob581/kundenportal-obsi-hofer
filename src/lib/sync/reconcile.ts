// Safety threshold from the PROJ-1 spec: if more than this fraction of
// previously-known rows for an entity are missing from the current pull,
// treat it as a likely partial/broken read rather than real deletions,
// and skip deleting for that entity.
export const DELETE_SAFETY_THRESHOLD = 0.2;

export type ReconcileResult = {
  missingIds: string[];
  deleted: number;
  skippedDueToThreshold: boolean;
};

export function computeMissingIds(existingIds: string[], fetchedIds: Set<string>): string[] {
  return existingIds.filter((id) => !fetchedIds.has(id));
}

// PROJ-16: Bei kleinen Mengen (einzelne Standorte, kleine Firmen) wäre schon
// das Löschen weniger Einträge "über 20 %" und würde nie übernommen. Die
// Schwelle greift deshalb erst, wenn vorher MEHR als diese Anzahl bekannt war;
// bis dahin wird normal gelöscht. Grosse Mengen bleiben gegen halbe Abrufe
// geschützt.
export const DELETE_SAFETY_MIN_ROWS = 10;

export function exceedsSafetyThreshold(existingCount: number, missingCount: number): boolean {
  if (existingCount <= DELETE_SAFETY_MIN_ROWS) return false;
  return missingCount / existingCount > DELETE_SAFETY_THRESHOLD;
}

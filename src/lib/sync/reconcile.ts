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

export function exceedsSafetyThreshold(existingCount: number, missingCount: number): boolean {
  if (existingCount === 0) return false;
  return missingCount / existingCount > DELETE_SAFETY_THRESHOLD;
}

import { batchDelete, batchSoftDelete, batchUpsert, fetchAllIds } from "@/lib/sync/batch";
import { fetchAllDataverseRecords } from "@/lib/sync/dataverse-client";
import { getEntityConfig } from "@/lib/sync/entities";
import { SYNC_JOBS } from "@/lib/sync/jobs";
import { computeMissingIds, exceedsSafetyThreshold } from "@/lib/sync/reconcile";

export type EntitySyncSummary = {
  slug: string;
  fetched: number;
  deleted: number;
  skippedDueToThreshold: boolean;
};

export type SyncRunResult = {
  entities: EntitySyncSummary[];
  warnings: string[];
};

export async function runDataverseSync(): Promise<SyncRunResult> {
  const entities: EntitySyncSummary[] = [];
  const warnings: string[] = [];

  for (const job of SYNC_JOBS) {
    const config = getEntityConfig(job.slug);
    if (!config) throw new Error(`No entity config for job "${job.slug}"`);

    // 1. What do we already have? (only non-soft-deleted Pruefberichte
    //    count as "existing" for the diff — an already-deleted row that's
    //    still absent needs no further action.)
    const existingIds = await fetchAllIds(config.table, config.softDelete ? "deleted_at" : undefined);

    // 2. What does Dataverse say right now?
    const rawRecords = await fetchAllDataverseRecords(job.entitySet, job.select);
    const mappedRecords = rawRecords.map(job.map).map((record) => {
      const parsed = config.schema.safeParse(record);
      if (!parsed.success) {
        throw new Error(`Mapped record for "${job.slug}" failed validation: ${parsed.error.message}`);
      }
      return parsed.data;
    });

    // 3. Write what's current.
    await batchUpsert(config.table, mappedRecords);

    // 4. Reconcile: anything we had before that didn't come back is gone.
    const fetchedIds = new Set(mappedRecords.map((r) => r.id));
    const missingIds = computeMissingIds(existingIds, fetchedIds);
    const skippedDueToThreshold = exceedsSafetyThreshold(existingIds.length, missingIds.length);

    let deleted = 0;
    if (missingIds.length > 0) {
      if (skippedDueToThreshold) {
        warnings.push(
          `"${job.slug}": ${missingIds.length}/${existingIds.length} Zeilen fehlen im aktuellen Lauf ` +
            `(> 20% Schwelle) — Löschung übersprungen, bitte Dataverse-Verbindung prüfen.`
        );
      } else if (config.softDelete) {
        await batchSoftDelete(config.table, missingIds);
        deleted = missingIds.length;
      } else {
        await batchDelete(config.table, missingIds);
        deleted = missingIds.length;
      }
    }

    entities.push({ slug: job.slug, fetched: mappedRecords.length, deleted, skippedDueToThreshold });
  }

  return { entities, warnings };
}

import { batchDelete, batchSoftDelete, batchUpsert, fetchAllIds } from "@/lib/sync/batch";
import { fetchAllDataverseRecords } from "@/lib/sync/dataverse-client";
import { getEntityConfig } from "@/lib/sync/entities";
import { SYNC_JOBS, type SyncJob } from "@/lib/sync/jobs";
import { computeMissingIds, exceedsSafetyThreshold } from "@/lib/sync/reconcile";

export type EntitySyncSummary = {
  slug: string;
  fetched: number;
  added: number;
  updated: number;
  deleted: number;
  skippedDueToThreshold: boolean;
};

export type SyncRunResult = {
  entities: EntitySyncSummary[];
  warnings: string[];
  errors: string[];
};

// Each entity is independent (its own table, its own Dataverse entity set),
// so one entity's failure must not prevent the others from syncing. Errors
// are collected and surfaced (route emails them) instead of aborting the
// whole run — the failed entity simply stays as-is until the next run.
async function syncOneEntity(job: SyncJob): Promise<EntitySyncSummary> {
  const config = getEntityConfig(job.slug);
  if (!config) throw new Error(`No entity config for job "${job.slug}"`);

  // 1. What do we already have? (only non-soft-deleted Pruefberichte count
  //    as "existing" for the diff — an already-deleted row that's still
  //    absent needs no further action.)
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
  const existingIdSet = new Set(existingIds);
  const fetchedIds = new Set(mappedRecords.map((r) => r.id));
  const missingIds = computeMissingIds(existingIds, fetchedIds);
  const skippedDueToThreshold = exceedsSafetyThreshold(existingIds.length, missingIds.length);

  // Added vs. updated is derived purely from set membership (was this id
  // already known before this run?), not from an actual field-level diff —
  // cheap since existingIds/fetchedIds are already computed for reconcile.
  let added = 0;
  let updated = 0;
  for (const id of fetchedIds) {
    if (existingIdSet.has(id)) updated += 1;
    else added += 1;
  }

  let deleted = 0;
  if (missingIds.length > 0) {
    if (!skippedDueToThreshold) {
      if (config.softDelete) {
        await batchSoftDelete(config.table, missingIds);
      } else {
        await batchDelete(config.table, missingIds);
      }
      deleted = missingIds.length;
    }
  }

  return { slug: job.slug, fetched: mappedRecords.length, added, updated, deleted, skippedDueToThreshold };
}

export async function runDataverseSync(): Promise<SyncRunResult> {
  const entities: EntitySyncSummary[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  for (const job of SYNC_JOBS) {
    try {
      const summary = await syncOneEntity(job);
      entities.push(summary);
      if (summary.skippedDueToThreshold) {
        warnings.push(
          `"${job.slug}": mehr als 20% der zuvor bekannten Zeilen fehlen im aktuellen Lauf — ` +
            `Löschung übersprungen, bitte Dataverse-Verbindung prüfen.`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Sync for "${job.slug}" failed, continuing with remaining entities:`, message);
      errors.push(`"${job.slug}": ${message}`);
    }
  }

  return { entities, warnings, errors };
}

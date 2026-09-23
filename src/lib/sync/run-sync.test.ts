import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchAllDataverseRecordsMock = vi.fn();
vi.mock("@/lib/sync/dataverse-client", () => ({
  fetchAllDataverseRecords: (entitySet: string, select: string[]) =>
    fetchAllDataverseRecordsMock(entitySet, select),
}));

// In-memory fake of the two Supabase tables exercised below, keyed by table name.
const tables: Record<string, Map<string, { id: string; deleted_at: string | null }>> = {};

function resetTable(name: string, rows: { id: string; deleted_at?: string | null }[]) {
  tables[name] = new Map(rows.map((r) => [r.id, { id: r.id, deleted_at: r.deleted_at ?? null }]));
}

vi.mock("@/lib/sync/batch", () => ({
  fetchAllIds: async (table: string, onlyWhereNull?: string) => {
    const rows = [...(tables[table]?.values() ?? [])];
    return rows.filter((r) => !onlyWhereNull || r.deleted_at === null).map((r) => r.id);
  },
  batchUpsert: async (table: string, records: { id: string }[]) => {
    if (!tables[table]) tables[table] = new Map();
    for (const record of records) {
      tables[table].set(record.id, { id: record.id, deleted_at: null });
    }
  },
  batchDelete: async (table: string, ids: string[]) => {
    for (const id of ids) tables[table]?.delete(id);
  },
  batchSoftDelete: async (table: string, ids: string[]) => {
    for (const id of ids) {
      const row = tables[table]?.get(id);
      if (row) row.deleted_at = new Date().toISOString();
    }
  },
}));

import { runDataverseSync } from "./run-sync";

beforeEach(() => {
  fetchAllDataverseRecordsMock.mockReset();
  for (const key of Object.keys(tables)) delete tables[key];
});

function mockDataverseReturns(byEntitySet: Record<string, Record<string, unknown>[]>) {
  fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string) => byEntitySet[entitySet] ?? []);
}

describe("runDataverseSync", () => {
  it("upserts records fetched from Dataverse into the mapped tables", async () => {
    resetTable("dv_firmen", []);
    mockDataverseReturns({
      bmvcc_firmas: [{ bmvcc_firmaid: "f1", bmvcc_name: "Firma A" }],
      bmvcc_artikels: [],
      bmvcc_kontakts: [],
      bmvcc_organizationlocations: [],
      bmvcc_equipmentrecords: [],
      bmvcc_pruefberichts: [],
      bmvcc_relations: [],
    });

    const result = await runDataverseSync();

    expect(tables["dv_firmen"].has("f1")).toBe(true);
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary?.fetched).toBe(1);
    expect(firmenSummary?.added).toBe(1);
    expect(firmenSummary?.updated).toBe(0);
  });

  it("hard-deletes rows that disappeared from Dataverse for a non-soft-delete entity", async () => {
    // 10 existing rows, only 1 missing (10%) — safely under the 20% threshold.
    resetTable(
      "dv_firmen",
      Array.from({ length: 10 }, (_, i) => ({ id: `old-${i}` }))
    );
    mockDataverseReturns({
      // old-0 no longer comes back, old-1..old-9 still do
      bmvcc_firmas: Array.from({ length: 9 }, (_, i) => ({ bmvcc_firmaid: `old-${i + 1}` })),
      bmvcc_artikels: [],
      bmvcc_kontakts: [],
      bmvcc_organizationlocations: [],
      bmvcc_equipmentrecords: [],
      bmvcc_pruefberichts: [],
      bmvcc_relations: [],
    });

    const result = await runDataverseSync();

    expect(tables["dv_firmen"].has("old-0")).toBe(false);
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary?.deleted).toBe(1);
    expect(firmenSummary?.added).toBe(0);
    expect(firmenSummary?.updated).toBe(9);
  });

  it("soft-deletes Pruefberichte instead of removing them", async () => {
    // 10 existing rows, only 1 missing (10%) — safely under the 20% threshold.
    resetTable(
      "dv_pruefberichte",
      Array.from({ length: 10 }, (_, i) => ({ id: `pb-${i}` }))
    );
    mockDataverseReturns({
      bmvcc_firmas: [],
      bmvcc_artikels: [],
      bmvcc_kontakts: [],
      bmvcc_organizationlocations: [],
      bmvcc_equipmentrecords: [],
      // pb-0 no longer comes back, pb-1..pb-9 still do
      bmvcc_pruefberichts: Array.from({ length: 9 }, (_, i) => ({
        bmvcc_pruefberichtid: `pb-${i + 1}`,
      })),
      bmvcc_relations: [],
    });

    await runDataverseSync();

    const row = tables["dv_pruefberichte"].get("pb-0");
    expect(row).toBeDefined();
    expect(row?.deleted_at).not.toBeNull();
  });

  it("skips deletion and warns when more than 20% of an entity's rows go missing at once", async () => {
    resetTable(
      "dv_firmen",
      Array.from({ length: 10 }, (_, i) => ({ id: `f-${i}` }))
    );
    mockDataverseReturns({
      // Only 5 of 10 come back — 50% missing, well above the 20% threshold.
      bmvcc_firmas: [
        { bmvcc_firmaid: "f-0" },
        { bmvcc_firmaid: "f-1" },
        { bmvcc_firmaid: "f-2" },
        { bmvcc_firmaid: "f-3" },
        { bmvcc_firmaid: "f-4" },
      ],
      bmvcc_artikels: [],
      bmvcc_kontakts: [],
      bmvcc_organizationlocations: [],
      bmvcc_equipmentrecords: [],
      bmvcc_pruefberichts: [],
      bmvcc_relations: [],
    });

    const result = await runDataverseSync();

    expect(tables["dv_firmen"].size).toBe(10); // nothing deleted
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary?.skippedDueToThreshold).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  // Fix for QA BUG-2: entities used to sync sequentially with no per-entity
  // error isolation, so a transient failure on one entity (this actually
  // happened live on "geraete" during backend testing) aborted every
  // entity after it for that whole run. Each entity is now isolated: a
  // failure is collected as an error, and every other entity still runs.
  it("isolates a failure on one entity so every other entity still syncs", async () => {
    resetTable("dv_firmen", []);
    resetTable("dv_kontakte", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string) => {
      if (entitySet === "bmvcc_artikels") throw new Error("transient network error");
      if (entitySet === "bmvcc_firmas") return [{ bmvcc_firmaid: "f1", bmvcc_name: "Firma A" }];
      if (entitySet === "bmvcc_kontakts") return [{ bmvcc_kontaktid: "k1", statecode: 0 }];
      return [];
    });

    const result = await runDataverseSync();

    // firmen (processed before artikel) completed...
    expect(tables["dv_firmen"]?.has("f1")).toBe(true);
    // ...and kontakte (processed after the failing artikel job) still ran too.
    expect(tables["dv_kontakte"]?.has("k1")).toBe(true);

    const artikelSummary = result.entities.find((e) => e.slug === "artikel");
    expect(artikelSummary).toBeUndefined(); // failed entity has no summary
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("artikel");
    expect(result.errors[0]).toContain("transient network error");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const fetchAllDataverseRecordsMock = vi.fn();
const fetchAllDataverseRecordsForIdsMock = vi.fn();
vi.mock("@/lib/sync/dataverse-client", () => ({
  fetchAllDataverseRecords: (entitySet: string, select: string[], filter?: string) =>
    fetchAllDataverseRecordsMock(entitySet, select, filter),
  fetchAllDataverseRecordsForIds: (entitySet: string, select: string[], filterColumn: string, ids: string[]) =>
    fetchAllDataverseRecordsForIdsMock(entitySet, select, filterColumn, ids),
}));

// In-memory fake of the Supabase tables exercised below, keyed by table name.
// Rows are plain objects (id + whatever foreign keys a test needs, e.g.
// standort_id/firma_id/geraet_id for PROJ-12's Firma-scoping tests).
const tables: Record<string, Map<string, Record<string, unknown>>> = {};

function resetTable(name: string, rows: Record<string, unknown>[]) {
  tables[name] = new Map(rows.map((r) => [r.id as string, { deleted_at: null, ...r }]));
}

vi.mock("@/lib/sync/batch", () => ({
  fetchAllIds: async (
    table: string,
    onlyWhereNull?: string,
    whereIn?: { column: string; values: string[] }
  ) => {
    if (whereIn && whereIn.values.length === 0) return [];
    let rows = [...(tables[table]?.values() ?? [])];
    if (onlyWhereNull) rows = rows.filter((r) => r[onlyWhereNull] == null);
    if (whereIn) rows = rows.filter((r) => whereIn.values.includes(r[whereIn.column] as string));
    return rows.map((r) => r.id as string);
  },
  batchUpsert: async (table: string, records: Record<string, unknown>[]) => {
    if (!tables[table]) tables[table] = new Map();
    for (const record of records) {
      const existing = tables[table].get(record.id as string);
      tables[table].set(record.id as string, { deleted_at: existing?.deleted_at ?? null, ...record });
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

import { runDataverseSync, FirmaNotFoundError } from "./run-sync";

beforeEach(() => {
  fetchAllDataverseRecordsMock.mockReset();
  fetchAllDataverseRecordsForIdsMock.mockReset();
  fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);
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

// PROJ-12: firma-scoped sync. Geräte/Prüfberichte/Kontakte have no direct
// Firma reference in Dataverse, so these tests exercise the chained
// resolution (Standort→Gerät→Prüfbericht, Relation→Kontakt) and — most
// importantly — that a sync scoped to one Firma never touches another
// Firma's data.
describe("runDataverseSync with firmaId (PROJ-12)", () => {
  it("throws FirmaNotFoundError and touches no table when the firmaId doesn't exist in Dataverse", async () => {
    fetchAllDataverseRecordsMock.mockResolvedValue([]); // nothing found for any entity set, including firmen

    await expect(runDataverseSync("missing-firma")).rejects.toBeInstanceOf(FirmaNotFoundError);
    expect(tables["dv_firmen"]?.size ?? 0).toBe(0);
  });

  it("upserts only the matched Firma, leaving other Firmen completely untouched", async () => {
    resetTable("dv_firmen", [{ id: "f1" }, { id: "f2" }]);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas" && filter?.includes("f1")) return [{ bmvcc_firmaid: "f1", bmvcc_name: "Firma A" }];
      return [];
    });

    const result = await runDataverseSync("f1");

    expect(tables["dv_firmen"].has("f1")).toBe(true);
    expect(tables["dv_firmen"].has("f2")).toBe(true); // untouched — the critical safety requirement
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary).toEqual({ slug: "firmen", fetched: 1, added: 0, updated: 1, deleted: 0, skippedDueToThreshold: false });
  });

  it("chains Standort → Gerät → Prüfbericht and Relation → Kontakt ids through the run, Artikel staying unscoped", async () => {
    resetTable("dv_artikel", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes("f1") ? [{ bmvcc_firmaid: "f1" }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes("f1") ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: "f1" }] : [];
      }
      if (entitySet === "bmvcc_relations") {
        return filter?.includes("f1")
          ? [{ bmvcc_relationid: "r1", _bmvcc_firma_value: "f1", _bmvcc_person_value: "k1" }]
          : [];
      }
      if (entitySet === "bmvcc_artikels") return [{ bmvcc_artikelid: "a1" }];
      return [];
    });
    fetchAllDataverseRecordsForIdsMock.mockImplementation(
      async (entitySet: string, _select: string[], _filterColumn: string, ids: string[]) => {
        if (entitySet === "bmvcc_equipmentrecords" && ids.includes("s1")) {
          return [{ bmvcc_equipmentrecordid: "g1", _bmvcc_standort_value: "s1" }];
        }
        if (entitySet === "bmvcc_pruefberichts" && ids.includes("g1")) {
          return [{ bmvcc_pruefberichtid: "pb1", _bmvcc_gearaet_value: "g1" }];
        }
        if (entitySet === "bmvcc_kontakts" && ids.includes("k1")) {
          return [{ bmvcc_kontaktid: "k1", statecode: 0 }];
        }
        return [];
      }
    );

    const result = await runDataverseSync("f1");

    expect(tables["dv_standorte"]?.has("s1")).toBe(true);
    expect(tables["dv_geraete"]?.has("g1")).toBe(true);
    expect(tables["dv_pruefberichte"]?.has("pb1")).toBe(true);
    expect(tables["dv_relationen"]?.has("r1")).toBe(true);
    expect(tables["dv_kontakte"]?.has("k1")).toBe(true);
    expect(tables["dv_artikel"]?.has("a1")).toBe(true); // always full, unscoped

    expect(fetchAllDataverseRecordsForIdsMock).toHaveBeenCalledWith(
      "bmvcc_equipmentrecords",
      expect.any(Array),
      "_bmvcc_standort_value",
      ["s1"]
    );
    expect(fetchAllDataverseRecordsForIdsMock).toHaveBeenCalledWith(
      "bmvcc_pruefberichts",
      expect.any(Array),
      "_bmvcc_gearaet_value",
      ["g1"]
    );
    expect(fetchAllDataverseRecordsForIdsMock).toHaveBeenCalledWith(
      "bmvcc_kontakts",
      expect.any(Array),
      "bmvcc_kontaktid",
      ["k1"]
    );
    expect(result.errors).toEqual([]);
  });

  it("never touches a Gerät belonging to a different Firma's Standort", async () => {
    resetTable("dv_standorte", [{ id: "s-other", firma_id: "other-firma" }]);
    resetTable("dv_geraete", [{ id: "g-other", standort_id: "s-other" }]);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes("f1") ? [{ bmvcc_firmaid: "f1" }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes("f1") ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: "f1" }] : [];
      }
      return [];
    });
    // Firma f1's Standort s1 has no Geräte at all in Dataverse for this test.
    fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);

    await runDataverseSync("f1");

    expect(tables["dv_geraete"].has("g-other")).toBe(true);
    expect(tables["dv_geraete"].get("g-other")?.deleted_at ?? null).toBeNull();
  });

  it("deletes a Gerät that disappeared from Dataverse within this Firma's scope", async () => {
    resetTable(
      "dv_geraete",
      // 10 existing rows at Standort s1, only 1 missing (10%) — safely under the 20% threshold.
      Array.from({ length: 10 }, (_, i) => ({ id: `g-${i}`, standort_id: "s1" }))
    );
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes("f1") ? [{ bmvcc_firmaid: "f1" }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes("f1") ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: "f1" }] : [];
      }
      return [];
    });
    fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string) => {
      if (entitySet === "bmvcc_equipmentrecords") {
        // g-0 no longer comes back, g-1..g-9 still do.
        return Array.from({ length: 9 }, (_, i) => ({
          bmvcc_equipmentrecordid: `g-${i + 1}`,
          _bmvcc_standort_value: "s1",
        }));
      }
      return [];
    });

    await runDataverseSync("f1");

    expect(tables["dv_geraete"].has("g-0")).toBe(false);
    expect(tables["dv_geraete"].has("g-1")).toBe(true);
  });

  it("isolates a failure in one chained entity so an independent entity (Artikel) still syncs", async () => {
    resetTable("dv_artikel", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes("f1") ? [{ bmvcc_firmaid: "f1" }] : [];
      if (entitySet === "bmvcc_organizationlocations") throw new Error("Standorte-Abruf fehlgeschlagen");
      if (entitySet === "bmvcc_artikels") return [{ bmvcc_artikelid: "a1" }];
      return [];
    });

    const result = await runDataverseSync("f1");

    expect(tables["dv_artikel"]?.has("a1")).toBe(true);
    expect(result.errors.some((e) => e.includes("standorte"))).toBe(true);
    // Downstream of the failed step (Geräte depend on Standort ids) simply
    // sees an empty id set rather than also throwing.
    expect(result.errors.some((e) => e.includes("geraete"))).toBe(false);
  });
});

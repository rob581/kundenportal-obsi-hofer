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

import {
  runDataverseSync,
  FirmaNotFoundError,
  InvalidFirmaIdError,
  InvalidStandortIdError,
  StandortNotFoundError,
} from "./run-sync";

beforeEach(() => {
  fetchAllDataverseRecordsMock.mockReset();
  fetchAllDataverseRecordsForIdsMock.mockReset();
  fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);
  for (const key of Object.keys(tables)) delete tables[key];
});

// PROJ-12: firma-scoped sync. Geräte/Prüfberichte/Kontakte have no direct
// Firma reference in Dataverse, so these tests exercise the chained
// resolution (Standort→Gerät→Prüfbericht, Relation→Kontakt) and — most
// importantly — that a sync scoped to one Firma never touches another
// Firma's data.
describe("runDataverseSync with firmaId (PROJ-12)", () => {
  const FIRMA_ID = "11111111-1111-1111-1111-111111111111";
  const OTHER_FIRMA_ID = "22222222-2222-2222-2222-222222222222";
  const UNKNOWN_FIRMA_ID = "99999999-9999-9999-9999-999999999999";

  // QA BUG-1 fix: firmaId must be a well-formed GUID before it's ever used
  // in a Dataverse $filter — otherwise a crafted value like "<guid> or 1 eq
  // 1" would make every scoping filter match every Firma, defeating the
  // whole point of this feature (and the 404 guard below it).
  describe("firmaId validation (QA BUG-1/BUG-2)", () => {
    it("rejects a non-GUID firmaId without making any Dataverse/Supabase call", async () => {
      await expect(runDataverseSync("1 eq 1 or 1 eq 1")).rejects.toBeInstanceOf(InvalidFirmaIdError);
      expect(fetchAllDataverseRecordsMock).not.toHaveBeenCalled();
    });

    it("rejects an empty firmaId instead of silently falling back to a full sync", async () => {
      await expect(runDataverseSync("")).rejects.toBeInstanceOf(InvalidFirmaIdError);
      expect(fetchAllDataverseRecordsMock).not.toHaveBeenCalled();
    });

  });

  it("throws FirmaNotFoundError and touches no table when the firmaId doesn't exist in Dataverse", async () => {
    fetchAllDataverseRecordsMock.mockResolvedValue([]); // nothing found for any entity set, including firmen

    await expect(runDataverseSync(UNKNOWN_FIRMA_ID)).rejects.toBeInstanceOf(FirmaNotFoundError);
    expect(tables["dv_firmen"]?.size ?? 0).toBe(0);
  });

  it("upserts only the matched Firma, leaving other Firmen completely untouched", async () => {
    resetTable("dv_firmen", [{ id: FIRMA_ID }, { id: OTHER_FIRMA_ID }]);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas" && filter?.includes(FIRMA_ID)) {
        return [{ bmvcc_firmaid: FIRMA_ID, bmvcc_name: "Firma A" }];
      }
      return [];
    });

    const result = await runDataverseSync(FIRMA_ID);

    expect(tables["dv_firmen"].has(FIRMA_ID)).toBe(true);
    expect(tables["dv_firmen"].has(OTHER_FIRMA_ID)).toBe(true); // untouched — the critical safety requirement
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary).toEqual({ slug: "firmen", fetched: 1, added: 0, updated: 1, deleted: 0, skippedDueToThreshold: false });
  });

  it("chains Standort → Gerät → Prüfbericht and Relation → Kontakt ids through the run, Artikel staying unscoped", async () => {
    resetTable("dv_artikel", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
          : [];
      }
      if (entitySet === "bmvcc_relations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_relationid: "r1", _bmvcc_firma_value: FIRMA_ID, _bmvcc_person_value: "k1" }]
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

    const result = await runDataverseSync(FIRMA_ID);

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
    resetTable("dv_standorte", [{ id: "s-other", firma_id: OTHER_FIRMA_ID }]);
    resetTable("dv_geraete", [{ id: "g-other", standort_id: "s-other" }]);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
          : [];
      }
      return [];
    });
    // Firma FIRMA_ID's Standort s1 has no Geräte at all in Dataverse for this test.
    fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);

    await runDataverseSync(FIRMA_ID);

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
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
          : [];
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

    await runDataverseSync(FIRMA_ID);

    expect(tables["dv_geraete"].has("g-0")).toBe(false);
    expect(tables["dv_geraete"].has("g-1")).toBe(true);
  });

  it("isolates a failure in one chained entity so an independent entity (Artikel) still syncs", async () => {
    resetTable("dv_artikel", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") throw new Error("Standorte-Abruf fehlgeschlagen");
      if (entitySet === "bmvcc_artikels") return [{ bmvcc_artikelid: "a1" }];
      return [];
    });

    const result = await runDataverseSync(FIRMA_ID);

    expect(tables["dv_artikel"]?.has("a1")).toBe(true);
    expect(result.errors.some((e) => e.includes("standorte"))).toBe(true);
    // Downstream of the failed step (Geräte depend on Standort ids) simply
    // sees an empty id set rather than also throwing.
    expect(result.errors.some((e) => e.includes("geraete"))).toBe(false);
  });

  it("adds the Firma when it isn't in Supabase yet", async () => {
    resetTable("dv_firmen", []);
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) =>
      entitySet === "bmvcc_firmas" && filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID, bmvcc_name: "Firma A" }] : []
    );

    const result = await runDataverseSync(FIRMA_ID);

    expect(tables["dv_firmen"].has(FIRMA_ID)).toBe(true);
    const firmenSummary = result.entities.find((e) => e.slug === "firmen");
    expect(firmenSummary).toMatchObject({ fetched: 1, added: 1, updated: 0 });
  });

  it("soft-deletes a Prüfbericht that disappeared within this Firma's scope instead of removing it", async () => {
    // 10 existing rows on Gerät g1, only 1 missing (10%) — safely under the 20% threshold.
    resetTable(
      "dv_pruefberichte",
      Array.from({ length: 10 }, (_, i) => ({ id: `pb-${i}`, geraet_id: "g1" }))
    );
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
          : [];
      }
      return [];
    });
    fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string) => {
      if (entitySet === "bmvcc_equipmentrecords") return [{ bmvcc_equipmentrecordid: "g1", _bmvcc_standort_value: "s1" }];
      if (entitySet === "bmvcc_pruefberichts") {
        // pb-0 no longer comes back, pb-1..pb-9 still do.
        return Array.from({ length: 9 }, (_, i) => ({ bmvcc_pruefberichtid: `pb-${i + 1}`, _bmvcc_gearaet_value: "g1" }));
      }
      return [];
    });

    await runDataverseSync(FIRMA_ID);

    const row = tables["dv_pruefberichte"].get("pb-0");
    expect(row).toBeDefined();
    expect(row?.deleted_at).not.toBeNull();
  });

  it("skips deletion and warns when more than 20% of this Firma's rows go missing at once", async () => {
    // 20 known rows: above the PROJ-16 minimum of 10, so the 20% rule applies.
    resetTable(
      "dv_geraete",
      Array.from({ length: 20 }, (_, i) => ({ id: `g-${i}`, standort_id: "s1" }))
    );
    fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
      if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
      if (entitySet === "bmvcc_organizationlocations") {
        return filter?.includes(FIRMA_ID)
          ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
          : [];
      }
      return [];
    });
    fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string) =>
      // Only 10 of 20 come back — 50% missing, well above the 20% threshold.
      entitySet === "bmvcc_equipmentrecords"
        ? Array.from({ length: 10 }, (_, i) => ({ bmvcc_equipmentrecordid: `g-${i}`, _bmvcc_standort_value: "s1" }))
        : []
    );

    const result = await runDataverseSync(FIRMA_ID);

    expect(tables["dv_geraete"].size).toBe(20); // nothing deleted
    const geraeteSummary = result.entities.find((e) => e.slug === "geraete");
    expect(geraeteSummary?.skippedDueToThreshold).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });

  // PROJ-15: Portal-Zugang pro Standort.
  describe("Portalzugänge (PROJ-15)", () => {
    function mockFirmaMitStandort() {
      fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
        if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
        if (entitySet === "bmvcc_organizationlocations") {
          return filter?.includes(FIRMA_ID)
            ? [{ bmvcc_organizationlocationid: "s1", _bmvcc_bexiofirma_value: FIRMA_ID }]
            : [];
        }
        return [];
      });
    }

    it("syncs the Zugänge of the Firma's Standorte and the Kontakte that only have a Zugang (no Relation)", async () => {
      mockFirmaMitStandort();
      fetchAllDataverseRecordsForIdsMock.mockImplementation(
        async (entitySet: string, _select: string[], filterColumn: string, ids: string[]) => {
          if (entitySet === "bmvcc_portalzugangs" && filterColumn === "_bmvcc_standort_value" && ids.includes("s1")) {
            return [{ bmvcc_portalzugangid: "pz1", _bmvcc_kontakt_value: "k-ohne-relation", _bmvcc_standort_value: "s1" }];
          }
          if (entitySet === "bmvcc_kontakts" && ids.includes("k-ohne-relation")) {
            return [{ bmvcc_kontaktid: "k-ohne-relation", statecode: 0 }];
          }
          return [];
        }
      );

      const result = await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"]?.get("pz1")).toMatchObject({ kontakt_id: "k-ohne-relation", standort_id: "s1" });
      expect(tables["dv_kontakte"]?.has("k-ohne-relation")).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("removes a revoked Zugang even when that is far above the 20% threshold (1 of 2)", async () => {
      resetTable("dv_portalzugaenge", [
        { id: "pz1", kontakt_id: "k1", standort_id: "s1" },
        { id: "pz2", kontakt_id: "k2", standort_id: "s1" },
      ]);
      mockFirmaMitStandort();
      fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string) =>
        entitySet === "bmvcc_portalzugangs"
          ? [{ bmvcc_portalzugangid: "pz1", _bmvcc_kontakt_value: "k1", _bmvcc_standort_value: "s1" }]
          : []
      );

      const result = await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"].has("pz2")).toBe(false);
      expect(tables["dv_portalzugaenge"].has("pz1")).toBe(true);
      const summary = result.entities.find((e) => e.slug === "portalzugaenge");
      expect(summary).toMatchObject({ deleted: 1, skippedDueToThreshold: false });
      expect(result.warnings).toEqual([]);
    });

    it("removes the last remaining Zugang of the Firma (100% missing)", async () => {
      resetTable("dv_portalzugaenge", [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }]);
      mockFirmaMitStandort();
      fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);

      await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"].size).toBe(0);
    });

    it("keeps an orphaned Zugang (no Kontakt) without failing the sync", async () => {
      mockFirmaMitStandort();
      fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string) =>
        entitySet === "bmvcc_portalzugangs"
          ? [{ bmvcc_portalzugangid: "pz-verwaist", _bmvcc_kontakt_value: null, _bmvcc_standort_value: "s1" }]
          : []
      );

      const result = await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"]?.get("pz-verwaist")?.kontakt_id).toBeNull();
      expect(result.errors).toEqual([]);
    });

    it("never touches Zugänge of another Firma's Standorte", async () => {
      resetTable("dv_portalzugaenge", [{ id: "pz-fremd", kontakt_id: "k9", standort_id: "s-fremd" }]);
      mockFirmaMitStandort();
      fetchAllDataverseRecordsForIdsMock.mockResolvedValue([]);

      await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"].has("pz-fremd")).toBe(true);
    });

    // QA BUG-2: Standort in Dataverse gelöscht, seine Löschung im Portal von
    // der 20-%-Schwelle gebremst — der Zugang darf trotzdem nicht bleiben.
    it("removes the Zugänge of a Standort that vanished from Dataverse, even if the Standort row is kept by the threshold", async () => {
      // 12 known Standorte (above the PROJ-16 minimum of 10); s10–s12 were
      // deleted in Dataverse: 3 of 12 = 25% > threshold → Standort rows stay.
      resetTable(
        "dv_standorte",
        Array.from({ length: 12 }, (_, i) => ({ id: `s${i + 1}`, firma_id: FIRMA_ID }))
      );
      resetTable("dv_portalzugaenge", [
        { id: "pz1", kontakt_id: "k1", standort_id: "s1" },
        { id: "pz3", kontakt_id: "k1", standort_id: "s10" },
      ]);
      fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
        if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
        if (entitySet === "bmvcc_organizationlocations") {
          return Array.from({ length: 9 }, (_, i) => ({
            bmvcc_organizationlocationid: `s${i + 1}`,
            _bmvcc_bexiofirma_value: FIRMA_ID,
          }));
        }
        return [];
      });
      fetchAllDataverseRecordsForIdsMock.mockImplementation(async (entitySet: string, _select: string[], _col: string, ids: string[]) =>
        entitySet === "bmvcc_portalzugangs" && ids.includes("s1")
          ? [{ bmvcc_portalzugangid: "pz1", _bmvcc_kontakt_value: "k1", _bmvcc_standort_value: "s1" }]
          : []
      );

      const result = await runDataverseSync(FIRMA_ID);

      expect(tables["dv_standorte"].has("s10")).toBe(true); // kept by the threshold (pre-existing PROJ-1 behaviour)
      expect(result.entities.find((e) => e.slug === "standorte")?.skippedDueToThreshold).toBe(true);
      expect(tables["dv_portalzugaenge"].has("pz3")).toBe(false); // but the Zugang is gone
      expect(tables["dv_portalzugaenge"].has("pz1")).toBe(true);
    });

    it("deletes no Zugang when the Standorte step fails (empty id list)", async () => {
      resetTable("dv_portalzugaenge", [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }]);
      fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
        if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
        if (entitySet === "bmvcc_organizationlocations") throw new Error("Standorte-Abruf fehlgeschlagen");
        return [];
      });

      const result = await runDataverseSync(FIRMA_ID);

      expect(tables["dv_portalzugaenge"].has("pz1")).toBe(true);
      expect(result.errors.some((e) => e.includes("standorte"))).toBe(true);
    });
  });

  // PROJ-16: Sync pro Standort.
  describe("Standort-Lauf (PROJ-16)", () => {
    const STANDORT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const STANDORT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

    // Dataverse knows Standort A and B of FIRMA_ID; a Standort filter with an
    // id only matches that one Standort (and only if it belongs to FIRMA_ID).
    function mockDataverse(geraeteA: string[], zugaengeA: { id: string; kontakt: string }[]) {
      fetchAllDataverseRecordsMock.mockImplementation(async (entitySet: string, _select: string[], filter?: string) => {
        if (entitySet === "bmvcc_firmas") return filter?.includes(FIRMA_ID) ? [{ bmvcc_firmaid: FIRMA_ID }] : [];
        if (entitySet === "bmvcc_organizationlocations") {
          const alle = [
            { bmvcc_organizationlocationid: STANDORT_A, _bmvcc_bexiofirma_value: FIRMA_ID },
            { bmvcc_organizationlocationid: STANDORT_B, _bmvcc_bexiofirma_value: FIRMA_ID },
          ];
          if (!filter?.includes(FIRMA_ID)) return [];
          const idMatch = filter.match(/bmvcc_organizationlocationid eq ([0-9a-f-]+)/);
          return idMatch ? alle.filter((s) => s.bmvcc_organizationlocationid === idMatch[1]) : alle;
        }
        if (entitySet === "bmvcc_artikels") return [{ bmvcc_artikelid: "a1" }];
        return [];
      });
      fetchAllDataverseRecordsForIdsMock.mockImplementation(
        async (entitySet: string, _select: string[], _col: string, ids: string[]) => {
          if (entitySet === "bmvcc_equipmentrecords" && ids.includes(STANDORT_A)) {
            return geraeteA.map((id) => ({ bmvcc_equipmentrecordid: id, _bmvcc_standort_value: STANDORT_A }));
          }
          if (entitySet === "bmvcc_portalzugangs" && ids.includes(STANDORT_A)) {
            return zugaengeA.map((z) => ({ bmvcc_portalzugangid: z.id, _bmvcc_kontakt_value: z.kontakt, _bmvcc_standort_value: STANDORT_A }));
          }
          if (entitySet === "bmvcc_kontakts") return ids.map((id) => ({ bmvcc_kontaktid: id, statecode: 0 }));
          return [];
        }
      );
    }

    function seedPortal() {
      resetTable("dv_standorte", [
        { id: STANDORT_A, firma_id: FIRMA_ID },
        { id: STANDORT_B, firma_id: FIRMA_ID },
      ]);
      resetTable("dv_geraete", [
        { id: "gA1", standort_id: STANDORT_A },
        { id: "gA2", standort_id: STANDORT_A },
        { id: "gB1", standort_id: STANDORT_B },
      ]);
      resetTable("dv_portalzugaenge", [
        { id: "pzA", kontakt_id: "k1", standort_id: STANDORT_A },
        { id: "pzB", kontakt_id: "k1", standort_id: STANDORT_B },
      ]);
      resetTable("dv_relationen", [{ id: "r1", firma_id: FIRMA_ID, kontakt_id: "k-rel" }]);
    }

    it("syncs only Standort A: deletes a vanished Gerät of A, leaves Standort B untouched", async () => {
      seedPortal();
      mockDataverse(["gA1"], [{ id: "pzA", kontakt: "k1" }]);

      const result = await runDataverseSync(FIRMA_ID, STANDORT_A);

      expect(tables["dv_geraete"].has("gA1")).toBe(true);
      expect(tables["dv_geraete"].has("gA2")).toBe(false); // 1 of 2 = 50%, deleted thanks to the minimum
      expect(tables["dv_geraete"].has("gB1")).toBe(true); // B untouched, although Dataverse returned nothing for B
      expect(tables["dv_standorte"].has(STANDORT_B)).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("removes a revoked Zugang to A but keeps the same Kontakt's Zugang to B", async () => {
      seedPortal();
      mockDataverse(["gA1", "gA2"], []);

      await runDataverseSync(FIRMA_ID, STANDORT_A);

      expect(tables["dv_portalzugaenge"].has("pzA")).toBe(false);
      expect(tables["dv_portalzugaenge"].has("pzB")).toBe(true);
    });

    it("syncs the Kontakte with a Zugang to A, and leaves the Relationen alone", async () => {
      seedPortal();
      mockDataverse(["gA1", "gA2"], [{ id: "pzA", kontakt: "k-neu" }]);

      await runDataverseSync(FIRMA_ID, STANDORT_A);

      expect(tables["dv_kontakte"]?.has("k-neu")).toBe(true);
      expect(tables["dv_relationen"].has("r1")).toBe(true);
      expect(fetchAllDataverseRecordsMock.mock.calls.some(([entitySet]) => entitySet === "bmvcc_relations")).toBe(false);
    });

    it("reports scope with the Standort and fetched: 1 for standorte", async () => {
      seedPortal();
      mockDataverse(["gA1", "gA2"], []);

      const result = await runDataverseSync(FIRMA_ID, STANDORT_A);

      expect(result.scope).toEqual({ firmaId: FIRMA_ID, standortId: STANDORT_A });
      expect(result.entities.find((e) => e.slug === "standorte")?.fetched).toBe(1);
      expect(result.entities.some((e) => e.slug === "relationen")).toBe(false);
      expect(tables["dv_artikel"]?.has("a1")).toBe(true); // Artikel as before
    });

    it("reports standortId null for a Firma run (behaviour unchanged)", async () => {
      seedPortal();
      mockDataverse(["gA1", "gA2"], []);

      const result = await runDataverseSync(FIRMA_ID);

      expect(result.scope).toEqual({ firmaId: FIRMA_ID, standortId: null });
      expect(result.entities.find((e) => e.slug === "standorte")?.fetched).toBe(2);
    });

    it("rejects a non-GUID or empty standortId before any Dataverse call", async () => {
      await expect(runDataverseSync(FIRMA_ID, "1 eq 1 or 1 eq 1")).rejects.toBeInstanceOf(InvalidStandortIdError);
      await expect(runDataverseSync(FIRMA_ID, "")).rejects.toBeInstanceOf(InvalidStandortIdError);
      expect(fetchAllDataverseRecordsMock).not.toHaveBeenCalled();
    });

    it("rejects a Standort of another Firma (or unknown) with StandortNotFoundError and writes nothing", async () => {
      seedPortal();
      resetTable("dv_firmen", []);
      mockDataverse(["gA1"], []);
      const FREMD = "cccccccc-cccc-cccc-cccc-cccccccccccc";

      await expect(runDataverseSync(FIRMA_ID, FREMD)).rejects.toBeInstanceOf(StandortNotFoundError);
      expect(tables["dv_firmen"].size).toBe(0); // not even the Firma was written
      expect(tables["dv_geraete"].size).toBe(3);
      expect(fetchAllDataverseRecordsForIdsMock).not.toHaveBeenCalled();
    });

    it("moves a Standort to its new Firma when run for the new Firma (Firmenwechsel)", async () => {
      resetTable("dv_standorte", [{ id: STANDORT_A, firma_id: "alte-firma" }]);
      mockDataverse([], []);

      await runDataverseSync(FIRMA_ID, STANDORT_A);

      expect(tables["dv_standorte"].get(STANDORT_A)?.firma_id).toBe(FIRMA_ID);
    });
  });
});


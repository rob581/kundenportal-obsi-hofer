import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal fluent query-builder mock: each chained method just records the
// call and returns `this`, until a terminal method (`.maybeSingle()` or
// simply being awaited) resolves with pre-configured table data.
type Row = Record<string, unknown>;
const tableData: Record<string, Row[]> = {};

function makeQuery(table: string) {
  let rows = tableData[table] ?? [];

  const builder = {
    select: () => builder,
    ilike: (column: string, value: string) => {
      rows = rows.filter((r) => String(r[column]).toLowerCase() === value.toLowerCase());
      return builder;
    },
    eq: (column: string, value: unknown) => {
      rows = rows.filter((r) => r[column] === value);
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      rows = rows.filter((r) => values.includes(r[column]));
      return builder;
    },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    // Supabase query builders are thenable — awaiting without a terminal
    // call (e.g. plain .eq()) resolves with the full row list.
    then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: rows, error: null }),
  };

  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => makeQuery(table) }),
}));

import { getPortalAccess, getFirmenNamen } from "./access";

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
});

describe("getPortalAccess", () => {
  it("returns access for an active Kontakt with linked Firmen", async () => {
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_relationen = [
      { kontakt_id: "k1", firma_id: "f1" },
      { kontakt_id: "k1", firma_id: "f2" },
    ];

    const access = await getPortalAccess("test@example.com");

    expect(access).toEqual({ contactId: "k1", firmaIds: ["f1", "f2"] });
  });

  it("matches email case-insensitively", async () => {
    tableData.dv_kontakte = [{ id: "k1", email: "Test@Example.com", ist_aktiv: true }];
    tableData.dv_relationen = [{ kontakt_id: "k1", firma_id: "f1" }];

    const access = await getPortalAccess("test@example.com");

    expect(access?.contactId).toBe("k1");
  });

  it("returns null for an unknown email", async () => {
    tableData.dv_kontakte = [];

    const access = await getPortalAccess("nobody@example.com");

    expect(access).toBeNull();
  });

  it("returns null for an inactive Kontakt", async () => {
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: false }];

    const access = await getPortalAccess("test@example.com");

    expect(access).toBeNull();
  });

  it("returns null for an active Kontakt with no linked Firma", async () => {
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_relationen = [];

    const access = await getPortalAccess("test@example.com");

    expect(access).toBeNull();
  });
});

describe("getFirmenNamen", () => {
  it("returns names for the requested ids only", async () => {
    tableData.dv_firmen = [
      { id: "f1", name: "Firma A" },
      { id: "f2", name: "Firma B" },
      { id: "f3", name: "Firma C" },
    ];

    const result = await getFirmenNamen(["f1", "f3"]);

    expect(result).toEqual([
      { id: "f1", name: "Firma A" },
      { id: "f3", name: "Firma C" },
    ]);
  });

  it("returns an empty array for an empty id list without querying", async () => {
    const result = await getFirmenNamen([]);
    expect(result).toEqual([]);
  });
});

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
    // Like real PostgREST: more than one row is an error (PGRST116), not "take the first".
    maybeSingle: async () =>
      rows.length > 1
        ? { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } }
        : { data: rows[0] ?? null, error: null },
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
  // PROJ-15: Zugang = aktiver Kontakt mit Portalzugang zu einem Standort,
  // der einer Firma gehört. Firmen = Firmen dieser Standorte.
  function seedStandorte() {
    tableData.dv_standorte = [
      { id: "s1", firma_id: "f1" },
      { id: "s2", firma_id: "f1" },
      { id: "s3", firma_id: "f2" },
    ];
  }

  it("returns the Firmen and Standorte of an active Kontakt's Zugänge", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }];

    const access = await getPortalAccess("test@example.com");

    expect(access).toEqual({ contactId: "k1", firmaIds: ["f1"], standortIds: ["s1"] });
  });

  it("matches email case-insensitively", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "Test@Example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }];

    const access = await getPortalAccess("test@example.com");

    expect(access?.contactId).toBe("k1");
  });

  it("returns null for an unknown email", async () => {
    tableData.dv_kontakte = [];

    expect(await getPortalAccess("nobody@example.com")).toBeNull();
  });

  it("returns null for an inactive Kontakt even with a Zugang", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: false }];
    tableData.dv_portalzugaenge = [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }];

    expect(await getPortalAccess("test@example.com")).toBeNull();
  });

  it("returns null for an active Kontakt without any Zugang (last Zugang revoked)", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [];
    // A Bexio relation alone no longer grants access.
    tableData.dv_relationen = [{ kontakt_id: "k1", firma_id: "f1" }];

    expect(await getPortalAccess("test@example.com")).toBeNull();
  });

  it("ignores the old PROJ-13 checkbox: a Zugang grants access even if ist_portal_freigegeben is false", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true, ist_portal_freigegeben: false }];
    tableData.dv_portalzugaenge = [{ id: "pz1", kontakt_id: "k1", standort_id: "s1" }];

    expect(await getPortalAccess("test@example.com")).not.toBeNull();
  });

  it("shows only the Standorte with Zugang, not all Standorte of the Firma", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [{ id: "pz1", kontakt_id: "k1", standort_id: "s2" }];

    const access = await getPortalAccess("test@example.com");

    expect(access).toEqual({ contactId: "k1", firmaIds: ["f1"], standortIds: ["s2"] });
  });

  it("lists every Firma the Kontakt has a Zugang for, with exactly those Standorte", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [
      { id: "pz1", kontakt_id: "k1", standort_id: "s1" },
      { id: "pz2", kontakt_id: "k1", standort_id: "s3" },
    ];

    const access = await getPortalAccess("test@example.com");

    expect(access?.firmaIds.sort()).toEqual(["f1", "f2"]);
    expect(access?.standortIds).toEqual(["s1", "s3"]);
  });

  it("ignores a Zugang to a Standort that is unknown or belongs to no Firma (fail-closed)", async () => {
    tableData.dv_standorte = [{ id: "s-ohne-firma", firma_id: null }];
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [
      { id: "pz1", kontakt_id: "k1", standort_id: "s-ohne-firma" },
      { id: "pz2", kontakt_id: "k1", standort_id: "s-unbekannt" },
    ];

    expect(await getPortalAccess("test@example.com")).toBeNull();
  });

  it("never lets an orphaned Zugang (no Kontakt) grant access", async () => {
    seedStandorte();
    tableData.dv_kontakte = [{ id: "k1", email: "test@example.com", ist_aktiv: true }];
    tableData.dv_portalzugaenge = [{ id: "pz-verwaist", kontakt_id: null, standort_id: "s1" }];

    expect(await getPortalAccess("test@example.com")).toBeNull();
  });

  // QA BUG-1 (PROJ-13): Bexio-Dubletten — dieselbe E-Mail bei mehreren Kontakten.
  it("combines the Zugänge of all active Kontakte sharing one e-mail address", async () => {
    seedStandorte();
    tableData.dv_kontakte = [
      { id: "k2", email: "test@example.com", ist_aktiv: true },
      { id: "k1", email: "test@example.com", ist_aktiv: true },
    ];
    tableData.dv_portalzugaenge = [
      { id: "pz1", kontakt_id: "k1", standort_id: "s1" },
      { id: "pz2", kontakt_id: "k2", standort_id: "s3" },
    ];

    const access = await getPortalAccess("test@example.com");

    expect(access?.contactId).toBe("k1");
    expect(access?.firmaIds.sort()).toEqual(["f1", "f2"]);
    expect(access?.standortIds).toEqual(["s1", "s3"]);
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

import { describe, it, expect, vi, beforeEach } from "vitest";

// Fluent query-builder mock extending the pattern from src/lib/auth/access.test.ts
// with the operators queries.ts actually chains: in, ilike, or, order, range,
// and a select(..., { count: "exact" }) that reports the pre-range row count.
type Row = Record<string, unknown>;
const tableData: Record<string, Row[]> = {};

function makeQuery(table: string) {
  let rows = [...(tableData[table] ?? [])];
  let countRequested = false;
  let total: number | null = null;

  const builder = {
    select: (_cols?: string, opts?: { count?: string }) => {
      if (opts?.count) countRequested = true;
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
    ilike: (column: string, value: string) => {
      const needle = value.replace(/^%|%$/g, "").toLowerCase();
      const wildcard = value.includes("%");
      rows = rows.filter((r) => {
        const v = String(r[column] ?? "").toLowerCase();
        return wildcard ? v.includes(needle) : v === needle;
      });
      return builder;
    },
    // Extended (PROJ-7) beyond plain ilike to also understand is.null/lt,
    // needed for the "zuPruefen" filter's .or("letzte_pruefung.is.null,letzte_pruefung.lt.<cutoff>").
    or: (expr: string) => {
      const conditions = expr.split(",").map((clause) => {
        const [column, op, ...rest] = clause.split(".");
        return { column, op, raw: rest.join(".") };
      });
      rows = rows.filter((r) =>
        conditions.some((c) => {
          const value = r[c.column];
          if (c.op === "is") return c.raw === "null" ? value == null : value != null;
          if (c.op === "lt") return value != null && String(value) < c.raw;
          const needle = c.raw.replace(/^%|%$/g, "").toLowerCase();
          return String(value ?? "").toLowerCase().includes(needle);
        })
      );
      return builder;
    },
    order: (column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => {
      const ascending = opts?.ascending ?? true;
      const nullsFirst = opts?.nullsFirst ?? false;
      rows = [...rows].sort((a, b) => {
        const av = a[column] as string | null;
        const bv = b[column] as string | null;
        if (av == null && bv == null) return 0;
        if (av == null) return nullsFirst ? -1 : 1;
        if (bv == null) return nullsFirst ? 1 : -1;
        return ascending ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
      return builder;
    },
    range: (start: number, end: number) => {
      total = rows.length;
      rows = rows.slice(start, end + 1);
      return builder;
    },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: { data: Row[]; error: null; count: number | null }) => void) =>
      resolve({ data: rows, error: null, count: countRequested ? total ?? rows.length : null }),
  };

  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => makeQuery(table) }),
}));

import { getGeraeteList, getGeraetById } from "./queries";

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
});

const STANDORT_A = "st-a";
const STANDORT_B = "st-b";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seedZweiFirmen() {
  tableData.dv_standorte = [
    { id: STANDORT_A, name: "Hauptlager Zürich", firma_id: "f1" },
    { id: STANDORT_B, name: "Lager Basel", firma_id: "f2" },
  ];
  tableData.dv_geraete = [
    {
      id: "g1",
      name: "Feuerlöscher Halle A",
      seriennummer: "FL-0041",
      barcode: "4012345000041",
      status: "Freigabe",
      letzte_pruefung: "2026-08-12",
      ablegereife: null,
      herstelljahr: "2019-01-01",
      standort_id: STANDORT_A,
      artikel_id: "a1",
      lagerort: "Regal 3",
      pruefer: null,
      zubehoer: null,
      bemerkungen: null,
      kunden_id: "KD-2026-001",
    },
    {
      id: "g2",
      name: "Rauchmelder EG",
      seriennummer: "RM-1187",
      barcode: null,
      status: "keine Freigabe",
      letzte_pruefung: "2026-03-04",
      ablegereife: null,
      herstelljahr: null,
      standort_id: STANDORT_A,
      artikel_id: null,
      lagerort: "Flur EG",
      pruefer: null,
      zubehoer: null,
      bemerkungen: null,
      kunden_id: null,
    },
    {
      id: "g3",
      name: "Absturzsicherung Kran",
      seriennummer: "AS-0512",
      barcode: null,
      status: "Letzte Freigabe",
      letzte_pruefung: null,
      ablegereife: null,
      herstelljahr: null,
      standort_id: STANDORT_A,
      artikel_id: null,
      lagerort: null,
      pruefer: null,
      zubehoer: null,
      bemerkungen: null,
      kunden_id: null,
    },
    {
      id: "g4",
      name: "Gerät anderer Firma",
      seriennummer: "XX-0001",
      barcode: null,
      status: "letzte freigabe",
      letzte_pruefung: "2026-01-01",
      ablegereife: null,
      herstelljahr: null,
      standort_id: STANDORT_B,
      artikel_id: null,
      lagerort: null,
      pruefer: null,
      zubehoer: null,
      bemerkungen: null,
      kunden_id: null,
    },
  ];
  tableData.dv_artikel = [{ id: "a1", bezeichnung: "Feuerlöscher 6kg ABC", hersteller: "GLORIA", norm: "EN 3" }];
}

describe("getGeraeteList", () => {
  it("returns only devices whose Standort belongs to the requested Firma", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", {});

    expect(result.items.map((g) => g.id).sort()).toEqual(["g1", "g2", "g3"]);
    expect(result.total).toBe(3);
  });

  it("returns an empty result for a Firma with no Standorte", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f-unknown", {});

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 25, statusOptions: [] });
  });

  it("deduplicates status options case-insensitively across the whole Firma", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", {});

    expect(result.statusOptions.map((s) => s.toLowerCase())).toEqual(
      ["freigabe", "keine freigabe", "letzte freigabe"].sort()
    );
    expect(result.statusOptions.length).toBe(3);
  });

  it("filters by status case-insensitively", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", { status: "freigabe" });

    expect(result.items.map((g) => g.id)).toEqual(["g1"]);
  });

  it("filters by search term across Seriennummer, Barcode and Lagerort", async () => {
    seedZweiFirmen();

    const bySeriennummer = await getGeraeteList("f1", { suche: "RM-1187" });
    expect(bySeriennummer.items.map((g) => g.id)).toEqual(["g2"]);

    const byBarcode = await getGeraeteList("f1", { suche: "4012345000041" });
    expect(byBarcode.items.map((g) => g.id)).toEqual(["g1"]);

    const byLagerort = await getGeraeteList("f1", { suche: "Flur EG" });
    expect(byLagerort.items.map((g) => g.id)).toEqual(["g2"]);
  });

  it("no longer matches on Gerätename (AC: Suche ersetzt durch Seriennummer/Barcode/Lagerort)", async () => {
    seedZweiFirmen();

    const byName = await getGeraeteList("f1", { suche: "Absturzsicherung" });
    expect(byName.items).toEqual([]);
  });

  it("sorts by letzte_pruefung descending with never-inspected devices first", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", {});

    expect(result.items.map((g) => g.id)).toEqual(["g3", "g1", "g2"]);
  });

  it("combines status filter and search term with AND (AC: beide Kriterien kombiniert)", async () => {
    seedZweiFirmen();

    // g2's Lagerort matches the search term, but its Status doesn't match
    // "Freigabe" — only a device matching BOTH may be returned.
    const result = await getGeraeteList("f1", { status: "Freigabe", suche: "Flur EG" });

    expect(result.items).toEqual([]);

    const matchesBoth = await getGeraeteList("f1", { status: "Freigabe", suche: "4012345000041" });
    expect(matchesBoth.items.map((g) => g.id)).toEqual(["g1"]);
  });

  it("paginates at 25 items per page across a larger result set", async () => {
    tableData.dv_standorte = [{ id: STANDORT_A, name: "Hauptlager Zürich", firma_id: "f1" }];
    tableData.dv_geraete = Array.from({ length: 30 }, (_, i) => ({
      id: `bulk-${i}`,
      name: `Gerät ${i}`,
      seriennummer: `SN-${i}`,
      barcode: null,
      status: "Freigabe",
      letzte_pruefung: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      ablegereife: null,
      herstelljahr: null,
      standort_id: STANDORT_A,
      artikel_id: null,
      lagerort: null,
      pruefer: null,
      zubehoer: null,
      bemerkungen: null,
      kunden_id: null,
    }));

    const page1 = await getGeraeteList("f1", { seite: 1 });
    expect(page1.items.length).toBe(25);
    expect(page1.total).toBe(30);
    expect(page1.pageSize).toBe(25);
    expect(page1.page).toBe(1);

    const page2 = await getGeraeteList("f1", { seite: 2 });
    expect(page2.items.length).toBe(5);
    expect(page2.total).toBe(30);

    const combinedIds = new Set([...page1.items, ...page2.items].map((g) => g.id));
    expect(combinedIds.size).toBe(30);
  });

  it("populates Artikel fields in the list too (Gerät-Spalte zeigt Artikel-Info, PROJ-3-Refinement)", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", {});
    const g1 = result.items.find((g) => g.id === "g1");
    const g2 = result.items.find((g) => g.id === "g2");

    expect(g1?.artikelBezeichnung).toBe("Feuerlöscher 6kg ABC");
    expect(g1?.artikelHersteller).toBe("GLORIA");
    expect(g1?.artikelNorm).toBe("EN 3");
    // g2 has no artikel_id at all — no Lookup should be attempted, fields stay null.
    expect(g2?.artikelBezeichnung).toBeNull();
  });

  it("maps kunden_id to kundenId (PROJ-7 Zusatzspalte)", async () => {
    seedZweiFirmen();

    const result = await getGeraeteList("f1", {});

    expect(result.items.find((g) => g.id === "g1")?.kundenId).toBe("KD-2026-001");
    expect(result.items.find((g) => g.id === "g2")?.kundenId).toBeNull();
  });

  it("filters by zuPruefen: never inspected or inspected over 360 days ago (matches the Dashboard-Kennzahl)", async () => {
    tableData.dv_standorte = [{ id: STANDORT_A, name: "Hauptlager Zürich", firma_id: "f1" }];
    tableData.dv_geraete = [
      {
        id: "recent",
        name: "Aktuell geprüft",
        seriennummer: "R-1",
        barcode: null,
        status: "Freigabe",
        letzte_pruefung: daysAgo(10),
        ablegereife: null,
        herstelljahr: null,
        standort_id: STANDORT_A,
        artikel_id: null,
        lagerort: null,
        pruefer: null,
        zubehoer: null,
        bemerkungen: null,
        kunden_id: null,
      },
      {
        id: "overdue",
        name: "Überfällig",
        seriennummer: "O-1",
        barcode: null,
        status: "Freigabe",
        letzte_pruefung: daysAgo(400),
        ablegereife: null,
        herstelljahr: null,
        standort_id: STANDORT_A,
        artikel_id: null,
        lagerort: null,
        pruefer: null,
        zubehoer: null,
        bemerkungen: null,
        kunden_id: null,
      },
      {
        id: "never",
        name: "Nie geprüft",
        seriennummer: "N-1",
        barcode: null,
        status: "Freigabe",
        letzte_pruefung: null,
        ablegereife: null,
        herstelljahr: null,
        standort_id: STANDORT_A,
        artikel_id: null,
        lagerort: null,
        pruefer: null,
        zubehoer: null,
        bemerkungen: null,
        kunden_id: null,
      },
    ];

    const result = await getGeraeteList("f1", { zuPruefen: true });

    expect(result.items.map((g) => g.id).sort()).toEqual(["never", "overdue"]);
  });
});

describe("getGeraetById", () => {
  it("returns full details including Artikel for a device owned by the Firma", async () => {
    seedZweiFirmen();

    const geraet = await getGeraetById("g1", "f1");

    expect(geraet).toMatchObject({
      id: "g1",
      standortName: "Hauptlager Zürich",
      artikelBezeichnung: "Feuerlöscher 6kg ABC",
      herstelljahr: "2019",
      kundenId: "KD-2026-001",
    });
  });

  it("returns null for a device belonging to a different Firma (no data leak via id guessing)", async () => {
    seedZweiFirmen();

    const geraet = await getGeraetById("g4", "f1");

    expect(geraet).toBeNull();
  });

  it("returns null for an unknown id", async () => {
    seedZweiFirmen();

    const geraet = await getGeraetById("does-not-exist", "f1");

    expect(geraet).toBeNull();
  });

  it("returns null for a device with no Standort at all", async () => {
    tableData.dv_geraete = [
      {
        id: "g5",
        name: "Verwaistes Gerät",
        seriennummer: null,
        barcode: null,
        status: null,
        letzte_pruefung: null,
        ablegereife: null,
        herstelljahr: null,
        standort_id: null,
        artikel_id: null,
        lagerort: null,
        pruefer: null,
        zubehoer: null,
        bemerkungen: null,
        kunden_id: null,
      },
    ];

    const geraet = await getGeraetById("g5", "f1");

    expect(geraet).toBeNull();
  });
});

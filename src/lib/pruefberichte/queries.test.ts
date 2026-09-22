import { describe, it, expect, vi, beforeEach } from "vitest";

// Same fluent query-builder mock pattern as src/lib/geraete/queries.test.ts.
type Row = Record<string, unknown>;
const tableData: Record<string, Row[]> = {};

function makeQuery(table: string) {
  let rows = [...(tableData[table] ?? [])];

  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      rows = rows.filter((r) => r[column] === value);
      return builder;
    },
    is: (column: string, value: null) => {
      rows = rows.filter((r) => r[column] === value);
      return builder;
    },
    in: (column: string, values: unknown[]) => {
      rows = rows.filter((r) => values.includes(r[column]));
      return builder;
    },
    gte: (column: string, value: string) => {
      rows = rows.filter((r) => typeof r[column] === "string" && (r[column] as string) >= value);
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
    then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: rows, error: null }),
  };

  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => makeQuery(table) }),
}));

import { getPruefberichteFuerGeraet, getPruefberichteFuerFirma } from "./queries";

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
});

describe("getPruefberichteFuerGeraet", () => {
  it("returns only reports for the requested Gerät", async () => {
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: "2026-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "pb2", geraet_id: "g2", pruefdatum: "2026-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerGeraet("g1");

    expect(result.map((p) => p.id)).toEqual(["pb1"]);
  });

  it("excludes soft-deleted reports", async () => {
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: "2026-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "pb2", geraet_id: "g1", pruefdatum: "2026-02-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: "2026-03-01T00:00:00Z" },
    ];

    const result = await getPruefberichteFuerGeraet("g1");

    expect(result.map((p) => p.id)).toEqual(["pb1"]);
  });

  it("includes archived reports (shown normally, not filtered)", async () => {
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: "2026-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, ist_archiviert: true, deleted_at: null },
    ];

    const result = await getPruefberichteFuerGeraet("g1");

    expect(result.map((p) => p.id)).toEqual(["pb1"]);
  });

  it("sorts by Prüfdatum descending, with reports missing a date sorted last", async () => {
    tableData.dv_pruefberichte = [
      { id: "alt", geraet_id: "g1", pruefdatum: "2024-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "kein-datum", geraet_id: "g1", pruefdatum: null, ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "neu", geraet_id: "g1", pruefdatum: "2026-01-01", ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerGeraet("g1");

    expect(result.map((p) => p.id)).toEqual(["neu", "alt", "kein-datum"]);
  });

  it("passes through Bemerkungen and Prüfer fields", async () => {
    tableData.dv_pruefberichte = [
      {
        id: "pb1",
        geraet_id: "g1",
        pruefdatum: "2026-01-01",
        ergebnis: "Freigabe",
        bemerkungen: "Alles in Ordnung.",
        pruefer: "M. Keller",
        deleted_at: null,
      },
    ];

    const result = await getPruefberichteFuerGeraet("g1");

    expect(result[0]).toMatchObject({
      bemerkungen: "Alles in Ordnung.",
      pruefer: "M. Keller",
    });
  });

  it("returns an empty array for a Gerät with no reports", async () => {
    tableData.dv_pruefberichte = [];

    const result = await getPruefberichteFuerGeraet("g-unknown");

    expect(result).toEqual([]);
  });
});

const STANDORT_A = "st-a";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seedFirmaMitGeraeten() {
  tableData.dv_standorte = [{ id: STANDORT_A, name: "Hauptlager", firma_id: "f1" }];
  tableData.dv_geraete = [
    { id: "g1", name: null, artikel_id: "a1", standort_id: STANDORT_A },
    { id: "g2", name: "Rauchmelder Typ X", artikel_id: null, standort_id: STANDORT_A },
    { id: "g-fremd", name: "Fremdes Gerät", artikel_id: null, standort_id: "st-fremd" },
  ];
  tableData.dv_artikel = [
    { id: "a1", bezeichnung: "Feuerlöscher 6kg ABC", hersteller: null, norm: null, artikeltyp: null, dimension: null },
  ];
}

describe("getPruefberichteFuerFirma", () => {
  it("returns an empty result for a Firma with no Standorte", async () => {
    tableData.dv_standorte = [];

    const result = await getPruefberichteFuerFirma("f-unknown", {});

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it("returns an empty result for a Firma with Standorte but no Geräte", async () => {
    tableData.dv_standorte = [{ id: STANDORT_A, name: "Hauptlager", firma_id: "f1" }];
    tableData.dv_geraete = [];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
  });

  it("only includes Prüfberichte of Geräte belonging to the Firma (Firma-Isolation)", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: daysAgo(10), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "pb-fremd", geraet_id: "g-fremd", pruefdatum: daysAgo(5), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result.items.map((i) => i.id)).toEqual(["pb1"]);
  });

  it("excludes soft-deleted reports", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: daysAgo(1), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "pb2", geraet_id: "g1", pruefdatum: daysAgo(2), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: "2026-01-01T00:00:00Z" },
    ];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result.items.map((i) => i.id)).toEqual(["pb1"]);
  });

  it("sorts by Prüfdatum descending across multiple Geräte, undated reports last", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "alt", geraet_id: "g1", pruefdatum: daysAgo(100), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "kein-datum", geraet_id: "g2", pruefdatum: null, ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "neu", geraet_id: "g2", pruefdatum: daysAgo(1), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result.items.map((i) => i.id)).toEqual(["neu", "alt", "kein-datum"]);
  });

  it("filters by Zeitraum (z.B. '30' = letzte 30 Tage)", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "aktuell", geraet_id: "g1", pruefdatum: daysAgo(10), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "alt", geraet_id: "g1", pruefdatum: daysAgo(400), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerFirma("f1", { zeitraum: "30" });

    expect(result.items.map((i) => i.id)).toEqual(["aktuell"]);
  });

  it("'alle' (Standard) liefert alle Prüfberichte unabhängig vom Datum", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "aktuell", geraet_id: "g1", pruefdatum: daysAgo(10), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "alt", geraet_id: "g1", pruefdatum: daysAgo(400), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerFirma("f1", { zeitraum: "alle" });

    expect(result.items.map((i) => i.id).sort()).toEqual(["alt", "aktuell"].sort());
  });

  it("paginiert im Speicher: Seite 1 hat 25, Seite 2 den Rest", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = Array.from({ length: 30 }, (_, i) => ({
      id: `pb${i}`,
      geraet_id: "g1",
      pruefdatum: daysAgo(i),
      ergebnis: "Freigabe",
      bemerkungen: null,
      pruefer: null,
      deleted_at: null,
    }));

    const page1 = await getPruefberichteFuerFirma("f1", { seite: 1 });
    expect(page1.items.length).toBe(25);
    expect(page1.total).toBe(30);

    const page2 = await getPruefberichteFuerFirma("f1", { seite: 2 });
    expect(page2.items.length).toBe(5);
  });

  it("reichert jede Zeile mit dem Artikel-Info-Label des zugehörigen Geräts an", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      { id: "pb1", geraet_id: "g1", pruefdatum: daysAgo(1), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
      { id: "pb2", geraet_id: "g2", pruefdatum: daysAgo(2), ergebnis: "Freigabe", bemerkungen: null, pruefer: null, deleted_at: null },
    ];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result.items.find((i) => i.id === "pb1")?.geraetLabel).toBe("Feuerlöscher 6kg ABC");
    expect(result.items.find((i) => i.id === "pb2")?.geraetLabel).toBe("Rauchmelder Typ X");
    expect(result.items.find((i) => i.id === "pb1")?.geraetId).toBe("g1");
  });

  it("gibt Bemerkungen und Prüfer unverändert weiter", async () => {
    seedFirmaMitGeraeten();
    tableData.dv_pruefberichte = [
      {
        id: "pb1",
        geraet_id: "g1",
        pruefdatum: daysAgo(1),
        ergebnis: "Freigabe",
        bemerkungen: "Alles ok",
        pruefer: "M. Keller",
        deleted_at: null,
      },
    ];

    const result = await getPruefberichteFuerFirma("f1", {});

    expect(result.items[0]).toMatchObject({ bemerkungen: "Alles ok", pruefer: "M. Keller" });
  });
});

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

import { getPruefberichteFuerGeraet } from "./queries";

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

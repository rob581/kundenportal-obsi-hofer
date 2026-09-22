import { describe, it, expect, vi, beforeEach } from "vitest";

// Same fluent query-builder mock pattern as src/lib/geraete/queries.test.ts,
// extended with a head-only count query (used for the Prüfberichte total).
type Row = Record<string, unknown>;
const tableData: Record<string, Row[]> = {};

function makeQuery(table: string) {
  let rows = [...(tableData[table] ?? [])];
  let countRequested = false;
  let head = false;

  const builder = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) countRequested = true;
      if (opts?.head) head = true;
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
    is: (column: string, value: null) => {
      rows = rows.filter((r) => (r[column] ?? null) === value);
      return builder;
    },
    then: (resolve: (v: { data: Row[] | null; error: null; count: number | null }) => void) =>
      resolve({ data: head ? null : rows, error: null, count: countRequested ? rows.length : null }),
  };

  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => makeQuery(table) }),
}));

import { getDashboardKennzahlen } from "./queries";

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
});

const STANDORT_A = "st-a";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function seedFirma(geraete: Row[], pruefberichte: Row[] = []) {
  tableData.dv_standorte = [{ id: STANDORT_A, firma_id: "f1" }];
  tableData.dv_geraete = geraete;
  tableData.dv_pruefberichte = pruefberichte;
}

describe("getDashboardKennzahlen", () => {
  it("returns all-zero Kennzahlen for a Firma with no Standorte", async () => {
    tableData.dv_standorte = [];
    tableData.dv_geraete = [];
    tableData.dv_pruefberichte = [];

    const result = await getDashboardKennzahlen("f-unknown");

    expect(result).toEqual({
      totalGeraete: 0,
      statusFreigabe: 0,
      statusKeineFreigabe: 0,
      statusLetzteFreigabe: 0,
      statusKeinStatus: 0,
      totalPruefberichte: 0,
      letztePruefung: null,
      zuPruefen: 0,
    });
  });

  it("returns all-zero Kennzahlen for a Firma with Standorte but no Geräte", async () => {
    seedFirma([]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.totalGeraete).toBe(0);
    expect(result.letztePruefung).toBeNull();
  });

  it("counts Geräte per Status, case-insensitively", async () => {
    seedFirma([
      { id: "g1", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: "2026-01-01" },
      { id: "g2", standort_id: STANDORT_A, status: "freigabe", letzte_pruefung: "2026-02-01" },
      { id: "g3", standort_id: STANDORT_A, status: "keine Freigabe", letzte_pruefung: null },
      { id: "g4", standort_id: STANDORT_A, status: "Letzte Freigabe", letzte_pruefung: null },
      { id: "g5", standort_id: STANDORT_A, status: "letzte freigabe", letzte_pruefung: null },
      { id: "g6", standort_id: STANDORT_A, status: null, letzte_pruefung: null },
    ]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.totalGeraete).toBe(6);
    expect(result.statusFreigabe).toBe(2);
    expect(result.statusKeineFreigabe).toBe(1);
    expect(result.statusLetzteFreigabe).toBe(2);
    expect(result.statusKeinStatus).toBe(1);
  });

  it("computes letzte Prüfung as the max date across all Geräte, ignoring nulls", async () => {
    seedFirma([
      { id: "g1", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: "2025-06-01" },
      { id: "g2", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: "2026-08-12" },
      { id: "g3", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: null },
    ]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.letztePruefung).toBe("2026-08-12");
  });

  it("returns null for letzte Prüfung when no Gerät was ever inspected", async () => {
    seedFirma([
      { id: "g1", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: null },
      { id: "g2", standort_id: STANDORT_A, status: "keine Freigabe", letzte_pruefung: null },
    ]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.letztePruefung).toBeNull();
  });

  it("counts only non-soft-deleted Prüfberichte belonging to the Firma's Geräte", async () => {
    seedFirma(
      [
        { id: "g1", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: "2026-01-01" },
        { id: "g2", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: "2026-01-01" },
      ],
      [
        { id: "pb1", geraet_id: "g1", deleted_at: null },
        { id: "pb2", geraet_id: "g1", deleted_at: null },
        { id: "pb3", geraet_id: "g2", deleted_at: null },
        { id: "pb4", geraet_id: "g2", deleted_at: "2026-02-01T00:00:00Z" },
        { id: "pb5", geraet_id: "g-fremd", deleted_at: null },
      ]
    );

    const result = await getDashboardKennzahlen("f1");

    expect(result.totalPruefberichte).toBe(3);
  });

  it("counts Prüfberichte correctly across chunked queries for a Firma with many Geräte", async () => {
    // Regression test for a live bug: .in("geraet_id", ...) with hundreds of
    // IDs in one request made the underlying fetch() fail outright. 250
    // Geräte forces the 200-per-chunk batching to actually kick in.
    const geraete = Array.from({ length: 250 }, (_, i) => ({
      id: `g${i}`,
      standort_id: STANDORT_A,
      status: "Freigabe",
      letzte_pruefung: "2026-01-01",
    }));
    const pruefberichte = geraete.map((g, i) => ({ id: `pb${i}`, geraet_id: g.id, deleted_at: null }));

    seedFirma(geraete, pruefberichte);

    const result = await getDashboardKennzahlen("f1");

    expect(result.totalGeraete).toBe(250);
    expect(result.totalPruefberichte).toBe(250);
  });

  it("counts a Gerät as 'zu prüfen' when never inspected or inspected over 360 days ago", async () => {
    seedFirma([
      { id: "recent", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: daysAgo(10) },
      { id: "overdue", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: daysAgo(400) },
      { id: "never", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: null },
    ]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.zuPruefen).toBe(2);
  });

  it("does not count a Gerät inspected exactly 360 days ago as 'zu prüfen' yet", async () => {
    seedFirma([
      { id: "boundary", standort_id: STANDORT_A, status: "Freigabe", letzte_pruefung: daysAgo(360) },
    ]);

    const result = await getDashboardKennzahlen("f1");

    expect(result.zuPruefen).toBe(0);
  });
});

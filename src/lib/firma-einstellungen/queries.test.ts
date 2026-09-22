import { describe, it, expect, vi, beforeEach } from "vitest";

// Same fluent query-builder mock pattern as src/lib/geraete/queries.test.ts,
// reduced to the operators queries.ts actually chains: eq + maybeSingle.
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
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
  };

  return builder;
}

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => makeQuery(table) }),
}));

import { getFirmaEinstellungen } from "./queries";

beforeEach(() => {
  for (const key of Object.keys(tableData)) delete tableData[key];
});

describe("getFirmaEinstellungen", () => {
  it("returns configured Zusatzspalten for a Firma with an entry", async () => {
    tableData.portal_firma_einstellungen = [{ firma_id: "f1", zusatzspalten: ["seriennummer", "kundenId"] }];

    const result = await getFirmaEinstellungen("f1");

    expect(result.zusatzspalten).toEqual(["seriennummer", "kundenId"]);
  });

  it("returns an empty list for a Firma without a configuration entry (default, no error)", async () => {
    tableData.portal_firma_einstellungen = [{ firma_id: "f-andere", zusatzspalten: ["barcode"] }];

    const result = await getFirmaEinstellungen("f1");

    expect(result.zusatzspalten).toEqual([]);
  });
});

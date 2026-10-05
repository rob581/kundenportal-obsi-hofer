import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };
vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => supabaseMock }));

import { fetchAllIds } from "./batch";

// Minimal chainable query-builder fake: records every call made on it so a
// test can assert which filters were applied, and resolves to `rows` when
// awaited (mirroring how the real Supabase client's builder is thenable).
function fakeQuery(rows: { id: string }[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "range", "is", "in"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }
  builder.then = (resolve: (value: { data: { id: string }[]; error: null }) => void) =>
    resolve({ data: rows, error: null });
  return { builder, calls };
}

beforeEach(() => {
  supabaseMock.from.mockReset();
});

describe("fetchAllIds", () => {
  it("returns ids without any extra filter by default", async () => {
    const { builder, calls } = fakeQuery([{ id: "a" }, { id: "b" }]);
    supabaseMock.from.mockReturnValue(builder);

    const result = await fetchAllIds("dv_firmen");

    expect(result).toEqual(["a", "b"]);
    expect(calls.some((c) => c.method === "in")).toBe(false);
  });

  it("applies the onlyWhereNull filter when given", async () => {
    const { builder, calls } = fakeQuery([]);
    supabaseMock.from.mockReturnValue(builder);

    await fetchAllIds("dv_pruefberichte", "deleted_at");

    expect(calls).toContainEqual({ method: "is", args: ["deleted_at", null] });
  });

  it("applies a whereIn filter when given (PROJ-12 Firma-scoping)", async () => {
    const { builder, calls } = fakeQuery([{ id: "g1" }]);
    supabaseMock.from.mockReturnValue(builder);

    const result = await fetchAllIds("dv_geraete", undefined, { column: "standort_id", values: ["s1", "s2"] });

    expect(result).toEqual(["g1"]);
    expect(calls).toContainEqual({ method: "in", args: ["standort_id", ["s1", "s2"]] });
  });

  it("returns an empty array without querying Supabase when whereIn.values is empty", async () => {
    const result = await fetchAllIds("dv_geraete", undefined, { column: "standort_id", values: [] });

    expect(result).toEqual([]);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("combines onlyWhereNull and whereIn", async () => {
    const { builder, calls } = fakeQuery([]);
    supabaseMock.from.mockReturnValue(builder);

    await fetchAllIds("dv_pruefberichte", "deleted_at", { column: "geraet_id", values: ["g1"] });

    expect(calls).toContainEqual({ method: "is", args: ["deleted_at", null] });
    expect(calls).toContainEqual({ method: "in", args: ["geraet_id", ["g1"]] });
  });
});

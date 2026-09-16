import { describe, it, expect, vi, beforeEach } from "vitest";

const upsertMock = vi.fn().mockResolvedValue({ error: null });
const deleteEqMock = vi.fn().mockResolvedValue({ error: null });
const updateEqMock = vi.fn().mockResolvedValue({ error: null });

const fromMock = vi.fn((table: string) => ({
  upsert: (record: unknown, opts: unknown) => upsertMock(table, record, opts),
  update: (patch: unknown) => ({ eq: (col: string, val: unknown) => updateEqMock(table, patch, col, val) }),
  delete: () => ({ eq: (col: string, val: unknown) => deleteEqMock(table, col, val) }),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import { POST, DELETE } from "./route";

function makeRequest(body: unknown, apiKey?: string) {
  return new Request("http://localhost/api/sync/geraete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey !== undefined ? { "x-api-key": apiKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

function paramsFor(entity: string) {
  return { params: Promise.resolve({ entity }) };
}

beforeEach(() => {
  process.env.SYNC_API_KEY = "test-secret";
  upsertMock.mockClear();
  deleteEqMock.mockClear();
  updateEqMock.mockClear();
  fromMock.mockClear();
});

describe("POST /api/sync/[entity]", () => {
  it("rejects requests without an API key", async () => {
    const res = await POST(makeRequest({ id: "1" }), paramsFor("geraete"));
    expect(res.status).toBe(401);
  });

  it("rejects requests with a wrong API key", async () => {
    const res = await POST(makeRequest({ id: "1" }, "wrong-key"), paramsFor("geraete"));
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown entity", async () => {
    const res = await POST(makeRequest({ id: "1" }, "test-secret"), paramsFor("unknown"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when the payload fails validation", async () => {
    const res = await POST(makeRequest({ name: "Gerät ohne ID" }, "test-secret"), paramsFor("geraete"));
    expect(res.status).toBe(400);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts a valid record into the mapped table", async () => {
    const res = await POST(
      makeRequest({ id: "abc-123", name: "Feuerlöscher 1" }, "test-secret"),
      paramsFor("geraete")
    );
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [table, record] = upsertMock.mock.calls[0];
    expect(table).toBe("dv_geraete");
    expect(record).toMatchObject({ id: "abc-123", name: "Feuerlöscher 1" });
  });
});

describe("DELETE /api/sync/[entity]", () => {
  it("rejects requests without an API key", async () => {
    const res = await DELETE(makeRequest({ id: "1" }), paramsFor("geraete"));
    expect(res.status).toBe(401);
  });

  it("hard-deletes a Gerät", async () => {
    const res = await DELETE(makeRequest({ id: "abc-123" }, "test-secret"), paramsFor("geraete"));
    expect(res.status).toBe(200);
    expect(deleteEqMock).toHaveBeenCalledWith("dv_geraete", "id", "abc-123");
    expect(updateEqMock).not.toHaveBeenCalled();
  });

  it("soft-deletes a Pruefbericht instead of removing it", async () => {
    const res = await DELETE(makeRequest({ id: "pb-1" }, "test-secret"), paramsFor("pruefberichte"));
    expect(res.status).toBe(200);
    expect(deleteEqMock).not.toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalledWith(
      "dv_pruefberichte",
      expect.objectContaining({ deleted_at: expect.any(String) }),
      "id",
      "pb-1"
    );
  });
});

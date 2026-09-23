import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getSupabaseAdminMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => getSupabaseAdminMock() }));

import { logExportEvent } from "./log-export";

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
  getSupabaseAdminMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("logExportEvent", () => {
  it("inserts a row with the given firma_id and entity", async () => {
    insertMock.mockResolvedValue({ error: null });

    await logExportEvent("f1", "geraete");

    expect(fromMock).toHaveBeenCalledWith("export_log");
    expect(insertMock).toHaveBeenCalledWith({ firma_id: "f1", entity: "geraete" });
  });

  it("never throws when Supabase returns an error (best-effort logging)", async () => {
    insertMock.mockResolvedValue({ error: { message: "table missing" } });

    await expect(logExportEvent("f1", "pruefberichte")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("never throws when the client itself throws (e.g. missing env vars)", async () => {
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables");
    });

    await expect(logExportEvent("f1", "geraete")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));
const getSupabaseAdminMock = vi.fn(() => ({ from: fromMock }));

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => getSupabaseAdminMock() }));

import { logLoginEvent } from "./log-login";

beforeEach(() => {
  insertMock.mockReset();
  fromMock.mockClear();
  getSupabaseAdminMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("logLoginEvent", () => {
  it("inserts one row per firmaId", async () => {
    insertMock.mockResolvedValue({ error: null });

    await logLoginEvent(["f1", "f2"]);

    expect(fromMock).toHaveBeenCalledWith("login_log");
    expect(insertMock).toHaveBeenCalledWith([{ firma_id: "f1" }, { firma_id: "f2" }]);
  });

  it("does nothing for an empty firmaIds array (no DB call)", async () => {
    await logLoginEvent([]);

    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("never throws when Supabase returns an error (best-effort logging)", async () => {
    insertMock.mockResolvedValue({ error: { message: "table missing" } });

    await expect(logLoginEvent(["f1"])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("never throws when the client itself throws", async () => {
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY environment variables");
    });

    await expect(logLoginEvent(["f1"])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

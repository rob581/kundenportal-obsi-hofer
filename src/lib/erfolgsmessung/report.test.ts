import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn(() => ({ select: selectMock }));
const getSupabaseAdminMock = vi.fn(() => ({ rpc: rpcMock, from: fromMock }));

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => getSupabaseAdminMock() }));

import { getLoginStatus, getExportsProMonat, buildErfolgsmessungReport } from "./report";

beforeEach(() => {
  rpcMock.mockReset();
  selectMock.mockReset();
  fromMock.mockClear();
});

describe("getLoginStatus", () => {
  it("maps snake_case RPC rows to camelCase", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { firma_id: "f1", firma_name: "Firma A", hat_login: true },
        { firma_id: "f2", firma_name: null, hat_login: false },
      ],
      error: null,
    });

    const result = await getLoginStatus();

    expect(rpcMock).toHaveBeenCalledWith("erfolgsmessung_login_status");
    expect(result).toEqual([
      { firmaId: "f1", firmaName: "Firma A", hatLogin: true },
      { firmaId: "f2", firmaName: "(ohne Namen)", hatLogin: false },
    ]);
  });

  it("throws with a descriptive message when the RPC call fails", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "function does not exist" } });

    await expect(getLoginStatus()).rejects.toThrow("Login-Status-Abfrage fehlgeschlagen");
  });
});

describe("getExportsProMonat", () => {
  it("groups export_log rows by month and entity", async () => {
    selectMock.mockResolvedValue({
      data: [
        { entity: "geraete", created_at: "2026-09-01T10:00:00Z" },
        { entity: "geraete", created_at: "2026-09-15T10:00:00Z" },
        { entity: "pruefberichte", created_at: "2026-09-02T10:00:00Z" },
        { entity: "geraete", created_at: "2026-08-20T10:00:00Z" },
      ],
      error: null,
    });

    const result = await getExportsProMonat();

    expect(fromMock).toHaveBeenCalledWith("export_log");
    expect(result).toEqual([
      { monat: "2026-09", entity: "geraete", anzahl: 2 },
      { monat: "2026-09", entity: "pruefberichte", anzahl: 1 },
      { monat: "2026-08", entity: "geraete", anzahl: 1 },
    ]);
  });

  it("returns an empty array when there are no exports yet", async () => {
    selectMock.mockResolvedValue({ data: [], error: null });

    const result = await getExportsProMonat();

    expect(result).toEqual([]);
  });

  it("throws with a descriptive message when the query fails", async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: "table missing" } });

    await expect(getExportsProMonat()).rejects.toThrow("Export-Log-Abfrage fehlgeschlagen");
  });
});

describe("buildErfolgsmessungReport", () => {
  it("lists Firmen by login status and the exports breakdown", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { firma_id: "f1", firma_name: "Firma A", hat_login: true },
        { firma_id: "f2", firma_name: "Firma B", hat_login: false },
      ],
      error: null,
    });
    selectMock.mockResolvedValue({
      data: [{ entity: "geraete", created_at: "2026-09-01T10:00:00Z" }],
      error: null,
    });

    const report = await buildErfolgsmessungReport();

    expect(report).toContain("1/2 Firmen (50%)");
    expect(report).toContain("Eingeloggt: Firma A");
    expect(report).toContain("Noch nicht eingeloggt: Firma B");
    expect(report).toContain("2026-09 – geraete: 1");
  });

  it("shows an explicit empty state instead of an empty list when there are no Kunden", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    selectMock.mockResolvedValue({ data: [], error: null });

    const report = await buildErfolgsmessungReport();

    expect(report).toContain("Keine Kunden mit Zugang.");
    expect(report).toContain("Bisher keine Exports.");
  });
});

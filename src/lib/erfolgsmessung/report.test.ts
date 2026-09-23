import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const loginLogSelectMock = vi.fn();
const exportLogSelectMock = vi.fn();
const fromMock = vi.fn((table: string) => {
  if (table === "login_log") return { select: loginLogSelectMock };
  if (table === "export_log") return { select: exportLogSelectMock };
  throw new Error(`Unerwartete Tabelle in Test: ${table}`);
});
const getSupabaseAdminMock = vi.fn(() => ({ rpc: rpcMock, from: fromMock }));

vi.mock("@/lib/supabase-admin", () => ({ getSupabaseAdmin: () => getSupabaseAdminMock() }));

const getFirmenNamenMock = vi.fn();
vi.mock("@/lib/auth/access", () => ({ getFirmenNamen: (ids: string[]) => getFirmenNamenMock(ids) }));

import {
  getLoginStatus,
  getLoginsProFirma,
  getExportsProMonat,
  getExportsProFirma,
  buildErfolgsmessungReport,
} from "./report";

beforeEach(() => {
  rpcMock.mockReset();
  loginLogSelectMock.mockReset();
  exportLogSelectMock.mockReset();
  fromMock.mockClear();
  getFirmenNamenMock.mockReset();
  // Sinnvoller Default für Tests, die login_log absichtlich leer lassen.
  getFirmenNamenMock.mockResolvedValue([]);
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

describe("getLoginsProFirma", () => {
  it("counts login_log rows per firma_id and resolves names", async () => {
    loginLogSelectMock.mockResolvedValue({
      data: [{ firma_id: "f1" }, { firma_id: "f1" }, { firma_id: "f2" }],
      error: null,
    });
    getFirmenNamenMock.mockResolvedValue([
      { id: "f1", name: "Firma A" },
      { id: "f2", name: "Firma B" },
    ]);

    const result = await getLoginsProFirma();

    expect(fromMock).toHaveBeenCalledWith("login_log");
    expect(result).toEqual([
      { firmaId: "f1", firmaName: "Firma A", anzahl: 2 },
      { firmaId: "f2", firmaName: "Firma B", anzahl: 1 },
    ]);
  });

  it("returns an empty array when there are no logins tracked yet", async () => {
    loginLogSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await getLoginsProFirma();

    expect(result).toEqual([]);
    expect(getFirmenNamenMock).toHaveBeenCalledWith([]);
  });

  it("falls back to a placeholder name when a firma has no resolvable name", async () => {
    loginLogSelectMock.mockResolvedValue({ data: [{ firma_id: "f1" }], error: null });
    getFirmenNamenMock.mockResolvedValue([]);

    const result = await getLoginsProFirma();

    expect(result).toEqual([{ firmaId: "f1", firmaName: "(ohne Namen)", anzahl: 1 }]);
  });

  it("throws with a descriptive message when the query fails", async () => {
    loginLogSelectMock.mockResolvedValue({ data: null, error: { message: "table missing" } });

    await expect(getLoginsProFirma()).rejects.toThrow("Login-Log-Abfrage fehlgeschlagen");
  });
});

describe("getExportsProMonat", () => {
  it("groups export_log rows by month and entity", async () => {
    exportLogSelectMock.mockResolvedValue({
      data: [
        { firma_id: "f1", entity: "geraete", created_at: "2026-09-01T10:00:00Z" },
        { firma_id: "f1", entity: "geraete", created_at: "2026-09-15T10:00:00Z" },
        { firma_id: "f2", entity: "pruefberichte", created_at: "2026-09-02T10:00:00Z" },
        { firma_id: "f1", entity: "geraete", created_at: "2026-08-20T10:00:00Z" },
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
    exportLogSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await getExportsProMonat();

    expect(result).toEqual([]);
  });

  it("throws with a descriptive message when the query fails", async () => {
    exportLogSelectMock.mockResolvedValue({ data: null, error: { message: "table missing" } });

    await expect(getExportsProMonat()).rejects.toThrow("Export-Log-Abfrage fehlgeschlagen");
  });
});

describe("getExportsProFirma", () => {
  it("counts export_log rows per firma_id and resolves names", async () => {
    exportLogSelectMock.mockResolvedValue({
      data: [
        { firma_id: "f1", entity: "geraete", created_at: "2026-09-01T10:00:00Z" },
        { firma_id: "f1", entity: "pruefberichte", created_at: "2026-09-02T10:00:00Z" },
        { firma_id: "f2", entity: "geraete", created_at: "2026-09-03T10:00:00Z" },
      ],
      error: null,
    });
    getFirmenNamenMock.mockResolvedValue([
      { id: "f1", name: "Firma A" },
      { id: "f2", name: "Firma B" },
    ]);

    const result = await getExportsProFirma();

    expect(result).toEqual([
      { firmaId: "f1", firmaName: "Firma A", anzahl: 2 },
      { firmaId: "f2", firmaName: "Firma B", anzahl: 1 },
    ]);
  });

  it("returns an empty array when there are no exports yet", async () => {
    exportLogSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await getExportsProFirma();

    expect(result).toEqual([]);
  });
});

describe("buildErfolgsmessungReport", () => {
  it("lists Firmen by login status, login counts, and the exports breakdown", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { firma_id: "f1", firma_name: "Firma A", hat_login: true },
        { firma_id: "f2", firma_name: "Firma B", hat_login: false },
      ],
      error: null,
    });
    loginLogSelectMock.mockResolvedValue({
      data: [{ firma_id: "f1" }, { firma_id: "f1" }],
      error: null,
    });
    getFirmenNamenMock.mockResolvedValue([
      { id: "f1", name: "Firma A" },
      { id: "f2", name: "Firma B" },
    ]);
    exportLogSelectMock.mockResolvedValue({
      data: [{ firma_id: "f2", entity: "geraete", created_at: "2026-09-01T10:00:00Z" }],
      error: null,
    });

    const report = await buildErfolgsmessungReport();

    expect(report).toContain("1/2 Firmen (50%)");
    expect(report).toContain("Eingeloggt: Firma A");
    expect(report).not.toContain("Noch nicht eingeloggt");
    expect(report).toContain("=== Logins pro Firma ===");
    expect(report).toContain("Firma A: 2");
    expect(report).toContain("2026-09 – geraete: 1");
    expect(report).toContain("=== CSV-Exports pro Firma ===");
    expect(report).toContain("Firma B: 1");
  });

  it("shows an explicit empty state instead of an empty list when there is no data yet", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    loginLogSelectMock.mockResolvedValue({ data: [], error: null });
    exportLogSelectMock.mockResolvedValue({ data: [], error: null });

    const report = await buildErfolgsmessungReport();

    expect(report).toContain("Keine Kunden mit Zugang.");
    expect(report).toContain("Noch keine erfassten Logins seit Einführung dieser Zählung.");
    // Beide Sektionen ("pro Monat" und "pro Firma") nutzen denselben Leer-Text.
    expect(report.match(/Bisher keine Exports\./g)).toHaveLength(2);
  });
});

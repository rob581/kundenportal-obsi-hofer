import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUserEmailMock = vi.fn();
const getPortalAccessMock = vi.fn();
const getCurrentFirmaIdMock = vi.fn();
const getPruefberichteExportRowsMock = vi.fn();
const logExportEventMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));
vi.mock("@/lib/auth/access", () => ({ getPortalAccess: (email: string) => getPortalAccessMock(email) }));
vi.mock("@/lib/auth/current-firma", () => ({ getCurrentFirmaId: () => getCurrentFirmaIdMock() }));
vi.mock("@/lib/pruefberichte/queries", () => ({
  getPruefberichteExportRows: (firmaId: string, filters: unknown) => getPruefberichteExportRowsMock(firmaId, filters),
}));
vi.mock("@/lib/export-log/log-export", () => ({
  logExportEvent: (firmaId: string, entity: string) => logExportEventMock(firmaId, entity),
}));

// Gleiches Test-Muster wie src/app/api/uebersicht/export/route.test.ts.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));

import { GET } from "./route";

function makeRequest(query = ""): Request {
  return new Request(`http://localhost/api/pruefberichte/export${query}`);
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  getPortalAccessMock.mockReset();
  getCurrentFirmaIdMock.mockReset();
  getPruefberichteExportRowsMock.mockReset();
  logExportEventMock.mockReset();
  redirectMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/pruefberichte/export", () => {
  it("redirects to /login when there is no session", async () => {
    getCurrentUserEmailMock.mockResolvedValue(null);

    await expect(GET(makeRequest())).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects to /kein-zugang when the email has no portal access", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue(null);

    await expect(GET(makeRequest())).rejects.toThrow("NEXT_REDIRECT:/kein-zugang");
  });

  it("returns a CSV download with the correct headers on success", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getPruefberichteExportRowsMock.mockResolvedValue([]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="pruefberichte-uebersicht-\d{4}-\d{2}-\d{2}\.csv"/
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("logs the export event (PROJ-11) on success", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getPruefberichteExportRowsMock.mockResolvedValue([]);

    await GET(makeRequest());

    expect(logExportEventMock).toHaveBeenCalledWith("f1", "pruefberichte");
  });

  it("passes the zeitraum query param through to getPruefberichteExportRows", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getPruefberichteExportRowsMock.mockResolvedValue([]);

    await GET(makeRequest("?zeitraum=30"));

    expect(getPruefberichteExportRowsMock).toHaveBeenCalledWith("f1", { zeitraum: "30" });
  });

  it("passes zeitraum as undefined when omitted (treated as 'alle' downstream)", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getPruefberichteExportRowsMock.mockResolvedValue([]);

    await GET(makeRequest());

    expect(getPruefberichteExportRowsMock).toHaveBeenCalledWith("f1", { zeitraum: undefined });
  });

  it("returns 500 without crashing when the export query fails", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getPruefberichteExportRowsMock.mockRejectedValue(new Error("DB unreachable"));

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
    expect(logExportEventMock).not.toHaveBeenCalled();
  });
});

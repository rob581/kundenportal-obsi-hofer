import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUserEmailMock = vi.fn();
const getPortalAccessMock = vi.fn();
const getCurrentFirmaIdMock = vi.fn();
const getGeraeteExportRowsMock = vi.fn();
const getFirmaEinstellungenMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({ getCurrentUserEmail: () => getCurrentUserEmailMock() }));
vi.mock("@/lib/auth/access", () => ({ getPortalAccess: (email: string) => getPortalAccessMock(email) }));
vi.mock("@/lib/auth/current-firma", () => ({ getCurrentFirmaId: () => getCurrentFirmaIdMock() }));
vi.mock("@/lib/geraete/queries", () => ({
  getGeraeteExportRows: (firmaId: string, filters: unknown) => getGeraeteExportRowsMock(firmaId, filters),
}));
vi.mock("@/lib/firma-einstellungen/queries", () => ({
  getFirmaEinstellungen: (firmaId: string) => getFirmaEinstellungenMock(firmaId),
}));

// Gleiches Test-Muster wie src/app/login/actions.test.ts: redirect() wird
// gemockt, um "NEXT_REDIRECT:<pfad>" zu werfen statt echt umzuleiten.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));

import { GET } from "./route";

function makeRequest(query = ""): Request {
  return new Request(`http://localhost/api/uebersicht/export${query}`);
}

beforeEach(() => {
  getCurrentUserEmailMock.mockReset();
  getPortalAccessMock.mockReset();
  getCurrentFirmaIdMock.mockReset();
  getGeraeteExportRowsMock.mockReset();
  getFirmaEinstellungenMock.mockReset();
  redirectMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/uebersicht/export", () => {
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
    getFirmaEinstellungenMock.mockResolvedValue({ zusatzspalten: [] });
    getGeraeteExportRowsMock.mockResolvedValue([]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(
      /attachment; filename="geraete-uebersicht-\d{4}-\d{2}-\d{2}\.csv"/
    );
    // .text() decodes via TextDecoder, which strips a leading BOM per spec —
    // check the raw bytes instead to actually verify the BOM is on the wire.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("passes status/suche/zuPruefen query params through to getGeraeteExportRows", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getFirmaEinstellungenMock.mockResolvedValue({ zusatzspalten: ["kundenId"] });
    getGeraeteExportRowsMock.mockResolvedValue([]);

    await GET(makeRequest("?status=Freigabe&suche=Test&zuPruefen=1"));

    expect(getGeraeteExportRowsMock).toHaveBeenCalledWith("f1", {
      status: "Freigabe",
      suche: "Test",
      zuPruefen: true,
      sucheKundenId: true,
    });
  });

  it("returns 500 without crashing when the export query fails", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getFirmaEinstellungenMock.mockResolvedValue({ zusatzspalten: [] });
    getGeraeteExportRowsMock.mockRejectedValue(new Error("DB unreachable"));

    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });

  it("still exports (without Zusatzspalten) when getFirmaEinstellungen fails (fail-open, wie /uebersicht)", async () => {
    getCurrentUserEmailMock.mockResolvedValue("test@example.com");
    getPortalAccessMock.mockResolvedValue({ contactId: "k1", firmaIds: ["f1"] });
    getCurrentFirmaIdMock.mockResolvedValue("f1");
    getFirmaEinstellungenMock.mockRejectedValue(new Error("table missing"));
    getGeraeteExportRowsMock.mockResolvedValue([]);

    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    expect(getGeraeteExportRowsMock).toHaveBeenCalledWith("f1", {
      status: undefined,
      suche: undefined,
      zuPruefen: false,
      sucheKundenId: false,
    });
  });
});

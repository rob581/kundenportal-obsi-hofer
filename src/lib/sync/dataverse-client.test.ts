import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const acquireTokenByClientCredential = vi.fn();

vi.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: vi.fn().mockImplementation(function ConfidentialClientApplicationMock() {
    return { acquireTokenByClientCredential };
  }),
}));

import { fetchAllDataverseRecords, fetchAllDataverseRecordsForIds } from "./dataverse-client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  acquireTokenByClientCredential.mockReset();
  acquireTokenByClientCredential.mockResolvedValue({
    accessToken: "token-1",
    expiresOn: new Date(Date.now() + 3600_000),
  });
  vi.stubEnv("DATAVERSE_URL", "https://obsi-hofer.crm4.dynamics.com/");
  vi.stubEnv("AZURE_TENANT_ID", "tenant-id");
  vi.stubEnv("AZURE_CLIENT_ID", "client-id");
  vi.stubEnv("AZURE_CLIENT_SECRET", "client-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fetchAllDataverseRecords", () => {
  it("builds the request without $filter when none is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAllDataverseRecords("bmvcc_firmas", ["bmvcc_firmaid"]);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("$filter");
  });

  it("appends an encoded $filter when given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAllDataverseRecords("bmvcc_firmas", ["bmvcc_firmaid"], "bmvcc_firmaid eq firma-1");

    const url = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(url).toContain("$filter=bmvcc_firmaid eq firma-1");
  });
});

describe("fetchAllDataverseRecordsForIds", () => {
  it("returns an empty array without calling Dataverse for an empty id list", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAllDataverseRecordsForIds("bmvcc_equipmentrecords", ["bmvcc_equipmentrecordid"], "_bmvcc_standort_value", []);

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("chunks more than 20 ids into separate requests and builds an OR-filter per chunk", async () => {
    // A fresh Response per call — a Response body can only be read once, and
    // this test expects two separate fetch calls (20 ids + 5 ids).
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ value: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const ids = Array.from({ length: 25 }, (_, i) => `standort-${i}`);

    await fetchAllDataverseRecordsForIds("bmvcc_equipmentrecords", ["bmvcc_equipmentrecordid"], "_bmvcc_standort_value", ids);

    expect(fetchMock).toHaveBeenCalledTimes(2); // 20 + 5
    const firstUrl = decodeURIComponent(fetchMock.mock.calls[0][0] as string);
    expect(firstUrl).toContain("_bmvcc_standort_value eq standort-0 or _bmvcc_standort_value eq standort-1");
  });

  it("merges results across chunks", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ value: [{ bmvcc_equipmentrecordid: "g1" }] }))
      .mockResolvedValueOnce(jsonResponse({ value: [{ bmvcc_equipmentrecordid: "g2" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const ids = Array.from({ length: 21 }, (_, i) => `standort-${i}`); // 2 chunks (20 + 1)

    const result = await fetchAllDataverseRecordsForIds(
      "bmvcc_equipmentrecords",
      ["bmvcc_equipmentrecordid"],
      "_bmvcc_standort_value",
      ids
    );

    expect(result).toEqual([{ bmvcc_equipmentrecordid: "g1" }, { bmvcc_equipmentrecordid: "g2" }]);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const runDataverseSyncMock = vi.fn();
const sendSyncAlertEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/sync/run-sync", () => ({ runDataverseSync: () => runDataverseSyncMock() }));
vi.mock("@/lib/sync/notify", () => ({ sendSyncAlertEmail: (subject: string, body: string) => sendSyncAlertEmailMock(subject, body) }));

import { GET } from "./route";

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/cron/sync-dataverse", {
    headers: secret !== undefined ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  runDataverseSyncMock.mockReset();
  sendSyncAlertEmailMock.mockClear();
});

describe("GET /api/cron/sync-dataverse", () => {
  it("rejects requests without the cron secret", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong secret", async () => {
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("returns 200 with a summary on success", async () => {
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "firmen", fetched: 302, deleted: 0, skippedDueToThreshold: false }],
      warnings: [],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entities[0].slug).toBe("firmen");
    expect(sendSyncAlertEmailMock).not.toHaveBeenCalled();
  });

  it("sends an alert email and returns 200 when a threshold warning occurs", async () => {
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "geraete", fetched: 100, deleted: 0, skippedDueToThreshold: true }],
      warnings: ['"geraete": 50/100 Zeilen fehlen'],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledTimes(1);
  });

  it("sends an alert email and returns 500 when the sync throws", async () => {
    runDataverseSyncMock.mockRejectedValue(new Error("Dataverse unreachable"));

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(500);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync fehlgeschlagen",
      expect.stringContaining("Dataverse unreachable")
    );
  });

  // QA BUG-1: a missing CRON_SECRET (e.g. forgotten Vercel env var) throws
  // before the try/catch instead of returning a graceful error response —
  // no log, no alert email, just an unhandled rejection. This test
  // documents the current (broken) behavior; once fixed it should instead
  // assert a clean 500 (or 401) JSON response with no throw.
  it("BUG: throws unhandled instead of responding gracefully when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    await expect(GET(makeRequest("anything"))).rejects.toThrow("Missing CRON_SECRET");
    expect(sendSyncAlertEmailMock).not.toHaveBeenCalled();
  });
});

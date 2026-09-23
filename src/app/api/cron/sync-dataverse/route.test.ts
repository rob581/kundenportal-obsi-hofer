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
  delete process.env.CRON_NOTIFY_ON_SUCCESS;
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
      errors: [],
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
      errors: [],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledTimes(1);
  });

  it("sends an alert email and returns 200 (partial success) when one entity errored", async () => {
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "firmen", fetched: 302, deleted: 0, skippedDueToThreshold: false }],
      warnings: [],
      errors: ['"artikel": fetch failed'],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync: Probleme beim täglichen Lauf",
      expect.stringContaining("artikel")
    );
  });

  it("sends an alert email and returns 500 when the sync throws entirely", async () => {
    runDataverseSyncMock.mockRejectedValue(new Error("Dataverse unreachable"));

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(500);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync fehlgeschlagen",
      expect.stringContaining("Dataverse unreachable")
    );
  });

  // Temporaerer CRON_NOTIFY_ON_SUCCESS-Schalter (Vercel Hobby zeigt Logs nur
  // 30 Minuten lang, Cron laeuft nachts) - Standard bleibt unveraendert
  // (kein Mail-Spam bei jedem sauberen Lauf), siehe .env.local.example.
  it("sends a summary email on a clean run only when CRON_NOTIFY_ON_SUCCESS is set", async () => {
    process.env.CRON_NOTIFY_ON_SUCCESS = "true";
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "firmen", fetched: 302, added: 2, updated: 297, deleted: 3, skippedDueToThreshold: false }],
      warnings: [],
      errors: [],
    });

    const res = await GET(makeRequest("test-cron-secret"));

    expect(res.status).toBe(200);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync: erfolgreich",
      expect.stringContaining("2 hinzugefügt, 297 aktualisiert")
    );
  });

  // Fix for QA BUG-1: a missing CRON_SECRET (e.g. forgotten Vercel env var)
  // used to throw before the try/catch — no log, no alert email, just an
  // unhandled rejection. Now the auth check runs inside the same
  // try/catch as the sync, so this is treated like any other failure.
  it("logs and emails an alert instead of crashing when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest("anything"));

    expect(res.status).toBe(500);
    expect(sendSyncAlertEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync fehlgeschlagen",
      expect.stringContaining("Missing CRON_SECRET")
    );
  });
});

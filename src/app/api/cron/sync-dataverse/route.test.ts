import { describe, it, expect, vi, beforeEach } from "vitest";

const runDataverseSyncMock = vi.fn();
const sendOpsEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/sync/run-sync", () => {
  class FirmaNotFoundError extends Error {
    constructor(firmaId: string) {
      super(`Firma mit ID "${firmaId}" wurde in Dataverse nicht gefunden.`);
      this.name = "FirmaNotFoundError";
    }
  }
  class InvalidFirmaIdError extends Error {
    constructor(firmaId: string) {
      super(`Ungültige firmaId: "${firmaId}" ist keine gültige GUID.`);
      this.name = "InvalidFirmaIdError";
    }
  }
  return {
    runDataverseSync: (firmaId: string) => runDataverseSyncMock(firmaId),
    FirmaNotFoundError,
    InvalidFirmaIdError,
  };
});
vi.mock("@/lib/notify/send-email", () => ({ sendOpsEmail: (subject: string, body: string) => sendOpsEmailMock(subject, body) }));

import { GET } from "./route";
import { FirmaNotFoundError, InvalidFirmaIdError } from "@/lib/sync/run-sync";

// firmaId ist Pflicht (kein Vollsync mehr) — null lässt den Parameter weg.
function makeRequest(secret?: string, firmaId: string | null = "firma-1") {
  const url = new URL("http://localhost/api/cron/sync-dataverse");
  if (firmaId !== null) url.searchParams.set("firmaId", firmaId);
  return new Request(url, {
    headers: secret !== undefined ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  delete process.env.CRON_NOTIFY_ON_SUCCESS;
  runDataverseSyncMock.mockReset();
  sendOpsEmailMock.mockClear();
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
    expect(sendOpsEmailMock).not.toHaveBeenCalled();
  });

  it("sends an alert email and returns 200 when a threshold warning occurs", async () => {
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "geraete", fetched: 100, deleted: 0, skippedDueToThreshold: true }],
      warnings: ['"geraete": 50/100 Zeilen fehlen'],
      errors: [],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendOpsEmailMock).toHaveBeenCalledTimes(1);
  });

  it("sends an alert email and returns 200 (partial success) when one entity errored", async () => {
    runDataverseSyncMock.mockResolvedValue({
      entities: [{ slug: "firmen", fetched: 302, deleted: 0, skippedDueToThreshold: false }],
      warnings: [],
      errors: ['"artikel": fetch failed'],
    });

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync: Probleme beim Sync für Firma firma-1",
      expect.stringContaining("artikel")
    );
  });

  it("sends an alert email and returns 500 when the sync throws entirely", async () => {
    runDataverseSyncMock.mockRejectedValue(new Error("Dataverse unreachable"));

    const res = await GET(makeRequest("test-cron-secret"));
    expect(res.status).toBe(500);
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
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
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
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
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
      "Dataverse-Sync fehlgeschlagen",
      expect.stringContaining("Missing CRON_SECRET")
    );
  });

  // PROJ-12: Firma-Filter.
  it("passes a firmaId query parameter through to runDataverseSync", async () => {
    runDataverseSyncMock.mockResolvedValue({ entities: [], warnings: [], errors: [] });

    await GET(makeRequest("test-cron-secret", "firma-1"));

    expect(runDataverseSyncMock).toHaveBeenCalledWith("firma-1");
  });

  // Decision Log 2026-10-07: kein Vollsync mehr — ohne firmaId wird gar
  // nichts synchronisiert, statt still alle Firmen zu übertragen.
  it("returns 400 without syncing or sending an ops email when firmaId is missing", async () => {
    const res = await GET(makeRequest("test-cron-secret", null));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("firmaId fehlt");
    expect(runDataverseSyncMock).not.toHaveBeenCalled();
    expect(sendOpsEmailMock).not.toHaveBeenCalled();
  });

  it("still requires the cron secret before reporting a missing firmaId", async () => {
    const res = await GET(makeRequest(undefined, null));
    expect(res.status).toBe(401);
  });

  it("returns 404 without sending an ops email when the firmaId is unknown", async () => {
    runDataverseSyncMock.mockRejectedValue(new FirmaNotFoundError("unbekannt-123"));

    const res = await GET(makeRequest("test-cron-secret", "unbekannt-123"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("unbekannt-123");
    expect(sendOpsEmailMock).not.toHaveBeenCalled();
  });

  // QA BUG-1 fix: a malformed/injected firmaId is rejected with 400, not
  // silently run or treated as an infrastructure failure worth alerting on.
  it("returns 400 without sending an ops email when the firmaId is not a valid GUID", async () => {
    runDataverseSyncMock.mockRejectedValue(new InvalidFirmaIdError("1 eq 1 or 1 eq 1"));

    const res = await GET(makeRequest("test-cron-secret", "1 eq 1 or 1 eq 1"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Ungültige firmaId");
    expect(sendOpsEmailMock).not.toHaveBeenCalled();
  });
});

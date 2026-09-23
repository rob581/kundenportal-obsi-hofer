import { describe, it, expect, vi, beforeEach } from "vitest";

const buildErfolgsmessungReportMock = vi.fn();
const sendOpsEmailMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/erfolgsmessung/report", () => ({
  buildErfolgsmessungReport: () => buildErfolgsmessungReportMock(),
}));
vi.mock("@/lib/notify/send-email", () => ({
  sendOpsEmail: (subject: string, body: string) => sendOpsEmailMock(subject, body),
}));

import { GET } from "./route";

function makeRequest(secret?: string) {
  return new Request("http://localhost/api/cron/erfolgsmessung-report", {
    headers: secret !== undefined ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "test-cron-secret";
  buildErfolgsmessungReportMock.mockReset();
  sendOpsEmailMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/cron/erfolgsmessung-report", () => {
  it("rejects requests without the cron secret", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with the wrong secret", async () => {
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("sends the report by email and returns 200 on success", async () => {
    buildErfolgsmessungReportMock.mockResolvedValue("=== Login-Quote ===\n1/1 Firmen (100%)");

    const res = await GET(makeRequest("test-cron-secret"));

    expect(res.status).toBe(200);
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
      "Wöchentlicher Erfolgsmessungs-Report",
      "=== Login-Quote ===\n1/1 Firmen (100%)"
    );
  });

  it("sends an alert email and returns 500 when the report generation fails", async () => {
    buildErfolgsmessungReportMock.mockRejectedValue(new Error("Login-Status-Abfrage fehlgeschlagen: RPC error"));

    const res = await GET(makeRequest("test-cron-secret"));

    expect(res.status).toBe(500);
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
      "Erfolgsmessungs-Report fehlgeschlagen",
      expect.stringContaining("RPC error")
    );
  });

  // Gleicher Fix wie bei /api/cron/sync-dataverse (QA BUG-1 dort): der
  // Auth-Check läuft im selben try/catch, damit ein fehlendes CRON_SECRET
  // geloggt/alarmiert statt unbehandelt geworfen wird.
  it("logs and emails an alert instead of crashing when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;

    const res = await GET(makeRequest("anything"));

    expect(res.status).toBe(500);
    expect(sendOpsEmailMock).toHaveBeenCalledWith(
      "Erfolgsmessungs-Report fehlgeschlagen",
      expect.stringContaining("Missing CRON_SECRET")
    );
  });
});

import { test, expect } from "@playwright/test";

// Same constraint as PROJ-2/3/4: seeing real Kennzahlen requires a live
// Entra External ID session tied to a real Dataverse-synced Kontakt, which
// this credential-free E2E suite can't exercise repeatably. This test
// covers what's reachable without a session — route protection for the new
// PROJ-5 page. The aggregation logic itself has thorough Vitest coverage in
// src/lib/dashboard/queries.test.ts. The authenticated flow (Kennzahlen,
// Status-Kacheln, Klick-Verlinkung, "Zu prüfen") was verified manually by
// the user against real data — see the QA Test Results section in
// features/PROJ-5-dashboard.md.

test.describe("PROJ-5: Dashboard", () => {
  test("visiting the Dashboard without a session redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});

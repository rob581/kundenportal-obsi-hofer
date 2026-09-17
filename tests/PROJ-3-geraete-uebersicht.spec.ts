import { test, expect } from "@playwright/test";

// Same constraint as PROJ-2: seeing real device data requires a live Entra
// External ID session tied to a real Dataverse-synced Kontakt, which this
// credential-free E2E suite can't exercise repeatably. These tests cover
// what's reachable without a session — route protection for the new PROJ-3
// pages — plus the getGeraeteList/getGeraetById logic already has thorough
// Vitest integration coverage in src/lib/geraete/queries.test.ts (Firma
// isolation, filters, search, sorting, pagination, IDOR protection). The
// authenticated flows (device list, filters, detail page, "Firma wechseln")
// were verified manually — see the QA Test Results section in
// features/PROJ-3-geraete-uebersicht.md.

test.describe("PROJ-3: Geräte-Übersicht", () => {
  test("visiting the device detail page without a session redirects to /login", async ({ page }) => {
    await page.goto("/uebersicht/geraete/some-device-id");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("filter/search/page query params on the Übersicht don't bypass the session check", async ({ page }) => {
    await page.goto("/uebersicht?status=Freigabe&suche=Feuerloescher&seite=2");
    await expect(page).toHaveURL(/\/login$/);
  });
});

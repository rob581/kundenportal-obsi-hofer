import { test, expect } from "@playwright/test";

// Same constraint as PROJ-2/3/5: seeing real Zusatzspalten (which depend on
// live Firma-Einstellungen + Dataverse-synced Geräte) requires a real
// session and can't be exercised repeatably in this credential-free E2E
// suite. PROJ-7 adds no new routes, only a new query param on the existing
// /uebersicht — this test covers that it doesn't bypass the session check,
// same as PROJ-3's existing status/suche/seite test. The resolution logic
// itself (fixed pool order, dedup, unknown-key filtering, KundenID search
// gating) has full Vitest coverage — see zusatzspalten.test.ts,
// firma-einstellungen/queries.test.ts and geraete/queries.test.ts. The
// authenticated table rendering (Zusatzspalten appear/disappear per Firma,
// KundenID search, "Zu prüfen"-Link) was verified manually by the user
// against real data — see QA Test Results below.

test.describe("PROJ-7: Kundenspezifische Spalten in der Geräte-Übersicht", () => {
  test("the zuPruefen query param on the Übersicht doesn't bypass the session check", async ({ page }) => {
    await page.goto("/uebersicht?zuPruefen=1");
    await expect(page).toHaveURL(/\/login$/);
  });
});

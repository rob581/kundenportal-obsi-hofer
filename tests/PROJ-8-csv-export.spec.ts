import { test, expect } from "@playwright/test";

// Same constraint as PROJ-3/7: exercising a real export (real Firma data,
// real Zusatzspalten-Konfiguration) needs a live session and can't be
// automated repeatably here. What's reachable without a session — that the
// new API route requires authentication just like every protected page —
// is covered below. The CSV-building logic itself (columns, escaping,
// quoting, BOM, batching) has full Vitest coverage — see
// src/lib/geraete/export-csv.test.ts, the getGeraeteExportRows tests in
// src/lib/geraete/queries.test.ts, and src/app/api/uebersicht/export/route.test.ts.

test.describe("PROJ-8: CSV-Export der Geräte-Übersicht", () => {
  test("visiting the export endpoint without a session redirects to /login", async ({ page }) => {
    await page.goto("/api/uebersicht/export");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("query params on the export endpoint don't bypass the session check", async ({ page }) => {
    await page.goto("/api/uebersicht/export?status=Freigabe&suche=Test&zuPruefen=1");
    await expect(page).toHaveURL(/\/login$/);
  });
});

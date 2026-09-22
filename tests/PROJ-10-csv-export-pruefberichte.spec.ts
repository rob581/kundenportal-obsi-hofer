import { test, expect } from "@playwright/test";

// Same constraint as PROJ-8/9: exercising a real export needs a live
// session and can't be automated repeatably here. This covers what's
// reachable without a session — the new API route requires authentication
// just like PROJ-8's export endpoint. The CSV-building/query logic itself
// (fixed columns, escaping, BOM, batching, Zeitraum-Filter incl. robustness
// against invalid values) has full Vitest coverage — see
// src/lib/pruefberichte/export-csv.test.ts, the getPruefberichteExportRows
// tests in src/lib/pruefberichte/queries.test.ts, and
// src/app/api/pruefberichte/export/route.test.ts.

test.describe("PROJ-10: CSV-Export der Prüfberichte-Übersicht", () => {
  test("visiting the export endpoint without a session redirects to /login", async ({ page }) => {
    await page.goto("/api/pruefberichte/export");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the zeitraum query param on the export endpoint doesn't bypass the session check", async ({ page }) => {
    await page.goto("/api/pruefberichte/export?zeitraum=30");
    await expect(page).toHaveURL(/\/login$/);
  });
});

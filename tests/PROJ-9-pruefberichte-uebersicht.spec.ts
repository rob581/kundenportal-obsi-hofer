import { test, expect } from "@playwright/test";

// Same constraint as PROJ-3/5/7/8: seeing real, firmenweite Prüfberichte
// braucht eine echte Session und lässt sich nicht automatisiert/wiederholbar
// durchspielen. /pruefberichte liegt unter der (protected)-Routengruppe und
// wird daher bereits generisch durch (protected)/layout.tsx geschützt
// (dasselbe Muster wie /uebersicht/dashboard/sicherheit) — dieser Test
// bestätigt das explizit, inkl. Zeitraum-/Seite-Query-Parameter. Die
// Abfragelogik selbst (Firma-Isolation, Batching, Sortierung/Paginierung,
// Zeitraum-Filter, Artikel-Info-Anreicherung) hat volle Vitest-Abdeckung —
// siehe src/lib/pruefberichte/queries.test.ts.

test.describe("PROJ-9: Prüfberichte-Übersicht", () => {
  test("visiting /pruefberichte without a session redirects to /login", async ({ page }) => {
    await page.goto("/pruefberichte");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("zeitraum/seite query params don't bypass the session check", async ({ page }) => {
    await page.goto("/pruefberichte?zeitraum=30&seite=2");
    await expect(page).toHaveURL(/\/login$/);
  });
});

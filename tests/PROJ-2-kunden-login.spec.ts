import { test, expect } from "@playwright/test";

// signInWithOtp/verifyOtp call the REAL Supabase Auth instance (no mocking
// layer exists for Server Actions in this project's Playwright setup) —
// clicking "Code anfordern" in an automated test would send a real email
// on every CI run and quickly hit Supabase's per-email rate limit (60s).
// These tests therefore cover everything reachable without actually
// requesting/verifying a code: the login page itself (Schritt 1) and the
// server-side route protection (middleware + protected layout). The full
// two-step flow with a real, per-mail zugestellten Code (Schritt 2,
// Kein-Zugang, Firmen-Auswahl, Übersicht, Abmelden) was verified manually
// end-to-end against the real Supabase-Instanz — see QA Test Results in
// features/PROJ-2-kunden-login.md.

test.describe("PROJ-2: Kunden-Login", () => {
  test("login page (Schritt 1) shows the E-Mail form, no internal provider jargon", async ({ page }) => {
    await page.goto("/login");
    // NOTE: "Kundenportal" is a shadcn CardTitle, which renders a <div> —
    // not an accessible heading role (QA finding, see spec Decision Log).
    await expect(page.getByText("Kundenportal")).toBeVisible();
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
    await expect(page.getByRole("button", { name: "Code anfordern" })).toBeVisible();
    await expect(page.getByText("Entra External ID")).toHaveCount(0);
    await expect(page.getByText("Supabase")).toHaveCount(0);
    await expect(page.getByText("OBSI Hofer GmbH")).toBeVisible();
  });

  test("the E-Mail field is required before requesting a code", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("E-Mail-Adresse");
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("visiting a protected page without a session redirects to /login", async ({ page }) => {
    await page.goto("/uebersicht");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting the Dashboard without a session redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting the Firmen-Auswahl page without a session redirects to /login", async ({ page }) => {
    await page.goto("/firmen-auswahl");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("visiting /kein-zugang without a session redirects to /login", async ({ page }) => {
    // Middleware redirects unauthenticated requests to /login before the
    // page's own (redundant, defense-in-depth) session check ever runs.
    const response = await page.goto("/kein-zugang");
    expect(response?.url()).toMatch(/\/login$/);
  });
});

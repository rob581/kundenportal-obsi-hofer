import { test, expect } from "@playwright/test";

// registerPasskey()/signInWithPasskey() trigger a real WebAuthn ceremony
// (navigator.credentials.create/get) that needs an actual authenticator
// (biometrics, security key) — not automatable in headless Playwright
// without a virtual authenticator setup, which this project doesn't use.
// These tests cover what's reachable without a real device: button
// visibility based on WebAuthn browser support, and route protection for
// "/sicherheit". The full register + sign-in flow was verified manually
// by the user with a real device (Windows Hello) — see QA Test Results in
// features/PROJ-6-passkey-login.md.

test.describe("PROJ-6: Passkey-Login", () => {
  test("shows the passkey button on the login page when WebAuthn is supported", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Mit Passkey anmelden" })).toBeVisible();
  });

  test("hides the passkey button when the browser has no WebAuthn support", async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error - simulating an older browser without WebAuthn for this test
      delete window.PublicKeyCredential;
    });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Mit Passkey anmelden" })).toHaveCount(0);
    // Der normale E-Mail+Code-Login bleibt in jedem Fall nutzbar.
    await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  });

  test("visiting /sicherheit without a session redirects to /login", async ({ page }) => {
    await page.goto("/sicherheit");
    await expect(page).toHaveURL(/\/login$/);
  });
});

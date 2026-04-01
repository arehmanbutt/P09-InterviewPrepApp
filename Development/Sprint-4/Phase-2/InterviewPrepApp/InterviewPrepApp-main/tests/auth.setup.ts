import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Clerk authentication setup using Testing Tokens.
 *
 * Uses @clerk/testing to bypass the Clerk UI (including OAuth flows like
 * Google Sign-In) and authenticate programmatically.
 *
 * Required env vars:
 *   E2E_CLERK_USER_EMAIL – test account email
 *   E2E_CLERK_USER_PASSWORD – test account password
 */
setup("authenticate via Clerk", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD must be set in .env.local or environment",
    );
  }

  // Set up Clerk testing token — this puts Clerk in testing mode
  await setupClerkTestingToken({ page });

  await page.goto("/sign-in");

  // Clerk renders its form inside an iframe or shadow DOM — wait for the email input
  const emailInput = page.locator('input[name="identifier"]');
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(email);

  // Click continue
  await page.getByRole("button", { name: /continue/i }).click();

  // Wait for password field and fill it
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
  await passwordInput.fill(password);

  // Click sign-in button
  await page.getByRole("button", { name: /continue/i }).click();

  // Wait until redirected to dashboard (authenticated area)
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
});

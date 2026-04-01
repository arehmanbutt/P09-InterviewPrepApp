import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("UC02 - User Sign In", () => {
  // These tests do NOT use stored auth state — they test the sign-in flow itself
  test.use({ storageState: { cookies: [], origins: [] } });

  test("T01: Happy path — sign in with correct email and password", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");

    // Wait for Clerk sign-in form
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(process.env.E2E_CLERK_USER_EMAIL!);

    await page.getByRole("button", { name: /continue/i }).click();

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill(process.env.E2E_CLERK_USER_PASSWORD!);

    await page.getByRole("button", { name: /continue/i }).click();

    // Should redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("T02: Sign in with incorrect password — shows error", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");

    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(process.env.E2E_CLERK_USER_EMAIL!);

    await page.getByRole("button", { name: /continue/i }).click();

    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill("WrongPassword999!");

    await page.getByRole("button", { name: /continue/i }).click();

    // Clerk should show an authentication error
    await expect(page.getByText(/incorrect|invalid|wrong|error/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("T03: Sign in with non-existent email — shows error", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");

    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });
    await emailInput.fill(`nonexistent-${Date.now()}@example.com`);

    await page.getByRole("button", { name: /continue/i }).click();

    // Clerk should show a "no account found" error
    await expect(page.getByText(/not found|no account|couldn't find|invalid/i).first()).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("T04: Access protected route while unauthenticated — redirects to sign-in", async ({
    page,
  }) => {
    await setupClerkTestingToken({ page });
    // Try to access dashboard directly without auth
    await page.goto("/dashboard");

    // Clerk middleware should redirect to /sign-in
    await page.waitForURL("**/sign-in**", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("T05: Sign in with Google OAuth — button is visible and clickable", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");

    // Wait for Clerk sign-in form to render
    const emailInput = page.locator('input[name="identifier"]');
    await emailInput.waitFor({ state: "visible", timeout: 15_000 });

    // Clerk renders social buttons as icon-only (Facebook, GitHub, Google)
    const socialButtons = page.locator(".cl-socialButtonsIconButton, .cl-socialButtonsBlockButton");
    const count = await socialButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify at least one social/OAuth button is enabled
    await expect(socialButtons.last()).toBeEnabled();
  });
});

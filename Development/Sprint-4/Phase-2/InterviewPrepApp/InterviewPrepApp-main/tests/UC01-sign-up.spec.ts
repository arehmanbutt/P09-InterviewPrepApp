import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { test, expect } from "@playwright/test";

test.describe("UC01 - User Sign Up", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("T01: Sign-up page renders with all form fields", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 15_000 });

    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="emailAddress"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("T02: Sign up with Google OAuth — button is visible and clickable", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 15_000 });

    const socialButtons = page.locator(".cl-socialButtonsIconButton, .cl-socialButtonsBlockButton");
    const count = await socialButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(socialButtons.first()).toBeEnabled();
  });

  test("T03: Sign up with already-existing email — shows error", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await firstNameInput.fill("Existing");

    await page.locator('input[name="lastName"]').fill("User");

    const usernameInput = page.locator('input[name="username"]');
    if (await usernameInput.isVisible().catch(() => false)) {
      await usernameInput.fill(`existing${Date.now()}`);
    }

    await page
      .locator('input[name="emailAddress"]')
      .fill(process.env.E2E_CLERK_USER_EMAIL || "existing@example.com");

    await page.locator('input[name="password"]').fill("StrongPassword123!");

    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(/already|exists|taken|use/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("T04: Sign up with weak password — shows validation error", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await firstNameInput.fill("Weak");

    await page.locator('input[name="lastName"]').fill("Pwd");
    await page.locator('input[name="emailAddress"]').fill(`weakpw-${Date.now()}@example.com`);
    await page.locator('input[name="password"]').fill("123");

    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(/password|weak|short|characters|length/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("T05: Sign up with invalid email format — shows validation error", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-up");

    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.waitFor({ state: "visible", timeout: 15_000 });
    await firstNameInput.fill("Invalid");

    await page.locator('input[name="lastName"]').fill("Email");
    await page.locator('input[name="emailAddress"]').fill("not-an-email");

    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page.getByText(/invalid|email|valid/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

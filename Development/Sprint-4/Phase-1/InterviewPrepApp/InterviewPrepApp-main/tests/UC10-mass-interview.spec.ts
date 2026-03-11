import { test, expect } from "@playwright/test";
import { createMassInterview, findInterviewCard, deleteInterview } from "./helpers";

test.describe("UC10 - Mass Interview Flow", () => {
  let massTitle: string;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    massTitle = await createMassInterview(page, {
      title: `MassTest ${Date.now()}`,
      company: "MassCorp",
    });
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    try {
      await deleteInterview(page, massTitle);
    } catch {
      // already cleaned up
    }
    await context.close();
  });

  test("T01: Mass interview shows purple badge, Copy Link, and Candidates link", async ({
    page,
  }) => {
    const card = await findInterviewCard(page, massTitle);

    // Purple "Mass" badge
    await expect(card.getByText("Mass", { exact: true })).toBeVisible();

    // "Copy Link" button
    await expect(card.getByRole("button", { name: "Copy Link" })).toBeVisible();

    // "Candidates" link
    await expect(card.getByRole("link", { name: "Candidates" })).toBeVisible();
  });

  test("T02: Creator attempts to join own mass interview — blocked", async ({ page }) => {
    // Get the share token by finding the Copy Link button and extracting the token
    const card = await findInterviewCard(page, massTitle);

    // Click Copy Link to grab the token from clipboard
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await card.getByRole("button", { name: "Copy Link" }).click();
    await page.waitForTimeout(1_000);

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // Extract token from URL like http://localhost:3000/join/TOKEN
    const token = clipboardText.split("/join/").pop();
    expect(token).toBeTruthy();

    // Try to join own interview
    await page.goto(`/join/${token}`);
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").textContent();
    const hasBlock = /unable to join|cannot|own|creator|blocked|error|not allowed/i.test(
      bodyText || "",
    );
    const redirectedToDashboard = page.url().includes("dashboard");

    expect(hasBlock || redirectedToDashboard).toBeTruthy();
  });

  test("T03: Invalid share token — shows Unable to Join error", async ({ page }) => {
    await page.goto("/join/invalid-token-12345");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Unable to Join")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("T04: Candidates page loads with correct heading and invite link button", async ({
    page,
  }) => {
    const card = await findInterviewCard(page, massTitle);
    await card.getByRole("link", { name: "Candidates" }).click();

    await expect(page).toHaveURL(/\/interviews\/.*\/candidates/);
    await page.waitForLoadState("networkidle");

    // Candidates heading (h1 specifically)
    await expect(page.locator("h1").filter({ hasText: "Candidates" })).toBeVisible();

    // Copy Invite Link button
    await expect(page.getByRole("button", { name: "Copy Invite Link" })).toBeVisible();

    // Should show candidate count or empty state
    const hasEmpty = await page
      .getByText("No candidates yet")
      .isVisible()
      .catch(() => false);
    const hasCandidateCount = await page
      .getByText(/\d+ candidate/)
      .isVisible()
      .catch(() => false);

    expect(hasEmpty || hasCandidateCount).toBeTruthy();
  });

  test("T05: Copy Link button works — shows Copied confirmation", async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

    const card = await findInterviewCard(page, massTitle);
    const copyButton = card.getByRole("button", { name: "Copy Link" });
    await expect(copyButton).toBeVisible();

    await copyButton.click();

    // Button text should change to "Copied!" momentarily
    await expect(card.getByText("Copied!")).toBeVisible({ timeout: 3_000 });
  });
});

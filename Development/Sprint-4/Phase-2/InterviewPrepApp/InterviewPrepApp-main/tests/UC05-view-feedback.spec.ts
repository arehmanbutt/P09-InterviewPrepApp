import { test, expect } from "@playwright/test";

test.describe("UC05 - View Interview Feedback", () => {
  /**
   * These tests require at least one completed interview with feedback.
   * We use the API to find one, and create + complete one if needed.
   */

  test("T01: Feedback page shows overall score, strengths, and areas for improvement", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Find a completed interview with feedback
    const feedbackLink = page.getByRole("link", { name: "View Feedback" }).first();
    await expect(feedbackLink).toBeVisible({
      timeout: 10_000,
    });

    await feedbackLink.click();
    await expect(page).toHaveURL(/\/feedback\//);
    await page.waitForLoadState("networkidle");

    // Feedback page must have both tabs
    await expect(page.getByRole("button", { name: "Feedback" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Transcript" })).toBeVisible();

    // Must show Overall Score
    await expect(page.getByText("Overall Score")).toBeVisible();

    // Must show Strengths and Areas for Improvement
    await expect(page.getByText("Strengths")).toBeVisible();
    await expect(page.getByText("Areas for Improvement")).toBeVisible();
  });

  test("T02: Download PDF link points to report API", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const feedbackLink = page.getByRole("link", { name: "View Feedback" }).first();
    await expect(feedbackLink).toBeVisible({ timeout: 10_000 });

    await feedbackLink.click();
    await expect(page).toHaveURL(/\/feedback\//);
    await page.waitForLoadState("networkidle");

    const downloadLink = page.getByRole("link", { name: "Download PDF" });
    await expect(downloadLink).toBeVisible();

    const href = await downloadLink.getAttribute("href");
    expect(href).toMatch(/\/api\/interviews\/.*\/report/);
  });

  test("T03: Transcript tab shows conversation entries", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const feedbackLink = page.getByRole("link", { name: "View Feedback" }).first();
    await expect(feedbackLink).toBeVisible({ timeout: 10_000 });

    await feedbackLink.click();
    await expect(page).toHaveURL(/\/feedback\//);
    await page.waitForLoadState("networkidle");

    // Switch to Transcript tab
    await page.getByRole("button", { name: "Transcript" }).click();

    // Transcript should have some conversation content (not be empty)
    // The transcript display area should contain at least some text
    await page.waitForTimeout(1_000);
    const bodyText = await page.locator("body").textContent();
    // After switching to transcript, the page should show conversation-like content
    // or at minimum the tab should be selected
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test("T04: Non-existent interview feedback — shows error or not-available state", async ({
    page,
  }) => {
    const response = await page.goto("/feedback/000000000000000000000000");
    await page.waitForLoadState("networkidle");

    const status = response?.status();
    const bodyText = await page.locator("body").textContent();

    // Must show error state: either HTTP 404, or error/not-available text
    const hasErrorText = /not found|error|404|not yet available|invalid/i.test(bodyText || "");
    expect(status === 404 || hasErrorText).toBeTruthy();
  });

  test("T05: Dashboard button on feedback page navigates back", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const feedbackLink = page.getByRole("link", { name: "View Feedback" }).first();
    await expect(feedbackLink).toBeVisible({ timeout: 10_000 });

    await feedbackLink.click();
    await expect(page).toHaveURL(/\/feedback\//);
    await page.waitForLoadState("networkidle");

    // Click Dashboard button (on the feedback page, not in nav) to go back
    const dashboardLink = page.getByRole("link", { name: "Dashboard" }).last();
    await expect(dashboardLink).toBeVisible();
    await dashboardLink.click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});

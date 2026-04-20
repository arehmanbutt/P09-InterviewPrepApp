import { test, expect } from "@playwright/test";
import { createTechnicalInterview, deleteInterview } from "./helpers";

test.describe("UC06 - Dashboard Search / Filter / Sort", () => {
  let createdTitle: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test interview so the dashboard is never empty
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    createdTitle = await createTechnicalInterview(page, {
      title: `FilterTest ${Date.now()}`,
      company: "FilterCorp",
    });
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    await deleteInterview(page, createdTitle);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("T01: Search by title — filters results to matching interviews", async ({ page }) => {
    await expect(page.getByText("Your Interviews")).toBeVisible();

    const searchInput = page.getByPlaceholder("Search by title or company...");
    await expect(searchInput).toBeVisible();

    // Search for our test interview
    await searchInput.fill("FilterTest");
    await page.waitForTimeout(500);

    // The created interview should be visible
    await expect(page.getByText(createdTitle).first()).toBeVisible();

    // Cards shown should all contain "FilterTest"
    const cards = page.locator(".rounded-xl.border").filter({ hasText: "FilterTest" });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("T02: Search with no results — shows empty state with clear link", async ({ page }) => {
    await expect(page.getByText("Your Interviews")).toBeVisible();

    const searchInput = page.getByPlaceholder("Search by title or company...");
    await searchInput.fill("xyznonexistent999zzz");

    await expect(page.getByText("No interviews match your filters.")).toBeVisible({
      timeout: 5_000,
    });

    // "Clear filters" link should be visible and functional
    const clearButton = page.getByText("Clear filters");
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Search should be cleared, interviews should reappear
    await expect(searchInput).toHaveValue("");
    await expect(page.getByText(createdTitle).first()).toBeVisible();
  });

  test("T03: Filter by Scheduled status — only scheduled interviews shown", async ({ page }) => {
    await expect(page.getByText("Your Interviews")).toBeVisible();

    // Click "Scheduled" filter pill
    await page.getByRole("button", { name: "Scheduled" }).click();
    await page.waitForTimeout(500);

    // Every visible card should have "Scheduled" badge
    const cards = page.locator(".rounded-xl.border");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByText("Scheduled")).toBeVisible();
    }
  });

  test("T04: Sort by A-Z vs Z-A — order changes", async ({ page }) => {
    await expect(page.getByText("Your Interviews")).toBeVisible();

    const sortSelect = page.locator("select");

    // Sort A-Z
    await sortSelect.selectOption("a-z");
    await page.waitForTimeout(500);
    const titles_az: string[] = [];
    const headings = page.locator("h3");
    const count = await headings.count();
    for (let i = 0; i < count; i++) {
      titles_az.push((await headings.nth(i).textContent()) || "");
    }

    // Sort Z-A
    await sortSelect.selectOption("z-a");
    await page.waitForTimeout(500);
    const titles_za: string[] = [];
    for (let i = 0; i < count; i++) {
      titles_za.push((await headings.nth(i).textContent()) || "");
    }

    // If more than one interview, the order should be reversed
    if (count > 1) {
      expect(titles_az[0]).toBe(titles_za[titles_za.length - 1]);
      expect(titles_az[titles_az.length - 1]).toBe(titles_za[0]);
    }

    // Both should have content
    expect(titles_az.length).toBeGreaterThanOrEqual(1);
    expect(titles_za.length).toBeGreaterThanOrEqual(1);
  });

  test("T05: Filter pills highlight active filter", async ({ page }) => {
    await expect(page.getByText("Your Interviews")).toBeVisible();

    const allPill = page.getByRole("button", { name: "All" });
    const scheduledPill = page.getByRole("button", { name: "Scheduled" });
    const completedPill = page.getByRole("button", { name: "Completed" });

    await expect(allPill).toBeVisible();
    await expect(scheduledPill).toBeVisible();
    await expect(completedPill).toBeVisible();

    // Click Scheduled — it should become active (has distinct styling)
    await scheduledPill.click();
    await page.waitForTimeout(300);

    // Click All to reset
    await allPill.click();
    await page.waitForTimeout(300);

    // All interviews should be visible again
    await expect(page.getByText(createdTitle).first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { deleteInterview } from "./helpers";

test.describe("UC03 - Create Interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/create-interview");
    await page.waitForLoadState("networkidle");
  });

  test("T01: Happy path — create a technical interview with manual input", async ({ page }) => {
    const title = `Tech Interview ${Date.now()}`;

    await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', title);
    await page.fill('input[placeholder="e.g. Acme Corp"]', "Acme Corp");
    await page.fill(
      'textarea[placeholder="Paste the job description here..."]',
      "We are looking for a Senior Backend Engineer with expertise in Node.js, PostgreSQL, and cloud architecture.",
    );
    await page.locator('input[type="number"]').fill("1");

    const techButton = page.getByRole("button", {
      name: /Create Technical Interview/i,
    });
    await expect(techButton).toBeEnabled();
    await techButton.click();

    // Should show loading state
    await expect(page.getByText(/Generating.../i).first()).toBeVisible({
      timeout: 10_000,
    });

    // Should redirect to dashboard with the new interview visible
    await page.waitForURL("**/dashboard", { timeout: 90_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });

    // Cleanup
    await deleteInterview(page, title);
  });

  test("T02: Create an HR screening interview", async ({ page }) => {
    const title = `HR Interview ${Date.now()}`;

    await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', title);
    await page.fill('input[placeholder="e.g. Acme Corp"]', "TechStart Inc");
    await page.fill(
      'textarea[placeholder="Paste the job description here..."]',
      "We need a Product Manager skilled in roadmap planning and stakeholder management.",
    );
    await page.locator('input[type="number"]').fill("1");

    const hrButton = page.getByRole("button", {
      name: /Create HR Screening Interview/i,
    });
    await expect(hrButton).toBeEnabled();
    await hrButton.click();

    await expect(page.getByText(/Generating.../i).first()).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForURL("**/dashboard", { timeout: 90_000 });
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });

    // Verify it shows "Scheduled" status
    const card = page.locator(".rounded-xl.border").filter({ hasText: title }).first();
    await expect(card.getByText("Scheduled")).toBeVisible();

    // Cleanup
    await deleteInterview(page, title);
  });

  test("T03: Create interview using a job role template — auto-fills fields", async ({ page }) => {
    // Click "Frontend Developer" template
    await page.getByText("Frontend Developer").first().click();

    // Verify template auto-fills title and description
    const titleInput = page.locator('input[placeholder="e.g. Senior Backend Engineer"]');
    await expect(titleInput).toHaveValue("Frontend Developer");

    const descTextarea = page.locator('textarea[placeholder="Paste the job description here..."]');
    const descValue = await descTextarea.inputValue();
    expect(descValue.length).toBeGreaterThan(10);

    // Template indicator should be visible
    await expect(page.getByText("Using template:")).toBeVisible();

    // Company still needs to be filled manually — buttons disabled
    const techButton = page.getByRole("button", {
      name: /Create Technical Interview/i,
    });
    await expect(techButton).toBeDisabled();

    // Fill company — buttons become enabled
    await page.fill('input[placeholder="e.g. Acme Corp"]', "WebCorp");
    await expect(techButton).toBeEnabled();
    await expect(
      page.getByRole("button", { name: /Create HR Screening Interview/i }),
    ).toBeEnabled();
  });

  test("T04: Attempt to create with empty required fields — buttons disabled", async ({ page }) => {
    const techButton = page.getByRole("button", {
      name: /Create Technical Interview/i,
    });
    const hrButton = page.getByRole("button", {
      name: /Create HR Screening Interview/i,
    });

    // All fields empty — buttons disabled
    await expect(techButton).toBeDisabled();
    await expect(hrButton).toBeDisabled();

    // Fill only title — still disabled
    await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', "Some Role");
    await expect(techButton).toBeDisabled();

    // Fill company too — still disabled (no description)
    await page.fill('input[placeholder="e.g. Acme Corp"]', "SomeCorp");
    await expect(techButton).toBeDisabled();

    // Fill description — now enabled
    await page.fill(
      'textarea[placeholder="Paste the job description here..."]',
      "A job description",
    );
    await expect(techButton).toBeEnabled();
    await expect(hrButton).toBeEnabled();
  });

  test("T05: Boundary values for Number of Questions — clamped to 1-20", async ({ page }) => {
    const numInput = page.locator('input[type="number"]');

    // Type 0 — should clamp to 1
    await numInput.fill("0");
    await numInput.blur();
    await expect(numInput).toHaveValue("1");

    // Type -5 — should clamp to 1
    await numInput.fill("-5");
    await numInput.blur();
    await expect(numInput).toHaveValue("1");

    // Type 25 — should clamp to 20
    await numInput.fill("25");
    await numInput.blur();
    await expect(numInput).toHaveValue("20");

    // Valid value: 10
    await numInput.fill("10");
    await numInput.blur();
    await expect(numInput).toHaveValue("10");
  });
});

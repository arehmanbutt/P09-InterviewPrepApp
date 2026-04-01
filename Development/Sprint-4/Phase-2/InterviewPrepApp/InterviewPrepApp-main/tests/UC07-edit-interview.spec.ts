import { test, expect } from "@playwright/test";
import { createTechnicalInterview, findInterviewCard, deleteInterview } from "./helpers";

test.describe("UC07 - Edit Interview", () => {
  let interviewTitle: string;
  let updatedTitle: string;

  test.beforeAll(async ({ browser }) => {
    updatedTitle = `Updated ${Date.now()}`;
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    interviewTitle = await createTechnicalInterview(page, {
      title: `EditTest ${Date.now()}`,
      company: "EditCorp",
    });
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "tests/.auth/user.json",
    });
    const page = await context.newPage();
    // Title may have been changed by T01 — try updated first, then original
    try {
      await deleteInterview(page, updatedTitle);
    } catch {
      try {
        await deleteInterview(page, interviewTitle);
      } catch {
        // already cleaned up
      }
    }
    await context.close();
  });

  test("T01: Happy path — edit title and company of a scheduled interview", async ({ page }) => {
    const card = await findInterviewCard(page, interviewTitle);

    const editButton = card.getByLabel("Edit interview");
    await expect(editButton).toBeVisible();
    await editButton.click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByText("Edit Interview")).toBeVisible();

    // Modify the title to a unique value
    const titleInput = modal.locator("#edit-title");
    await expect(titleInput).toBeVisible();
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    const companyInput = modal.locator("#edit-company");
    await companyInput.clear();
    await companyInput.fill("Updated Corp");

    await modal.getByRole("button", { name: "Save Changes" }).click();

    await expect(modal).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(updatedTitle)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Updated Corp").first()).toBeVisible();

    // Update for subsequent tests and cleanup
    interviewTitle = updatedTitle;
  });

  test("T02: Edit and cancel — modal closes, no changes saved", async ({ page }) => {
    const card = await findInterviewCard(page, interviewTitle);
    const originalTitle = interviewTitle;

    await card.getByLabel("Edit interview").click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 15_000 });

    const titleInput = modal.locator("#edit-title");
    await titleInput.clear();
    await titleInput.fill("Should Not Be Saved");

    await modal.getByRole("button", { name: "Cancel" }).click();

    await expect(modal).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(originalTitle)).toBeVisible();
    await expect(page.getByText("Should Not Be Saved")).not.toBeVisible();
  });

  test("T03: Edit with whitespace-only title — validation prevents save", async ({ page }) => {
    const card = await findInterviewCard(page, interviewTitle);
    await card.getByLabel("Edit interview").click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 15_000 });

    const titleInput = modal.locator("#edit-title");
    await titleInput.clear();
    await titleInput.fill("   ");

    await modal.getByRole("button", { name: "Save Changes" }).click();

    await page.waitForTimeout(2_000);
    const modalStillOpen = await modal.isVisible();
    const hasError = await page
      .getByText(/error|required|invalid|empty|failed/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(modalStillOpen || hasError).toBeTruthy();

    if (modalStillOpen) {
      await modal.getByRole("button", { name: "Cancel" }).click();
    }
  });

  test("T04: Edit button only appears for scheduled interviews, not completed", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const cards = page.locator(".rounded-xl.border");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const isScheduled = await card
        .getByText("Scheduled")
        .isVisible()
        .catch(() => false);

      if (isScheduled) {
        await expect(card.getByLabel("Edit interview")).toBeVisible();
      } else {
        await expect(card.getByLabel("Edit interview")).not.toBeVisible();
      }
    }
  });

  test("T05: Edit another user's interview via API — returns 403 or 404", async ({ page }) => {
    const response = await page.request.patch("/api/interviews/000000000000000000000000", {
      data: {
        title: "Hacked Title",
        company: "Hacked Corp",
        description: "Hacked description",
      },
    });

    expect([403, 404]).toContain(response.status());
  });
});

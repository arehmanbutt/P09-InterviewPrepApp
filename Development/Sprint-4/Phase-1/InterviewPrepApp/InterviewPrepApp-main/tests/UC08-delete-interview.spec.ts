import { test, expect } from "@playwright/test";
import { createTechnicalInterview, findInterviewCard, getCardWrapper } from "./helpers";

test.describe("UC08 - Delete Interview", () => {
  test("T01: Happy path — delete a scheduled interview with confirmation", async ({ page }) => {
    const title = await createTechnicalInterview(page, {
      title: `DeleteTest ${Date.now()}`,
    });

    const card = await findInterviewCard(page, title);
    const wrapper = getCardWrapper(page, title);
    const cardsBefore = await page.locator("h3").count();

    // Click trash icon on the card
    await card.getByLabel("Delete interview").click();

    // Confirmation dialog appears (sibling of card, inside wrapper)
    await expect(wrapper.getByText("Delete this interview? This cannot be undone.")).toBeVisible();

    // Confirm deletion
    await wrapper.locator("button.bg-red-600").click();

    // Card should disappear
    await expect(card).not.toBeVisible({ timeout: 10_000 });

    // Interview count should decrease
    const cardsAfter = await page.locator("h3").count();
    expect(cardsAfter).toBeLessThan(cardsBefore);
  });

  test("T02: Click delete then cancel — interview NOT deleted", async ({ page }) => {
    const title = await createTechnicalInterview(page, {
      title: `DeleteCancel ${Date.now()}`,
    });

    const card = await findInterviewCard(page, title);
    const wrapper = getCardWrapper(page, title);

    // Click delete
    await card.getByLabel("Delete interview").click();

    // Confirmation should appear
    await expect(wrapper.getByText("Delete this interview? This cannot be undone.")).toBeVisible();

    // Click Cancel
    await wrapper.getByRole("button", { name: "Cancel" }).click();

    // Confirmation should disappear
    await expect(
      wrapper.getByText("Delete this interview? This cannot be undone."),
    ).not.toBeVisible();

    // Interview should still be there
    await expect(page.getByText(title)).toBeVisible();

    // Cleanup
    await card.getByLabel("Delete interview").click();
    await wrapper.locator("button.bg-red-600").click();
    await expect(card).not.toBeVisible({ timeout: 10_000 });
  });

  test("T03: Delete button appears on all interviews regardless of status", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const cards = page.locator(".rounded-xl.border");
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByLabel("Delete interview")).toBeVisible();
    }
  });

  test("T04: Delete interview — verify title disappears from page", async ({ page }) => {
    const title = await createTechnicalInterview(page, {
      title: `DeleteVerify ${Date.now()}`,
    });

    const card = await findInterviewCard(page, title);
    const wrapper = getCardWrapper(page, title);
    await expect(page.getByText(title)).toBeVisible();

    // Delete it
    await card.getByLabel("Delete interview").click();
    await wrapper.locator("button.bg-red-600").click();

    await expect(card).not.toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(title, { exact: true })).not.toBeVisible();
  });

  test("T05: Attempt to delete another user's interview via API — 403 or 404", async ({ page }) => {
    const response = await page.request.delete("/api/interviews/000000000000000000000000");

    expect([403, 404]).toContain(response.status());
  });
});

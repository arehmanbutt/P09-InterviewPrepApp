import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Creates a technical interview and waits for redirect to dashboard.
 * Returns the title used so tests can locate the created interview.
 */
export async function createTechnicalInterview(
  page: Page,
  options: { title?: string; company?: string; numQuestions?: number } = {},
): Promise<string> {
  const title = options.title ?? `E2E Tech ${Date.now()}`;
  const company = options.company ?? "E2E Corp";
  const numQuestions = options.numQuestions ?? 1;

  await page.goto("/create-interview");
  await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', title);
  await page.fill('input[placeholder="e.g. Acme Corp"]', company);
  await page.fill(
    'textarea[placeholder="Paste the job description here..."]',
    "A backend engineer with experience in Node.js, REST APIs, and databases.",
  );
  await page.locator('input[type="number"]').fill(String(numQuestions));

  await page.getByRole("button", { name: /Create Technical Interview/i }).click();

  // Wait for generation and redirect
  await page.waitForURL("**/dashboard", { timeout: 90_000 });
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });

  return title;
}

/**
 * Creates an HR screening interview and waits for redirect to dashboard.
 */
export async function createHRInterview(
  page: Page,
  options: { title?: string; company?: string; numQuestions?: number } = {},
): Promise<string> {
  const title = options.title ?? `E2E HR ${Date.now()}`;
  const company = options.company ?? "E2E Corp";
  const numQuestions = options.numQuestions ?? 1;

  await page.goto("/create-interview");
  await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', title);
  await page.fill('input[placeholder="e.g. Acme Corp"]', company);
  await page.fill(
    'textarea[placeholder="Paste the job description here..."]',
    "An HR screening for a product manager with stakeholder management skills.",
  );
  await page.locator('input[type="number"]').fill(String(numQuestions));

  await page.getByRole("button", { name: /Create HR Screening Interview/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 90_000 });
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });

  return title;
}

/**
 * Creates a mass interview and returns the title.
 */
export async function createMassInterview(
  page: Page,
  options: { title?: string; company?: string } = {},
): Promise<string> {
  const title = options.title ?? `E2E Mass ${Date.now()}`;
  const company = options.company ?? "E2E Corp";

  await page.goto("/create-interview");
  await page.fill('input[placeholder="e.g. Senior Backend Engineer"]', title);
  await page.fill('input[placeholder="e.g. Acme Corp"]', company);
  await page.fill(
    'textarea[placeholder="Paste the job description here..."]',
    "A mass interview for frontend developers skilled in React and TypeScript.",
  );
  await page.locator('input[type="number"]').fill("1");

  // Toggle mass interview ON
  const toggle = page.getByRole("switch");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  await page.getByRole("button", { name: /Create Technical Interview/i }).click();

  await page.waitForURL("**/dashboard", { timeout: 90_000 });
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 10_000 });

  return title;
}

/**
 * Navigates to dashboard and finds an interview card by title.
 * Returns the card locator.
 */
export async function findInterviewCard(page: Page, title: string) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  const card = page.locator(".rounded-xl.border").filter({ hasText: title }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  return card;
}

/**
 * Returns the outer wrapper div that contains both the card and
 * the delete confirmation dialog (which is a sibling of the card).
 */
export function getCardWrapper(page: Page, title: string) {
  return page.locator(".rounded-xl.border").filter({ hasText: title }).first().locator("..");
}

/**
 * Deletes the first interview matching the given title from the dashboard.
 */
export async function deleteInterview(page: Page, title: string) {
  const card = await findInterviewCard(page, title);
  const wrapper = getCardWrapper(page, title);
  await card.getByLabel("Delete interview").click();
  // Confirmation is rendered as a sibling of the card, inside the wrapper
  await expect(wrapper.getByText("Delete this interview? This cannot be undone.")).toBeVisible();
  await wrapper.locator("button.bg-red-600").click();
  await expect(card).not.toBeVisible({ timeout: 10_000 });
}

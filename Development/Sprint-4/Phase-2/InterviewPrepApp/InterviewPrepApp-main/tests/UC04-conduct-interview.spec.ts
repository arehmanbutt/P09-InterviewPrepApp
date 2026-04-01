import { test, expect } from "@playwright/test";
import {
  createTechnicalInterview,
  createHRInterview,
  findInterviewCard,
  deleteInterview,
} from "./helpers";

test.describe("UC04 - Conduct Voice Interview", () => {
  // Mock microphone for all tests
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const dest = ctx.createMediaStreamDestination();
      oscillator.connect(dest);
      oscillator.start();
      const silentStream = dest.stream;
      navigator.mediaDevices.getUserMedia = async () => silentStream;
    });

    // Mock Deepgram WebSocket to avoid real API calls
    await page.routeWebSocket(/deepgram\.com/, (ws) => {
      ws.onMessage((message) => {
        if (typeof message === "string") {
          try {
            const data = JSON.parse(message);
            if (data.type === "SettingsConfiguration") {
              ws.send(JSON.stringify({ type: "SettingsApplied" }));
            }
          } catch {
            // ignore non-JSON messages
          }
        }
      });
    });
  });

  test("T01: Start a technical interview — pre-start screen shows, then active session", async ({
    page,
  }) => {
    // Create an interview to test with
    const title = await createTechnicalInterview(page);

    // Find and click Start
    const card = await findInterviewCard(page, title);
    await card.getByRole("link", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/interview\//);

    // Pre-start screen: shows interview title, "Start Interview" button, "Back to Dashboard"
    await expect(page.getByRole("heading", { level: 1 })).toContainText(title);
    const startBtn = page.getByRole("button", { name: "Start Interview" });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Back to Dashboard" })).toBeVisible();

    // Click Start Interview
    await startBtn.click();

    // Active session: "End Interview" button should appear
    await expect(page.getByRole("button", { name: "End Interview" })).toBeVisible({
      timeout: 15_000,
    });

    // Question counter should be visible
    await expect(page.getByText(/Question \d+ of \d+/)).toBeVisible();

    // Cleanup: go back and delete
    await page.goto("/dashboard");
    await deleteInterview(page, title);
  });

  test("T02: Create HR interview, verify it appears on dashboard with correct status", async ({
    page,
  }) => {
    const title = await createHRInterview(page);

    const card = await findInterviewCard(page, title);

    // Verify the card has "Scheduled" badge and "Start" link
    await expect(card.getByText("Scheduled")).toBeVisible();
    await expect(card.getByRole("link", { name: "Start" })).toBeVisible();

    // Cleanup
    await deleteInterview(page, title);
  });

  test("T03: Deny microphone permission — app shows error or handles gracefully", async ({
    page,
  }) => {
    // Override getUserMedia to reject
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
    });

    const title = await createTechnicalInterview(page);
    const card = await findInterviewCard(page, title);
    await card.getByRole("link", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/interview\//);

    // Click Start Interview with denied mic
    const startBtn = page.getByRole("button", { name: "Start Interview" });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // App should NOT crash — page should still be interactive
    // Either shows an error message or the End Interview button still appears
    await page.waitForTimeout(3_000);
    const hasEndBtn = await page
      .getByRole("button", { name: "End Interview" })
      .isVisible()
      .catch(() => false);
    const hasErrorText = await page
      .getByText(/microphone|permission|denied|error|access/i)
      .first()
      .isVisible()
      .catch(() => false);
    const hasStartBtn = await startBtn.isVisible().catch(() => false);

    // At least one of these must be true: app recovered, showed error, or stayed on start screen
    expect(hasEndBtn || hasErrorText || hasStartBtn).toBeTruthy();

    // Cleanup
    await page.goto("/dashboard");
    await deleteInterview(page, title);
  });

  test("T04: Navigate away during interview and return — page reloads correctly", async ({
    page,
  }) => {
    const title = await createTechnicalInterview(page);
    const card = await findInterviewCard(page, title);
    await card.getByRole("link", { name: "Start" }).click();
    await expect(page).toHaveURL(/\/interview\//);
    const interviewUrl = page.url();

    // Navigate away
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    // Return to interview
    await page.goto(interviewUrl);
    await expect(page).toHaveURL(/\/interview\//);

    // Page should load with Start Interview button (pre-start screen)
    await expect(page.getByRole("button", { name: "Start Interview" })).toBeVisible({
      timeout: 10_000,
    });

    // Cleanup
    await page.goto("/dashboard");
    await deleteInterview(page, title);
  });

  test("T05: End interview shows confirmation dialog", async ({ page }) => {
    const title = await createTechnicalInterview(page);
    const card = await findInterviewCard(page, title);
    await card.getByRole("link", { name: "Start" }).click();

    const startBtn = page.getByRole("button", { name: "Start Interview" });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    const endBtn = page.getByRole("button", { name: "End Interview" });
    await expect(endBtn).toBeVisible({ timeout: 15_000 });

    // Click End Interview — should show confirmation
    await endBtn.click();

    await expect(
      page.getByText("Are you sure? This will end the interview and generate feedback."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "End & Generate Feedback" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Click Cancel — confirmation should disappear, End Interview remains
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(endBtn).toBeVisible();

    // Cleanup
    await page.goto("/dashboard");
    await deleteInterview(page, title);
  });
});

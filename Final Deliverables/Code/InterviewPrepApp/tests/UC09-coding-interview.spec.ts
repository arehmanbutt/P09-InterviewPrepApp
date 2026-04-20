import { test, expect } from "@playwright/test";

test.describe("UC09 - Coding Interview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/coding-interview", { timeout: 45_000 });
    await page.waitForLoadState("domcontentloaded");
    // Wait for problems to load — h1 with problem title appears
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  });

  test("T01: Page loads with problem, editor, and run button", async ({ page }) => {
    // Problem title visible
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const titleText = await h1.textContent();
    expect(titleText!.length).toBeGreaterThan(0);

    // Monaco editor present
    await expect(page.locator(".monaco-editor")).toBeVisible();

    // Description tab active
    await expect(page.getByRole("button", { name: "Description" })).toBeVisible();

    // Run Code button visible
    await expect(page.getByRole("button", { name: "Run Code" })).toBeVisible();

    // Problem counter visible (e.g., "1 / 5")
    await expect(page.getByText(/1\s*\/\s*\d+/)).toBeVisible();
  });

  test("T02: Write code and run — shows test results with pass/fail counts", async ({ page }) => {
    // Write code using Monaco API
    await page.evaluate(() => {
      const model = (
        window as unknown as {
          monaco?: { editor?: { getModels?: () => { setValue: (v: string) => void }[] } };
        }
      ).monaco?.editor?.getModels()?.[0];
      if (model) {
        model.setValue("function solution(nums) {\n  return nums.reduce((a, b) => a + b, 0);\n}\n");
      }
    });

    // Click Run Code
    const runButton = page.getByRole("button", { name: "Run Code" });
    await runButton.click();

    // Button should change to "Running..."
    await expect(page.getByRole("button", { name: "Running..." })).toBeVisible({ timeout: 5_000 });

    // Test Results panel should appear
    await expect(page.getByText("Test Results")).toBeVisible({
      timeout: 15_000,
    });

    // Should show pass/fail count like "X/Y passed"
    await expect(page.getByText(/\d+\/\d+ passed/)).toBeVisible();
  });

  test("T03: Run wrong code — shows Wrong Answer with expected vs actual", async ({ page }) => {
    // Set deliberately wrong code
    await page.evaluate(() => {
      const model = (
        window as unknown as {
          monaco?: { editor?: { getModels?: () => { setValue: (v: string) => void }[] } };
        }
      ).monaco?.editor?.getModels()?.[0];
      if (model) {
        model.setValue("function solution() {\n  return -1;\n}\n");
      }
    });

    await page.getByRole("button", { name: "Run Code" }).click();

    await expect(page.getByText("Test Results")).toBeVisible({
      timeout: 15_000,
    });

    // Should show "Wrong Answer" badge
    await expect(page.getByText("Wrong Answer").first()).toBeVisible({
      timeout: 15_000,
    });

    // Should show expected vs actual comparison
    await expect(page.getByText("Expected:").first()).toBeVisible();
    await expect(page.getByText("Your output:").first()).toBeVisible();
  });

  test("T04: Run code with syntax error — shows error output", async ({ page }) => {
    await page.evaluate(() => {
      const model = (
        window as unknown as {
          monaco?: { editor?: { getModels?: () => { setValue: (v: string) => void }[] } };
        }
      ).monaco?.editor?.getModels()?.[0];
      if (model) {
        model.setValue("function solution() {\n  return \n}\n{{{");
      }
    });

    await page.getByRole("button", { name: "Run Code" }).click();

    await expect(page.getByText("Test Results")).toBeVisible({
      timeout: 15_000,
    });

    // Should show "Error:" in the results
    await expect(page.getByText("Error:").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("T05: Navigate between problems — Prev/Next buttons and counter update", async ({
    page,
  }) => {
    // Should start at problem 1
    await expect(page.getByText(/1\s*\/\s*\d+/)).toBeVisible();

    // Prev button should NOT be visible on first problem
    const prevButton = page.getByRole("button", { name: "← Prev" });
    await expect(prevButton).not.toBeVisible();

    // Next button should be visible
    const nextButton = page.getByRole("button", { name: "Next →" });
    await expect(nextButton).toBeVisible();

    // Click Next
    await nextButton.click();
    await page.waitForTimeout(1_000);

    // Counter should update to "2 / N"
    await expect(page.getByText(/2\s*\/\s*\d+/)).toBeVisible();

    // Prev should now be visible
    await expect(prevButton).toBeVisible();

    // Click Prev to go back
    await prevButton.click();
    await page.waitForTimeout(1_000);

    // Counter should be back to "1 / N"
    await expect(page.getByText(/1\s*\/\s*\d+/)).toBeVisible();
  });

  test("T06: Switch programming language", async ({ page }) => {
    const langSelect = page.locator("select").first();
    await expect(langSelect).toBeVisible();

    // Switch to Python
    await langSelect.selectOption("python");
    await page.waitForTimeout(500);
    await expect(page.locator(".monaco-editor")).toBeVisible();

    // Switch to C++
    await langSelect.selectOption("cpp");
    await page.waitForTimeout(500);
    await expect(page.locator(".monaco-editor")).toBeVisible();

    // Switch back to JavaScript
    await langSelect.selectOption("javascript");
    await page.waitForTimeout(500);
    await expect(page.locator(".monaco-editor")).toBeVisible();
  });
});

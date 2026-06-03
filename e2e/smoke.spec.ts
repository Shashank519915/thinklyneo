import { test, expect } from "@playwright/test";

/**
 * Public-route smoke tests (no Clerk session required).
 * CI targets the deployed frontend; override with PLAYWRIGHT_BASE_URL for local dev.
 */
test.describe("public routes smoke", () => {
  test("sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("docs proxy responds", async ({ page }) => {
    const response = await page.goto("/docs");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
  });
});

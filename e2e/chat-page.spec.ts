import { test, expect } from "@playwright/test";

/**
 * Chat route smoke — unauthenticated users are redirected or see sign-in.
 */
test.describe("chat page smoke", () => {
  test("chat route responds without server error", async ({ page }) => {
    const response = await page.goto("/chat");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/chat returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.get("/api/chat");
    expect(res.status()).toBe(401);
  });
});

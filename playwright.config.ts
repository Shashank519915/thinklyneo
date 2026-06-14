import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "https://thinklyneo.vercel.app";
const useLocalServer = process.env.PLAYWRIGHT_LOCAL === "1";

/**
 * Smoke e2e against a running app.
 * CI sets PLAYWRIGHT_LOCAL=1 and builds/starts the frontend so chat API proxy is tested
 * from the branch under test (not stale production). Override with PLAYWRIGHT_BASE_URL for local dev.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: useLocalServer
    ? {
        command: "pnpm start --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          ...process.env,
          BACKEND_URL:
            process.env.BACKEND_URL ?? "https://thinklyneo-backend.vercel.app",
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
            "pk_test_bmF0aW9uYWwtZXdlLTM5LmNsZXJrLmFjY291bnRzLmRldiQ",
          CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
        },
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});

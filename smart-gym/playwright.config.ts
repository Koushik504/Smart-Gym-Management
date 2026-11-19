import "dotenv/config";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["json", { outputFile: "docs/BROWSER_RESULTS.json" }]],
  use: {
    baseURL: process.env.APP_ORIGIN || "http://127.0.0.1:3100",
    channel: "msedge",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});

import { defineConfig } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  // The shared development proxy can be slow during Vite's first module load.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.AUTO_RESEARCH_PREVIEW_URL ?? "http://localhost:80",
    browserName: "chromium",
    launchOptions: executablePath ? { executablePath } : {},
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
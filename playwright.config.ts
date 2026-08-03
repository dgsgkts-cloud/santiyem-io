// Depo E2E — depoya ait (repository-owned) Playwright yapılandırması.
//
// Harici bir yardımcı pakete bağımlılık yoktur; yalnızca @playwright/test
// kullanılır. Dev sunucusu zaten 8080'de çalışıyorsa yeniden başlatılmaz.

import { defineConfig, devices } from "@playwright/test";

const APP_URL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

// Sandbox ortamında yüklü Chromium sürümü paketle birebir aynı olmayabilir.
// E2E_CHROMIUM_PATH verildiğinde o çalıştırılabilir dosya kullanılır.
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: APP_URL,
    trace: "retain-on-failure",
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
});

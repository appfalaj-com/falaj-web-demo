import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.FALAJ_E2E_PORT || 4173);
const host = process.env.FALAJ_E2E_HOST || "127.0.0.1";
const baseURL = process.env.FALAJ_E2E_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: process.env.FALAJ_E2E_BASE_URL
    ? undefined
    : {
        command: `node ./node_modules/vite/bin/vite.js --host ${host} --port ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

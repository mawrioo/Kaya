import { defineConfig } from "@playwright/test"

// Never reuse a running server: 3000/4000 belong to the owner's app and real data.
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node tests/browser-server.mjs backend",
      url: "http://127.0.0.1:4100/api/data",
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "node tests/browser-server.mjs frontend",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
})

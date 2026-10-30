import { readdirSync } from "node:fs"
import { defineConfig } from "@playwright/test"

// Never reuse a running server: 3000/4000 belong to the owner's app and real data.
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3200",
    launchOptions: { args: process.env.KAYA_BROWSER_DISABLE_GPU === "1" ? ["--disable-gpu"] : [] },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  globalSetup: "./tests/browser-server.mjs",
  projects: readdirSync(`${__dirname}/tests`)
    .filter((name) => name.endsWith(".spec.ts"))
    .map((name) => ({ name: name.replace(".spec.ts", ""), testMatch: `**/${name}` })),
})

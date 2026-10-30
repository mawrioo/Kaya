import { expect, test, type Page } from "./browser-fixtures"

const noOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

test.beforeEach(async () => {
  const response = await fetch("http://127.0.0.1:4200/__test/reset", {
    method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN! },
  })
  expect(response.ok).toBe(true)
})

test("six wallets can be compared in the initial phone viewport, with independent persistent privacy", async ({ page, request }, info) => {
  for (const name of ["Mandiri", "Cash"]) {
    expect((await request.post("/api/wallets", { data: { name, kind: "bank", startingBalance: 25000000 } })).ok()).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")
  const wallets = page.getByRole("region", { name: "Wallets", exact: true })
  await expect(wallets.getByRole("listitem")).toHaveCount(6)
  const strip = page.getByRole("button", { name: "Quick add", exact: true })
  const last = (await wallets.getByRole("listitem").last().boundingBox())!
  expect(last.y + last.height).toBeLessThan((await strip.boundingBox())!.y)
  const balances = wallets.locator("li > div > p:last-child")
  const edges = await balances.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().right))
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(1)
  await page.getByRole("button", { name: "Hide BCA balance", exact: true }).click()
  await expect(wallets.getByRole("listitem").filter({ hasText: "BCA" })).not.toContainText("8.742.300")
  await expect(page.getByRole("button", { name: "Hide Bank Jago balance", exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole("button", { name: "Show BCA balance", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Hide total balance", exact: true }).click()
  await expect(page.getByRole("button", { name: "Balance breakdown", exact: true })).toHaveCount(0)
  await noOverflow(page)
  await page.screenshot({ path: info.outputPath("home-six-wallets.png"), animations: "disabled" })
})

test("wallet details, value updates and menus stay reachable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto("/wallets")
  const bca = page.locator("#wallet-card-wallet-bca")
  await expect(bca).toContainText("8.742.300")
  await bca.getByRole("button", { name: "More options for BCA", exact: true }).click()
  await page.getByRole("menuitem", { name: "Correct balance", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  const investment = page.locator("#wallet-card-wallet-pluang")
  await investment.getByRole("button", { name: "More options for Pluang", exact: true }).click()
  await page.getByRole("menuitem", { name: "Show wallet details", exact: true }).click()
  await investment.getByRole("button", { name: "Update value for Pluang", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await noOverflow(page)
})

test("transactions appear early, filters preserve their scope and totals remain available", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/transactions?month=2026-09")
  await expect(page.getByRole("combobox", { name: "Filter by wallet" })).toBeHidden()
  const row = page.locator(".group\\/row").first()
  await expect(row).toBeVisible()
  expect((await row.boundingBox())!.y).toBeLessThan(550)
  await page.getByRole("button", { name: /^Filters/ }).click()
  await page.getByRole("combobox", { name: "Filter by wallet" }).click()
  await page.getByRole("option", { name: "BCA", exact: true }).click()
  await page.getByRole("button", { name: /^Filters/ }).click()
  await expect(page.getByText("Filtered by: BCA", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /· Totals$/ }).click()
  await expect(page.getByRole("region", { name: "Totals", exact: true }).getByText("Money in", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "More transaction actions", exact: true }).click()
  await page.getByRole("menuitem", { name: "Import CSV", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await page.getByRole("button", { name: "Clear filters", exact: true }).click()
  await expect(page.getByText("Filtered by: BCA", { exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Date range:/ })).toContainText("All dates")
  await noOverflow(page)
})

for (const theme of ["light", "dark"] as const) {
  test(`phone layouts keep the records readable across widths (${theme})`, async ({ page }, info) => {
    test.setTimeout(180_000)
    const errors: string[] = []
    page.on("pageerror", error => errors.push(error.message))
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 })
      for (const route of ["/", "/wallets", "/transactions?month=2026-09", "/categories", "/goals", "/insights?month=2026-09", "/insights?view=compare&month=2026-09", "/insights?view=year&year=2026"]) {
        await page.goto(route)
        await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
        await noOverflow(page)
        if (width === 390) await page.screenshot({ path: info.outputPath(`${route.replace(/[^a-z0-9]/gi, "_") || "home"}.png`), animations: "disabled" })
      }
    }
    expect(errors).toEqual([])
  })
}

test("long names and balances, increased text size, and landscape retain access", async ({ page, request }) => {
  expect((await request.put("/api/wallets/wallet-bca", { data: { name: "My household spending account" } })).ok()).toBe(true)
  expect((await request.post("/api/wallets", { data: { name: "Long balance", kind: "cash", startingBalance: 987654321000 } })).ok()).toBe(true)
  for (const viewport of [{ width: 360, height: 780 }, { width: 740, height: 360 }]) {
    await page.setViewportSize(viewport)
    for (const route of ["/", "/wallets", "/transactions?month=2026-09", "/categories", "/goals", "/insights?month=2026-09"]) {
      await page.goto(route)
      await page.evaluate(() => { document.documentElement.style.fontSize = "20px" })
      await noOverflow(page)
    }
  }
})

test("desktop retains visible wallet details and transaction filters", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/wallets")
  await expect(page.getByRole("button", { name: "Balance breakdown", exact: true })).toBeHidden()
  await expect(page.getByRole("button", { name: "Update value for Pluang", exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath("wallets-desktop.png"), animations: "disabled" })
  await page.goto("/transactions?month=2026-09")
  await expect(page.getByRole("combobox", { name: "Filter by wallet" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Import CSV", exact: true })).toBeVisible()
  await expect(page.getByRole("region", { name: "Totals", exact: true }).getByText("Money in", { exact: true })).toBeVisible()
  await noOverflow(page)
  await page.screenshot({ path: info.outputPath("transactions-desktop.png"), animations: "disabled" })
})

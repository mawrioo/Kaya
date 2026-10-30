import { editQuickDraft, entryOption, saveQuickDraft, finishQuickDraft } from "./quick-entry-helpers"
import { expect, test, type APIRequestContext } from "./browser-fixtures"

const read = async (request: APIRequestContext) => (await request.get("/api/data")).json()
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date())
const expense = (description: string) => ({ type: "expense", amount: 23000, walletId: "wallet-bca", categoryId: "cat-food", date: `${today()}T12:00:00+07:00`, description })

test("two open windows pick up saved changes without losing a draft or filter", async ({ page, context, request }) => {
  const before = await read(request)
  const categoryId = before.categories.find((c: { type: string }) => c.type === "expense").id
  const second = await context.newPage()
  await page.goto("/wallets")
  await second.goto("/transactions")
  await second.getByRole("button", { name: "Add transaction", exact: true }).click()
  await second.getByLabel("Note (optional)").fill("Keep this unfinished note")
  const response = await request.post("/api/transactions", { data: { ...expense("Live window check"), categoryId } })
  expect(response.ok()).toBe(true)
  const { transaction } = await response.json()
  try {
    await expect(page.locator("#wallet-card-wallet-bca")).toContainText("8.719.300", { timeout: 12000 })
    await expect(second.getByLabel("Note (optional)")).toHaveValue("Keep this unfinished note")
    await second.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(second.getByText("Live window check", { exact: true })).toBeVisible({ timeout: 12000 })
    await second.reload()
    await expect(second.getByText("Live window check", { exact: true })).toBeVisible()
  } finally { await request.delete(`/api/transactions/${transaction.id}`); await second.close() }
})

test("a stale poll cannot undo the visible result of a local save", async ({ page, request }) => {
  const before = await read(request)
  await page.goto("/wallets")
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  let release!: () => void
  const held = new Promise<void>((resolve) => { release = resolve })
  let reading!: () => void
  const started = new Promise<void>((resolve) => { reading = resolve })
  let heldFirstRead = false
  await page.route("**/api/data", async (route) => {
    // Hold the polling read only; the save's fresh duplicate check must still reach the server.
    if (heldFirstRead) return route.continue()
    heldFirstRead = true
    reading()
    await held
    await route.fulfill({ json: before })
  })
  await started
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await entryOption(page, "Simple expense")
  await page.getByLabel("Your expense").fill("kopi 23rb BCA")
  await page.getByRole("button", { name: "Review", exact: true }).click()
  await editQuickDraft(page)
  await page.getByLabel("Note (optional)").fill("Stale poll check")
  await page.locator("#tx-category").click()
  await page.getByRole("option", { name: "Food", exact: true }).click()
  await saveQuickDraft(page)
  await finishQuickDraft(page)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  release()
  await page.waitForTimeout(500)
  await expect(page.locator("#wallet-card-wallet-bca")).toContainText("8.719.300")
  await page.unroute("**/api/data")
  const data = await read(request)
  const saved = data.transactions.find((tx: { description: string }) => tx.description === "Stale poll check")
  expect(saved).toBeTruthy()
  await request.delete(`/api/transactions/${saved.id}`)
})

test("month rollover follows the default filter, preserves a draft and respects Clear filters", async ({ page }) => {
  await page.goto("/transactions")
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  await page.clock.setFixedTime(new Date("2026-12-31T23:59:55+07:00"))
  await expect(page.getByRole("button", { name: /^Date range:/ })).toContainText("Dec", { timeout: 5000 })
  await page.getByRole("button", { name: "Add transaction", exact: true }).click()
  await page.getByLabel("Note (optional)").fill("Midnight draft")
  const date = await page.locator("#tx-date").innerText()
  await page.clock.setFixedTime(new Date("2027-01-01T00:00:02+07:00"))
  await page.waitForTimeout(1500)
  await expect(page.getByLabel("Note (optional)")).toHaveValue("Midnight draft")
  await expect(page.locator("#tx-date")).toHaveText(date)
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(page.getByRole("button", { name: /^Date range:/ })).toContainText("Jan")
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().click()
  await page.clock.setFixedTime(new Date("2027-02-01T00:00:02+07:00"))
  await page.waitForTimeout(1500)
  await expect(page.getByRole("button", { name: /^Date range:/ })).toContainText("All dates")
})

test("matured deposito reminders can be dismissed and stay dismissed on reload", async ({ page, request }) => {
  const response = await request.post("/api/wallets", { data: {
    name: "Reminder deposito", kind: "deposito", startingBalance: 100000,
    deposito: { ratePercent: 5, startDate: "2020-01-01", tenorMonths: 1, rollover: false, fromWalletId: "wallet-bca" },
  } })
  expect(response.ok()).toBe(true)
  const { wallet } = await response.json()
  try {
    await page.goto("/")
    const link = page.getByRole("link", { name: /Reminder deposito has matured/ })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", `/wallets#wallet-card-${wallet.id}`)
    await page.getByRole("button", { name: "Dismiss Reminder deposito has matured" }).click()
    await expect(link).toHaveCount(0)
    await page.reload()
    await expect(link).toHaveCount(0)
  } finally { await request.delete(`/api/wallets/${wallet.id}`) }
})

test("charts have themed series, detailed keyboard-accessible figures and private hidden balances", async ({ page }, info) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  for (const [width, theme] of [[1440, "light"], [390, "dark"], [320, "light"]] as const) {
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/insights?month=2026-09")
    const summary = page.locator("summary", { hasText: "View monthly figures" })
    await summary.focus()
    await page.keyboard.press("Enter")
    const table = page.getByRole("table", { name: "Income and spending, month by month" })
    await expect(table).toBeVisible()
    await expect(table).toContainText("September 2026")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await page.locator("[data-slot=month-chart] .recharts-bar").count()).toBe(2)
    const contrast = await page.getByRole("region", { name: "Month by month", exact: true }).evaluate((panel) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const ctx = canvas.getContext("2d")!
      const luminance = (color: string) => {
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3).map((n) => {
          const value = n / 255
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        })
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
      }
      const background = luminance(getComputedStyle(panel).backgroundColor)
      return Array.from(panel.querySelectorAll(".recharts-bar-rectangle path")).map((bar) => {
        const foreground = luminance(getComputedStyle(bar).fill)
        return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05)
      })
    })
    expect(contrast.length).toBeGreaterThan(0)
    for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(3)
    await page.getByRole("region", { name: "Month by month", exact: true }).screenshot({ path: info.outputPath(`charts-${width}-${theme}.png`), animations: "disabled" })
    await page.getByRole("button", { name: "Hide total balance", exact: true }).click()
    await expect(page.locator("summary", { hasText: "View balance figures" })).toHaveCount(0)
    await expect(page.locator("[data-slot=balance-chart]")).toHaveCount(0)
    await page.getByRole("button", { name: "Show total balance", exact: true }).click()
  }
  expect(errors).toEqual([])
})

test("offline reads keep cached balances and reconnect refreshes without a reload", async ({ page, context, request }) => {
  const before = await read(request)
  const categoryId = before.categories.find((c: { type: string }) => c.type === "expense").id
  await page.goto("/wallets")
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  await context.setOffline(true)
  // This request comes from the independent API client, like a second device.
  const response = await request.post("/api/transactions", { data: { ...expense("Offline refresh check"), categoryId } })
  const { transaction } = await response.json()
  try {
    await page.waitForTimeout(5500)
    await expect(page.locator("#wallet-card-wallet-bca")).toContainText("8.742.300")
    await context.setOffline(false)
    await expect(page.locator("#wallet-card-wallet-bca")).toContainText("8.719.300", { timeout: 12000 })
  } finally {
    await context.setOffline(false)
    await request.delete(`/api/transactions/${transaction.id}`)
  }
})

test("a new day refreshes deposito interest, maturity and goal reminders without recording income", async ({ page, request }) => {
  const setDay = async (date: string | null) => {
    const response = await fetch("http://127.0.0.1:4200/__test/date", {
      method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN!, "content-type": "application/json" }, body: JSON.stringify({ date }),
    })
    expect(response.ok).toBe(true)
    return response.json()
  }
  await setDay("2026-10-31")
  const deposited = await request.post("/api/wallets", { data: {
    name: "Day-change deposito", kind: "deposito", startingBalance: 1000000,
    deposito: { ratePercent: 5, startDate: "2026-10-01", tenorMonths: 1, rollover: false, fromWalletId: "wallet-bca" },
  } })
  const { wallet } = await deposited.json()
  const goalResponse = await request.post("/api/goals", { data: {
    name: "Day-change goal", targetAmount: 2000000, savedAmount: 0, targetDate: "2026-11-08", walletId: "wallet-bca", icon: "gift",
  } })
  const { goal } = await goalResponse.json()
  try {
    await page.clock.setFixedTime(new Date("2026-10-31T23:59:55+07:00"))
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
    await expect(page.getByRole("link", { name: /Day-change deposito has matured/ })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /Day-change goal:/ })).toHaveCount(0)
    const before = await read(request)
    const after = await setDay("2026-11-01")
    await page.clock.setFixedTime(new Date("2026-11-01T00:00:02+07:00"))
    await expect(page.getByRole("link", { name: /Day-change deposito has matured/ })).toBeVisible({ timeout: 12000 })
    await expect(page.getByRole("link", { name: /Day-change goal:/ })).toBeVisible()
    expect(after.transactions).toHaveLength(before.transactions.length)
    expect(after.wallets.find((w: { id: string }) => w.id === wallet.id).deposito.interest).toBeGreaterThan(before.wallets.find((w: { id: string }) => w.id === wallet.id).deposito.interest)
  } finally {
    await request.delete(`/api/goals/${goal.id}`)
    await request.delete(`/api/wallets/${wallet.id}`)
    await setDay(null)
  }
})

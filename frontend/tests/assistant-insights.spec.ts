import { expect, test, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"
import { formatRupiah } from "../lib/format"

async function freezeDay() {
  const response = await fetch("http://127.0.0.1:4200/__test/date", { method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN!, "content-type": "application/json" }, body: JSON.stringify({ date: "2026-10-28" }) })
  expect(response.ok).toBe(true)
}
async function ask(page: Page, text: string) {
  const disclosure = page.getByRole("button", { name: "Questions and recurring payments", exact: true })
  if (await disclosure.isVisible() && await disclosure.getAttribute("aria-expanded") === "false") await disclosure.click()
  const panel = page.getByRole("region", { name: "Ask about your records" })
  await panel.getByLabel("Your spending question").fill(text)
  await panel.getByRole("button", { name: "Ask", exact: true }).click()
  await expect(panel.getByRole("button", { name: "Ask", exact: true })).toBeEnabled()
  return panel
}
async function openRecurring(page: Page) {
  const panel = page.getByRole("region", { name: "Ask about your records" })
  const summary = panel.locator("summary").filter({ hasText: /^Recurring payments/ })
  if (!(await summary.locator("..").evaluate(el => (el as HTMLDetailsElement).open))) await summary.click()
  return panel
}

test("spending totals link to exactly the supporting date, wallet and category records", async ({ page, request }) => {
  await freezeDay()
  const before: AppData = await (await request.get("/api/data")).json()
  const food = before.categories.find(c => c.name === "Food" && c.type === "expense")!
  const wallet = before.wallets.find(w => w.name === "Bank Jago")!
  const expected = before.transactions.filter(t => t.type === "expense" && t.categoryId === food.id && t.walletId === wallet.id && t.date.slice(0, 7) === "2026-09")
  await page.goto("/insights")
  const panel = await ask(page, `How much did I spend on Food from ${wallet.name} in September 2026?`)
  const answer = panel.getByRole("status").filter({ hasText: "Recorded spending." })
  await expect(answer).toContainText(formatRupiah(expected.reduce((sum, t) => sum + t.amount, 0)))
  const link = answer.getByRole("link").first()
  const href = new URL((await link.getAttribute("href"))!, "http://localhost")
  expect(href.searchParams.get("from")).toBe("2026-09-01")
  expect(href.searchParams.get("to")).toBe("2026-09-30")
  expect(href.searchParams.get("wallet")).toBe(wallet.id)
  expect(href.searchParams.get("category")).toBe(food.id)
  await link.click()
  await expect(page.getByRole("heading", { name: "Transactions", exact: true })).toBeVisible()
  await expect(page.locator("[data-swipe-row]")).toHaveCount(expected.length)
  expect((await (await request.get("/api/data")).json()).transactions).toEqual(before.transactions)
})

test("comparison keeps separate evidence and unsupported restrictions ask instead of widening", async ({ page }) => {
  await freezeDay()
  await page.goto("/insights")
  const panel = await ask(page, "Compare spending September 2026 with August 2026")
  const links = panel.getByRole("status").filter({ hasText: "Recorded spending for each period." }).getByRole("link")
  await expect(links).toHaveCount(2)
  expect(new URL((await links.nth(0).getAttribute("href"))!, "http://localhost").searchParams.get("from")).toBe("2026-09-01")
  expect(new URL((await links.nth(1).getAttribute("href"))!, "http://localhost").searchParams.get("from")).toBe("2026-08-01")
  for (const text of ["Total mysterycategory last month", "How much did I spend excluding Food last month?", "Compare spending this month with last week"]) {
    await ask(page, text)
    await expect(panel.getByRole("status").filter({ hasText: /could not match|two whole months/ })).toBeVisible()
    await expect(panel.getByRole("status").getByRole("link")).toHaveCount(0)
  }
})

test("a largest-expense link scopes the list to its record and can be cleared", async ({ page, request }) => {
  await freezeDay()
  const before: AppData = await (await request.get("/api/data")).json()
  const rows = before.transactions.filter(t => t.type === "expense" && t.date.slice(0, 7) === "2026-09").sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date))
  await page.goto("/insights")
  const panel = await ask(page, "Show my 3 highest expenses September 2026")
  const evidence = panel.getByRole("status").filter({ hasText: "Largest recorded expenses" }).getByRole("link")
  await expect(evidence).toHaveCount(3)
  const link = evidence.first()
  expect(new URL((await link.getAttribute("href"))!, "http://localhost").searchParams.get("ids")).toBe(rows[0].id)
  await link.click()
  await expect(page.locator("[data-swipe-row]")).toHaveCount(1)
  await expect(page.locator(`[data-swipe-row="${rows[0].id}"]`)).toBeVisible()
  await page.getByRole("button", { name: "Show all records in this period" }).click()
  await expect(page.locator("[data-swipe-row]")).toHaveCount(Math.min(rows.length, 30))
})

test("track, dismiss and remove persist without recording future payments", async ({ page, request }) => {
  await freezeDay()
  const before: AppData = await (await request.get("/api/data")).json()
  const category = before.categories.find(c => c.name === "Entertainment" && c.type === "expense")!
  const wallet = before.wallets.find(w => w.name === "BCA")!
  for (const date of ["2026-08-21", "2026-09-21", "2026-10-21"]) {
    const response = await request.post("/api/transactions", { data: { type: "expense", amount: 49000, date: `${date}T12:00:00+07:00`, walletId: wallet.id, categoryId: category.id, description: "Browser music plan" } })
    expect(response.status()).toBe(201)
  }
  const seeded: AppData = await (await request.get("/api/data")).json()
  await page.goto("/insights")
  let panel = await openRecurring(page)
  let row = panel.locator("li").filter({ has: page.getByRole("link", { name: "View 3 matching payments", exact: true }) }).filter({ hasText: "Browser music plan" })
  await expect(row).toContainText("monthly")
  await expect(row).toContainText("21 Nov 2026")
  await row.getByRole("button", { name: "Track payment" }).click()
  await expect(row).toContainText("Tracked")
  await page.reload()
  panel = await openRecurring(page)
  row = panel.locator("li").filter({ has: page.getByRole("link", { name: "View 3 matching payments", exact: true }) }).filter({ hasText: "Browser music plan" })
  await expect(row).toContainText("Tracked")
  await row.getByRole("button", { name: "Dismiss", exact: true }).click()
  await expect(row).toHaveCount(0)
  await page.reload()
  panel = await openRecurring(page)
  await panel.locator("summary").filter({ hasText: "Manage saved choices" }).click()
  const saved = panel.locator("li").filter({ hasText: "Browser music plan / dismissed" })
  await expect(saved).toBeVisible()
  await saved.getByRole("button", { name: "Remove choice" }).click()
  await expect(panel.getByText("Browser music plan", { exact: true })).toBeVisible()
  const after: AppData = await (await request.get("/api/data")).json()
  expect(after.transactions).toEqual(seeded.transactions)
  expect(after.wallets).toEqual(seeded.wallets)
  expect(after.transactions).toHaveLength(before.transactions.length + 3)
})

test("editing a question discards a delayed answer", async ({ page }) => {
  await page.goto("/insights")
  let release!: () => void
  let waiting = false
  let finished = false
  await page.route("**/api/assistant/questions", async route => {
    const response = await route.fetch()
    waiting = true
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ response }).catch(() => {})
    finished = true
  })
  const panel = page.getByRole("region", { name: "Ask about your records" })
  await panel.getByLabel("Your spending question").fill("Total spending September 2026")
  await panel.getByRole("button", { name: "Ask", exact: true }).click()
  await expect.poll(() => waiting).toBe(true)
  await panel.getByLabel("Your spending question").fill("Total income September 2026")
  release()
  await expect.poll(() => finished).toBe(true)
  await expect(panel.getByRole("status").getByRole("link")).toHaveCount(0)
})

test("record changes clear an answer and abort a delayed answer without clearing the question", async ({ page, request }) => {
  await freezeDay()
  const before: AppData = await (await request.get("/api/data")).json()
  const wallet = before.wallets.find(w => w.name === "BCA")!
  const category = before.categories.find(c => c.type === "expense" && c.name === "Food")!
  const text = "Total spending September 2026"
  await page.goto("/insights")
  const panel = await ask(page, text)
  await expect(panel.getByRole("status").getByRole("link")).toHaveCount(1)
  const add = async () => {
    const response = await request.post("/api/transactions", { data: { type: "expense", amount: 12345, walletId: wallet.id, categoryId: category.id, date: "2026-09-29T12:00:00+07:00", description: "Browser refreshed spending" } })
    expect(response.status()).toBe(201)
  }
  await add()
  await expect(panel.getByRole("alert")).toContainText("Records changed", { timeout: 15000 })
  await expect(panel.getByRole("status").getByRole("link")).toHaveCount(0)
  await expect(panel.getByLabel("Your spending question")).toHaveValue(text)
  await ask(page, text)
  const updated: AppData = await (await request.get("/api/data")).json()
  const total = updated.transactions.filter(t => t.type === "expense" && t.date.slice(0, 7) === "2026-09").reduce((sum, t) => sum + t.amount, 0)
  await expect(panel.getByRole("status").filter({ hasText: "Recorded spending." })).toContainText(formatRupiah(total))
  let release!: () => void
  let waiting = false
  let finished = false
  await page.route("**/api/assistant/questions", async route => {
    const response = await route.fetch()
    waiting = true
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ response }).catch(() => {})
    finished = true
  })
  await panel.getByRole("button", { name: "Ask", exact: true }).click()
  await expect.poll(() => waiting).toBe(true)
  await add()
  await expect(panel.getByRole("alert")).toContainText("Records changed", { timeout: 15000 })
  release()
  await expect.poll(() => finished).toBe(true)
  await expect(panel.getByRole("status").getByRole("link")).toHaveCount(0)
  await expect(panel.getByLabel("Your spending question")).toHaveValue(text)
})

for (const [width, theme] of [[1440, "light"], [390, "dark"]] as const) {
  test(`assistant Insights fits ${width}px ${theme}`, async ({ page }, info) => {
    await freezeDay()
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    await page.goto("/insights")
    const panel = await ask(page, "Total spending last month")
    await openRecurring(page)
    await expect(panel.getByRole("status").filter({ hasText: "Recorded spending." })).toBeVisible()
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await panel.screenshot({ path: info.outputPath("assistant-insights.png"), animations: "disabled" })
  })
}

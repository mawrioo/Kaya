import { expect, test, type APIRequestContext } from "./browser-fixtures"
import type { AppData, Transaction } from "../lib/types"

// The printable monthly report: its numbers against the data, as printed, in dark mode, and on a phone.
const BASE = "http://localhost:3200"
const NBSP = String.fromCharCode(0xa0)
const plain = (text: string) => text.split(NBSP).join(" ")
const dots = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
const read = async (request: APIRequestContext) => (await (await request.get("/api/data")).json()) as AppData

/** The latest month that has any money in or out, "2026-09": the month Home and the report start on while this one is empty. */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
function monthOf(transactions: Transaction[], wanted: string) {
  const inMonth = transactions.filter((tx) => tx.date.startsWith(wanted))
  return {
    inMonth,
    income: inMonth.reduce((s, tx) => s + (tx.type === "income" ? tx.amount : 0), 0),
    spending: inMonth.reduce((s, tx) => s + (tx.type === "expense" ? tx.amount : 0), 0),
  }
}
const nameOf = (month: string) => `${MONTHS[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`

test("Insights has a Report link for the month on screen; the sheet holds the month's real figures and no wallet balance", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const data = await read(request)
  const month = "2026-09"
  const { inMonth, income, spending } = monthOf(data.transactions, month)

  await page.goto(`/insights?month=${month}`)
  await page.getByRole("link", { name: "Report" }).click()
  await page.waitForURL(new RegExp(`/insights/report\\?month=${month}`))
  const sheet = page.getByRole("article", { name: `Monthly report, ${nameOf(month)}` })
  await expect(sheet).toBeVisible()
  await expect(page).toHaveTitle(new RegExp(`Kaya report ${nameOf(month)}`))

  const text = plain(await sheet.innerText())
  expect(text).toContain(`+Rp ${dots(income)}`)
  expect(text).toContain(`−Rp ${dots(spending)}`)
  expect(text).toContain(`+Rp ${dots(income - spending)}`)
  for (const heading of ["The month at a glance", "In words", "Where it went", "Where it came from", "The biggest expenses", "Which wallets paid", "Where the goals stand today", "Every transaction"]) {
    expect(text).toContain(heading)
  }
  // Every transaction of the month is listed, and none from another month.
  await expect(sheet.getByRole("table", { name: "Every transaction" }).locator("tbody tr")).toHaveCount(inMonth.length)
  // (A goal's own amounts are on the sheet by design, and one can equal a wallet's balance: those are left out of the check.)
  const goalAmounts = new Set(data.goals.flatMap((goal) => [goal.savedAmount, goal.targetAmount]))
  for (const wallet of data.wallets.filter((entry) => !goalAmounts.has(entry.balance))) expect(text).not.toContain(`Rp ${dots(wallet.balance)}`)
  expect(errors).toEqual([])
})

test("the month switcher steps to another month, renames the page, and Back to Insights returns to it", async ({ page }) => {
  await page.goto("/insights/report?month=2026-09")
  await page.getByRole("button", { name: /Previous month/ }).click()
  await page.waitForURL(/month=2026-08/)
  await expect(page.getByRole("article", { name: "Monthly report, August 2026" })).toBeVisible()
  await expect(page).toHaveTitle(/August 2026/)
  await page.getByRole("link", { name: "Back to Insights" }).click()
  await page.waitForURL(/\/insights\?month=2026-08/)
  // A month that doesn't exist falls back to the one Home shows rather than printing an empty sheet.
  await page.goto("/insights/report?month=1999-01")
  await expect(page.getByRole("article")).toBeVisible()
  await expect(page.getByRole("article")).not.toHaveAttribute("aria-label", /1999/)
})

test("printed, only the sheet is left: no menu, no buttons, no Quick add coin; and it makes a PDF of a few pages", async ({ page }) => {
  await page.goto("/insights/report?month=2026-09")
  await expect(page.getByRole("article")).toBeVisible()
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible()
  await page.emulateMedia({ media: "print" })
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeHidden()
  await expect(page.getByRole("link", { name: "Back to Insights" })).toBeHidden()
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeHidden()
  await expect(page.locator("[data-slot='sidebar']").first()).toBeHidden()
  await expect(page.getByRole("heading", { name: "Monthly report" })).toBeHidden()
  const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-")
  const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length
  expect(pages).toBeGreaterThanOrEqual(2)
  expect(pages).toBeLessThanOrEqual(5)
  await page.emulateMedia({ media: "screen" })
})

test("in dark mode the sheet is still light paper with dark ink, so what you see is what prints", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE, colorScheme: "dark", viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  await page.goto("/insights/report?month=2026-09")
  const sheet = page.getByRole("article")
  await expect(sheet).toBeVisible()
  const colours = await sheet.evaluate((el) => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext("2d")!
    return [getComputedStyle(el).backgroundColor, getComputedStyle(el).color].map((color) => {
      ctx.fillStyle = color
      ctx.fillRect(0, 0, 1, 1)
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3)
    })
  })
  expect(Math.min(...colours[0])).toBeGreaterThan(220)
  expect(Math.max(...colours[1])).toBeLessThan(90)
  await context.close()
})

test("on a phone and a tablet nothing runs off the side", async ({ browser }) => {
  for (const [width, height] of [[390, 844], [320, 640], [820, 1180]]) {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width, height } })
    const page = await context.newPage()
    await page.goto("/insights/report?month=2026-09")
    await expect(page.getByRole("article")).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no sideways scroll at ${width}px`).toBe(true)
    await context.close()
  }
})

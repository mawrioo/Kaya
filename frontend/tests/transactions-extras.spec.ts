import { expect, test, type APIRequestContext, type Page } from "@playwright/test"
import type { AppData, Transaction } from "../lib/types"

// Totals, day totals, hover buttons, Duplicate, and Save and add another. They share one in-memory database; everything
// they add is deleted again at the end, so the files after this one find the data as they left it.
test.describe.configure({ mode: "serial" })

const NBSP = String.fromCharCode(0xa0)
const plain = (text: string) => text.split(NBSP).join(" ")
const dots = (n: number) => String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
const rp = (n: number, sign: "auto" | "always" = "auto") => `${n < 0 ? "−" : sign === "always" && n > 0 ? "+" : ""}Rp ${dots(n)}`

const read = async (request: APIRequestContext) => (await (await request.get("/api/data")).json()) as AppData
let baseline: Set<string>

test.beforeAll(async ({ request }) => {
  baseline = new Set((await read(request)).transactions.map((tx) => tx.id))
})
test.afterAll(async ({ request }) => {
  for (const tx of (await read(request)).transactions) if (!baseline.has(tx.id)) await request.delete(`/api/transactions/${tx.id}`)
})

const sums = (transactions: Transaction[]) => ({
  income: transactions.reduce((s, tx) => s + (tx.type === "income" ? tx.amount : 0), 0),
  spending: transactions.reduce((s, tx) => s + (tx.type === "expense" ? tx.amount : 0), 0),
  transfers: transactions.filter((tx) => tx.type === "transfer").length,
})
const strip = (page: Page) => page.getByRole("region", { name: "Totals" })
const quickAddCoin = (page: Page) => page.getByRole("button", { name: "Quick add", exact: true })

test("the strip under the filters adds up what the list holds: money in, money out, net, and what it leaves out", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const { transactions } = await read(request)
  const { income, spending, transfers } = sums(transactions)

  await page.goto("/transactions")
  await expect(strip(page)).toBeVisible()
  const text = plain(await strip(page).innerText())
  for (const expected of [rp(income, "always"), rp(-spending), rp(income - spending, "always")]) expect(text).toContain(expected)
  expect(text).toContain(`Showing 30 of ${transactions.length} transactions`)
  expect(text).toContain(`Totals cover all ${transactions.length}.`)
  expect(text).toContain(`${transfers} transfers aren't counted.`)
  expect(errors).toEqual([])
})

test("filters change the totals, and with nothing left the strip gives way to the usual message", async ({ page, request }) => {
  const { transactions, wallets } = await read(request)
  const jago = wallets.find((wallet) => wallet.name === "Bank Jago")!
  const inJago = transactions.filter((tx) => tx.type !== "transfer" && tx.walletId === jago.id)

  await page.goto("/transactions")
  await page.getByRole("combobox", { name: "Filter by wallet" }).click()
  await page.getByRole("option", { name: "Bank Jago" }).click()
  await expect(strip(page)).toContainText(rp(-sums(inJago).spending))
  expect(plain(await strip(page).innerText())).toContain(rp(sums(inJago).income - sums(inJago).spending, "always"))

  await page.getByRole("searchbox", { name: "Search transactions" }).fill("zzzz nothing matches this")
  await expect(strip(page)).toHaveCount(0)
  await expect(page.getByText("Nothing matches these filters")).toBeVisible()
})

test("each day's heading says what that day came to, and a day with only transfers says nothing", async ({ page, request }) => {
  const { transactions } = await read(request)
  const byDay = new Map<string, Transaction[]>()
  for (const tx of transactions) byDay.set(tx.date.slice(0, 10), [...(byDay.get(tx.date.slice(0, 10)) ?? []), tx])
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  const withMoney = days.find(([, list]) => list.some((tx) => tx.type !== "transfer"))!
  const onlyTransfers = days.find(([, list]) => list.every((tx) => tx.type === "transfer"))

  await page.goto("/transactions")
  const net = sums(withMoney[1]).income - sums(withMoney[1]).spending
  const [year, month, day] = withMoney[0].split("-").map(Number)
  const label = `${day} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]} ${year}`
  const heading = page.getByRole("heading", { level: 2 }).filter({ hasText: label }).first()
  expect(plain(await heading.innerText())).toContain(rp(net, "always"))
  await expect(heading.getByText("Net for the day")).toBeAttached()
  if (onlyTransfers) {
    const [y, m, d] = onlyTransfers[0].split("-").map(Number)
    const quiet = page.getByRole("heading", { level: 2 }).filter({ hasText: `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${y}` }).first()
    await expect(quiet.getByText("Net for the day")).toHaveCount(0)
  }
})

test("a row's buttons appear when it is pointed at, or when one has the keyboard; there are three: Edit, Duplicate, Delete", async ({ page }) => {
  await page.goto("/transactions")
  const row = page.locator("li[data-swipe-row]").first()
  const buttons = row.locator(".row-actions")
  await page.mouse.move(2, 2)
  await expect(buttons).toHaveCSS("opacity", "0")
  await row.hover()
  await expect(buttons).toHaveCSS("opacity", "1")
  await expect(row.getByRole("button")).toHaveCount(3)
  await page.mouse.move(2, 2)
  await expect(buttons).toHaveCSS("opacity", "0")
  await row.getByRole("button", { name: /^Edit/ }).focus()
  await expect(buttons).toHaveCSS("opacity", "1")
  await expect(row.getByRole("button", { name: /^Duplicate/ })).toBeVisible()
})

test("Duplicate opens the form filled in and dated today; nothing is saved until Save; the copied category survives a new note", async ({ page, request }) => {
  const before = await read(request)
  await page.goto("/transactions")
  const original = before.transactions.filter((tx) => tx.type === "expense").sort((a, b) => b.date.localeCompare(a.date))[0]
  const target = page.locator(`li[data-swipe-row="${original.id}"]`)

  await target.hover()
  await target.getByRole("button", { name: /^Duplicate/ }).click()
  const dialog = page.getByRole("dialog", { name: "Duplicate transaction" })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel("Note (optional)")).toHaveValue(original.description)
  await expect(dialog.locator("#tx-amount")).toHaveValue(dots(original.amount))
  const category = before.categories.find((c) => c.id === original.categoryId)!
  await expect(dialog.locator("#tx-category")).toContainText(category.name)
  const today = new Date()
  await expect(dialog.locator("#tx-date")).toContainText(`${today.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][today.getMonth()]} ${today.getFullYear()}`)
  expect((await read(request)).transactions).toHaveLength(before.transactions.length)

  await dialog.getByLabel("Note (optional)").fill("Kopi pagi, a copy")
  await expect(dialog.locator("#tx-category")).toContainText(category.name)
  await dialog.getByRole("button", { name: "Add transaction", exact: true }).click()
  await expect(dialog).toHaveCount(0)

  const after = await read(request)
  expect(after.transactions).toHaveLength(before.transactions.length + 1)
  const copy = after.transactions.find((tx) => tx.description === "Kopi pagi, a copy")!
  expect(copy).toMatchObject({ type: original.type, amount: original.amount })
  expect(copy.date.slice(0, 10)).toBe(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`)
  expect(after.transactions.find((tx) => tx.id === original.id)).toEqual(original)
})

test("Save and add another keeps the box open and starts over; the kind, wallet and date stay; an empty form is refused", async ({ page, request }) => {
  const before = await read(request)
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Add transaction", exact: true }).first().click()
  const dialog = page.getByRole("dialog", { name: "Add transaction" })
  await expect(dialog.getByRole("button", { name: "Save and add another" })).toBeVisible()

  await dialog.getByRole("button", { name: "Save and add another" }).click()
  await expect(dialog.getByText("Enter an amount.")).toBeVisible()
  expect((await read(request)).transactions).toHaveLength(before.transactions.length)

  const wallet = (await dialog.locator("#tx-wallet").innerText()).trim()
  const date = (await dialog.locator("#tx-date").innerText()).trim()
  await dialog.locator("#tx-amount").fill("11000")
  await dialog.locator("#tx-category").click()
  await page.getByRole("option", { name: "Transport" }).click()
  await dialog.getByLabel("Note (optional)").fill("Parkir mall")
  await dialog.getByRole("button", { name: "Save and add another" }).click()

  await expect(dialog.locator("#tx-amount")).toHaveValue("")
  await expect(dialog.locator("#tx-amount")).toBeFocused()
  await expect(dialog.getByLabel("Note (optional)")).toHaveValue("")
  await expect(dialog.locator("#tx-category")).toContainText("Choose a category")
  await expect(dialog.locator("#tx-wallet")).toContainText(wallet)
  await expect(dialog.locator("#tx-date")).toContainText(date)
  await expect(dialog).toBeVisible()
  expect((await read(request)).transactions).toHaveLength(before.transactions.length + 1)

  // The second is saved with the ordinary button, which closes the box. Both are in the list without a reload.
  await dialog.locator("#tx-amount").fill("9000")
  await dialog.locator("#tx-category").click()
  await page.getByRole("option", { name: "Food" }).click()
  await dialog.getByLabel("Note (optional)").fill("Es kopi susu")
  await dialog.getByRole("button", { name: "Add transaction", exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const after = await read(request)
  expect(after.transactions).toHaveLength(before.transactions.length + 2)
  expect(after.transactions.find((tx) => tx.description === "Parkir mall")).toMatchObject({ amount: 11_000, categoryId: "cat-transport" })
  await expect(page.getByText("Parkir mall")).toBeVisible()
})

test("editing has no Save and add another: it only saves the one", async ({ page }) => {
  await page.goto("/transactions")
  const row = page.locator("li[data-swipe-row]").first()
  await row.hover()
  await row.getByRole("button", { name: /^Edit/ }).click()
  const dialog = page.getByRole("dialog", { name: "Edit transaction" })
  await expect(dialog.getByRole("button", { name: "Save changes" })).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Save and add another" })).toHaveCount(0)
  await dialog.getByRole("button", { name: "Cancel" }).click()
})

test("Quick add can save and add another: it goes back to the one-line box, ready for the next line", async ({ page, request }) => {
  const before = await read(request)
  await page.goto("/")
  await expect(quickAddCoin(page)).toBeEnabled()
  await quickAddCoin(page).click()
  // Its title changes from "Quick add" to "Add transaction" once the line has filled the form, so it is found as the only dialog.
  const dialog = page.getByRole("dialog")
  const line = dialog.getByRole("textbox", { name: "Your expense" })
  await line.fill("bakso 30rb BCA")
  await line.press("Enter")
  await expect(dialog.getByLabel("Note (optional)")).toHaveValue("bakso")
  await dialog.locator("#tx-category").click()
  await page.getByRole("option", { name: "Food" }).click()
  await dialog.getByRole("button", { name: "Save and add another" }).click()

  await expect(dialog.getByRole("textbox", { name: "Your expense" })).toHaveValue("")
  await expect(dialog.getByRole("textbox", { name: "Your expense" })).toBeFocused()
  await expect(dialog.getByRole("button", { name: "Save and add another" })).toHaveCount(0)
  const mid = await read(request)
  expect(mid.transactions).toHaveLength(before.transactions.length + 1)
  expect(mid.transactions.find((tx) => tx.description === "bakso")).toMatchObject({ amount: 30_000 })

  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
})

test("on a tablet and a phone the strip and the toolbar fit, with nothing running off the side", async ({ browser }) => {
  for (const [width, height] of [[820, 1180], [390, 844], [320, 640], [1024, 768]]) {
    const context = await browser.newContext({ baseURL: "http://localhost:3100", viewport: { width, height } })
    const page = await context.newPage()
    await page.goto("/transactions")
    await expect(strip(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no sideways scroll at ${width}px`).toBe(true)
    const box = await strip(page).boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    // The search box is never squeezed into a sliver by the buttons beside it.
    const search = await page.getByRole("searchbox", { name: "Search transactions" }).boundingBox()
    expect(search!.width).toBeGreaterThan(200)
    await context.close()
  }
})

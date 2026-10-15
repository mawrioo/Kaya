import { expect, test, type APIRequestContext, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

// Importing a bank's CSV, on the shared in-memory database. What it imports it takes out again (with Undo, and then by hand
// for anything left), so the files that run after this one find the data as they left it.
test.describe.configure({ mode: "serial" })

const BASE = "http://localhost:3200"
const read = async (request: APIRequestContext) => (await (await request.get("/api/data")).json()) as AppData
const balance = (data: AppData, name: string) => data.wallets.find((wallet) => wallet.name === name)!.balance
let baseline: AppData

test.beforeAll(async ({ request }) => {
  baseline = await read(request)
  expect(baseline.wallets.some((wallet) => wallet.name === "BCA")).toBe(true)
})
test.afterAll(async ({ request }) => {
  const ids = new Set(baseline.transactions.map((tx) => tx.id))
  for (const tx of (await read(request)).transactions) if (!ids.has(tx.id)) await request.delete(`/api/transactions/${tx.id}`)
})

// The shape of a BCA-style download: lines above the table, no year on the dates, English numbers, DB/CR in a column of its own.
// The salary is one the app already has (the sample data has a September salary of 12.500.000 on 25 Sep 2026).
const BCA_LIKE = `Informasi Rekening - Mutasi Rekening
No. rekening : 1234567890
Periode : 01/09/2026 - 09/10/2026

Tanggal Transaksi,Keterangan,Cabang,Jumlah,,Saldo
'25/09/2026,September salary,0000,"12,500,000.00",CR,"21,242,300.00"
'03/10/2026,KARTU DEBIT 0310 KOPI KENANGAN SUDIRMAN,0998,"25,000.00",DB,"21,217,300.00"
'04/10/2026,GRAB *RIDE 1234 JAKARTA,0998,"18,000.00",DB,"21,199,300.00"
'05/10/2026,BUNGA TABUNGAN,0000,"1,250.00",CR,"21,200,550.00"
xx/yy,Broken line,0000,"5,000.00",DB,
Saldo Awal : 8,742,300.00
`

const file = (name: string, content: string | Buffer) => ({ name, mimeType: "text/csv", buffer: Buffer.isBuffer(content) ? content : Buffer.from(content) })
const importButton = (page: Page) => page.getByRole("button", { name: "Import CSV" })
const text = async (locator: ReturnType<Page["locator"]>) => (await locator.innerText()).split(String.fromCharCode(0xa0)).join(" ")

async function openAt(page: Page, wallet: string) {
  await page.goto("/transactions")
  await importButton(page).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("heading", { name: "Import from a bank's file" })).toBeVisible()
  await dialog.locator("#import-wallet").click()
  await page.getByRole("option", { name: wallet }).click()
  return dialog
}

test("a file that isn't a CSV, or is empty, is refused in words and nothing changes", async ({ page, request }) => {
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(file("statement.csv", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x01, 0x00])))
  await expect(dialog.getByText("That isn't a CSV file")).toBeVisible()
  await dialog.locator("#import-file").setInputFiles(file("empty.csv", "\n\n"))
  await expect(dialog.getByText("That file is empty.")).toBeVisible()
  expect((await read(request)).transactions).toHaveLength(baseline.transactions.length)
})

test("it finds the lines, flags what the app has and what can't be read, files each line by the owner's own earlier habits, and shows both balances", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(file("bca-like.csv", BCA_LIKE))
  await expect(dialog.getByRole("heading", { name: "Check the lines" })).toBeVisible()

  const lines = dialog.getByRole("listitem")
  await expect(lines).toHaveCount(5)
  const summary = await text(dialog)
  expect(summary).toContain("3 of 5 ticked")
  expect(summary).toContain("1 already in Kaya")
  expect(summary).toContain("1 can't be read")
  expect(summary).toContain("1 other line left out")

  await expect(lines.filter({ hasText: "September salary" }).getByRole("checkbox")).not.toBeChecked()
  await expect(lines.filter({ hasText: "September salary" })).toContainText("Already in Kaya")
  await expect(lines.filter({ hasText: "Broken line" })).toContainText("Can't read the date.")
  await expect(lines.filter({ hasText: "Broken line" }).getByRole("checkbox")).toBeDisabled()

  // The sample data has "Kopi Kenangan" under Food and "Grab home in the rain" under Transport, so the bank's longer words land there.
  await expect(lines.filter({ hasText: "KOPI KENANGAN" }).locator("select")).toHaveValue("cat-food")
  await expect(lines.filter({ hasText: "KOPI KENANGAN" })).toContainText("From your earlier “Kopi Kenangan”")
  await expect(lines.filter({ hasText: "GRAB" }).locator("select")).toHaveValue("cat-transport")
  await expect(lines.filter({ hasText: "BUNGA" }).locator("select")).toHaveValue("cat-other-income")

  const bca = balance(baseline, "BCA")
  const after = bca - 25_000 - 18_000 + 1_250
  const dots = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  expect(summary).toContain(`BCA goes from Rp ${dots(bca)} to Rp ${dots(after)}`)
  expect(summary).toContain("The bank's own balance in the file is Rp 21.200.550")
  expect(errors).toEqual([])
})

test("choosing lines, changing a category and importing saves exactly those, moves the balance as if added by hand, and Undo takes it all back out", async ({ page, request }) => {
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(file("bca-like.csv", BCA_LIKE))
  const lines = dialog.getByRole("listitem")
  await expect(lines).toHaveCount(5)

  await lines.filter({ hasText: "KOPI KENANGAN" }).locator("select").selectOption("cat-shopping")
  await lines.filter({ hasText: "GRAB" }).getByRole("checkbox").uncheck()
  await expect(dialog).toContainText("2 of 5 ticked")
  await dialog.getByRole("checkbox", { name: "Select all" }).check()
  await expect(dialog).toContainText("4 of 5 ticked")
  await dialog.getByRole("checkbox", { name: "Select all" }).uncheck()
  await expect(dialog.getByRole("button", { name: "Import", exact: true })).toBeDisabled()
  await lines.filter({ hasText: "KOPI KENANGAN" }).getByRole("checkbox").check()
  await lines.filter({ hasText: "BUNGA" }).getByRole("checkbox").check()
  await expect(dialog.getByRole("button", { name: "Import 2 transactions" })).toBeVisible()

  const before = await read(request)
  await dialog.getByRole("button", { name: "Import 2 transactions" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(page.getByText("Imported 2 transactions")).toBeVisible()

  const after = await read(request)
  expect(after.transactions).toHaveLength(before.transactions.length + 2)
  expect(balance(after, "BCA")).toBe(balance(before, "BCA") - 25_000 + 1_250)
  const kopi = after.transactions.find((tx) => tx.description.includes("KOPI KENANGAN"))!
  expect(kopi).toMatchObject({ type: "expense", amount: 25_000, categoryId: "cat-shopping" })
  expect(kopi.date).toMatch(/^2026-10-03T12:00:00[+-]\d\d:\d\d$/)
  expect(after.transactions.find((tx) => tx.description === "BUNGA TABUNGAN")).toMatchObject({ type: "income", amount: 1_250 })
  expect(after.transactions.some((tx) => tx.description.includes("GRAB"))).toBe(false)
  await expect(page.getByText("BUNGA TABUNGAN").first()).toBeVisible()

  await page.getByRole("button", { name: "Undo" }).first().click()
  await expect(page.getByText("Import undone")).toBeVisible()
  const undone = await read(request)
  expect(undone.transactions).toHaveLength(before.transactions.length)
  expect(balance(undone, "BCA")).toBe(balance(before, "BCA"))
  await expect(page.getByText("BUNGA TABUNGAN")).toHaveCount(0)
})

test("importing the same file twice adds nothing new the second time: what is already there is flagged and unticked", async ({ page, request }) => {
  const first = await openAt(page, "BCA")
  await first.locator("#import-file").setInputFiles(file("bca-like.csv", BCA_LIKE))
  await expect(first.getByRole("button", { name: "Import 3 transactions" })).toBeVisible()
  await first.getByRole("button", { name: "Import 3 transactions" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const imported = await read(request)
  expect(imported.transactions).toHaveLength(baseline.transactions.length + 3)

  const second = await openAt(page, "BCA")
  await second.locator("#import-file").setInputFiles(file("bca-like.csv", BCA_LIKE))
  await expect(second.getByRole("heading", { name: "Check the lines" })).toBeVisible()
  await expect(second).toContainText("4 already in Kaya")
  await expect(second).toContainText("0 of 5 ticked")
  await expect(second.getByRole("button", { name: "Import", exact: true })).toBeDisabled()

  // Choosing another wallet means none of them are there yet.
  await second.locator("#import-wallet").click()
  await page.getByRole("option", { name: "Bank Jago" }).click()
  await expect(second).not.toContainText("already in Kaya")
  await expect(second).toContainText("4 of 5 ticked")
  await second.getByRole("button", { name: "Cancel" }).click()
  expect((await read(request)).transactions).toHaveLength(baseline.transactions.length + 3)
})

test("a file in another shape is read too: semicolons, Indonesian numbers, a column each for money out and in, and the columns can be fixed by hand", async ({ page }) => {
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(
    file("other-bank.csv", `Tgl;Uraian;Debet;Kredit;Saldo\n05/10/2026;Listrik PLN;250.000,00;;1.000.000,00\n06/10/2026;Bunga;;1.250,50;1.001.251,00\n`)
  )
  await expect(dialog.getByRole("heading", { name: "Check the lines" })).toBeVisible()
  const lines = dialog.getByRole("listitem")
  await expect(lines).toHaveCount(2)
  await expect(lines.nth(0)).toContainText("−Rp 250.000")
  await expect(lines.nth(1)).toContainText("+Rp 1.251")

  await dialog.getByRole("button", { name: "Cancel" }).click()
})

test("with no column names at all it guesses, and a column picked by hand changes the lines at once", async ({ page }) => {
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(file("plain.csv", "05/10/2026,Kopi,-25000,9999\n06/10/2026,Gaji,12500000,-1\n"))
  await expect(dialog.getByRole("heading", { name: "Check the lines" })).toBeVisible()
  const lines = dialog.getByRole("listitem")
  await expect(lines.nth(0)).toContainText("−Rp 25.000")
  await expect(lines.nth(1)).toContainText("+Rp 12.500.000")

  await dialog.getByText("How the columns were read").click()
  await dialog.locator("#import-amount-column").selectOption("3")
  await expect(lines.nth(0)).toContainText("+Rp 9.999")
  await expect(lines.nth(1)).toContainText("−Rp 1")
  await dialog.locator("#import-amount-column").selectOption("2")
  await expect(lines.nth(0)).toContainText("−Rp 25.000")

  // A column that isn't the dates is told in words on every line (nothing vanishes quietly), and nothing can be imported.
  await dialog.locator("#import-date-column").selectOption("1")
  await expect(lines.nth(0)).toContainText("Can't read the date.")
  await expect(lines.nth(1)).toContainText("Can't read the date.")
  await expect(dialog.getByText("2 can't be read")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Import", exact: true })).toBeDisabled()
  await dialog.getByRole("button", { name: "Cancel" }).click()
})

test("a file with no transactions in it says so, opens the column choices, and has nothing to import", async ({ page }) => {
  const dialog = await openAt(page, "BCA")
  await dialog.locator("#import-file").setInputFiles(file("words.csv", "hello,world\nfoo,bar\n"))
  await expect(dialog.getByRole("heading", { name: "Check the lines" })).toBeVisible()
  await expect(dialog.getByText("couldn't find any transactions")).toBeVisible()
  await expect(dialog.locator("#import-date-column")).toBeVisible()
  await expect(dialog.getByRole("button", { name: "Import", exact: true })).toBeDisabled()
  await dialog.getByRole("button", { name: "Choose another file" }).click()
  await expect(dialog.getByRole("heading", { name: "Import from a bank's file" })).toBeVisible()
  await dialog.getByRole("button", { name: "Cancel" }).click()
})

test("on a phone the import fits the screen from the first step to the list", async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto("/transactions")
  await importButton(page).click()
  const dialog = page.getByRole("dialog")
  await dialog.locator("#import-file").setInputFiles(file("bca-like.csv", BCA_LIKE))
  await expect(dialog.getByRole("heading", { name: "Check the lines" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  await context.close()
})

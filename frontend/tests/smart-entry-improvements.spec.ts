import { editQuickDraft, entryOption, saveQuickDraft, finishQuickDraft, saveAnotherQuickDraft } from "./quick-entry-helpers"
import { expect, test, type Page, type APIRequestContext } from "./browser-fixtures"
import type { AppData, NewTransaction } from "../lib/types"

async function freezeDay() {
  const response = await fetch("http://127.0.0.1:4200/__test/date", { method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN!, "content-type": "application/json" }, body: JSON.stringify({ date: "2026-10-28" }) })
  expect(response.ok).toBe(true)
}
async function open(page: Page, text = "paid 35rb Food BCA last Friday") {
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await page.getByLabel("What happened?").fill(text)
  await page.getByLabel("What happened?").press("Enter")
  await expect(page.locator("#tx-review-heading")).toContainText(/Review|Quick add/)
  await editQuickDraft(page)
}
async function reply(page: Page, text: string) {
  await editQuickDraft(page)
  await page.getByLabel("Reply or correction").fill(text)
  await page.getByLabel("Reply or correction").press("Enter")
  await expect(page.getByLabel("Reply or correction")).toHaveValue("")
}
const entry: NewTransaction = { type: "expense", amount: 35000, walletId: "wallet-bca", categoryId: "cat-food", date: "2026-10-23T12:00:00+07:00", description: "Food" }
async function seed(request: APIRequestContext, input: NewTransaction = entry) {
  const response = await request.post("/api/transactions", { data: input })
  expect(response.status()).toBe(201)
}

test("duplicate notice is advisory, follows edits and undo, and confirmation saves exactly once", async ({ page, request }) => {
  await freezeDay()
  await seed(request)
  const before: AppData = await (await request.get("/api/data")).json()
  await open(page)
  await expect(page.locator("#tx-duplicates")).toContainText("The note matches too")
  await expect(page.locator("#tx-date")).toContainText("23 Oct 2026")
  await expect(page.getByRole("button", { name: /^(Save|Review)$/ })).toBeEnabled()
  await expect(page.getByRole("link", { name: "View this wallet in Transactions (new tab)" })).toHaveAttribute("target", "_blank")
  await reply(page, "make that 40rb")
  await expect(page.locator("#tx-duplicates")).toHaveCount(0)
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(page.locator("#tx-duplicates")).toBeVisible()
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
  await saveQuickDraft(page, true)
  await finishQuickDraft(page)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const after: AppData = await (await request.get("/api/data")).json()
  expect(after.transactions).toHaveLength(before.transactions.length + 1)
  expect(after.wallets.find(w => w.id === "wallet-bca")!.balance).toBe(before.wallets.find(w => w.id === "wallet-bca")!.balance - 35000)
})

test("a match added on another device during review must be seen before the next confirmation", async ({ page, request }) => {
  await freezeDay()
  await open(page)
  const baseline = await (await request.get("/api/data")).json()
  let confirming = false
  let injected = false
  await page.route("**/api/data", async route => {
    if (!confirming) return route.fulfill({ json: baseline })
    if (!injected) { injected = true; await seed(request) }
    return route.continue()
  })
  confirming = true
  await saveQuickDraft(page, true)
  await expect(page.getByRole("alert")).toContainText("appeared since your last review")
  await expect(page.locator("#tx-duplicates")).toBeVisible()
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(baseline.transactions.length + 1)
  await saveQuickDraft(page)
  await finishQuickDraft(page)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(baseline.transactions.length + 2)
})

test("a failed fresh duplicate check keeps the draft and makes no save request", async ({ page, request }) => {
  await freezeDay()
  await open(page)
  const before = await (await request.get("/api/data")).json()
  let writes = 0
  page.on("request", request => { if (request.method() === "POST" && request.url().endsWith("/api/transactions")) writes++ })
  await page.route("**/api/data", route => route.abort("failed"))
  await saveQuickDraft(page)
  await expect(page.getByRole("alert")).toContainText("Could not check for similar entries")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
  expect(writes).toBe(0)
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
  await page.unroute("**/api/data")
})

test("undo restores type-dependent fields and groups a whole manual typing edit", async ({ page }) => {
  await freezeDay()
  await open(page)
  await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
  await reply(page, "this was transfer")
  await expect(page.locator("#tx-category")).toHaveCount(0)
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(page.getByRole("radio", { name: "Expense", exact: true })).toBeChecked()
  await expect(page.locator("#tx-category")).toContainText("Food")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
  const note = page.getByLabel("Note (optional)")
  await note.fill("")
  await note.pressSequentially("Dinner with friends")
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(note).toHaveValue("Food")
  await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
  await page.getByLabel("Amount", { exact: true }).fill("60000")
  await reply(page, "use Bank Jago")
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("60.000")
  await expect(page.locator("#tx-wallet")).toContainText("BCA")
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
})

test("undo restores a missing-field question and invalid corrections add no history", async ({ page }) => {
  await freezeDay()
  await open(page, "beli Food dari BCA Jumat lalu")
  await reply(page, "35rb")
  await page.getByRole("button", { name: "Undo last change" }).click()
  await expect(page.locator("#tx-question")).toHaveText("How much was it?")
  await expect(page.getByRole("button", { name: /^(Save|Review)$/ })).toBeDisabled()
  await expect(page.getByLabel("Reply or correction")).toBeFocused()
  await reply(page, "-35rb")
  await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
})

test("undo aborts an in-flight correction and a stale result cannot restore it", async ({ page }) => {
  await freezeDay()
  await open(page)
  await reply(page, "make that 40rb")
  let release!: () => void
  let waiting = false
  let finished = false
  await page.route("**/api/transactions/preview", async route => {
    const response = await route.fetch()
    waiting = true
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ response }).catch(() => {})
    finished = true
  })
  await page.getByLabel("Reply or correction").fill("actually yesterday")
  await page.getByRole("button", { name: "Apply", exact: true }).click()
  await expect.poll(() => waiting).toBe(true)
  await page.getByRole("button", { name: "Undo last change" }).click()
  release()
  await expect.poll(() => finished).toBe(true)
  await page.unroute("**/api/transactions/preview")
  await reply(page, "note: after undo")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
  await expect(page.locator("#tx-date")).toContainText("23 Oct 2026")
})

test("broader date replies preserve money, show exact dates and reset undo after saving another", async ({ page, request }) => {
  await freezeDay()
  const before = await (await request.get("/api/data")).json()
  await open(page, "paid 35rb Food BCA Friday")
  await expect(page.locator("#tx-question")).toContainText("Which date")
  await reply(page, "last Friday")
  await expect(page.locator("#tx-date")).toContainText("23 Oct 2026")
  await reply(page, "tanggalnya dua hari lalu")
  await expect(page.locator("#tx-date")).toContainText("26 Oct 2026")
  await reply(page, "date the 25th of last month")
  await expect(page.locator("#tx-date")).toContainText("25 Sep 2026")
  await saveAnotherQuickDraft(page)
  await expect(page.getByLabel("What happened?")).toHaveValue("")
  const after: AppData = await (await request.get("/api/data")).json()
  const added = after.transactions.find(t => !before.transactions.some((old: { id: string }) => old.id === t.id))!
  expect(added.amount).toBe(35000)
  expect(added.date.slice(0, 10)).toBe("2026-09-25")
  await page.getByLabel("What happened?").fill("paid 10rb Food BCA")
  await page.getByLabel("What happened?").press("Enter")
  await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
  await reply(page, "make that 20rb")
  await entryOption(page, "Start new")
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await expect(page.getByLabel("What happened?")).toHaveValue("")
  await page.getByLabel("What happened?").fill("paid 10rb Food BCA")
  await page.getByLabel("What happened?").press("Enter")
  await reply(page, "make that 20rb")
  await entryOption(page, "Start new")
  await page.getByLabel("What happened?").fill("paid 30rb Food BCA")
  await page.getByLabel("What happened?").press("Enter")
  await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
})

for (const [width, theme] of [[1440, "light"], [390, "dark"], [320, "light"]] as const) {
  test(`duplicate review and undo fit ${width}px ${theme}`, async ({ page, request }, info) => {
    await freezeDay()
    await seed(request)
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    await open(page)
    await reply(page, "make that 35rb")
    await expect(page.getByRole("button", { name: "Undo last change" })).toHaveCount(0)
    await page.locator("#tx-duplicates").scrollIntoViewIfNeeded()
    await expect(page.locator("#tx-duplicates")).toBeInViewport()
    expect(await page.getByRole("dialog").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("duplicates.png"), animations: "disabled" })
    await page.getByRole("button", { name: /^(Save|Review)$/ }).scrollIntoViewIfNeeded()
    await expect(page.getByRole("button", { name: /^(Save|Review)$/ })).toBeInViewport()
  })
}

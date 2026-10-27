import { expect, test, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

async function open(page: Page) {
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await expect(page.getByLabel("Your transaction")).toBeFocused()
}
async function prepare(page: Page, sentence: string) {
  await page.getByLabel("Your transaction").fill(sentence)
  await page.getByLabel("Your transaction").press("Enter")
}

test("expense, income and transfer are editable drafts until explicit confirmation", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  for (const [sentence, type, amount] of [
    ["paid 35rb for lunch from BCA yesterday", "expense", 35000],
    ["received Salary 5jt in Bank Jago today", "income", 5000000],
    ["transfer 500rb from BCA to Bank Jago", "transfer", 500000],
  ] as const) {
    const before: AppData = await (await request.get("/api/data")).json()
    await open(page)
    await prepare(page, sentence)
    await expect(page.getByRole("heading", { name: "Review transaction" })).toBeVisible()
    await expect(page.getByRole("radio", { name: type[0].toUpperCase() + type.slice(1), exact: true })).toBeChecked()
    expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
    // A second Enter on the focused amount must not silently confirm.
    await page.getByLabel("Amount", { exact: true }).press("Enter")
    expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
    await page.getByLabel("Note (optional)").fill(`Smart ${type} check`)
    if (type !== "transfer") await expect(page.locator("#tx-category")).not.toContainText("Choose a category")
    await page.getByRole("button", { name: "Confirm and save", exact: true }).dblclick()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const after: AppData = await (await request.get("/api/data")).json()
    expect(after.transactions).toHaveLength(before.transactions.length + 1)
    expect(after.transactions.find(t => t.description === `Smart ${type} check`)).toMatchObject({ type, amount })
    const balance = (data: AppData, name: string) => data.wallets.find(w => w.name === name)!.balance
    expect(balance(after, "BCA") - balance(before, "BCA")).toBe(type === "income" ? 0 : -amount)
    expect(balance(after, "Bank Jago") - balance(before, "Bank Jago")).toBe(type === "expense" ? 0 : amount)
  }
  expect(errors).toEqual([])
})

test("clarification keeps the sentence and permits manual correction without saving", async ({ page, request }) => {
  const before = await (await request.get("/api/data")).json()
  await open(page)
  await prepare(page, "transfer 500rb BCA Bank Jago")
  await expect(page.locator("#tx-question")).toContainText("Which wallet")
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeDisabled()
  await page.getByRole("button", { name: "Use form instead" }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("500.000")
  await expect(page.getByRole("radio", { name: "Transfer", exact: true })).toBeChecked()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
})

test("a changed sentence, Stop and close discard delayed previews", async ({ page, request }) => {
  const before = await (await request.get("/api/data")).json()
  let received = 0
  let release!: () => void
  await page.route("**/api/transactions/preview", async route => {
    received++
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ json: { status: "ready", draft: { type: "expense", amount: 999999, categoryId: "cat-food", walletId: "wallet-bca", date: "2026-10-27", description: "Stale reply" }, defaults: [], message: "Review" } }).catch(() => {})
  })
  await open(page)
  await prepare(page, "paid 25rb BCA")
  await expect.poll(() => received).toBe(1)
  await page.getByLabel("Your transaction").fill("received Salary 2jt BCA")
  release()
  await expect(page.getByRole("button", { name: "Confirm and save" })).toHaveCount(0)
  await page.getByRole("button", { name: "Prepare", exact: true }).click()
  await expect.poll(() => received).toBe(2)
  await page.getByRole("button", { name: "Stop", exact: true }).click()
  release()
  await expect(page.getByText("Preparation stopped. Your sentence is still here.")).toBeVisible()
  await page.getByRole("button", { name: "Prepare", exact: true }).click()
  await expect.poll(() => received).toBe(3)
  await page.keyboard.press("Escape")
  release()
  await page.unroute("**/api/transactions/preview")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await expect(page.getByLabel("Your transaction")).toHaveValue("")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveCount(0)
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
})

test("an unavailable model offers the form and simple expense entry", async ({ page }) => {
  await page.route("**/api/transactions/preview", route => route.fulfill({ status: 503, json: { error: "The local assistant is unavailable. You can use the ordinary form.", code: "unavailable" } }))
  await open(page)
  await prepare(page, "paid 25rb lunch BCA")
  await expect(page.getByRole("alert")).toContainText("unavailable")
  await page.getByRole("button", { name: "Use form instead" }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Simple expense", exact: true }).click()
  await page.getByLabel("Your expense").fill("kopi 25rb BCA")
  await page.getByRole("button", { name: "Fill form" }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("25.000")
})

test("uncertain save acknowledgement blocks retrying the same draft", async ({ page, request }) => {
  const before = await (await request.get("/api/data")).json()
  await open(page)
  await prepare(page, "received Salary 1jt BCA")
  await page.route("**/api/transactions", async route => {
    if (route.request().method() !== "POST") return route.continue()
    // The backend saved successfully, but its acknowledgement was lost.
    await route.fetch()
    await route.abort("failed")
  })
  await page.getByRole("button", { name: "Confirm and save" }).click()
  await expect(page.getByRole("link", { name: "Check Transactions" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "Save and add another" })).toBeDisabled()
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length + 1)
})

test("manual edits stay put and save-and-add-another starts a fresh sentence", async ({ page, request }) => {
  const before = await (await request.get("/api/data")).json()
  await open(page)
  await prepare(page, "paid 25rb lunch BCA")
  await page.getByLabel("Amount", { exact: true }).fill("30000")
  await page.locator("#tx-category").click()
  await page.getByRole("option", { name: "Shopping", exact: true }).click()
  await page.getByLabel("Note (optional)").fill("Manual override")
  await expect(page.locator("#tx-category")).toContainText("Shopping")
  await page.getByRole("button", { name: "Save and add another" }).click()
  await expect(page.getByLabel("Your transaction")).toHaveValue("")
  await expect(page.getByLabel("Your transaction")).toBeFocused()
  const after = await (await request.get("/api/data")).json()
  expect(after.transactions).toHaveLength(before.transactions.length + 1)
  expect(after.transactions.find((t: { description: string }) => t.description === "Manual override")).toMatchObject({ amount: 30000, categoryId: "cat-shopping" })
})

for (const [width, theme] of [[1440, "light"], [390, "dark"], [320, "light"]] as const) {
  test(`smart entry layout at ${width}px in ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    await open(page)
    await page.screenshot({ path: info.outputPath("entry.png"), animations: "disabled" })
    await prepare(page, "transfer 500rb from BCA to Bank Jago")
    await expect(page.locator("#tx-to-wallet")).toContainText("Bank Jago")
    await page.getByRole("button", { name: "Confirm and save" }).scrollIntoViewIfNeeded()
    await expect(page.getByRole("button", { name: "Confirm and save" })).toBeInViewport()
    expect(await page.getByRole("dialog").evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("review.png"), animations: "disabled" })
  })
}

test("a PIN lock during preparation clears the draft and returns to the lock screen", async ({ page }) => {
  await page.goto("/")
  expect((await page.request.put("/api/auth/pin", { data: { pin: "4821" } })).ok()).toBe(true)
  try {
    await open(page)
    let waiting = false
    let release!: () => void
    await page.route("**/api/transactions/preview", async route => {
      waiting = true
      await new Promise<void>(resolve => { release = resolve })
      await route.continue().catch(() => {})
    })
    await prepare(page, "paid 25rb lunch BCA")
    await expect.poll(() => waiting).toBe(true)
    await page.request.post("/api/auth/lock")
    release()
    await expect(page.getByRole("heading", { name: "Kaya is locked" })).toBeVisible()
    await expect(page.getByLabel("Your transaction")).toHaveCount(0)
    await page.locator("#lock-pin").fill("4821")
    await page.getByRole("button", { name: "Unlock", exact: true }).click()
    await page.getByRole("button", { name: "Quick add", exact: true }).click()
    await expect(page.getByLabel("Your transaction")).toHaveValue("")
  } finally {
    await page.request.delete("/api/auth/pin", { data: { currentPin: "4821" } })
  }
})

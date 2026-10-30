import { editQuickDraft, entryOption, reviewQuickDraft, saveQuickDraft, finishQuickDraft, openEntryPreferences } from "./quick-entry-helpers"
import { expect, test, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

async function open(page: Page, text?: string) {
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  if (text) {
    await page.getByLabel("What happened?").fill(text)
    await page.getByLabel("What happened?").press("Enter")
    await editQuickDraft(page)
  }
}
async function openBatch(page: Page, text: string) {
  await open(page)
  await entryOption(page, "Several transactions")
  await page.getByLabel("Your transactions", { exact: true }).fill(text)
  await page.getByRole("button", { name: "Prepare entries", exact: true }).click()
  await expect(page.getByTestId("assistant-batch-1")).toBeVisible()
}
const data = async (request: import("@playwright/test").APIRequestContext): Promise<AppData> => (await request.get("/api/data")).json()

test("remembered categories are learned only after saving and can be inspected, changed and forgotten", async ({ page, request }) => {
  await open(page, "paid 35rb coffee BCA")
  await page.locator("#tx-category").click()
  await page.getByRole("option", { name: "Shopping", exact: true }).click()
  await page.getByRole("checkbox", { name: /Remember this category for/ }).check()
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  expect((await (await request.get("/api/assistant")).json()).rules).toHaveLength(0)
  await open(page, "paid 36rb coffee BCA")
  await page.locator("#tx-category").click()
  await page.getByRole("option", { name: "Shopping", exact: true }).click()
  await page.getByRole("checkbox", { name: /Remember this category for/ }).check()
  await saveQuickDraft(page)
  await finishQuickDraft(page)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const assistant = await (await request.get("/api/assistant")).json()
  expect(assistant.rules).toContainEqual(expect.objectContaining({ phrase: "coffee", categoryId: "cat-shopping", type: "expense" }))
  await open(page, "paid 37rb coffee BCA")
  await expect(page.locator("#tx-category")).toContainText("Shopping")
  await openEntryPreferences(page)
  await page.getByLabel("Category for coffee", { exact: true }).selectOption("cat-food")
  await expect.poll(async () => (await (await request.get("/api/assistant")).json()).rules.find((rule: { phrase: string }) => rule.phrase === "coffee")?.categoryId).toBe("cat-food")
  await page.getByRole("button", { name: "Edit matching note coffee", exact: true }).click()
  await page.getByLabel("Exact matching note", { exact: true }).fill("coffee corner")
  await page.getByRole("button", { name: "Update matching note", exact: true }).click()
  await expect(page.getByRole("button", { name: "Forget category for coffee corner", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Forget category for coffee corner", exact: true }).click()
  await expect.poll(async () => (await (await request.get("/api/assistant")).json()).rules.length).toBe(0)
})

test("favourite templates use fresh dates, optional amounts and editable fields without saving transactions", async ({ page, request }) => {
  const before = await data(request)
  await open(page, "paid 35rb Food BCA yesterday")
  await reviewQuickDraft(page)
  await entryOption(page, "Save as favourite")
  await page.getByLabel("Favourite name", { exact: true }).fill("Lunch")
  await page.getByRole("button", { name: "Save favourite", exact: true }).click()
  await expect(page.getByRole("status").filter({ hasText: "Favourite saved" })).toBeVisible()
  const template = (await (await request.get("/api/assistant")).json()).templates.find((item: { name: string }) => item.name === "Lunch")
  expect(template.draft.amount).toBeUndefined()
  expect(template.draft.date).toBeUndefined()
  await page.getByRole("button", { name: "Back", exact: true }).click()
  await entryOption(page, "Start new")
  await entryOption(page, "Use a favourite")
  await page.getByRole("button", { name: "Lunch", exact: true }).click()
  await expect(page.locator("#tx-question")).toContainText("How much")
  await page.getByLabel("Reply or correction").fill("45000")
  await page.getByLabel("Reply or correction").press("Enter")
  await expect(page.getByRole("region", { name: "Transaction review" })).toContainText("Rp 45.000")
  await openEntryPreferences(page)
  await page.getByRole("button", { name: "Edit favourite Lunch", exact: true }).click()
  await page.getByLabel("Amount", { exact: true }).fill("45000")
  await page.getByLabel("Favourite name", { exact: true }).fill("Lunch at desk")
  await page.getByRole("checkbox", { name: /Keep this amount/ }).check()
  await page.getByRole("button", { name: "Update favourite", exact: true }).click()
  await expect.poll(async () => (await (await request.get("/api/assistant")).json()).templates[0]?.name).toBe("Lunch at desk")
  expect((await (await request.get("/api/assistant")).json()).templates[0].draft.amount).toBe(45000)
  expect((await data(request)).transactions).toHaveLength(before.transactions.length)
  await page.getByRole("button", { name: "Delete favourite Lunch at desk", exact: true }).click()
  await expect.poll(async () => (await (await request.get("/api/assistant")).json()).templates.length).toBe(0)
})

test("several reviewed transactions save atomically with exact wallet effects and independent corrections", async ({ page, request }) => {
  const before = await data(request)
  await openBatch(page, "Food 35rb BCA; Salary 5jt Bank Jago; transfer 500rb from BCA to Bank Jago")
  await expect(page.getByTestId("assistant-batch-3")).toBeVisible()
  expect((await data(request)).transactions).toHaveLength(before.transactions.length)
  await page.getByLabel("Reply for entry 1", { exact: true }).fill("make that 40rb")
  await page.getByLabel("Reply for entry 1", { exact: true }).press("Enter")
  await expect(page.getByLabel("Reply for entry 1", { exact: true })).toHaveValue("")
  await expect(page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true })).toHaveValue("40.000")
  await expect(page.getByTestId("assistant-batch-3").getByLabel("Amount", { exact: true })).toHaveValue("500.000")
  await page.getByRole("button", { name: "Confirm and save 3 entries", exact: true }).dblclick()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const after = await data(request)
  expect(after.transactions).toHaveLength(before.transactions.length + 3)
  expect(after.wallets.find(wallet => wallet.id === "wallet-bca")!.balance).toBe(before.wallets.find(wallet => wallet.id === "wallet-bca")!.balance - 540000)
  expect(after.wallets.find(wallet => wallet.id === "wallet-jago")!.balance).toBe(before.wallets.find(wallet => wallet.id === "wallet-jago")!.balance + 5500000)
})

test("batch questions, explicit type selection, undo and unselected rows keep separate drafts", async ({ page, request }) => {
  const before = await data(request)
  await openBatch(page, "Food BCA; paid income 5jt Bank Jago")
  await expect(page.getByLabel("Type for entry 2", { exact: true })).toHaveValue("")
  await page.getByLabel("Category for entry 2", { exact: true }).selectOption("cat-food")
  await expect(page.getByRole("button", { name: "Confirm and save 2 entries", exact: true })).toBeDisabled()
  await page.getByLabel("Reply for entry 1", { exact: true }).fill("35rb")
  await page.getByLabel("Reply for entry 1", { exact: true }).press("Enter")
  await expect(page.getByLabel("Reply for entry 1", { exact: true })).toHaveValue("")
  await page.getByRole("button", { name: "Undo entry 1 change", exact: true }).click()
  await expect(page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true })).toHaveValue("")
  await page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true }).fill("35000")
  await page.getByLabel("Type for entry 2", { exact: true }).selectOption("income")
  await page.getByLabel("Category for entry 2", { exact: true }).selectOption("cat-salary")
  await expect(page.getByRole("button", { name: "Confirm and save 2 entries", exact: true })).toBeEnabled()
  await page.getByRole("checkbox", { name: /Entry 2:/ }).uncheck()
  await page.getByRole("button", { name: "Confirm and save 1 entry", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await data(request)).transactions).toHaveLength(before.transactions.length + 1)
})

for (const failure of ["lost", "malformed"] as const) {
  test(`${failure} batch acknowledgement retries the same durable request without duplicates`, async ({ page, request }) => {
    const before = await data(request)
    await openBatch(page, "Food 12345 BCA; Salary 76543 Bank Jago")
    let firstBody = ""
    let attempts = 0
    await page.route("**/api/assistant/batch", async route => {
      attempts++
      if (attempts === 1) {
        firstBody = route.request().postData()!
        await route.fetch()
        if (failure === "lost") await route.abort("failed")
        else await route.fulfill({ status: 201, json: {} })
      } else {
        expect(route.request().postData()).toBe(firstBody)
        await route.continue()
      }
    })
    await page.getByRole("button", { name: "Confirm and save 2 entries", exact: true }).click()
    await expect(page.getByRole("button", { name: "Retry same batch safely", exact: true })).toBeEnabled()
    await expect(page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true })).toBeDisabled()
    expect((await data(request)).transactions).toHaveLength(before.transactions.length + 2)
    await page.getByRole("button", { name: "Retry same batch safely", exact: true }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    expect(attempts).toBe(2)
    expect((await data(request)).transactions).toHaveLength(before.transactions.length + 2)
  })
}

test("manual batch edits discard a delayed row reply and closing saves nothing", async ({ page, request }) => {
  const before = await data(request)
  await openBatch(page, "Food 35rb BCA; Salary 5jt Bank Jago")
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
  await page.getByLabel("Reply for entry 1", { exact: true }).fill("make that 40rb")
  await page.getByRole("button", { name: "Apply to entry 1", exact: true }).click()
  await expect.poll(() => waiting).toBe(true)
  await page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true }).fill("55000")
  release()
  await expect.poll(() => finished).toBe(true)
  await page.unroute("**/api/transactions/preview")
  await page.getByLabel("Reply for entry 1", { exact: true }).fill("use Bank Jago")
  await page.getByLabel("Reply for entry 1", { exact: true }).press("Enter")
  await expect(page.getByLabel("Reply for entry 1", { exact: true })).toHaveValue("")
  await expect(page.getByTestId("assistant-batch-1").getByLabel("Amount", { exact: true })).toHaveValue("55.000")
  await page.keyboard.press("Escape")
  expect((await data(request)).transactions).toHaveLength(before.transactions.length)
})

for (const [width, theme] of [[1440, "light"], [390, "dark"], [320, "light"]] as const) {
  test(`batch review fits ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    await openBatch(page, "Food 35rb BCA; Salary 5jt Bank Jago")
    expect(await page.getByRole("dialog").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath("batch-review.png"), animations: "disabled" })
    await page.getByRole("button", { name: "Confirm and save 2 entries", exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole("button", { name: "Confirm and save 2 entries", exact: true })).toBeInViewport()
  })
}

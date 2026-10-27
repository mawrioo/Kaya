import { expect, test, type Page } from "./browser-fixtures"

async function open(page: Page, sentence: string) {
  await page.goto("/transactions")
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await page.getByLabel("Your transaction").fill(sentence)
  await page.getByLabel("Your transaction").press("Enter")
  await expect(page.getByLabel("Reply or correction")).toBeVisible()
}
async function reply(page: Page, text: string) {
  await page.getByLabel("Reply or correction").fill(text)
  await page.getByLabel("Reply or correction").press("Enter")
  await expect(page.getByLabel("Reply or correction")).toHaveValue("")
}

test("missing amount, correction and manual category share one draft and one explicit save", async ({ page, request }) => {
  const before = await (await request.get("/api/data")).json()
  await open(page, "Bought lunch from BCA yesterday")
  await expect(page.locator("#tx-question")).toHaveText("How much was it?")
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeDisabled()
  await expect(page.locator("#tx-wallet")).toContainText("BCA")
  await expect(page.getByLabel("Note (optional)")).toHaveValue("lunch")
  await reply(page, "35rb")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
  await page.locator("#tx-category").click()
  await page.getByRole("option", { name: "Shopping", exact: true }).click()
  await reply(page, "actually use Bank Jago")
  await expect(page.locator("#tx-category")).toContainText("Shopping")
  await expect(page.locator("#tx-wallet")).toContainText("Bank Jago")
  await reply(page, "yes")
  expect((await (await request.get("/api/data")).json()).transactions).toHaveLength(before.transactions.length)
  await page.getByRole("button", { name: "Confirm and save" }).dblclick()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const after = await (await request.get("/api/data")).json()
  expect(after.transactions).toHaveLength(before.transactions.length + 1)
  expect(after.transactions.find((t: { description: string; amount: number }) => t.description === "lunch" && t.amount === 35000)).toMatchObject({ walletId: "wallet-jago", categoryId: "cat-shopping" })
})

test("transfer asks for the end and rejects a same-wallet correction atomically", async ({ page }) => {
  await open(page, "transfer 500rb from BCA to Bank Jago")
  await reply(page, "use Superbank")
  await expect(page.locator("#tx-question")).toContainText("source or destination")
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeDisabled()
  await page.getByRole("button", { name: "Destination", exact: true }).click()
  await expect(page.locator("#tx-to-wallet")).toContainText("Superbank")
  await reply(page, "to BCA")
  await expect(page.getByText(/Choose two different wallets/)).toBeVisible()
  await expect(page.locator("#tx-wallet")).toContainText("BCA")
  await expect(page.locator("#tx-to-wallet")).toContainText("Superbank")
})

test("manual answers advance the question and Start new clears context", async ({ page }) => {
  await open(page, "transfer from BCA")
  await expect(page.locator("#tx-question")).toContainText("How much")
  await page.getByLabel("Amount", { exact: true }).fill("50000")
  await expect(page.locator("#tx-question")).toContainText("receives")
  await page.locator("#tx-to-wallet").click()
  await page.getByRole("option", { name: "Bank Jago", exact: true }).click()
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeEnabled()
  await reply(page, "make that 60rb")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("60.000")
  await page.getByRole("button", { name: "Start new", exact: true }).click()
  await expect(page.getByLabel("Your transaction")).toHaveValue("")
  await expect(page.getByLabel("Your transaction")).toBeFocused()
  await expect(page.getByLabel("Reply or correction")).toHaveCount(0)
})

test("manual edits invalidate an in-flight correction", async ({ page }) => {
  await open(page, "paid 35rb Food BCA")
  let release!: () => void
  let received = false
  await page.route("**/api/transactions/preview", async route => {
    const response = await route.fetch()
    received = true
    await new Promise<void>(resolve => { release = resolve })
    await route.fulfill({ response }).catch(() => {})
  })
  await page.getByLabel("Reply or correction").fill("make that 40rb")
  await page.getByRole("button", { name: "Apply", exact: true }).click()
  await expect.poll(() => received).toBe(true)
  await page.getByLabel("Amount", { exact: true }).fill("55000")
  release()
  await page.unroute("**/api/transactions/preview")
  await reply(page, "use Bank Jago")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("55.000")
  await expect(page.locator("#tx-wallet")).toContainText("Bank Jago")
})

test("a type correction requests a compatible category without losing the amount", async ({ page }) => {
  await open(page, "paid 35rb Food BCA")
  await reply(page, "this was income")
  await expect(page.getByRole("radio", { name: "Income", exact: true })).toBeChecked()
  await expect(page.locator("#tx-question")).toContainText("category")
  await reply(page, "Salary")
  await expect(page.locator("#tx-category")).toContainText("Salary")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("35.000")
  await expect(page.getByRole("button", { name: "Confirm and save" })).toBeEnabled()
})

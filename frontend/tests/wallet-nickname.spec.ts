import { expect, test, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

// These share one database in order: set a nickname, use it, refuse a bad one, clear it.
test.describe.configure({ mode: "serial" })

const quickAddButton = (page: Page) => page.getByRole("button", { name: "Quick add", exact: true })
const editDialog = (page: Page) => page.getByRole("dialog", { name: "Edit wallet" })

async function openEdit(page: Page, wallet: string) {
  await page.goto("/wallets")
  await expect(quickAddButton(page)).toBeEnabled()
  await page.getByRole("button", { name: `More options for ${wallet}` }).click()
  await page.getByRole("menuitem", { name: "Edit details" }).click()
  await expect(editDialog(page)).toBeVisible()
}

const wallet = async (request: import("@playwright/test").APIRequestContext, name: string) =>
  ((await (await request.get("/api/data")).json()) as AppData).wallets.find((entry) => entry.name === name)!

test("a nickname is saved on a wallet, and Quick add finds the wallet by it", async ({ page, request }) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const jago = await wallet(request, "Bank Jago")
  expect(jago.nickname).toBeUndefined()
  const transactions = ((await (await request.get("/api/data")).json()) as AppData).transactions.length

  await openEdit(page, "Bank Jago")
  const nickname = page.getByLabel("Nickname (optional)")
  await expect(nickname).toHaveValue("")
  await nickname.fill("  JaGo  ")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await wallet(request, "Bank Jago")).nickname).toBe("JaGo")

  // Quick add understands it, in any case, with no change to the transactions until the form is saved.
  await quickAddButton(page).click()
  await page.getByRole("button", { name: "Simple expense", exact: true }).click()
  const line = page.getByRole("textbox", { name: "Your expense" })
  await line.fill("kopi susu 20rb jago")
  await line.press("Enter")
  await expect(page.locator("#tx-wallet")).toContainText("Bank Jago")
  await expect(page.getByRole("status").filter({ hasText: "Form filled" })).toContainText("Wallet: Bank Jago")
  await expect(page.getByLabel("Note (optional)")).toHaveValue("kopi susu")
  expect(((await (await request.get("/api/data")).json()) as AppData).transactions).toHaveLength(transactions)

  await page.getByRole("button", { name: "Add transaction", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const after = (await (await request.get("/api/data")).json()) as AppData
  expect(after.transactions).toHaveLength(transactions + 1)
  expect(after.wallets.find((entry) => entry.name === "Bank Jago")!.balance).toBe(jago.balance - 20_000)
  expect(after.transactions.find((tx) => tx.description === "kopi susu")).toMatchObject({ type: "expense", amount: 20_000, walletId: jago.id })

  // It is still there after a reload, and the edit form shows it.
  await openEdit(page, "Bank Jago")
  await expect(page.getByLabel("Nickname (optional)")).toHaveValue("JaGo")
  await page.getByRole("button", { name: "Cancel" }).click()
  expect(errors).toEqual([])
})

test("a nickname that is already a wallet name, or too much like one, is explained and nothing is saved", async ({ page, request }) => {
  await openEdit(page, "Superbank")
  const nickname = page.getByLabel("Nickname (optional)")

  await nickname.fill("bca")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "BCA is already the name of another wallet." })).toBeVisible()
  await expect(nickname).toBeFocused()
  await expect(nickname).toHaveAttribute("aria-invalid", "true")
  expect((await wallet(request, "Superbank")).nickname).toBeUndefined()

  await nickname.fill("jago")
  await expect(page.getByRole("alert")).toHaveCount(0) // fixing the box clears the message at once
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "jago is already the nickname of Bank Jago." })).toBeVisible()

  await nickname.fill("2024")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "A nickname needs at least one letter." })).toBeVisible()
  expect((await wallet(request, "Superbank")).nickname).toBeUndefined()

  await nickname.fill("super")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await wallet(request, "Superbank")).nickname).toBe("super")
})

test("a wallet's own name can't be taken by someone else's nickname either", async ({ page, request }) => {
  await openEdit(page, "BCA")
  await page.getByLabel("Name", { exact: true }).fill("Super")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Super is already the nickname of Superbank. Choose another name." })).toBeVisible()
  expect((await wallet(request, "BCA")).name).toBe("BCA")
  await page.getByRole("button", { name: "Cancel" }).click()
})

test("a new wallet can start with a nickname", async ({ page, request }) => {
  await page.goto("/wallets")
  await expect(quickAddButton(page)).toBeEnabled()
  await page.getByRole("button", { name: "Add wallet" }).click()
  await page.getByLabel("Name", { exact: true }).fill("GoPay Wallet")
  await page.getByLabel("Nickname (optional)").fill("gopay")
  await page.locator("#wallet-kind").click()
  await page.getByRole("option", { name: "E-wallet" }).click()
  await page.getByRole("button", { name: "Add wallet", exact: true }).last().click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const created = await wallet(request, "GoPay Wallet")
  expect(created.nickname).toBe("gopay")

  await quickAddButton(page).click()
  await page.getByRole("button", { name: "Simple expense", exact: true }).click()
  const line = page.getByRole("textbox", { name: "Your expense" })
  await line.fill("gopay 15rb parkir")
  await line.press("Enter")
  await expect(page.locator("#tx-wallet")).toContainText("GoPay Wallet")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
})

test("emptying the box takes the nickname away, and Quick add stops using it", async ({ page, request }) => {
  // Start from a known state, whatever ran before: Bank Jago has a nickname.
  const jago = await wallet(request, "Bank Jago")
  const set = await request.put(`/api/wallets/${jago.id}`, { data: { name: jago.name, description: jago.description, nickname: "jago" } })
  expect(set.ok()).toBe(true)
  expect((await wallet(request, "Bank Jago")).nickname).toBe("jago")

  await openEdit(page, "Bank Jago")
  await expect(page.getByLabel("Nickname (optional)")).toHaveValue("jago")
  await page.getByLabel("Nickname (optional)").fill("   ")
  await page.getByRole("button", { name: "Save changes" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await wallet(request, "Bank Jago")).nickname).toBeUndefined()

  await quickAddButton(page).click()
  await page.getByRole("button", { name: "Simple expense", exact: true }).click()
  const line = page.getByRole("textbox", { name: "Your expense" })
  await line.fill("kopi 20rb jago")
  await line.press("Enter")
  await expect(page.getByRole("status").filter({ hasText: "Form filled" })).toContainText("Kept wallet")
  await expect(page.getByLabel("Note (optional)")).toHaveValue("kopi jago")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
})

test("deleting a wallet and undoing it brings its nickname back", async ({ page, request }) => {
  // GoPay Wallet has no transactions, so it can be deleted.
  await page.goto("/wallets")
  await expect(quickAddButton(page)).toBeEnabled()
  await page.getByRole("button", { name: "More options for GoPay Wallet" }).click()
  await page.getByRole("menuitem", { name: /Delete/ }).click()
  await page.getByLabel(/To confirm, type/).fill("Delete GoPay Wallet")
  await page.getByRole("button", { name: "Delete wallet", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect((await (await request.get("/api/data")).json() as AppData).wallets.some((entry) => entry.name === "GoPay Wallet")).toBe(false)
  await page.getByRole("button", { name: "Undo" }).click()
  await expect.poll(async () => (await wallet(request, "GoPay Wallet"))?.nickname).toBe("gopay")
})

for (const width of [320, 390]) {
  for (const theme of ["light", "dark"] as const) {
    test(`the wallet form with its nickname box fits at ${width}px in ${theme} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 800 })
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
      await openEdit(page, "Bank Jago")
      await page.getByLabel("Nickname (optional)").fill("x".repeat(20))
      const dialog = editDialog(page)
      expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath("wallet-form.png"), animations: "disabled" })
      await page.getByRole("button", { name: "Cancel" }).click()
    })
  }
}

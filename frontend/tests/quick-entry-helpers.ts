import { expect, type Page } from "./browser-fixtures"

/** Reach the editable draft through the same disclosure the owner uses. */
export async function editQuickDraft(page: Page) {
  await expect(page.getByRole("heading", { name: /^(Review (expense|income|transfer)|Edit details)$/ }).or(page.locator("#tx-question"))).not.toHaveCount(0)
  if (await page.getByLabel("Amount", { exact: true }).isVisible()) return
  const edit = page.getByRole("button", { name: "Edit details", exact: true })
  if (await edit.isVisible()) await edit.click()
  else await page.getByRole("button", { name: "Enter manually", exact: true }).click()
  await expect(page.getByLabel("Amount", { exact: true })).toBeVisible()
}

export async function entryOption(page: Page, name: string) {
  await page.getByRole("button", { name: "More entry options" }).click()
  await page.getByRole("menuitem", { name, exact: true }).click()
  await expect(page.getByRole("menu")).toHaveCount(0)
}

export async function reviewQuickDraft(page: Page) {
  if (await page.locator("#tx-amount").isVisible()) {
    await page.getByRole("button", { name: "Review", exact: true }).click()
  }
}

export async function saveQuickDraft(page: Page, double = false) {
  await reviewQuickDraft(page)
  const button = page.getByRole("button", { name: "Save", exact: true })
  if (double) await button.dblclick()
  else await button.click()
}

export async function finishQuickDraft(page: Page) {
  await expect(page.getByRole("heading", { name: "Transaction added", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Done", exact: true }).click()
}

export async function saveAnotherQuickDraft(page: Page) {
  await saveQuickDraft(page)
  await expect(page.getByRole("heading", { name: "Transaction added", exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Add another", exact: true }).click()
}

export async function openEntryPreferences(page: Page) {
  await page.keyboard.press("Escape")
  if (await page.getByRole("button", { name: "More pages", exact: true }).isVisible()) {
    await page.getByRole("button", { name: "More pages", exact: true }).click()
    await page.getByRole("button", { name: "Settings", exact: true }).click()
  } else await page.getByRole("button", { name: /Settings$/ }).click()
  await page.getByRole("button", { name: "Entry preferences", exact: true }).click()
  await expect(page.getByRole("dialog", { name: "Entry preferences", exact: true })).toBeVisible()
}

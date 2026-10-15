import { expect, test, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

// Files run in name order and share one in-memory database. Only the toast checks save a transaction.
test.beforeAll(async ({ request }) => {
  const data: AppData = await (await request.get("/api/data")).json()
  expect(data.wallets.some((wallet) => wallet.name === "BCA")).toBe(true)
})

const quickAddDialog = (page: Page) => page.getByRole("dialog", { name: "Quick add" })
const coin = (page: Page) => page.getByRole("button", { name: "Quick add", exact: true })

/** True when nothing (a toast, the Next.js dev badge) sits on top of the coin: its middle and eight points around it. */
const coinIsUncovered = (page: Page) =>
  coin(page).evaluate((button) => {
    const box = button.getBoundingClientRect()
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const radius = box.width / 2 - 8
    const points = [[0, 0], ...Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * radius, Math.sin((i * Math.PI) / 4) * radius])]
    return points.every(([dx, dy]) => {
      const top = document.elementFromPoint(cx + dx, cy + dy)
      return !!top && button.contains(top)
    })
  })

for (const path of ["/", "/transactions", "/wallets", "/insights", "/categories", "/goals"]) {
  test(`Ctrl+K opens Quick add on ${path}, a plain Q does not, and Escape gives the keyboard back`, async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(path)
    await expect(coin(page)).toBeEnabled()

    await page.keyboard.press("q")
    await page.keyboard.press("Q")
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await page.keyboard.press("Control+k")
    await expect(quickAddDialog(page)).toBeVisible()
    await expect(page.getByRole("textbox", { name: "Your expense" })).toBeFocused()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(coin(page)).toBeFocused()
    expect(errors).toEqual([])
  })
}

test("Ctrl+K leads straight into the one-line flow, and nothing is saved until Add transaction", async ({ page, request }) => {
  const before: AppData = await (await request.get("/api/data")).json()
  await page.goto("/")
  await expect(coin(page)).toBeEnabled()
  await page.keyboard.press("Control+k")
  await page.getByRole("textbox", { name: "Your expense" }).fill("kopi 20rb BCA")
  await page.keyboard.press("Enter")
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("20.000")
  await expect(page.locator("#tx-wallet")).toContainText("BCA")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const after: AppData = await (await request.get("/api/data")).json()
  expect(after.transactions).toHaveLength(before.transactions.length)
})

test("letters stay letters in a box, and Ctrl+K from a box gives the keyboard back to that box", async ({ page }) => {
  await page.goto("/transactions")
  await expect(coin(page)).toBeEnabled()
  const search = page.getByLabel("Search transactions")
  await search.click()
  await page.keyboard.type("quiet")
  await expect(search).toHaveValue("quiet")
  await expect(page.getByRole("dialog")).toHaveCount(0)

  await page.keyboard.press("Control+k")
  await expect(quickAddDialog(page)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(search).toBeFocused()
  await expect(search).toHaveValue("quiet")
})

test("nothing opens on top of another dialog, a menu, or a list", async ({ page }) => {
  await page.goto("/transactions")
  await expect(coin(page)).toBeEnabled()

  // A dialog that is already open keeps the keyboard.
  await page.getByRole("button", { name: "Add transaction" }).first().click()
  const regular = page.getByRole("dialog", { name: "Add transaction" })
  await expect(regular).toBeVisible()
  await regular.getByRole("heading", { name: "Add transaction" }).click()
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toHaveCount(1)
  await expect(quickAddDialog(page)).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)

  // So does an open list.
  await page.getByRole("combobox", { name: "Filter by type" }).click()
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("listbox")).toHaveCount(0)

  // And an open menu.
  await page.goto("/wallets")
  await expect(coin(page)).toBeEnabled()
  await page.getByRole("button", { name: "More options for BCA" }).click()
  await expect(page.getByRole("menu")).toBeVisible()
  await page.keyboard.press("Control+k")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.keyboard.press("Escape")
  await expect(page.getByRole("menu")).toHaveCount(0)
})

test("other keys and modified keys do nothing", async ({ page }) => {
  await page.goto("/wallets")
  await expect(coin(page)).toBeEnabled()
  for (const key of ["n", "k", "q", "Control+q", "Alt+k", "Control+Alt+k", "Control+Shift+k", "/"]) await page.keyboard.press(key)
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("the coin has no word on it, is still called Quick add, and advertises Ctrl+K only", async ({ page }) => {
  await page.goto("/")
  const button = coin(page)
  await expect(button).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K")
  await expect(button).toHaveAttribute("aria-haspopup", "dialog")
  expect((await button.innerText()).trim()).toBe("")
  await expect(button.locator("kbd")).toHaveCount(0)
  await expect(button.locator("svg")).toHaveCount(1)
})

test("pointing at the coin names it and its shortcut, and closing the box never leaves the name hanging", async ({ page }) => {
  await page.goto("/wallets")
  await expect(coin(page)).toBeEnabled()
  const tip = page.getByRole("tooltip")

  await coin(page).hover()
  await expect(tip).toBeVisible()
  await expect(tip).toContainText("Quick add")
  await expect(tip).toContainText("Ctrl+K")

  // Opening it with the mouse and closing it with the mouse hands the keyboard back to the coin without a tooltip.
  await coin(page).click()
  await expect(quickAddDialog(page)).toBeVisible()
  await quickAddDialog(page).getByRole("button", { name: "Close" }).click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(coin(page)).toBeFocused()
  await page.mouse.move(300, 300)
  await page.waitForTimeout(700)
  await expect(tip).toHaveCount(0)

  // Same when the keyboard opens and closes it.
  await page.keyboard.press("Control+k")
  await expect(quickAddDialog(page)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page.waitForTimeout(500)
  await expect(tip).toHaveCount(0)

  // Arriving at the coin by keyboard does show it, and Escape puts it away. (It still has the keyboard from the close.)
  await page.mouse.move(300, 300)
  await coin(page).evaluate((button) => button.blur())
  await expect(coin(page)).not.toBeFocused()
  await coin(page).focus()
  await expect(tip).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(tip).toHaveCount(0)
})

for (const [width, height] of [[320, 700], [390, 844], [768, 900], [1440, 900]] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`the coin sits bottom right at ${width}px in ${theme} mode, uncovered, and the page clears it`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height })
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
      await page.goto("/transactions")
      const button = coin(page)
      await expect(button).toBeVisible()
      const box = (await button.boundingBox())!
      expect(box).toMatchObject({ width: 44, height: 44 })
      expect(width - (box.x + box.width)).toBeCloseTo(24, 0)
      expect(height - (box.y + box.height)).toBeCloseTo(24, 0)
      // Anything that drops in a moment after the page loads (the Next.js dev badge used to) has had time to appear.
      await page.waitForTimeout(2000)
      expect(await coinIsUncovered(page)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath("top.png"), animations: "disabled" })

      // At the very end of the page the last row ends above the coin (the wrapper's own padding is the room).
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(200)
      const gap = await page.evaluate(() => {
        const last = document.querySelector("#main-content > div")!.lastElementChild!.getBoundingClientRect()
        const button = document.querySelector("button[aria-label='Quick add']")!.getBoundingClientRect()
        return button.top - last.bottom
      })
      expect(gap).toBeGreaterThanOrEqual(8)
      await page.screenshot({ path: testInfo.outputPath("bottom.png"), animations: "disabled" })
    })
  }
}

test("the sidebar's bottom is back to its own spacing: nothing is reserved under it any more", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/wallets")
  const footer = page.locator("[data-slot='sidebar-footer']")
  await expect(footer).toBeVisible()
  expect(await footer.evaluate((node) => getComputedStyle(node).paddingBottom)).toBe("16px")
  // The theme switch is the last thing, 24px from the bottom of the window.
  const bottom = await footer.evaluate((node) => node.getBoundingClientRect().bottom)
  expect(Math.round(bottom)).toBe(900)
})

for (const [width, height] of [[390, 844], [1440, 900]] as const) {
  test(`a message appears at the top, clear of the coin, at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height })
    await page.goto("/")
    await expect(coin(page)).toBeEnabled()
    await coin(page).click()
    const line = page.getByRole("textbox", { name: "Your expense" })
    await line.fill("teh botol 15rb BCA")
    await line.press("Enter")
    await page.getByRole("button", { name: "Add transaction", exact: true }).click()
    const toast = page.locator("[data-sonner-toast]").first()
    await expect(toast).toBeVisible()
    await expect(toast).toContainText("Transaction added")
    // Sonner slides it in; wait for it to settle before measuring.
    await page.waitForTimeout(700)
    const toastBox = (await toast.boundingBox())!
    const coinBox = (await coin(page).boundingBox())!
    expect(toastBox.y + toastBox.height).toBeLessThanOrEqual(coinBox.y)
    expect(toastBox.y).toBeGreaterThanOrEqual(16)
    expect(toastBox.y).toBeLessThan(120)
    if (width < 600) expect(toastBox.x + toastBox.width / 2).toBeCloseTo(width / 2, 0)
    else expect(width - toastBox.x - toastBox.width).toBeCloseTo(24, 0)
    expect(await coinIsUncovered(page)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath("toast.png"), animations: "disabled" })
  })
}

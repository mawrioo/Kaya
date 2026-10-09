import { expect, test, type Page } from "@playwright/test"

// The wallet cards follow the room they have, not the window: with the menu open a 768px tablet leaves them about 480px, and
// two columns of that wrapped "Superbank" letter by letter. They are one column until there is room for two good ones.
const BASE = "http://localhost:3100"

const columns = (page: Page) =>
  page.locator("[id^='wallet-card-']").first().evaluate((card) => getComputedStyle(card.parentElement!).gridTemplateColumns.split(" ").length)

async function wallets(page: Page, width: number, height = 900, folded = false) {
  if (folded) await page.context().addCookies([{ name: "sidebar_state", value: "false", url: BASE }])
  await page.setViewportSize({ width, height })
  await page.goto("/wallets")
  await expect(page.locator("[id^='wallet-card-']").first()).toBeVisible()
}

test("one column on a tablet with the menu open, two once the cards have room for two", async ({ page }) => {
  await wallets(page, 820, 1180)
  expect(await columns(page)).toBe(1)
  await page.setViewportSize({ width: 1024, height: 800 })
  await expect.poll(() => columns(page)).toBe(2)
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect.poll(() => columns(page)).toBe(2)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => columns(page)).toBe(1)
})

test("with the menu folded to icons a tablet has the room, so there are two columns again", async ({ page }) => {
  await wallets(page, 820, 1180, true)
  expect(await columns(page)).toBe(2)
})

test("no wallet's name is broken in the middle of a word, at any width from a phone to a laptop", async ({ page }) => {
  for (const width of [320, 390, 600, 768, 820, 900, 1023, 1024, 1280]) {
    await wallets(page, width, 900)
    for (const name of await page.locator("[id^='wallet-card-'] h3 a").allInnerTexts()) {
      const link = page.locator("[id^='wallet-card-'] h3 a", { hasText: name }).first()
      const lines = await link.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)))
      expect(lines, `"${name}" at ${width}px takes ${lines} lines`).toBeLessThanOrEqual(2)
      // A name that is one word never wraps at all.
      if (!name.includes(" ")) expect(lines, `"${name}" at ${width}px`).toBe(1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no sideways scroll at ${width}px`).toBe(true)
  }
})

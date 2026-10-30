import { expect, test, type Page } from "./browser-fixtures"

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

/** Chromium touch input exercises the browser's gesture arbitration, including native page scrolling. */
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const input = await page.context().newCDPSession(page)
  try {
    if (from.x === to.x) {
      // Native vertical scrolling must arbitrate against the row's horizontal drag listener.
      await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] })
      for (let step = 1; step <= 12; step++) {
        await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x, y: from.y + (to.y - from.y) * step / 12 }] })
        await page.waitForTimeout(20)
      }
      await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    } else {
      // Raw horizontal sequences suppress the next synthetic tap even on a plain HTML control page.
      await input.send("Input.synthesizeScrollGesture", {
        x: from.x, y: from.y, xDistance: to.x - from.x, yDistance: to.y - from.y,
        speed: 600, gestureSourceType: "touch", preventFling: true,
      })
    }
  } finally { await input.detach() }
}

test("a finger swipe reveals transaction actions, while a vertical swipe scrolls the page", async ({ page }) => {
  await page.goto("/transactions?month=2026-09")
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  const row = page.locator("li[data-swipe-row]").first()
  const box = (await row.boundingBox())!
  await swipe(page, { x: box.x + box.width - 15, y: box.y + 22 }, { x: box.x + box.width - 235, y: box.y + 22 })
  await row.getByRole("button", { name: /^Duplicate / }).tap()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).tap()

  await page.reload()
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  const fresh = (await row.boundingBox())!
  await swipe(page, { x: fresh.x + 60, y: fresh.y + 30 }, { x: fresh.x + 60, y: fresh.y - 130 })
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(30)
})

test("the bottom action opens and closes by touch, and an empty period can recover", async ({ page }) => {
  await page.goto("/transactions?month=2026-10")
  await page.getByRole("button", { name: "Quick add", exact: true }).tap()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).tap()
  await page.getByRole("button", { name: "Clear filters", exact: true }).first().tap()
  await expect(page.locator("li[data-swipe-row]").first()).toBeVisible()
  await page.getByRole("button", { name: "More pages", exact: true }).tap()
  await expect(page.getByRole("dialog", { name: "More", exact: true })).toBeVisible()
})


import { expect, test, type Page } from "./browser-fixtures"

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test.beforeEach(async ({ request }) => {
  const reset = await fetch("http://127.0.0.1:4200/__test/reset", {
    method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN! },
  })
  expect(reset.ok).toBe(true)
  const data = await reset.json()
  for (const goal of data.goals) expect((await request.delete(`/api/goals/${goal.id}`)).ok()).toBe(true)
  for (const [name, targetAmount, savedAmount] of [["Bali", 20000000, 5000000], ["Mobil", 700000000, 35000000], ["Emergency fund", 50000000, 12000000], ["Laptop", 15000000, 3000000]] as const) {
    expect((await request.post("/api/goals", { data: { name, targetAmount, savedAmount, walletId: "wallet-bca", icon: "gift", targetDate: "2027-10-29" } })).ok()).toBe(true)
  }
})

const noOverflow = async (page: Page) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

for (const theme of ["light", "dark"] as const) {
  test(`three goals fit and the menu ends after settings (${theme})`, async ({ page }, info) => {
    await page.addInitScript(value => localStorage.setItem("theme", value), theme)
    await page.goto("/goals")
    const cards = page.locator('li[id^="goal-card-"]')
    await expect(cards).toHaveCount(4)
    const third = (await cards.nth(2).boundingBox())!
    expect(third.y + third.height).toBeLessThan((await page.getByRole("button", { name: "Quick add", exact: true }).boundingBox())!.y)
    expect((await cards.first().boundingBox())!.height).toBeLessThan(190)
    await page.screenshot({ path: info.outputPath(`${theme}-goals.png`), animations: "disabled" })
    await page.getByRole("button", { name: "More pages", exact: true }).tap()
    const menu = page.getByRole("dialog", { name: "More", exact: true })
    await expect(menu).toBeVisible()
    const bounds = (await menu.boundingBox())!
    expect(bounds.width).toBeCloseTo(390, 1)
    expect(bounds.height).toBeLessThan(310)
    await expect(menu.getByRole("link", { name: "Goals", exact: true })).toHaveAttribute("aria-current", "page")
    for (const link of await menu.getByRole("navigation").getByRole("link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await noOverflow(page)
    await page.screenshot({ path: info.outputPath(`${theme}-menu.png`), animations: "disabled" })
    await page.getByRole("button", { name: "Close menu", exact: true }).tap()
    await expect(menu).toBeHidden()
    await expect(page.getByRole("button", { name: "More pages", exact: true })).toBeFocused()
  })
}

test("goal details, money, history and phone navigation remain usable by touch", async ({ page }) => {
  await page.goto("/goals")
  const card = page.locator('li[id^="goal-card-"]').first()
  await card.getByRole("button", { name: /Details$/ }).tap()
  await expect(card.getByText("Rp 15.000.000 to go", { exact: true }).filter({ visible: true })).toBeVisible()
  await expect(card.getByText(/to reach it by/)).toBeVisible()
  await card.getByRole("button", { name: /Details$/ }).tap()
  await card.getByRole("button", { name: "Add money to Bali" }).tap()
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("100000")
  await page.getByRole("button", { name: "Add", exact: true }).tap()
  await expect(card.getByText("Rp 5.100.000", { exact: true }).first()).toBeVisible()
  await card.getByRole("button", { name: "More options for Bali" }).tap()
  await page.getByRole("menuitem", { name: "History", exact: true }).tap()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "More pages", exact: true }).tap()
  await page.getByRole("button", { name: "Settings", exact: true }).tap()
  await expect(page.getByRole("button", { name: /Change name/ })).toBeVisible()
  await page.getByRole("button", { name: "Back to More", exact: true }).tap()
  await page.getByRole("button", { name: "Close menu", exact: true }).tap()
  await page.getByRole("navigation", { name: "Phone navigation" }).getByRole("link", { name: "Wallets", exact: true }).tap()
  await expect(page).toHaveURL(/wallets$/)
  await expect(page.getByRole("dialog", { name: "More", exact: true })).toBeHidden()
  await page.getByRole("button", { name: "More pages", exact: true }).tap()
  await expect(page.getByRole("button", { name: "Close menu", exact: true })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog", { name: "More", exact: true })).toBeHidden()
  await expect(page.getByRole("button", { name: "More pages", exact: true })).toBeFocused()
})

test("long goals, enlarged text, short screens and desktop keep all controls reachable", async ({ page, request }, info) => {
  const data = await (await request.get("/api/data")).json()
  expect((await request.put(`/api/goals/${data.goals[0].id}`, { data: { ...data.goals[0], name: "Family holiday and a much longer goal", targetAmount: 987654321000, savedAmount: 123456789000 } })).ok()).toBe(true)
  for (const viewport of [{ width: 360, height: 780 }, { width: 740, height: 360 }]) {
    await page.setViewportSize(viewport)
    await page.goto("/goals")
    await page.evaluate(() => { document.documentElement.style.fontSize = "20px" })
    await noOverflow(page)
    await page.locator('li[id^="goal-card-"]').first().getByRole("button", { name: /Details$/ }).tap()
    await noOverflow(page)
    await page.getByRole("button", { name: "More pages", exact: true }).tap()
    const menu = page.getByRole("dialog", { name: "More", exact: true })
    const bounds = (await menu.boundingBox())!
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height)
    await menu.getByRole("button", { name: "Settings", exact: true }).tap()
    await expect(page.getByRole("button", { name: /Change name/ })).toBeVisible()
    await page.getByRole("button", { name: "Back to More", exact: true }).tap()
    await page.getByRole("button", { name: "Close menu", exact: true }).tap()
    await noOverflow(page)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto("/goals")
  await expect(page.getByRole("button", { name: /Details$/ }).first()).toBeHidden()
  await expect(page.getByText(/to reach it by/).first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Collapse menu" })).toBeVisible()
  await page.screenshot({ path: info.outputPath("desktop-goals.png"), animations: "disabled" })
})

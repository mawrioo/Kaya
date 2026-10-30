import { expect, test, type Page } from "./browser-fixtures"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// The new Kaya mark in the sidebar and the phone's top bar, the tab icons, and the brand files. Nothing here saves anything.
const file = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts))
const brandLink = (page: Page) => page.getByRole("link", { name: "Kaya, home" })

async function expectTheNewMark(page: Page) {
  const link = brandLink(page)
  await expect(link).toHaveText("Kaya")
  await expect(link).toHaveAttribute("href", "/")
  await expect(link.locator("svg")).toHaveCount(0)
  const facts = await link.locator("span").first().evaluate((word) => ({
    spacing: getComputedStyle(word).letterSpacing,
    size: getComputedStyle(word).fontSize,
    family: getComputedStyle(word).fontFamily,
    serif: getComputedStyle(document.documentElement).getPropertyValue("--font-source-serif"),
    color: getComputedStyle(word).color,
    expected: getComputedStyle(document.documentElement).getPropertyValue("--sidebar-primary"),
  }))
  expect(parseFloat(facts.spacing)).toBeCloseTo(0.8, 1)
  expect(facts.size).toBe("20px")
  expect(facts.family.replaceAll('"', "")).toContain(facts.serif.trim().replaceAll('"', ""))
  expect(facts.color).toBeTruthy()
  await expect(link.locator(".coin-rim")).toHaveCount(0)
}

for (const theme of ["light", "dark"] as const) {
  test(`the sidebar shows the cream Kaya wordmark (${theme} mode)`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
    await page.goto("/wallets")
    await expect(brandLink(page)).toBeVisible()
    await expectTheNewMark(page)
    // The header keeps its height: 20px above, 32px for the controls, 12px below.
    const header = await page.locator("[data-slot='sidebar-header']").evaluate((node) => node.getBoundingClientRect().height)
    expect(header).toBeCloseTo(64, 0)
    await page.screenshot({ path: testInfo.outputPath("sidebar.png"), clip: { x: 0, y: 0, width: 256, height: 400 }, animations: "disabled" })
    expect(errors).toEqual([])
  })

  test(`the phone header shares the desktop serif wordmark (${theme} mode)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
    await page.goto("/")
    const link = page.locator("header").getByRole("link", { name: "Kaya, home" })
    await expect(link).toBeVisible()
    await expectTheNewMark(page)
    const bar = (await page.locator("header", { has: page.getByRole("link", { name: "Kaya, home" }) }).boundingBox())!
    const mark = (await link.boundingBox())!
    expect(bar.height).toBe(56)
    expect(mark.y).toBeGreaterThanOrEqual(bar.y)
    expect(mark.y + mark.height).toBeLessThanOrEqual(bar.y + bar.height)
    await page.screenshot({ path: testInfo.outputPath("topbar.png"), clip: { x: 0, y: 0, width: 390, height: 64 }, animations: "disabled" })
  })
}

test("the mark opens Home, and the link keeps its name for screen readers", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/wallets")
  await brandLink(page).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(brandLink(page)).toHaveAttribute("aria-label", "Kaya, home")
})

test("the browser tab, the iPhone home screen and old browsers get the new icons, byte for byte", async ({ page, request }) => {
  await page.goto("/")
  const links = await page.locator("head link[rel~='icon'], head link[rel='apple-touch-icon']").evaluateAll((nodes) =>
    nodes.map((node) => ({ rel: node.getAttribute("rel"), href: node.getAttribute("href")!, type: node.getAttribute("type"), sizes: node.getAttribute("sizes") }))
  )
  const svg = links.find((link) => link.href.startsWith("/icon.svg"))
  const ico = links.find((link) => link.href.startsWith("/favicon.ico"))
  const apple = links.find((link) => link.rel === "apple-touch-icon")
  expect(svg?.type).toBe("image/svg+xml")
  expect(ico).toBeTruthy()
  expect(apple?.href.startsWith("/apple-icon.png")).toBe(true)

  const asked = async (href: string) => {
    const response = await request.get(href)
    expect(response.status(), href).toBe(200)
    return { type: response.headers()["content-type"], body: await response.body() }
  }
  const tab = await asked(svg!.href)
  expect(tab.type).toContain("image/svg+xml")
  expect(tab.body.equals(file("public", "brand", "favicon.svg"))).toBe(true)
  expect(tab.body.toString()).not.toContain("#E8833A") // the old orange K coin is gone

  const old = await asked(ico!.href)
  expect(old.type).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/)
  expect(old.body.equals(file("app", "favicon.ico"))).toBe(true)
  expect(old.body.readUInt16LE(4)).toBe(3)

  const touch = await asked(apple!.href)
  expect(touch.type).toContain("image/png")
  expect(touch.body.equals(file("public", "brand", "apple-touch-icon.png"))).toBe(true)
  expect([touch.body.readUInt32BE(16), touch.body.readUInt32BE(20)]).toEqual([180, 180])
})

test("every brand file is served from /brand/ exactly as it is in the kit", async ({ request }) => {
  const names = readdirSync(join(process.cwd(), "public", "brand"))
  expect(names).toHaveLength(17)
  for (const name of names) {
    const response = await request.get(`/brand/${name}`)
    expect(response.status(), name).toBe(200)
    expect(response.headers()["content-type"], name).toContain(name.endsWith(".svg") ? "image/svg+xml" : "image/png")
    expect((await response.body()).equals(file("public", "brand", name)), name).toBe(true)
  }
})

test("the wordmark stays still on hover in normal and reduced motion, and links Home by keyboard", async ({ page }) => {
  await page.goto("/wallets")
  const link = brandLink(page)
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion })
    await link.hover()
    expect(await link.evaluate((node) => node.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running").length)).toBe(0)
  }
  await link.focus()
  await expect(link).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/$/)
})

test("nothing else in the app still draws the round K badge", async ({ page }) => {
  for (const path of ["/", "/wallets", "/goals", "/insights", "/transactions", "/categories", "/no-such-page"]) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(path)
    await expect(brandLink(page)).toBeVisible()
    // A lone "K" in a round, coin-rimmed badge was the old logo. Wallet and goal badges carry icons, never a letter.
    const letters = await page.locator(".coin-rim").evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).innerText.trim()).filter((text) => text === "K"))
    expect(letters, path).toEqual([])
  }
})

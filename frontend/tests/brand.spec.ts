import { expect, test, type Locator, type Page } from "@playwright/test"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// The new Kaya mark in the sidebar and the phone's top bar, the tab icons, and the brand files. Nothing here saves anything.
const SIMPLE_BLADE = "M54 50C43 36 50 16 69 6C73 25 72 40 63 50Q58.5 53 54 50z"
const file = (...parts: string[]) => readFileSync(join(process.cwd(), ...parts))
const brandLink = (page: Page) => page.getByRole("link", { name: "Kaya, home" })

/** What the brand link draws, read from the page: the shapes, the colours they come out as, and how big it all is. */
function markFacts(link: Locator) {
  return link.evaluate((link) => {
    const toRgb = (css: string) => {
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = 1
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.fillStyle = css
      context.fillRect(0, 0, 1, 1)
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data
      return [r, g, b]
    }
    const svg = link.querySelector("svg")!
    const paths = [...svg.querySelectorAll("path")]
    const word = link.querySelector("span")!
    return {
      svgCount: link.querySelectorAll("svg").length,
      ariaHidden: svg.getAttribute("aria-hidden"),
      focusable: svg.getAttribute("focusable"),
      width: svg.getBoundingClientRect().width,
      height: svg.getBoundingClientRect().height,
      linkHeight: link.getBoundingClientRect().height,
      pathCount: paths.length,
      blades: paths.slice(0, 4).map((path) => path.getAttribute("d")),
      bladeColour: toRgb(getComputedStyle(paths[0]).fill),
      diamondColour: toRgb(getComputedStyle(paths[4]).fill),
      wordColour: toRgb(getComputedStyle(word).color),
      letterSpacing: getComputedStyle(word).letterSpacing,
      text: (link as HTMLElement).innerText.trim(),
      hasCoinRim: !!link.querySelector(".coin-rim"),
      pointerEvents: getComputedStyle(svg).pointerEvents,
    }
  })
}

const near = (found: number[], expected: number[], within = 2) => found.every((value, index) => Math.abs(value - expected[index]) <= within)

async function expectTheNewMark(page: Page) {
  const facts = await markFacts(brandLink(page))
  // One decorative drawing: the simple mark (it is under 48px), four blades and the diamond.
  expect(facts.svgCount).toBe(1)
  expect(facts.ariaHidden).toBe("true")
  expect(facts.focusable).toBe("false")
  expect(facts.pointerEvents).toBe("none")
  expect(facts.pathCount).toBe(5)
  expect(facts.blades).toEqual([SIMPLE_BLADE, SIMPLE_BLADE, SIMPLE_BLADE, SIMPLE_BLADE])
  expect(facts.width).toBe(44)
  expect(facts.width).toBeLessThan(48)
  expect(facts.height).toBe(44)
  // It takes the room the 36px coin took, so nothing around it moves.
  expect(facts.linkHeight).toBeCloseTo(36, 0)
  // Cream blades like the wordmark beside them; the light clay diamond (#E07A45), because this ground is forest green in both themes.
  expect(facts.bladeColour).toEqual(facts.wordColour)
  expect(Math.min(...facts.bladeColour)).toBeGreaterThan(200)
  expect(near(facts.diamondColour, [224, 122, 69])).toBe(true)
  // The wordmark is "Kaya" at 20px, spaced 0.04em.
  expect(parseFloat(facts.letterSpacing)).toBeCloseTo(0.8, 1)
  // And the round K badge is gone.
  expect(facts.text).toBe("Kaya")
  expect(facts.hasCoinRim).toBe(false)
}

for (const theme of ["light", "dark"] as const) {
  test(`the sidebar shows the Kaya mark with the on-dark colours, not the K coin (${theme} mode)`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
    await page.goto("/wallets")
    await expect(brandLink(page)).toBeVisible()
    await expectTheNewMark(page)
    // The header keeps its height: 28px above, 36px for the mark, 24px below.
    const header = await page.locator("[data-slot='sidebar-header']").evaluate((node) => node.getBoundingClientRect().height)
    expect(header).toBeCloseTo(88, 0)
    await page.screenshot({ path: testInfo.outputPath("sidebar.png"), clip: { x: 0, y: 0, width: 256, height: 400 }, animations: "disabled" })
    expect(errors).toEqual([])
  })

  test(`the phone's top bar shows the same mark (${theme} mode)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
    await page.goto("/")
    const link = page.locator("header").getByRole("link", { name: "Kaya, home" })
    await expect(link).toBeVisible()
    await expectTheNewMark(page)
    const bar = (await page.locator("header", { has: page.getByRole("link", { name: "Kaya, home" }) }).boundingBox())!
    const mark = (await link.locator("svg").boundingBox())!
    expect(bar.height).toBe(64)
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

test("the mark still turns once when you point at it (the K coin's old flip), and stops under reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/wallets")
  const link = brandLink(page)
  await expect(link).toBeVisible()
  const timing = () => link.locator("svg").evaluate((svg) => svg.getAnimations().map((animation) => ({
    name: (animation as CSSAnimation).animationName,
    duration: Number(animation.effect!.getComputedTiming().duration),
  })))

  expect(await timing()).toEqual([])
  await link.hover()
  const normal = await timing()
  expect(normal).toHaveLength(1)
  expect(normal[0].name).toBe("coin-flip")
  expect(normal[0].duration).toBeGreaterThan(700)

  await page.mouse.move(700, 500)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await link.hover()
  const reduced = await timing()
  expect(reduced.length).toBeLessThanOrEqual(1)
  for (const animation of reduced) expect(animation.duration).toBeLessThan(1)
  await page.waitForTimeout(150)
  expect(await link.locator("svg").evaluate((svg) => svg.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0)
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

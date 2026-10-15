/**
 * Portfolio capture: prove an isolated sample database, prepare the demo fixture,
 * capture stills, then record real interactions and scene timing for render-video.py.
 * Run from the repo root: node --disable-warning=ExperimentalWarning docs/portfolio/capture.mjs
 * Outputs: docs/portfolio/screenshots and .nb-test/portfolio-media/{raw WebM,capture.json}.
 * The harness owns server/app-copy cleanup; recordings stay until rendering is done.
 * See README.md in this folder for tools, date assumptions and packaging.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, expect } from "@playwright/test"
import setup from "../../frontend/tests/browser-server.mjs"
import { seedDemo } from "./seed-demo.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, "../..")
const scratch = join(repo, ".nb-test")
const media = join(scratch, "portfolio-media")
const shots = join(here, "screenshots")
mkdirSync(media, { recursive: true })
mkdirSync(shots, { recursive: true })
const before = new Set(readdirSync(scratch))
let browser
let cleanup
const errors = []
const scenes = []
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
try {
  // The harness refuses occupied ports and proves the standard seed before returning.
  cleanup = await setup()
  const created = readdirSync(scratch).filter((name) => !before.has(name) && name.startsWith("browser-"))
  if (created.length !== 1) throw new Error("Could not identify the owned app copy.")
  const run = join(scratch, created[0])
  const sample = seedDemo(repo, run)
  console.log("Verified original sample; prepared fictional portfolio data:", sample)
  browser = await chromium.launch({ headless: true })
  // Capture all starting-state screenshots before the movie saves its lunch expense.
  const contextOptions = { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5, timezoneId: "Asia/Jakarta", colorScheme: "light", reducedMotion: "reduce" }
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  page.on("pageerror", (error) => errors.push(error.message))
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00+07:00"))
  async function ready(target) {
    await expect(target.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
    await target.evaluate(() => document.fonts.ready)
    // This owner-only design comparison control is omitted from presentation captures.
    await target.addStyleTag({ content: 'button[data-slot="popover-trigger"].print-hidden.fixed { visibility: hidden !important; }' })
    await pause(700)
  }
  for (const [name, route] of [["home", "/"], ["wallets", "/wallets"], ["transactions", "/transactions?month=2026-10"], ["goals", "/goals"], ["insights", "/insights?month=2026-10"]]) {
    await page.goto(`http://localhost:3200${route}`)
    await ready(page)
    await expect(page.locator("body")).not.toContainText("Something went wrong")
    if (name === "home") await expect(page.getByText("30.000.000", { exact: false }).first()).toBeVisible()
    if (name === "wallets") for (const id of Object.keys(sample.wallets)) await expect(page.locator(`#wallet-card-${id}`)).toBeVisible()
    if (name === "insights") {
      await page.screenshot({ path: join(shots, "insights-summary.png"), animations: "disabled" })
      await page.evaluate(() => window.scrollTo(0, 680))
      await pause(400)
    }
    await page.screenshot({ path: join(shots, `${name}.png`), animations: "disabled" })
    console.log(`Captured ${name}`)
  }
  await page.goto("http://localhost:3200/")
  await page.evaluate(() => { localStorage.setItem("theme", "dark") })
  await page.reload()
  await ready(page)
  await page.screenshot({ path: join(shots, "home-dark.png"), animations: "disabled" })
  await page.evaluate(() => { localStorage.setItem("theme", "light") })
  const mobileContext = await browser.newContext({ ...contextOptions, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const mobile = await mobileContext.newPage()
  mobile.on("pageerror", (error) => errors.push(error.message))
  await mobile.goto("http://localhost:3200/")
  await ready(mobile)
  expect(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await mobile.screenshot({ path: join(shots, "mobile-full.png"), fullPage: true, animations: "disabled" })
  await mobile.screenshot({ path: join(shots, "mobile.png"), animations: "disabled" })
  await mobileContext.close()
  await context.close()

  const movie = await browser.newContext({ ...contextOptions, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, recordVideo: { dir: media, size: { width: 1440, height: 900 } } })
  const zero = performance.now()
  const screen = await movie.newPage()
  screen.on("pageerror", (error) => errors.push(error.message))
  // Keep the real browser clock during interactions so native animation timelines advance.
  const timestamp = () => (performance.now() - zero) / 1000
  async function open(route) {
    await screen.goto(`http://localhost:3200${route}`)
    await ready(screen)
    await screen.evaluate(() => {
      const pointer = document.createElement("div")
      pointer.id = "demo-pointer"
      pointer.style.cssText = "position:fixed;left:-50px;top:-50px;width:22px;height:28px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #0007)"
      pointer.innerHTML = '<svg viewBox="0 0 24 30"><path d="M2 2v23l6-6 5 9 4-2-5-9h9z" fill="#fff" stroke="#193b2a" stroke-width="1.8" stroke-linejoin="round"/></svg>'
      document.body.append(pointer)
      document.addEventListener("mousemove", (e) => { pointer.style.left = `${e.clientX}px`; pointer.style.top = `${e.clientY}px` })
    })
    await screen.mouse.move(1330, 80)
  }
  async function click(locator) {
    const rect = await locator.boundingBox()
    if (!rect) throw new Error("Demo control is missing")
    await screen.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 18 })
    await pause(180)
    await locator.click()
  }
  // Only these intervals enter the final edit; page navigation/loading stays outside them.
  async function scene(label, subtitle, action) {
    const start = timestamp()
    await action()
    scenes.push({ label, subtitle, start, end: timestamp() })
    console.log(`Recorded ${label}`)
  }
  await open("/")
  await scene("Your money, in one place", "BCA · Bank Jago · Superbank · Pluang", async () => { await pause(4200) })
  await open("/wallets")
  await scene("Give every account a purpose", "Bills, everyday spending, savings and investing.", async () => { await pause(3800) })
  await open("/transactions?month=2026-10")
  await scene("Add lunch in one line", "Type it. Check the details. Save.", async () => {
    await click(screen.getByRole("button", { name: "Quick add", exact: true }))
    await pause(550)
    await screen.getByLabel("Your expense").pressSequentially("Lunch 25rb BCA", { delay: 100 })
    await pause(1000)
    await click(screen.getByRole("button", { name: "Fill form", exact: true }))
    await expect(screen.getByLabel("Amount", { exact: true })).toHaveValue("25.000")
    await expect(screen.locator("#tx-category")).toContainText("Food")
    await pause(1800)
    await click(screen.getByRole("button", { name: "Add transaction", exact: true }))
    await expect(screen.getByRole("dialog")).toHaveCount(0)
    const after = await (await screen.request.get("http://localhost:3200/api/data")).json()
    const added = after.transactions.find((tx) => tx.description === "Lunch" && tx.amount === 25000)
    expect(added).toBeTruthy()
    const row = screen.locator(`[data-swipe-row="${added.id}"]`)
    await expect(row).toContainText("25.000")
    await expect(row).toContainText("BCA")
    await expect(screen.locator("section").filter({ has: row })).toHaveCSS("opacity", "1")
    await pause(2400)
  })
  const saved = await (await screen.request.get("http://localhost:3200/api/data")).json()
  expect(saved.wallets.find((wallet) => wallet.id === "wallet-bca").balance).toBe(9975000)
  expect(saved.transactions).toHaveLength(21)
  await open("/insights?month=2026-10")
  await scene("See where the month went", "Income, spending and what is left over.", async () => {
    await pause(2300)
    await screen.evaluate(() => window.scrollTo({ top: 680, behavior: "smooth" }))
    await pause(3300)
  })
  await open("/goals")
  await scene("Keep something for later", "An emergency fund. A holiday. A future home.", async () => { await pause(4800) })
  // Closing the context flushes the video before its path is handed to the renderer.
  const video = screen.video()
  await movie.close()
  const raw = await video.path()
  expect(errors).toEqual([])
  writeFileSync(join(media, "capture.json"), JSON.stringify({ raw, scenes, sample, errors, screenshotCount: 9, viewport: { width: 1440, height: 900 } }, null, 2))
  console.log("Capture ready:", join(media, "capture.json"))
} finally {
  if (browser) await browser.close()
  if (cleanup) await cleanup()
}

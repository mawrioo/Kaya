/** Capture real Kaya components with fictional data in the owned browser-test copy. */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { chromium, expect } from "@playwright/test"
import setup from "../../frontend/tests/browser-server.mjs"
import { seedDemo } from "./seed-demo.mjs"

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, "../..")
const scratch = join(repo, ".nb-test")
const output = join(here, "poster-parts")
mkdirSync(scratch, { recursive: true })
mkdirSync(output, { recursive: true })
const before = new Set(readdirSync(scratch))
let cleanup
let browser
try {
  cleanup = await setup()
  const created = readdirSync(scratch).filter((name) => !before.has(name) && name.startsWith("browser-"))
  if (created.length !== 1) throw new Error("Cannot identify the owned browser copy")
  const run = resolve(scratch, created[0])
  const local = relative(scratch, run)
  if (local.startsWith("..") || local.includes(sep) || !local.startsWith("browser-")) throw new Error("Unsafe copy path")
  seedDemo(repo, run) // First verifies 41 transactions and BCA Rp 8.742.300.
  const db = new DatabaseSync(join(run, "sample.db"))
  try {
    db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE")
    for (const [id, balance, color, position] of [
      ["wallet-bca", 25000000, "sky", 0],
      ["wallet-jago", 10000000, "marigold", 2],
      ["wallet-superbank", 25000000, "sage", 3],
      ["wallet-pluang", 15000000, "moss", 4],
    ]) db.prepare("UPDATE wallets SET balance=?, color=?, default_color=?, position=? WHERE id=?").run(balance, color, color, position, id)
    db.prepare("INSERT INTO wallets (id,name,kind,balance,description,color,default_color,position) VALUES (?,?,?,?,?,?,?,?)").run("wallet-mandiri", "Mandiri", "bank", 20000000, "", "ochre", "ochre", 1)
    db.prepare("INSERT INTO wallets (id,name,kind,balance,description,color,default_color,position,deposit_rate_bp,deposit_start,deposit_tenor,deposit_rollover,deposit_source_wallet_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run("wallet-deposito", "Deposito", "bank", 5000000, "", "plum", "plum", 5, 500, "2026-10-17", 3, 0, "wallet-bca")
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Invalid poster fixture")
    db.exec("COMMIT")
  } catch (error) { db.exec("ROLLBACK"); throw error } finally { db.close() }
  const dated = await fetch("http://127.0.0.1:4200/__test/date", { method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN, "content-type": "application/json" }, body: JSON.stringify({ date: "2026-10-17" }) })
  if (!dated.ok) throw new Error("Cannot set the isolated demo date")
  const data = await dated.json()
  if (data.wallets.length !== 6 || data.wallets.reduce((sum, w) => sum + w.balance, 0) !== 100000000) throw new Error("Poster total must be exactly Rp 100.000.000 across six wallets")
  console.log("Verified standard sample; poster fixture: six wallets, total Rp 100.000.000")
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1664, height: 1200 }, deviceScaleFactor: 2, timezoneId: "Asia/Jakarta", colorScheme: "dark", reducedMotion: "reduce" })
  await context.addInitScript(() => localStorage.setItem("theme", "dark"))
  const page = await context.newPage()
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.clock.setFixedTime(new Date("2026-10-17T20:00:00+07:00"))
  await page.goto("http://localhost:3200/")
  await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[aria-labelledby="total-balance-label"]')).toContainText("100.000.000")
  await expect(page.locator('[aria-labelledby="total-balance-label"]')).toContainText("Across 6 wallets")
  // Prove hydration with a real interaction before applying presentation styles.
  await page.getByRole("button", { name: "Quick add", exact: true }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  // Keep live-refresh renders from replacing the temporary capture styles mid-frame.
  await page.clock.pauseAt(new Date("2026-10-17T20:00:01+07:00"))
  // Poster-only type changes. The live app's source and styling remain untouched.
  await page.addStyleTag({ content: readFileSync(join(here, "poster-capture.css"), "utf8") })
  const captures = {}
  async function capture(name, locator) {
    await locator.scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    const original = await locator.boundingBox()
    await locator.evaluate((root, name) => {
      // Read every computed size before changing any ancestor to avoid scaling twice.
      const nodes = [root, ...root.querySelectorAll("*")]
      const originals = nodes.map((node) => {
        const style = getComputedStyle(node)
        return { node, style: node.getAttribute("style"), font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight) }
      })
      const box = root.getBoundingClientRect()
      window.__posterOriginals = originals
      for (const { node, font, line } of originals) {
        node.style.setProperty("font-size", `${font * 1.25}px`, "important")
        if (Number.isFinite(line)) node.style.setProperty("line-height", `${Math.max(line, font * 1.25 * 1.15)}px`, "important")
      }
      root.style.width = `${box.width}px`
      root.style.height = `${box.height}px`
      root.style.minHeight = `${box.height}px`
      root.style.maxHeight = `${box.height}px`
      root.dataset.posterPanel = name
    }, name)
    await page.clock.runFor(100)
    try {
      const checks = await locator.evaluate((root) => {
        const box = root.getBoundingClientRect()
        const clipped = []
        const ratios = []
        for (const { node, font } of window.__posterOriginals) {
          if (node.closest('.sr-only, [aria-hidden="true"]') || getComputedStyle(node).display === "none") continue
          for (const text of node.childNodes) {
            if (text.nodeType !== Node.TEXT_NODE || !text.textContent.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(text)
            const rect = range.getBoundingClientRect()
            if (!rect.width || !rect.height) continue
            ratios.push(parseFloat(getComputedStyle(node).fontSize) / font)
            if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) clipped.push(text.textContent.trim())
          }
        }
        return { width: box.width, height: box.height, clipped, typeScale: [Math.min(...ratios), Math.max(...ratios)], batik: root.querySelector(".kawung") ? getComputedStyle(root.querySelector(".kawung")).maskSize : null }
      })
      if (checks.clipped.length || Math.abs(checks.width - original.width) > 0.1 || Math.abs(checks.height - original.height) > 0.1 || checks.typeScale.some((scale) => Math.abs(scale - 1.25) > 0.001)) throw new Error(`${name}: ${JSON.stringify(checks)}`)
      await locator.screenshot({ path: join(output, `${name}.png`), animations: "disabled" })
      captures[name] = { ...original, checks }
    } finally {
      await locator.evaluate((root) => {
        delete root.dataset.posterPanel
        for (const { node, style } of window.__posterOriginals) {
          if (style === null) node.removeAttribute("style")
          else node.setAttribute("style", style)
        }
        delete window.__posterOriginals
      })
    }
  }
  await capture("total", page.locator('[aria-labelledby="total-balance-label"]'))
  for (const [index, name] of ["bca", "mandiri", "jago", "superbank", "pluang", "deposito"].entries()) {
    await capture(`wallet-${name}`, page.getByRole("region", { name: "Wallets", exact: true }).locator("li").nth(index))
  }
  await capture("month", page.locator('[aria-labelledby="panel-this-month"]'))
  await capture("spending", page.locator('[aria-labelledby="panel-spending-by-category"]'))
  await capture("goals", page.locator('[aria-labelledby="panel-savings-goals"]'))
  if (errors.length) throw new Error(errors.join("\n"))
  writeFileSync(join(output, "capture.json"), JSON.stringify({ date: "2026-10-17", fictional: true, total: 100000000, typeScale: 1.25, batikScale: 1.35, captures }, null, 2) + "\n")
  console.log(JSON.stringify(captures))
} finally {
  await browser?.close()
  await cleanup?.()
}

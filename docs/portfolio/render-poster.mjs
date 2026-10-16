/** Render the static poster. No app server, API or database is involved. */
import { createServer } from "node:http"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, "../..")
const assets = new Map([
  ["/docs/portfolio/kaya-poster.html", [resolve(here, "kaya-poster.html"), "text/html; charset=utf-8"]],
  ["/frontend/app/fonts/Inter.ttf", [resolve(repo, "frontend/app/fonts/Inter.ttf"), "font/ttf"]],
  ["/frontend/app/fonts/SourceSerif4.ttf", [resolve(repo, "frontend/app/fonts/SourceSerif4.ttf"), "font/ttf"]],
  ["/kaya-logo/svg/kaya-mark-on-dark.svg", [resolve(repo, "kaya-logo/svg/kaya-mark-on-dark.svg"), "image/svg+xml"]],
])
for (const name of ["total", "wallet-bca", "wallet-mandiri", "wallet-jago", "wallet-superbank", "month", "spending", "goals"]) {
  assets.set(`/docs/portfolio/poster-parts/${name}.png`, [resolve(here, "poster-parts", `${name}.png`), "image/png"])
}
const server = createServer(async (req, res) => {
  const asset = assets.get(req.url)
  if (!asset) { res.writeHead(404).end(); return }
  try {
    const bytes = await readFile(asset[0])
    res.writeHead(200, { "Content-Type": asset[1] }).end(bytes)
  } catch { res.writeHead(500).end() }
})
let browser
try {
  // An OS-assigned loopback port cannot clash with the owner's app or browser-test servers.
  await new Promise((ok, fail) => { server.once("error", fail); server.listen(0, "localhost", ok) })
  const port = server.address().port
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 2400, height: 1500 }, deviceScaleFactor: 1.2, colorScheme: "dark" })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("requestfailed", (request) => errors.push(request.url()))
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== `http://localhost:${port}`) {
      errors.push("External request refused")
      return route.abort()
    }
    return route.continue()
  })
  await page.goto(`http://localhost:${port}/docs/portfolio/kaya-poster.html`)
  await page.evaluate(() => document.fonts.ready)
  const checks = await page.evaluate(() => ({
    fonts: [...document.fonts].every((font) => font.status === "loaded"),
    images: [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    canvas: document.documentElement.scrollWidth === 2400 && document.documentElement.scrollHeight === 1500,
    overflow: [...document.querySelectorAll(".poster *")].filter((el) => {
      const box = el.getBoundingClientRect()
      return box.width > 0 && (box.right > 2400.5 || box.bottom > 1500.5 || box.left < 0 || box.top < 0)
    }).map((el) => el.className?.baseVal ?? el.className),
  }))
  if (errors.length || !checks.fonts || !checks.images || !checks.canvas || checks.overflow.length) {
    throw new Error(JSON.stringify({ checks, errors }))
  }
  await page.screenshot({ path: resolve(here, "kaya-poster.png"), animations: "disabled" })
  console.log(JSON.stringify({ output: "docs/portfolio/kaya-poster.png", width: 2880, height: 1800, checks }))
} finally {
  await browser?.close()
  await new Promise((ok) => server.close(ok))
}

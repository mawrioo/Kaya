/** Playwright setup owns both app copies, both processes and the throwaway database. */
import { cpSync, mkdirSync, mkdtempSync, rmSync, openSync, closeSync } from "node:fs"
import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { createServer } from "node:net"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

export default async function setup() {
  const liveAI = process.env.KAYA_BROWSER_REAL_AI === "1"
  if (liveAI) {
    const response = await fetch("http://127.0.0.1:11434/api/ps", { signal: AbortSignal.timeout(5000) })
    if (!response.ok || (await response.json()).models.length) throw new Error("The live model suite requires an idle local Ollama server.")
  }
  // Refuse occupied test ports before starting either process.
  for (const port of [3200, 4200]) await new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once("error", reject)
    probe.listen(port, () => probe.close(resolve))
  })
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
  const scratch = join(repo, ".nb-test")
  mkdirSync(scratch, { recursive: true })
  const run = mkdtempSync(join(scratch, "browser-"))
  const excluded = new Set(["node_modules", ".next", "data", "test-results", "playwright-report"])
  for (const name of ["frontend", "backend"]) {
    const original = join(repo, name)
    cpSync(original, join(run, name), {
      recursive: true,
      filter: (source) => !excluded.has(source.slice(original.length + 1).split(/[\\/]/)[0]) && !source.endsWith(".tsbuildinfo"),
    })
  }
  process.env.KAYA_BROWSER_TOKEN = randomUUID()
  const env = { ...process.env, NODE_ENV: "development", __NEXT_DEV_SERVER: "1", NEXT_RUNTIME: "nodejs", TURBOPACK: "1", KAYA_BROWSER_COPY: run, DB_PATH: join(run, "sample.db"), PORT: "4200", BACKEND_URL: "http://127.0.0.1:4200" }
  mkdirSync(join(repo, "frontend/test-results"), { recursive: true })
  const log = openSync(join(repo, "frontend/test-results/servers.log"), "w")
  const children = [
    spawn(process.execPath, [join(repo, "frontend/tests/browser-backend.mjs")], { env, stdio: ["ignore", log, log] }),
    spawn(process.execPath, [join(repo, "frontend/tests/browser-frontend.mjs")], { cwd: join(run, "frontend"), env, stdio: ["ignore", log, log] }),
  ]
  const cleanup = async () => {
    for (const child of children) {
      if (child.exitCode === null) {
        const exited = new Promise((resolve) => child.once("exit", resolve))
        child.kill("SIGTERM")
        await exited
      }
    }
    closeSync(log)
    await new Promise((resolve) => setTimeout(resolve, 500))
    rmSync(run, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
    if (liveAI) {
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "qwen3.5:2b", keep_alive: 0 }), signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) throw new Error("The live trial finished, but its model could not be unloaded.")
    }
  }
  try {
    for (const address of ["http://127.0.0.1:4200/api/data", "http://localhost:3200"]) {
      const deadline = Date.now() + 180000
      for (;;) {
        if (children.some((child) => child.exitCode !== null)) throw new Error("A test server stopped; see test-results/servers.log.")
        try { if ((await fetch(address, { signal: AbortSignal.timeout(5000) })).ok) break } catch { /* Starting. */ }
        if (Date.now() > deadline) throw new Error(`Test server did not start: ${address}`)
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }
    const data = await (await fetch("http://127.0.0.1:4200/api/data")).json()
    if (data.transactions.length !== 41 || data.wallets.find((w) => w.id === "wallet-bca")?.balance !== 8742300) throw new Error("The browser app is not using sample data.")
    return cleanup
  } catch (error) { await cleanup(); throw error }
}

/** Browser-test servers: a fresh in-memory database and a separate Next working folder. */
import { cpSync, mkdirSync, mkdtempSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
if (process.argv[2] === "backend") {
  process.env.PORT = "4100"
  process.env.DB_PATH = ":memory:"
  await import(pathToFileURL(join(repo, "backend/src/server.ts")).href)
} else if (process.argv[2] === "frontend") {
  const scratch = join(repo, ".nb-test")
  mkdirSync(scratch, { recursive: true })
  const run = mkdtempSync(join(scratch, "quick-add-"))
  const original = join(repo, "frontend")
  const copy = join(run, "frontend")
  const excluded = new Set(["node_modules", ".next", "test-results", "playwright-report", "tests"])
  cpSync(original, copy, {
    recursive: true,
    filter: (source) => !excluded.has(source.slice(original.length + 1).split(/[\\/]/)[0]) && !source.endsWith(".tsbuildinfo"),
  })
  mkdirSync(join(run, "backend/src"), { recursive: true })
  cpSync(join(repo, "backend/src/types.ts"), join(run, "backend/src/types.ts"))
  process.env.BACKEND_URL = "http://127.0.0.1:4100"
  // Found the way Node finds any package, so it also works from a scratch copy of the project inside the repo.
  const next = createRequire(join(repo, "frontend/package.json")).resolve("next/dist/bin/next")
  process.chdir(copy)
  process.argv = [process.execPath, next, "dev", copy, "-p", "3100"]
  await import(pathToFileURL(next).href)
} else {
  throw new Error("Choose frontend or backend for the isolated browser checks.")
}

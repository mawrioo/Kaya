// Run Next directly so the harness owns the serving process on Windows as well as Unix.
import { startServer } from "next/dist/server/lib/start-server.js"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
if (!process.env.KAYA_BROWSER_COPY) throw new Error("An isolated app copy is required.")
const production = process.env.KAYA_BROWSER_PRODUCTION === "1"
if (production) {
  process.env.NODE_ENV = "production"
  delete process.env.__NEXT_DEV_SERVER
  const require = createRequire(import.meta.url)
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], { cwd: process.cwd(), env: process.env, stdio: "inherit" })
  const stop = () => child.kill("SIGTERM")
  process.on("SIGTERM", stop)
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject)
      child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Isolated production build failed (${code}).`)))
    })
  } finally { process.off("SIGTERM", stop) }
}
await startServer({ dir: process.cwd(), port: 3200, isDev: !production, allowRetry: false })

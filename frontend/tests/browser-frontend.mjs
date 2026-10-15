// Run Next directly so the harness owns the serving process on Windows as well as Unix.
import { startServer } from "next/dist/server/lib/start-server.js"
if (!process.env.KAYA_BROWSER_COPY) throw new Error("An isolated app copy is required.")
await startServer({ dir: process.cwd(), port: 3200, isDev: true, allowRetry: false })

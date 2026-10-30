/** Test-only entry point. The app and database are both in the supplied scratch folder. */
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import { serve } from "@hono/node-server"

if (!process.env.KAYA_BROWSER_COPY || !process.env.KAYA_BROWSER_TOKEN || !process.env.DB_PATH?.startsWith(process.env.KAYA_BROWSER_COPY)) throw new Error("An isolated browser-test copy is required.")
const fromCopy = (file) => import(pathToFileURL(join(process.env.KAYA_BROWSER_COPY, "backend/src", file)).href)
const { openDatabase } = await fromCopy("db.ts")
const { createStore } = await fromCopy("store.ts")
const { createApp } = await fromCopy("app.ts")
const db = openDatabase()
let testDay
const { calendarDate } = await fromCopy("time.ts")
const store = createStore(db, () => testDay ?? calendarDate(new Date()))
store.reset()
// Ordinary checks stay deterministic. The opt-in live suite calls the real local model.
const liveAI = process.env.KAYA_BROWSER_REAL_AI === "1"
const { createPreviewModel } = await fromCopy("preview-model.ts")
const realModel = createPreviewModel({ enabled: true, model: "qwen3.5:2b" })
const modelTimings = []
const app = createApp(store, { enabled: true, now: () => testDay ? new Date(`${testDay}T12:00:00+07:00`) : new Date(), model: liveAI ? async (input, signal) => {
  const start = performance.now()
  try { return await realModel(input, signal) }
  finally { modelTimings.push(Math.round(performance.now() - start)) }
} : async ({ categories }) => ({
  categoryId: categories.find(c => c.name === "Food")?.id ?? categories.find(c => c.name === "Salary")?.id ?? null,
}) })
app.get("/__test/model-stats", (c) => {
  if (c.req.header("authorization") !== process.env.KAYA_BROWSER_TOKEN) return c.text("Forbidden", 403)
  return c.json({ liveAI, model: "qwen3.5:2b", modelTimings })
})
app.post("/__test/reset", (c) => {
  if (c.req.header("authorization") !== process.env.KAYA_BROWSER_TOKEN) return c.text("Forbidden", 403)
  testDay = undefined
  db.exec("DELETE FROM app_sessions; DELETE FROM app_lock")
  store.reset()
  return c.json(store.getData())
})
app.post("/__test/date", async (c) => {
  if (c.req.header("authorization") !== process.env.KAYA_BROWSER_TOKEN) return c.text("Forbidden", 403)
  const { date } = await c.req.json()
  if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.text("Invalid date", 400)
  testDay = date ?? undefined
  return c.json(store.getData())
})
serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 4200 })

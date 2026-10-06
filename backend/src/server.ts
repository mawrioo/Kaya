/**
 * Starts the backend: opens the database file and serves the API. It only
 * listens on this computer (127.0.0.1). The frontend passes requests on to it,
 * so a phone on your Wi-Fi talks to the frontend, never to this directly.
 */
import { serve } from "@hono/node-server"

import { createApp } from "./app.ts"
import { DB_PATH, openDatabase } from "./db.ts"
import { createStore } from "./store.ts"

const port = Number(process.env.PORT ?? 4000)
const db = openDatabase()
const app = createApp(createStore(db))

const server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
  console.log(`Backend ready on http://${info.address}:${info.port}`)
  console.log(`Database file: ${DB_PATH}`)
})

function shutDown() {
  server.close()
  db.close()
  process.exit(0)
}
process.on("SIGINT", shutDown)
process.on("SIGTERM", shutDown)

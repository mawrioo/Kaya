/**
 * Turns Kaya's PIN off, for when it has been forgotten.
 *
 *   npm run pin:reset -- --yes
 *
 * It can only be run on this computer, from the project folder, which is the point: a PIN keeps other people on the same
 * Wi-Fi out, and whoever sits at this computer can always take it off. Your data is not touched. Every device is signed
 * out, so open Kaya again and set a new PIN from the menu at the bottom of the sidebar if you want one.
 */
import { DB_PATH, openDatabase } from "./db.ts"
import { createAuth } from "./auth.ts"

if (!process.argv.includes("--yes")) {
  console.error("This turns Kaya's PIN off. Your data is not touched.")
  console.error(`Database file: ${DB_PATH}`)
  console.error("To go ahead, run:  npm run pin:reset -- --yes")
  process.exit(1)
}

const db = openDatabase()
const auth = createAuth(db)
const hadPin = auth.isPinSet()
auth.forceRemove()
console.log(hadPin ? "Done. The PIN is off. Open Kaya, and set a new one from the menu at the bottom of the sidebar if you like." : "There was no PIN, so nothing changed.")
db.close()

/**
 * Erases the database and puts the sample data back.
 *
 *   npm run db:reset -- --yes
 *
 * It refuses to run without --yes, because it deletes everything you entered.
 */
import { DB_PATH, openDatabase } from "./db.ts"
import { createStore } from "./store.ts"

if (!process.argv.includes("--yes")) {
  console.error("This erases ALL your data and restores the sample data.")
  console.error(`Database file: ${DB_PATH}`)
  console.error("To go ahead, run:  npm run db:reset -- --yes")
  process.exit(1)
}

const db = openDatabase()
const store = createStore(db)
store.reset()
const data = store.getData()
console.log(
  `Done. Sample data restored: ${data.wallets.length} wallets, ${data.categories.length} categories, ` +
    `${data.transactions.length} transactions, ${data.goals.length} goals.`
)
db.close()

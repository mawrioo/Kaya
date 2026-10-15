/** Fictional portfolio data. Refuses every database outside a disposable browser copy. */
import { DatabaseSync } from "node:sqlite"
import { resolve, relative, sep } from "node:path"

export function seedDemo(repo, run) {
  const scratch = resolve(repo, ".nb-test")
  const local = relative(scratch, resolve(run))
  if (local.startsWith("..") || local.includes(sep) || !local.startsWith("browser-")) throw new Error("Expected one isolated browser copy.")
  const db = new DatabaseSync(resolve(run, "sample.db"))
  try {
    if (db.prepare("SELECT COUNT(*) AS n FROM transactions").get().n !== 41 || db.prepare("SELECT balance FROM wallets WHERE id = 'wallet-bca'").get().balance !== 8742300) throw new Error("Prove the original sample data before preparing the demo.")
    db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE")
    db.exec("DELETE FROM goal_movements; DELETE FROM goals; DELETE FROM transactions; DELETE FROM wallet_value_updates")
    const balances = { "wallet-bca": 10000000, "wallet-jago": 2000000, "wallet-superbank": 12000000, "wallet-pluang": 6000000 }
    for (const [id, balance] of Object.entries(balances)) db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(balance, id)
    db.prepare("UPDATE app_user SET name = ?, monthly_budget = ? WHERE id = 1").run("Mario", 5000000)
    db.exec("UPDATE categories SET budget = NULL")
    for (const [id, amount] of [["cat-home", 2500000], ["cat-groceries", 1000000], ["cat-food", 300000], ["cat-transport", 200000]]) db.prepare("UPDATE categories SET budget = ? WHERE id = ?").run(amount, id)
    const insert = db.prepare("INSERT INTO transactions (id,type,amount,date,description,wallet_id,category_id,from_wallet_id,to_wallet_id) VALUES (?,?,?,?,?,?,?,?,?)")
    for (const month of ["09", "10"]) {
      const rows = [
        ["01", "income", 10000000, `${month === "09" ? "September" : "October"} salary`, "wallet-bca", "cat-salary"],
        ["02", "expense", 2000000, "Monthly rent", "wallet-bca", "cat-home"],
        ["03", "transfer", 2000000, "Everyday spending money", "wallet-bca", "wallet-jago"],
        ["03", "transfer", 1000000, "Monthly savings", "wallet-bca", "wallet-superbank"],
        ["04", "expense", 800000, "Grocery shop", "wallet-jago", "cat-groceries"],
        ["05", "expense", 300000, "Internet and electricity", "wallet-bca", "cat-home"],
        ["08", "expense", 100000, "Train card top-up", "wallet-jago", "cat-transport"],
        ["10", "expense", 500000, "Sent to Mum", "wallet-bca", "cat-family"],
        ["12", "expense", month === "09" ? 750000 : 250000, "Clothes and home essentials", "wallet-jago", "cat-shopping"],
        ["14", "expense", 50000, "Lunch", "wallet-jago", "cat-food"],
      ]
      rows.forEach(([day, type, amount, description, wallet, category], index) => {
        const transfer = type === "transfer"
        insert.run(`demo-${month}-${index}`, type, amount, `2026-${month}-${day}T12:${String(index).padStart(2, "0")}:00+07:00`, description, transfer ? null : wallet, transfer ? null : category, transfer ? wallet : null, transfer ? category : null)
      })
    }
    const goals = [
      ["goal-emergency", "Emergency fund", 10000000, 8000000, "2027-03-31", "wallet-superbank", "umbrella", 6000000],
      ["goal-holiday", "A little holiday", 4000000, 2000000, "2027-04-30", "wallet-superbank", "plane", 1000000],
      ["goal-home", "Future home", 30000000, 6000000, "2029-12-31", "wallet-pluang", "key-round", 5000000],
    ]
    goals.forEach(([id, name, target, saved, date, wallet, icon, started], position) => {
      db.prepare("INSERT INTO goals (id,name,target_amount,saved_amount,target_date,wallet_id,icon,position,pace_from,pace_amount) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id, name, target, saved, date, wallet, icon, position, "2026-09-01", started)
      const movement = db.prepare("INSERT INTO goal_movements (goal_id,at,kind,old_saved,new_saved) VALUES (?,?,?,?,?)")
      movement.run(id, "2026-09-01T08:00:00+07:00", "start", 0, started)
      movement.run(id, "2026-10-03T12:30:00+07:00", "add", started, saved)
    })
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Invalid portfolio sample.")
    db.exec("COMMIT")
    return { wallets: balances, transactions: 20, month: "October 2026", income: 10000000, spending: 4000000, total: 30000000 }
  } catch (error) {
    try { db.exec("ROLLBACK") } catch { /* No transaction began. */ }
    throw error
  } finally { db.close() }
}

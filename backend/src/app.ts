/**
 * The web routes. The frontend talks to these, and only these:
 *
 *   GET    /api/data                everything the app draws itself from
 *   PUT    /api/user                change the owner's name
 *   PUT    /api/monthly-budget      set the budget for the whole month, or take it away
 *   POST   /api/transactions        add a transaction
 *   PUT    /api/transactions/:id    change a transaction
 *   DELETE /api/transactions/:id    delete a transaction
 *   POST   /api/wallets                add a wallet
 *   PUT    /api/wallets/order          put the wallets in a new order
 *   PUT    /api/wallets/:id            rename a wallet, change its note, colour or icon
 *   DELETE /api/wallets/:id            delete a wallet and its transactions
 *   POST   /api/wallets/:id/value      set an investment wallet's current market value
 *   POST   /api/wallets/:id/correction set any other wallet's balance to what the real account shows
 *   POST   /api/wallets/:id/settle     move a matured deposito's money into another wallet
 *   GET    /api/wallets/:id/history    the balances set by hand for a wallet, newest first
 *   POST   /api/categories             add a category
 *   PUT    /api/categories/order       put the categories in a new order
 *   PUT    /api/categories/:id         change a category the owner made (presets can't be changed)
 *   PUT    /api/categories/:id/budget  set a spending category's monthly budget, or take it away (presets too)
 *   DELETE /api/categories/:id         delete a category the owner made; its transactions move to "Other"
 *   POST   /api/goals                  add a goal
 *   PUT    /api/goals/order            put the goals in a new order
 *   PUT    /api/goals/:id              change a goal, including which wallet it is saved in
 *   POST   /api/goals/:id/add-money    add to what has been saved for a goal, optionally moving the money from another wallet
 *   POST   /api/goals/:id/take-out     take money back out of a goal
 *   GET    /api/goals/:id/history      every change to what is saved for a goal, newest first
 *   DELETE /api/goals/:id              delete a goal and its history
 *   POST   /api/undo/:undoId           put back a transaction, wallet or goal that was just deleted
 *   POST   /api/backup                 copy the data file into the backups folder ("Back up now")
 *
 * Saving or deleting a transaction or wallet also returns every wallet with its new balance.
 * Saving or deleting a category returns every category.
 * Saving or deleting a goal returns every goal, and adding money from another wallet also
 * returns the wallets and the transfer that was recorded.
 */
import { Hono } from "hono"

import type { Store } from "./store.ts"
import { ValidationError } from "./validate.ts"

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new ValidationError("Send the data as JSON.")
  }
}

export function createApp(store: Store) {
  const app = new Hono()

  app.get("/api/health", (c) => c.json({ ok: true }))

  app.get("/api/data", (c) => c.json(store.getData()))

  app.put("/api/user", async (c) => c.json(store.updateUser(await readJson(c.req.raw))))

  // One budget for all spending together in a month, next to the ones for single categories.
  app.put("/api/monthly-budget", async (c) => c.json(store.setMonthlyBudget(await readJson(c.req.raw))))

  app.post("/api/transactions", async (c) => {
    const result = store.createTransaction(await readJson(c.req.raw))
    return c.json(result, 201)
  })

  app.put("/api/transactions/:id", async (c) => {
    const result = store.updateTransaction(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That transaction doesn't exist any more." }, 404)
  })

  app.delete("/api/transactions/:id", (c) => {
    const result = store.deleteTransaction(c.req.param("id"))
    return result ? c.json(result) : c.json({ error: "That transaction doesn't exist any more." }, 404)
  })

  app.post("/api/wallets", async (c) => {
    const result = store.createWallet(await readJson(c.req.raw))
    return c.json(result, 201)
  })

  // Registered before the ":id" route so "order" isn't mistaken for a wallet id.
  app.put("/api/wallets/order", async (c) => c.json(store.reorderWallets(await readJson(c.req.raw))))

  app.put("/api/wallets/:id", async (c) => {
    const result = store.updateWallet(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  // Sets an investment's current market value. It is not income or spending, so it makes no transaction.
  app.post("/api/wallets/:id/value", async (c) => {
    const result = store.updateWalletValue(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  // Fixes a balance that has drifted from the real account. Not income or spending, so no transaction either.
  app.post("/api/wallets/:id/correction", async (c) => {
    const result = store.correctWalletBalance(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  app.post("/api/wallets/:id/settle", async (c) => {
    const result = store.settleDeposito(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  app.get("/api/wallets/:id/history", (c) => {
    const history = store.getWalletHistory(c.req.param("id"))
    return history ? c.json(history) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  app.delete("/api/wallets/:id", (c) => {
    const result = store.deleteWallet(c.req.param("id"))
    return result ? c.json(result) : c.json({ error: "That wallet doesn't exist any more." }, 404)
  })

  app.post("/api/categories", async (c) => {
    const result = store.createCategory(await readJson(c.req.raw))
    return c.json(result, 201)
  })

  // Registered before the ":id" routes so "order" and "restore" aren't mistaken for a category id.
  app.put("/api/categories/order", async (c) => c.json(store.reorderCategories(await readJson(c.req.raw))))

  // Undoes deleting a category.
  app.post("/api/categories/restore", async (c) => c.json(store.restoreCategory(await readJson(c.req.raw)), 201))

  app.put("/api/categories/:id", async (c) => {
    const result = store.updateCategory(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That category doesn't exist any more." }, 404)
  })

  app.put("/api/categories/:id/budget", async (c) => {
    const result = store.setCategoryBudget(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That category doesn't exist any more." }, 404)
  })

  app.delete("/api/categories/:id", (c) => {
    const result = store.deleteCategory(c.req.param("id"))
    return result ? c.json(result) : c.json({ error: "That category doesn't exist any more." }, 404)
  })

  app.post("/api/goals", async (c) => {
    const result = store.createGoal(await readJson(c.req.raw))
    return c.json(result, 201)
  })

  // Registered before the ":id" route so "order" isn't mistaken for a goal id.
  app.put("/api/goals/order", async (c) => c.json(store.reorderGoals(await readJson(c.req.raw))))

  app.put("/api/goals/:id", async (c) => {
    const result = store.updateGoal(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That goal doesn't exist any more." }, 404)
  })

  // Adds to the goal. Only when the body names a wallet the money comes from is a transfer recorded too.
  app.post("/api/goals/:id/add-money", async (c) => {
    const result = store.addToGoal(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That goal doesn't exist any more." }, 404)
  })

  // Only changes the goal. No money moves between wallets and no transaction is made.
  app.post("/api/goals/:id/take-out", async (c) => {
    const result = store.takeFromGoal(c.req.param("id"), await readJson(c.req.raw))
    return result ? c.json(result) : c.json({ error: "That goal doesn't exist any more." }, 404)
  })

  app.get("/api/goals/:id/history", (c) => {
    const history = store.getGoalHistory(c.req.param("id"))
    return history ? c.json(history) : c.json({ error: "That goal doesn't exist any more." }, 404)
  })

  app.delete("/api/goals/:id", (c) => {
    const result = store.deleteGoal(c.req.param("id"))
    return result ? c.json(result) : c.json({ error: "That goal doesn't exist any more." }, 404)
  })

  app.onError((error, c) => {
    if (error instanceof ValidationError) return c.json({ error: error.message }, 400)
    console.error(error)
    return c.json({ error: "Something went wrong while saving. Nothing was changed." }, 500)
  })

  // Undoes deleting a transaction, a wallet or a goal, using the undo id the delete sent back.
  app.post("/api/undo/:undoId", (c) => c.json(store.undo(c.req.param("undoId")), 201))

  // Copies the data file into the backups folder. Only ever runs when the owner presses "Back up now".
  app.post("/api/backup", (c) => c.json(store.backUp(), 201))

  app.notFound((c) => c.json({ error: "Not found." }, 404))

  return app
}

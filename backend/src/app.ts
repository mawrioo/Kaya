/**
 * The web routes. The frontend talks to these, and only these:
 *
 *   GET    /api/data                everything the app draws itself from
 *   PUT    /api/user                change the owner's name
 *   PUT    /api/monthly-budget      set the budget for the whole month, or take it away
 *   POST   /api/transactions        add a transaction
 *   POST   /api/transactions/import add many transactions read from a bank's file, all or nothing
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
 *   GET    /api/auth/status            whether Kaya has a PIN, and whether this device has typed it
 *   POST   /api/auth/unlock            type the PIN on this device
 *   POST   /api/auth/lock              forget this device, so it has to type the PIN again
 *   PUT    /api/auth/pin               turn the PIN on, or change it
 *   DELETE /api/auth/pin               turn the PIN off
 *
 * With a PIN set, every route above except the health check and /api/auth/* answers 401 until the device has typed it.
 *
 * Saving or deleting a transaction or wallet also returns every wallet with its new balance.
 * Saving or deleting a category returns every category.
 * Saving or deleting a goal returns every goal, and adding money from another wallet also
 * returns the wallets and the transfer that was recorded.
 */
import { Hono, type Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"

import { AuthError, SESSION_COOKIE } from "./auth.ts"
import type { Store } from "./store.ts"
import { ValidationError } from "./validate.ts"
import { createPreviewModel, PreviewModelError, type SuggestionModel } from "./preview-model.ts"
import { previewConversation as previewTransaction } from "./preview-conversation.ts"
import { previewBatch } from "./batch-preview.ts"
import { answerSpendingQuestion } from "./spending-questions.ts"
import { detectSubscriptions } from "./subscription-detection.ts"

async function readJson(request: Request, limit = 5 * 1024 * 1024): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > limit) throw new ValidationError("Keep the request short.")
  const reader = request.body?.getReader()
  if (!reader) throw new ValidationError("Send the data as JSON.")
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > limit) throw new ValidationError("Keep the request short.")
      chunks.push(value)
    }
  } finally { await reader.cancel() }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    throw new ValidationError("Send the data as JSON.")
  }
}

export function createApp(store: Store, previewOptions: { model?: SuggestionModel; now?: () => Date; enabled?: boolean } = {}) {
  const app = new Hono()

  const auth = store.auth
  const previewEnabled = previewOptions.enabled ?? process.env.KAYA_AI_ENABLED !== "false"
  const previewModel = previewOptions.model ?? createPreviewModel({ enabled: previewEnabled })

  app.get("/api/health", (c) => c.json({ ok: true }))

  /** Hands a device its cookie after it has typed the PIN. HttpOnly, so no script on the page can read it. */
  function giveSession(c: Context, session: { token: string; maxAgeSeconds: number }) {
    setCookie(c, SESSION_COOKIE, session.token, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: session.maxAgeSeconds })
  }

  // With a PIN set, nothing is answered until this device has typed it. The health check and the PIN routes are the exceptions.
  app.use("/api/*", async (c, next) => {
    const path = c.req.path
    if (path === "/api/health" || path.startsWith("/api/auth/")) return next()
    if (!auth.isAllowed(getCookie(c, SESSION_COOKIE))) {
      return c.json({ error: "Kaya is locked. Enter your PIN to open it.", locked: true }, 401)
    }
    return next()
  })

  app.get("/api/auth/status", (c) => c.json(auth.status(getCookie(c, SESSION_COOKIE))))

  app.post("/api/auth/unlock", async (c) => {
    giveSession(c, auth.unlock(await readJson(c.req.raw)))
    return c.json({ pinSet: true })
  })

  app.post("/api/auth/lock", (c) => {
    auth.lock(getCookie(c, SESSION_COOKIE))
    deleteCookie(c, SESSION_COOKIE, { path: "/" })
    return c.json({ pinSet: auth.isPinSet() })
  })

  app.put("/api/auth/pin", async (c) => {
    giveSession(c, auth.setPin(await readJson(c.req.raw)))
    return c.json({ pinSet: true })
  })

  app.delete("/api/auth/pin", async (c) => {
    auth.removePin(await readJson(c.req.raw))
    deleteCookie(c, SESSION_COOKIE, { path: "/" })
    return c.json({ pinSet: false })
  })

  app.get("/api/data", (c) => c.json(store.getData()))

  app.put("/api/user", async (c) => c.json(store.updateUser(await readJson(c.req.raw))))

  // One budget for all spending together in a month, next to the ones for single categories.
  app.put("/api/monthly-budget", async (c) => c.json(store.setMonthlyBudget(await readJson(c.req.raw))))

  // Preview is read-only and uses the same PIN protection as the ledger. No model can invoke save.
  app.post("/api/transactions/preview", async (c) => {
    if (!previewEnabled) throw new PreviewModelError("disabled", "AI Quick add is off. You can use the ordinary form.")
    if (Number(c.req.header("content-length")) > 4096) throw new ValidationError("Keep the preview request short.")
    const reader = c.req.raw.body?.getReader()
    if (!reader) throw new ValidationError("Send a sentence as JSON.")
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        size += value.length
        if (size > 4096) throw new ValidationError("Keep the preview request short.")
        chunks.push(value)
      }
    } finally { await reader.cancel() }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")) }
    catch { throw new ValidationError("Send the data as JSON.") }
    const data = store.getData()
    const result = await previewTransaction(body, {
      categoryRules: store.assistant.getData().rules,
      wallets: data.wallets.map(({ id, name, nickname, kind }) => ({ id, name, nickname, kind })),
      categories: data.categories.map(({ id, name, type }) => ({ id, name, type })),
      transactions: data.transactions.filter(t => t.type !== "transfer").map(t => ({ type: t.type, categoryId: t.categoryId, description: t.description, date: t.date })),
    }, previewModel, { now: previewOptions.now?.(), signal: c.req.raw.signal })
    // A device may have been locked while the model was working.
    if (!auth.isAllowed(getCookie(c, SESSION_COOKIE))) return c.json({ error: "Kaya is locked. Enter your PIN to open it.", locked: true }, 401)
    return c.json(result)
  })

  app.get("/api/assistant", c => c.json(store.assistant.getData()))
  app.put("/api/assistant/rules", async c => c.json(store.assistant.saveRule(await readJson(c.req.raw, 4096))))
  app.delete("/api/assistant/rules/:id", c => { store.assistant.deleteRule(c.req.param("id")); return c.json(store.assistant.getData()) })
  app.put("/api/assistant/templates", async c => c.json(store.assistant.saveTemplate(await readJson(c.req.raw, 4096))))
  app.delete("/api/assistant/templates/:id", c => { store.assistant.deleteTemplate(c.req.param("id")); return c.json(store.assistant.getData()) })
  app.post("/api/assistant/batch", async c => c.json(store.assistant.saveBatch(await readJson(c.req.raw, 16384)), 201))
  app.post("/api/assistant/preview-batch", async c => {
    if (!previewEnabled) throw new PreviewModelError("disabled", "AI Quick add is off. You can use the ordinary form.")
    const body = await readJson(c.req.raw, 16384)
    const data = store.getData()
    const result = await previewBatch(body, { wallets: data.wallets, categories: data.categories, categoryRules: store.assistant.getData().rules,
      transactions: data.transactions.filter(t => t.type !== "transfer") }, previewModel, { now: previewOptions.now?.(), signal: c.req.raw.signal })
    if (!auth.isAllowed(getCookie(c, SESSION_COOKIE))) return c.json({ error: "Kaya is locked. Enter your PIN to open it.", locked: true }, 401)
    return c.json(result)
  })
  app.post("/api/assistant/questions", async c => {
    const body = await readJson(c.req.raw, 4096)
    const text = body && typeof body === "object" && "text" in body ? body.text : undefined
    return c.json(answerSpendingQuestion(text, store.getData(), previewOptions.now?.()))
  })
  app.get("/api/assistant/subscriptions", c => c.json(detectSubscriptions(store.getData(), store.assistant.getData().subscriptions, previewOptions.now?.())))
  app.put("/api/assistant/subscriptions", async c => {
    const body = await readJson(c.req.raw, 4096)
    if (!body || typeof body !== "object" || !("key" in body)) throw new ValidationError("Choose a recurring payment.")
    const known = detectSubscriptions(store.getData(), store.assistant.getData().subscriptions, previewOptions.now?.()).some(candidate => candidate.key === body.key)
      || store.assistant.getData().subscriptions.some(preference => preference.key === body.key)
    if (!known) throw new ValidationError("That recurring payment is no longer available. Refresh the suggestions.")
    return c.json(store.assistant.setSubscription(body))
  })

  app.post("/api/transactions", async (c) => {
    const result = store.createTransaction(await readJson(c.req.raw))
    return c.json(result, 201)
  })

  // Registered before the ":id" routes so "import" isn't mistaken for a transaction id.
  app.post("/api/transactions/import", async (c) => c.json(store.importTransactions(await readJson(c.req.raw)), 201))

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
    if (error instanceof PreviewModelError) return c.json({ error: error.message, code: error.code }, error.code === "busy" ? 429 : error.code === "cancelled" ? 408 : 503)
    if (error instanceof ValidationError) return c.json({ error: error.message }, 400)
    if (error instanceof AuthError) {
      if (error.retryAfterSeconds !== undefined) c.header("Retry-After", String(error.retryAfterSeconds))
      const retry = error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {}
      return c.json({ error: error.message, ...retry }, error.status)
    }
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

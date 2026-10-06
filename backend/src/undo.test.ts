import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, DeleteGoalResult, DeleteTransactionResult, DeleteWalletResult, UndoResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

function freshStack() {
  const db = openDatabase(":memory:")
  return { db, store: createStore(db) }
}
type TestStore = ReturnType<typeof createStore>

const balances = (store: TestStore) => Object.fromEntries(store.getData().wallets.map((w) => [w.id, w.balance]))

/** Asserts that `work` is refused with a plain-English message matching `message`. */
const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

/** Asserts that undoing is refused, and that the refusal changed nothing at all. */
function refusesAndChangesNothing(store: TestStore, undoId: string, message: RegExp) {
  const before = store.getData()
  refuses(() => store.undo(undoId), message)
  assert.deepEqual(store.getData(), before)
}

const spending = (walletId: string, amount: number) => ({
  type: "expense",
  amount,
  date: "2026-09-30T10:00:00+07:00",
  description: "Something",
  walletId,
  categoryId: "cat-food",
})

describe("undoing the deletion of a transaction", () => {
  it("puts back an expense exactly as it was, and the wallet balance goes back too", () => {
    const { store } = freshStack()
    const before = store.getData()
    const { wallets, undoId } = store.deleteTransaction("tx-041")!
    assert.equal(wallets.find((w) => w.id === "wallet-jago")?.balance, 2_315_500 + 215_000)
    assert.equal(store.getData().transactions.some((tx) => tx.id === "tx-041"), false)

    const result = store.undo(undoId)
    assert.equal(result.kind, "transaction")
    assert.deepEqual(store.getData(), before, "the whole database is as it was before the delete")
  })

  it("puts back income, and a transfer with both of its wallets", () => {
    const { store } = freshStack()
    const before = store.getData()
    store.undo(store.deleteTransaction("tx-037")!.undoId)
    store.undo(store.deleteTransaction("tx-038")!.undoId)
    assert.deepEqual(store.getData(), before)
  })

  it("says what came back: the transaction, and every wallet with its balance", () => {
    const { store } = freshStack()
    const original = store.getData().transactions.find((tx) => tx.id === "tx-041")
    const result = store.undo(store.deleteTransaction("tx-041")!.undoId)
    assert.ok(result.kind === "transaction")
    assert.deepEqual(result.transaction, original)
    assert.deepEqual(result.wallets, store.getData().wallets)
  })

  it("can't be undone twice, and an id it doesn't know is refused too", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteTransaction("tx-041")!
    store.undo(undoId)
    refuses(() => store.undo(undoId), /can't be undone any more/)
    refuses(() => store.undo("undo-nope"), /can't be undone any more/)
  })

  it("is refused, changing nothing, when the wallet it was in has been deleted since", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteTransaction("tx-001")! // rent, from BCA
    store.deleteWallet("wallet-bca")
    refusesAndChangesNothing(store, undoId, /wallet it was in has been deleted/)
  })

  it("is refused when the other wallet of a transfer has been deleted since", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteTransaction("tx-038")! // BCA to Bank Jago
    store.deleteWallet("wallet-jago")
    refusesAndChangesNothing(store, undoId, /one of the wallets it moved money between has been deleted/i)
  })

  it("is refused when its category has been deleted since", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteTransaction("tx-003")! // groceries
    store.deleteCategory("cat-groceries")
    refusesAndChangesNothing(store, undoId, /category has been deleted/)
  })

  it("is forgotten when the data is reset", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteTransaction("tx-041")!
    store.reset()
    refuses(() => store.undo(undoId), /can't be undone any more/)
  })

  it("keeps only the 50 most recent deletes", () => {
    const { store } = freshStack()
    const ids = Array.from({ length: 60 }, (_, i) => store.createTransaction(spending("wallet-jago", 1_000 + i)).transaction.id)
    const undoIds = ids.map((id) => store.deleteTransaction(id)!.undoId)
    refuses(() => store.undo(undoIds[0]), /can't be undone any more/)
    refuses(() => store.undo(undoIds[9]), /can't be undone any more/)
    assert.equal(store.undo(undoIds[10]).kind, "transaction")
    assert.equal(store.undo(undoIds[59]).kind, "transaction")
  })
})

describe("undoing the deletion of a goal", () => {
  it("puts back the goal exactly as it was, with its history, pace and place in the list", () => {
    const { store } = freshStack()
    const before = store.getData()
    const history = store.getGoalHistory("goal-japan")
    const { goals, undoId } = store.deleteGoal("goal-japan")!
    assert.equal(goals.some((g) => g.id === "goal-japan"), false)
    assert.equal(store.getGoalHistory("goal-japan"), undefined)

    const result = store.undo(undoId)
    assert.ok(result.kind === "goal")
    assert.equal(result.goal.id, "goal-japan")
    assert.deepEqual(result.goals, before.goals)
    assert.deepEqual(store.getData(), before)
    assert.deepEqual(store.getGoalHistory("goal-japan"), history)
  })

  it("brings back the date a reached goal was reached", () => {
    const { store } = freshStack()
    const { goal } = store.createGoal(
      { name: "Small one", targetAmount: 1_000_000, savedAmount: 1_000_000, targetDate: "", walletId: "wallet-bca", icon: "gift" },
      new Date(2026, 9, 1, 9, 0)
    )
    assert.ok(goal.reachedAt)
    const before = store.getData()
    store.undo(store.deleteGoal(goal.id)!.undoId)
    assert.deepEqual(store.getData(), before)
    assert.equal(store.getData().goals.find((g) => g.id === goal.id)?.reachedAt, goal.reachedAt)
  })

  it("keeps a goal that was moved into another wallet's history intact: the transfer it made stays where it is", () => {
    const { store } = freshStack()
    store.addToGoal("goal-emergency", { amount: 500_000, fromWalletId: "wallet-jago" })
    const before = store.getData()
    const history = store.getGoalHistory("goal-emergency")
    store.undo(store.deleteGoal("goal-emergency")!.undoId)
    assert.deepEqual(store.getData(), before)
    assert.deepEqual(store.getGoalHistory("goal-emergency"), history)
  })

  it("is refused, changing nothing, when the wallet it was saved in has been deleted since", () => {
    const { store } = freshStack()
    const { goal } = store.createGoal({
      name: "Cash goal", targetAmount: 2_000_000, savedAmount: 0, targetDate: "", walletId: "wallet-bca", icon: "gift",
    })
    const { undoId } = store.deleteGoal(goal.id)!
    store.deleteWallet("wallet-bca")
    refusesAndChangesNothing(store, undoId, /wallet it was saved in has been deleted/)
  })

  it("forgets which wallet some money came from, as deleting that wallet always does, when it has been deleted since", () => {
    const { store } = freshStack()
    store.addToGoal("goal-emergency", { amount: 500_000, fromWalletId: "wallet-jago" })
    assert.equal(store.getGoalHistory("goal-emergency")![0].fromWalletId, "wallet-jago")
    const { undoId } = store.deleteGoal("goal-emergency")!
    store.deleteWallet("wallet-jago")

    store.undo(undoId)
    const history = store.getGoalHistory("goal-emergency")!
    assert.equal(history.length, 5)
    assert.equal(history[0].fromWalletId, undefined)
    assert.equal(history[0].transferred, true)
  })

  it("can't be undone twice", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteGoal("goal-japan")!
    store.undo(undoId)
    refuses(() => store.undo(undoId), /can't be undone any more/)
  })
})

describe("undoing the deletion of a wallet", () => {
  it("puts back everything: the wallet, its balance, its transactions, its history and its place", () => {
    const { store } = freshStack()
    store.correctWalletBalance("wallet-bca", { value: 8_000_000 }, new Date(2026, 9, 1, 9, 0))
    store.updateWalletValue("wallet-pluang", { value: 15_500_000 }, new Date(2026, 9, 1, 9, 5))
    store.reorderWallets({ ids: ["wallet-jago", "wallet-superbank", "wallet-bca", "wallet-pluang"] })
    const before = store.getData()
    const bcaHistory = store.getWalletHistory("wallet-bca")
    const homeHistory = store.getGoalHistory("goal-home")

    const gone = store.deleteWallet("wallet-bca")!
    assert.equal(gone.wallets.length, 3)
    assert.ok(gone.deletedTransactionIds.length > 10)
    assert.equal(store.getWalletHistory("wallet-bca"), undefined)

    const result = store.undo(gone.undoId)
    assert.ok(result.kind === "wallet")
    assert.equal(result.wallet.id, "wallet-bca")
    assert.deepEqual(result.wallets, before.wallets)
    assert.deepEqual(store.getData(), before, "the whole database is as it was before the delete")
    assert.deepEqual(store.getWalletHistory("wallet-bca"), bcaHistory)
    assert.deepEqual(store.getGoalHistory("goal-home"), homeHistory, "a goal's history says again that its money came from BCA")
  })

  it("says what came back: the wallet, every wallet, its transactions and its hand-set balances", () => {
    const { store } = freshStack()
    store.correctWalletBalance("wallet-bca", { value: 8_000_000 })
    const before = store.getData()
    const result = store.undo(store.deleteWallet("wallet-bca")!.undoId)
    assert.ok(result.kind === "wallet")
    assert.deepEqual(
      result.transactions,
      before.transactions.filter((tx) => (tx.type === "transfer" ? tx.fromWalletId === "wallet-bca" || tx.toWalletId === "wallet-bca" : tx.walletId === "wallet-bca"))
    )
    assert.deepEqual(result.balanceAdjustments, before.balanceAdjustments.filter((entry) => entry.walletId === "wallet-bca"))
  })

  it("leaves the other wallets' balances alone, both when deleting and when undoing", () => {
    const { store } = freshStack()
    const before = balances(store)
    const { wallets, undoId } = store.deleteWallet("wallet-bca")!
    for (const wallet of wallets) assert.equal(wallet.balance, before[wallet.id])
    store.undo(undoId)
    assert.deepEqual(balances(store), before)
  })

  it("still works after other things have changed in the meantime", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteWallet("wallet-bca")!
    store.createTransaction(spending("wallet-jago", 50_000))
    store.undo(undoId)
    const after = balances(store)
    assert.equal(after["wallet-bca"], 8_742_300)
    assert.equal(after["wallet-jago"], 2_315_500 - 50_000)
  })

  it("is refused, changing nothing, when another wallet now has its name (capitals don't matter)", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteWallet("wallet-bca")!
    store.createWallet({ name: "bca", kind: "bank", description: "", startingBalance: 0 })
    refusesAndChangesNothing(store, undoId, /another wallet called BCA/)
  })

  it("is refused when a wallet it had transfers with has been deleted since", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteWallet("wallet-bca")!
    store.deleteWallet("wallet-jago")
    refusesAndChangesNothing(store, undoId, /wallet it had transfers with has been deleted/)
  })

  it("is refused when a category its transactions used has been deleted since", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteWallet("wallet-jago")! // it paid for the groceries
    store.deleteCategory("cat-groceries")
    refusesAndChangesNothing(store, undoId, /category its transactions used has been deleted/)
  })

  it("can't be undone twice", () => {
    const { store } = freshStack()
    const { undoId } = store.deleteWallet("wallet-bca")!
    store.undo(undoId)
    refuses(() => store.undo(undoId), /can't be undone any more/)
  })
})

describe("putting transactions back in their own place", () => {
  // Real data has transactions with exactly the same date and time (several entered in the same minute). They are
  // listed in the order they were saved, so an undo has to give a transaction back its place among them.
  const SAME_TIME = "2026-09-30T10:00:00+07:00"
  const saveAt = (store: TestStore, walletId: string, note: string) =>
    store.createTransaction({ ...spending(walletId, 1_000), date: SAME_TIME, description: note }).transaction.id
  const orderOf = (store: TestStore) => store.getData().transactions.filter((tx) => tx.date === SAME_TIME).map((tx) => tx.description)

  it("comes back in the same place among transactions with exactly the same time: first, middle or last", () => {
    for (const victim of [0, 1, 2]) {
      const { store } = freshStack()
      const ids = ["a", "b", "c"].map((note) => saveAt(store, "wallet-jago", note))
      const before = store.getData()
      store.undo(store.deleteTransaction(ids[victim])!.undoId)
      assert.deepEqual(orderOf(store), ["a", "b", "c"], `after undoing the delete of ${["a", "b", "c"][victim]}`)
      assert.deepEqual(store.getData(), before)
    }
  })

  it("comes back in the same place when a whole wallet comes back, among another wallet's transactions", () => {
    const { store } = freshStack()
    // Bank Jago and BCA take turns, all at the same time.
    ;[["wallet-jago", "a"], ["wallet-bca", "b"], ["wallet-jago", "c"], ["wallet-bca", "d"]].forEach(([walletId, note]) => saveAt(store, walletId, note))
    const before = store.getData()
    store.undo(store.deleteWallet("wallet-jago")!.undoId)
    assert.deepEqual(orderOf(store), ["a", "b", "c", "d"])
    assert.deepEqual(store.getData(), before)
  })

  it("still comes back, after it, if a new transaction has taken its old place in the meantime", () => {
    const { store } = freshStack()
    const last = saveAt(store, "wallet-jago", "last")
    const { undoId } = store.deleteTransaction(last)!
    saveAt(store, "wallet-jago", "newer") // gets the number the deleted one had
    store.undo(undoId)
    assert.deepEqual(orderOf(store), ["newer", "last"])
    assert.equal(store.getData().transactions.filter((tx) => tx.id === last).length, 1)
  })
})

describe("the undo API", () => {
  const freshApp = () => createApp(createStore(openDatabase(":memory:")))
  const dataOf = async (app: ReturnType<typeof freshApp>) => (await (await app.request("/api/data")).json()) as AppData

  it("sends an undo id with every delete, and POST /api/undo/:id puts it back", async () => {
    const app = freshApp()
    const before = await dataOf(app)

    const tx = (await (await app.request("/api/transactions/tx-041", { method: "DELETE" })).json()) as DeleteTransactionResult
    assert.match(tx.undoId, /^undo-/)
    const goal = (await (await app.request("/api/goals/goal-japan", { method: "DELETE" })).json()) as DeleteGoalResult
    assert.match(goal.undoId, /^undo-/)
    const wallet = (await (await app.request("/api/wallets/wallet-bca", { method: "DELETE" })).json()) as DeleteWalletResult
    assert.match(wallet.undoId, /^undo-/)

    for (const [undoId, kind] of [[wallet.undoId, "wallet"], [goal.undoId, "goal"], [tx.undoId, "transaction"]] as const) {
      const res = await app.request(`/api/undo/${undoId}`, { method: "POST" })
      assert.equal(res.status, 201)
      assert.equal(((await res.json()) as UndoResult).kind, kind)
    }
    assert.deepEqual(await dataOf(app), before)
  })

  it("answers 400 with a plain message for an id it doesn't know or has already used", async () => {
    const app = freshApp()
    const unknown = await app.request("/api/undo/undo-nope", { method: "POST" })
    assert.equal(unknown.status, 400)
    assert.match(((await unknown.json()) as { error: string }).error, /can't be undone any more/)

    const { undoId } = (await (await app.request("/api/transactions/tx-041", { method: "DELETE" })).json()) as DeleteTransactionResult
    assert.equal((await app.request(`/api/undo/${undoId}`, { method: "POST" })).status, 201)
    assert.equal((await app.request(`/api/undo/${undoId}`, { method: "POST" })).status, 400)
  })
})

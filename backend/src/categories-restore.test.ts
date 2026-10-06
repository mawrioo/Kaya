import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { OTHER_CATEGORY_ID } from "./category-look.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { Category, RestoreCategory, RestoreCategoryResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

/** A store, and the database under it, so a test can change something behind the store's back. */
function freshStack() {
  const db = openDatabase(":memory:")
  return { db, store: createStore(db) }
}
type TestStore = ReturnType<typeof createStore>

const balances = (store: TestStore) => Object.fromEntries(store.getData().wallets.map((w) => [w.id, w.balance]))
const indexOf = (store: TestStore, id: string) => store.getData().categories.findIndex((category) => category.id === id)

/** Asserts that `work` is refused with a plain-English message matching `message`. */
const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
})

/** Deletes a category the way the page does, and builds the request that would undo it. */
function deleteAndKeepUndo(store: TestStore, id: string): RestoreCategory {
  const category = store.getData().categories.find((entry) => entry.id === id)!
  const { movedTransactionIds, position } = store.deleteCategory(id)!
  return {
    category: {
      id: category.id,
      name: category.name,
      type: category.type,
      icon: category.icon,
      color: category.color,
      ...(category.budget !== undefined ? { budget: category.budget } : {}),
    },
    position,
    transactionIds: movedTransactionIds,
  }
}

describe("undoing the deletion of a category", () => {
  it("puts everything back exactly as it was: the category, its budget, its place and its transactions", () => {
    const { store } = freshStack()
    store.setCategoryBudget("cat-groceries", { budget: 600_000 })
    const before = store.getData()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    assert.equal(store.getData().categories.some((c) => c.id === "cat-groceries"), false)

    const result = store.restoreCategory(undo)
    assert.equal(result.category.id, "cat-groceries")
    assert.deepEqual(result.restoredTransactionIds.sort(), ["tx-003", "tx-017", "tx-030"])
    assert.deepEqual(store.getData(), before, "the whole database is as it was before the delete")
    assert.deepEqual(result.categories, before.categories)
  })

  it("works for an income category too, moving its four transactions back from the income Other", () => {
    const { store } = freshStack()
    const before = store.getData()
    const undo = deleteAndKeepUndo(store, "cat-side-income")
    assert.equal(undo.transactionIds.length, 4)
    store.restoreCategory(undo)
    assert.deepEqual(store.getData(), before)
  })

  it("brings back a category that had no transactions and no budget", () => {
    const { store } = freshStack()
    const { category } = store.createCategory({ name: "Coffee", type: "expense", icon: "coffee", color: "plum" })
    const before = store.getData()
    const undo = deleteAndKeepUndo(store, category.id)
    assert.deepEqual(undo.transactionIds, [])
    const result = store.restoreCategory(undo)
    assert.equal(result.category.budget, undefined)
    assert.deepEqual(store.getData(), before)
  })

  it("says in its reply what place a deleted category had", () => {
    const { store } = freshStack()
    const { position } = store.deleteCategory("cat-groceries")!
    assert.equal(typeof position, "number")
    assert.ok(position > 0)
  })

  it("puts it back in its old place, in the middle of the list, not at the end", () => {
    const { store } = freshStack()
    const where = indexOf(store, "cat-family")
    assert.ok(where > 0 && where < store.getData().categories.length - 1, "it was in the middle")
    store.restoreCategory(deleteAndKeepUndo(store, "cat-family"))
    assert.equal(indexOf(store, "cat-family"), where)
  })

  it("keeps its place after other categories were added in between", () => {
    const { store } = freshStack()
    const where = indexOf(store, "cat-groceries")
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.createCategory({ name: "Coffee", type: "expense", icon: "coffee", color: "plum" })
    store.restoreCategory(undo)
    assert.equal(indexOf(store, "cat-groceries"), where)
    assert.equal(store.getData().categories.length, 14)
  })

  it("puts it last when its place is beyond everything (a number nothing else has reached)", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-side-income")
    store.restoreCategory({ ...undo, position: 9999 })
    assert.equal(store.getData().categories.at(-1)?.id, "cat-side-income")
  })

  it("still comes back (somewhere sensible, exactly once) when the categories were reordered after the delete", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.reorderCategories({ ids: store.getData().categories.map((c) => c.id).reverse() })
    store.restoreCategory(undo)
    const ids = store.getData().categories.map((c) => c.id)
    assert.equal(ids.filter((id) => id === "cat-groceries").length, 1)
    assert.equal(ids.length, 13)
  })

  it("brings two deleted categories back in their original order, whichever one is undone first", () => {
    for (const order of [["cat-groceries", "cat-family"], ["cat-family", "cat-groceries"]]) {
      const { store } = freshStack()
      const before = store.getData().categories
      const undoGroceries = deleteAndKeepUndo(store, "cat-groceries")
      const undoFamily = deleteAndKeepUndo(store, "cat-family")
      for (const id of order) store.restoreCategory(id === "cat-groceries" ? undoGroceries : undoFamily)
      assert.deepEqual(store.getData().categories, before, `undone as ${order.join(" then ")}`)
    }
  })

  it("never changes a wallet balance, and moves only the transactions it was asked to", () => {
    const { store } = freshStack()
    const walletsBefore = balances(store)
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    // Something that was already in Other before stays there.
    const otherBefore = store.getData().transactions.filter((tx) => tx.type !== "transfer" && tx.categoryId === OTHER_CATEGORY_ID.expense)
    store.restoreCategory(undo)
    assert.deepEqual(balances(store), walletsBefore)
    const stillOther = store.getData().transactions.filter((tx) => tx.type !== "transfer" && tx.categoryId === OTHER_CATEGORY_ID.expense)
    assert.deepEqual(stillOther.map((tx) => tx.id).sort(), otherBefore.filter((tx) => !undo.transactionIds.includes(tx.id)).map((tx) => tx.id).sort())
  })

  it("can be done again after another delete", () => {
    const { store } = freshStack()
    const before = store.getData()
    store.restoreCategory(deleteAndKeepUndo(store, "cat-groceries"))
    store.restoreCategory(deleteAndKeepUndo(store, "cat-groceries"))
    assert.deepEqual(store.getData(), before)
  })
})

describe("what undoing a deletion refuses", () => {
  it("is refused when a transaction was moved out of Other in the meantime, and nothing at all changes", () => {
    const { db, store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    db.prepare("UPDATE transactions SET category_id = 'cat-food' WHERE id = 'tx-017'").run()
    const before = store.getData()
    refuses(() => store.restoreCategory(undo), /have changed since it was deleted, so that can't be undone/)
    assert.deepEqual(store.getData(), before, "all or nothing: not even the other two moved back")
  })

  it("is refused when a listed transaction doesn't exist any more", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.deleteTransaction("tx-003")
    const before = store.getData()
    refuses(() => store.restoreCategory(undo), /have changed since/)
    assert.deepEqual(store.getData(), before)
  })

  it("is refused when the transactions are in the other kind's Other (wrong kind of money)", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-side-income")
    refuses(() => store.restoreCategory({ ...undo, category: { ...undo.category, type: "expense" }, transactionIds: undo.transactionIds }), /have changed since/)
  })

  it("is refused when its name was taken in the meantime, with the usual message", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.createCategory({ name: "groceries", type: "expense", icon: "tag", color: "sky" })
    const before = store.getData()
    refuses(() => store.restoreCategory(undo), /You already have an expense category called groceries/i)
    assert.deepEqual(store.getData(), before)
  })

  it("lets the same name come back when only the other kind has it", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.createCategory({ name: "Groceries", type: "income", icon: "tag", color: "sky" })
    assert.equal(store.restoreCategory(undo).category.name, "Groceries")
  })

  it("is refused when the category is already there", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    store.restoreCategory(undo)
    refuses(() => store.restoreCategory(undo), /already there/)
  })

  it("is refused for a preset, and for something that isn't a category id", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    refuses(() => store.restoreCategory({ ...undo, category: { ...undo.category, id: "cat-food" } }), /preset can't be restored|already there/)
    refuses(() => store.restoreCategory({ ...undo, category: { ...undo.category, id: "nope" } }), /isn't a category that can be restored/)
    refuses(() => store.restoreCategory({ ...undo, category: { ...undo.category, id: "cat-" + "x".repeat(200) } }), /isn't a category that can be restored/)
  })

  it("checks the category's own details like a new one: name, icon, colour and kind", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    const withCategory = (changes: Record<string, unknown>) => ({ ...undo, category: { ...undo.category, ...changes } })
    refuses(() => store.restoreCategory(withCategory({ name: "  " })), /Give the category a name/)
    refuses(() => store.restoreCategory(withCategory({ name: "x".repeat(31) })), /at most 30 characters/)
    refuses(() => store.restoreCategory(withCategory({ icon: "rocket" })), /one of the icons/)
    refuses(() => store.restoreCategory(withCategory({ color: "pink" })), /one of the colours/)
    refuses(() => store.restoreCategory(withCategory({ type: "transfer" })), /spending or for income/)
  })

  it("checks the budget: whole rupiah above zero, and only for spending", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    const withBudget = (budget: unknown) => ({ ...undo, category: { ...undo.category, budget } })
    refuses(() => store.restoreCategory(withBudget(0)), /above zero/)
    refuses(() => store.restoreCategory(withBudget(-5)), /above zero/)
    refuses(() => store.restoreCategory(withBudget(1.5)), /above zero/)
    refuses(() => store.restoreCategory(withBudget("lots")), /above zero/)
    const income = deleteAndKeepUndo(store, "cat-side-income")
    refuses(() => store.restoreCategory({ ...income, category: { ...income.category, budget: 1000 } }), /Budgets are for spending/)
  })

  it("checks where it sat and which transactions to move", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    refuses(() => store.restoreCategory({ ...undo, position: -1 }), /where the category sat/)
    refuses(() => store.restoreCategory({ ...undo, position: 2.5 }), /where the category sat/)
    refuses(() => store.restoreCategory({ ...undo, position: "3" }), /where the category sat/)
    refuses(() => store.restoreCategory({ ...undo, position: undefined }), /where the category sat/)
    refuses(() => store.restoreCategory({ ...undo, transactionIds: "tx-003" }), /list of transactions/)
    refuses(() => store.restoreCategory({ ...undo, transactionIds: [3] }), /list of transactions/)
    refuses(() => store.restoreCategory({ ...undo, transactionIds: ["tx-003", "tx-003"] }), /only once/)
    refuses(() => store.restoreCategory(null), /JSON object/)
    refuses(() => store.restoreCategory({ position: 0, transactionIds: [] }), /category to restore/)
  })

  it("leaves everything exactly as it was after any refusal", () => {
    const { store } = freshStack()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    const before = store.getData()
    for (const bad of [{ ...undo, position: -1 }, { ...undo, category: { ...undo.category, icon: "rocket" } }, { ...undo, transactionIds: ["tx-003", "nope"] }]) {
      assert.throws(() => store.restoreCategory(bad))
      assert.deepEqual(store.getData(), before)
    }
  })
})

describe("the undo route", () => {
  it("answers 201 with the category, every category and the transactions that went back", async () => {
    const { store } = freshStack()
    const app = createApp(store)
    const before = store.getData()
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    const response = await app.request("/api/categories/restore", json("POST", undo))
    assert.equal(response.status, 201)
    const body = (await response.json()) as RestoreCategoryResult
    assert.equal(body.category.id, "cat-groceries")
    assert.deepEqual(body.restoredTransactionIds.sort(), ["tx-003", "tx-017", "tx-030"])
    assert.deepEqual(body.categories, before.categories)
    assert.deepEqual(store.getData(), before)
  })

  it("answers 400 with a plain message for a request that can't be undone, and changes nothing", async () => {
    const { db, store } = freshStack()
    const app = createApp(store)
    const undo = deleteAndKeepUndo(store, "cat-groceries")
    db.prepare("UPDATE transactions SET category_id = 'cat-food' WHERE id = 'tx-003'").run()
    const before = store.getData()
    const response = await app.request("/api/categories/restore", json("POST", undo))
    assert.equal(response.status, 400)
    assert.match(((await response.json()) as { error: string }).error, /have changed since/)
    assert.deepEqual(store.getData(), before)
  })

  it("answers 400 for something that isn't JSON, and 400 for an empty request", async () => {
    const app = createApp(freshStack().store)
    const notJson = await app.request("/api/categories/restore", { method: "POST", body: "nope", headers: { "content-type": "application/json" } })
    assert.equal(notJson.status, 400)
    const empty = await app.request("/api/categories/restore", json("POST", {}))
    assert.equal(empty.status, 400)
  })

  it("does the whole round trip over HTTP: delete, then undo", async () => {
    const { store } = freshStack()
    const app = createApp(store)
    await app.request("/api/categories/cat-groceries/budget", json("PUT", { budget: 750_000 }))
    const before = store.getData()
    const index = before.categories.findIndex((c: Category) => c.id === "cat-groceries")
    const deleted = await app.request("/api/categories/cat-groceries", { method: "DELETE" })
    assert.equal(deleted.status, 200)
    const { movedTransactionIds, position } = (await deleted.json()) as { movedTransactionIds: string[]; position: number }
    const category = before.categories[index]
    const restored = await app.request("/api/categories/restore", json("POST", { category, position, transactionIds: movedTransactionIds }))
    assert.equal(restored.status, 201)
    assert.deepEqual(store.getData(), before)
    assert.equal(store.getData().categories[index].budget, 750_000)
  })

  it("is not mistaken for a category called 'restore': PUT and DELETE on that id are plain 404s", async () => {
    const app = createApp(freshStack().store)
    assert.equal((await app.request("/api/categories/restore", { method: "DELETE" })).status, 404)
    assert.equal((await app.request("/api/categories/restore", json("PUT", { name: "x", icon: "tag", color: "sky" }))).status, 404)
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import { ValidationError } from "./validate.ts"

const when = "2026-10-28T12:00:00+07:00"
const expense = (over: Record<string, unknown> = {}) => ({ type: "expense", amount: 35000, date: when, description: "Kopi Kenangan", walletId: "wallet-bca", categoryId: "cat-food", ...over })
const fresh = () => { const db = openDatabase(":memory:"); return { db, store: createStore(db) } }
const ledger = (store: ReturnType<typeof createStore>) => ({ transactions: store.getData().transactions, wallets: store.getData().wallets })
function diskFixture(work: (path: string, folder: string) => void) {
  const prefix = resolve(tmpdir(), "kaya-assistant-")
  const folder = mkdtempSync(prefix)
  try { work(join(folder, "sample.db"), folder) }
  finally {
    if (!resolve(folder).startsWith(prefix)) throw Error("Refusing to clean outside this test's temporary folder")
    rmSync(folder, { recursive: true, force: true })
  }
}

describe("explicit category learning", () => {
  it("starts empty and learns only when a confirmed transaction opts in", () => {
    const { store } = fresh()
    assert.deepEqual(store.assistant.getData(), { rules: [], templates: [], subscriptions: [] })
    store.createTransaction(expense())
    assert.equal(store.assistant.getData().rules.length, 0)
    store.createTransaction(expense({ description: "  KOPI Kenangan!  ", rememberCategory: true }))
    const rule = store.assistant.getData().rules[0]
    assert.deepEqual({ ...rule, id: "id" }, { id: "id", type: "expense", phrase: "kopi kenangan", categoryId: "cat-food" })
    store.createTransaction(expense({ categoryId: "cat-shopping", rememberCategory: true }))
    assert.equal(store.assistant.getData().rules.length, 1)
    assert.equal(store.assistant.getData().rules[0].categoryId, "cat-shopping")
  })
  it("rolls the transaction and balance back when remembering is invalid", () => {
    const { store } = fresh()
    const before = ledger(store)
    for (const body of [expense({ rememberCategory: "yes" }), expense({ description: "!!!", rememberCategory: true }), expense({ categoryId: "cat-salary", rememberCategory: true }), { type: "transfer", amount: 1000, fromWalletId: "wallet-bca", toWalletId: "wallet-jago", date: when, description: "Transfer", rememberCategory: true }]) {
      assert.throws(() => store.createTransaction(body), ValidationError)
      assert.deepEqual(ledger(store), before)
      assert.equal(store.assistant.getData().rules.length, 0)
    }
  })
  it("supports exact typed rule CRUD without accepting incompatible or unknown fields", () => {
    const { store } = fresh()
    const first = store.assistant.saveRule({ type: "expense", phrase: "Lunch!", categoryId: "cat-food" })
    const changed = store.assistant.saveRule({ id: first.id, type: "expense", phrase: "Lunch with friends", categoryId: "cat-shopping" })
    assert.equal(changed.id, first.id)
    assert.equal(changed.phrase, "lunch with friends")
    for (const body of [{ type: "transfer", phrase: "Lunch", categoryId: "cat-food" }, { type: "expense", phrase: "Lunch", categoryId: "cat-salary" }, { type: "expense", phrase: "Lunch", categoryId: "unknown" }, { type: "expense", phrase: "Lunch", categoryId: "cat-food", amount: 1 }, { id: "unknown", type: "expense", phrase: "Lunch", categoryId: "cat-food" }]) assert.throws(() => store.assistant.saveRule(body), ValidationError)
    assert.equal(store.assistant.deleteRule(first.id), true)
    assert.equal(store.assistant.deleteRule(first.id), false)
  })
  it("removes rules for a deleted category and does not silently move them to Other", () => {
    const { store } = fresh()
    const { category } = store.createCategory({ name: "Coffee", type: "expense", icon: "coffee", color: "plum" })
    store.assistant.saveRule({ type: "expense", phrase: "Kopi", categoryId: category.id })
    const template = store.assistant.saveTemplate({ name: "Coffee", draft: { type: "expense", categoryId: category.id, walletId: "wallet-bca" } })
    store.deleteCategory(category.id)
    assert.equal(store.assistant.getData().rules.length, 0)
    assert.equal(store.assistant.getData().templates.find(row => row.id === template.id)?.draft.categoryId, undefined)
  })
})

describe("favourite draft templates", () => {
  it("stores optional amounts and discards old calendar dates without writing transactions", () => {
    const { store } = fresh()
    const before = ledger(store)
    const saved = store.assistant.saveTemplate({ name: "Lunch", draft: { type: "expense", walletId: "wallet-bca", categoryId: "cat-food", description: "Lunch", date: "2020-01-01" } })
    assert.equal(saved.draft.amount, undefined)
    assert.equal(saved.draft.date, undefined)
    assert.deepEqual(ledger(store), before)
    const updated = store.assistant.saveTemplate({ id: saved.id, name: "Work lunch", draft: { ...saved.draft, amount: 35000 } })
    assert.equal(updated.draft.amount, 35000)
    assert.equal(store.assistant.getData().templates.length, 1)
    assert.equal(store.assistant.deleteTemplate(saved.id), true)
  })
  it("validates financial fields, direction, compatible categories and unique names", () => {
    const { store } = fresh()
    store.assistant.saveTemplate({ name: "Lunch", draft: { type: "expense" } })
    for (const body of [{ name: "lunch", draft: { type: "expense" } }, { name: "Bad", draft: { type: "expense", amount: 0 } }, { name: "Bad", draft: { type: "expense", categoryId: "cat-salary" } }, { name: "Bad", draft: { type: "expense", walletId: "missing" } }, { name: "Bad", draft: { type: "transfer", walletId: "wallet-bca", toWalletId: "wallet-bca" } }, { name: "Bad", draft: { type: "income", toWalletId: "wallet-bca" } }, { name: "Bad", draft: { type: "expense", balance: 100 } }]) assert.throws(() => store.assistant.saveTemplate(body), ValidationError)
    const transfer = store.assistant.saveTemplate({ name: "Savings", draft: { type: "transfer", amount: 500000, walletId: "wallet-bca", toWalletId: "wallet-jago" } })
    assert.equal(transfer.draft.toWalletId, "wallet-jago")
  })
  it("asks for a deleted wallet instead of substituting another wallet", () => {
    const { db, store } = fresh()
    const saved = store.assistant.saveTemplate({ name: "Cash spending", draft: { type: "expense", walletId: "wallet-bca", categoryId: "cat-food" } })
    // Simulate a reference disappearing while retaining the unrelated template.
    db.prepare("UPDATE assistant_templates SET draft_json = ? WHERE id = ?").run(JSON.stringify({ ...saved.draft, walletId: "deleted-wallet" }), saved.id)
    const read = store.assistant.getData().templates[0]
    assert.equal(read.draft.walletId, undefined)
    assert.equal(read.draft.categoryId, "cat-food")
  })
})

describe("reviewed message batch saving", () => {
  it("saves expense/income/transfer rows and rules in one atomic request", () => {
    const { store } = fresh()
    const before = store.getData()
    const rows = [expense({ rememberCategory: true }), { type: "income", amount: 200000, date: when, description: "Bonus", walletId: "wallet-jago", categoryId: "cat-bonus" }, { type: "transfer", amount: 100000, date: when, description: "Savings", fromWalletId: "wallet-bca", toWalletId: "wallet-jago" }]
    const saved = store.assistant.saveBatch({ requestId: "batch-fixture-one", transactions: rows })
    assert.equal(saved.transactions.length, 3)
    assert.equal(store.getData().transactions.length, before.transactions.length + 3)
    assert.equal(saved.wallets.find(row => row.id === "wallet-bca")!.balance, before.wallets.find(row => row.id === "wallet-bca")!.balance - 135000)
    assert.equal(saved.wallets.find(row => row.id === "wallet-jago")!.balance, before.wallets.find(row => row.id === "wallet-jago")!.balance + 300000)
    assert.equal(store.assistant.getData().rules.length, 1)
  })
  it("rejects malformed rows, oversized batches and CSV replacement fields without writes", () => {
    const { store } = fresh()
    const before = ledger(store)
    for (const body of [{ requestId: "batch-fixture-two", transactions: [] }, { requestId: "batch-fixture-two", transactions: Array.from({ length: 6 }, () => expense()) }, { requestId: "batch-fixture-two", transactions: [expense(), expense({ walletId: "unknown" })] }, { requestId: "batch-fixture-two", transactions: [expense({ replaceTransactionId: "tx-existing" })] }, { requestId: "short", transactions: [expense()] }]) {
      assert.throws(() => store.assistant.saveBatch(body), ValidationError)
      assert.deepEqual(ledger(store), before)
    }
  })
  it("rolls back prior inserts and learning when a later database insert fails", () => {
    const { db, store } = fresh()
    const before = ledger(store)
    db.exec("CREATE TRIGGER fail_batch_row BEFORE INSERT ON transactions WHEN NEW.description = 'reject this' BEGIN SELECT RAISE(ABORT, 'fixture rejection'); END")
    assert.throws(() => store.assistant.saveBatch({ requestId: "batch-fixture-three", transactions: [expense({ rememberCategory: true }), expense({ description: "reject this" })] }), /fixture rejection/)
    assert.deepEqual(ledger(store), before)
    assert.deepEqual(store.assistant.getData().rules, [])
    assert.equal((db.prepare("SELECT count(*) AS count FROM assistant_batch_requests").get() as { count: number }).count, 0)
  })
  it("replays original IDs without new writes, rejects key conflicts and returns current balances", () => {
    const { store } = fresh()
    const body = { requestId: "batch-fixture-four", transactions: [expense()] }
    const first = store.assistant.saveBatch(body)
    store.createTransaction(expense({ amount: 123 }))
    const before = ledger(store)
    const replay = store.assistant.saveBatch(body)
    assert.deepEqual(replay.transactions, first.transactions)
    assert.deepEqual(replay.wallets, store.getData().wallets)
    assert.deepEqual(ledger(store), before)
    assert.throws(() => store.assistant.saveBatch({ ...body, transactions: [expense({ amount: 36000 })] }), /already used/)
    assert.deepEqual(ledger(store), before)
  })
  it("replays after referenced categories or saved rows have been removed without recreating them", () => {
    const { store } = fresh()
    const { category } = store.createCategory({ name: "Coffee", type: "expense", icon: "coffee", color: "plum" })
    const body = { requestId: "batch-fixture-five", transactions: [expense({ categoryId: category.id })] }
    const first = store.assistant.saveBatch(body)
    store.deleteTransaction(first.transactions[0].id)
    store.deleteCategory(category.id)
    const before = ledger(store)
    const replay = store.assistant.saveBatch(body)
    assert.equal(replay.transactions[0].id, first.transactions[0].id)
    assert.deepEqual(ledger(store), before)
  })
})

describe("persistent assistant state and migration", () => {
  it("tracks, dismisses, renames and removes a subscription preference", () => {
    const { store } = fresh()
    store.assistant.setSubscription({ key: "wallet-bca:spotify:monthly", status: "tracked", name: "Spotify" })
    store.assistant.setSubscription({ key: "wallet-bca:spotify:monthly", status: "dismissed", name: "Music" })
    assert.deepEqual(store.assistant.getData().subscriptions, [{ key: "wallet-bca:spotify:monthly", status: "dismissed", name: "Music" }])
    assert.throws(() => store.assistant.setSubscription({ key: "key", status: "automatic", name: "Music" }), ValidationError)
    store.assistant.setSubscription({ key: "wallet-bca:spotify:monthly", status: "remove" })
    assert.deepEqual(store.assistant.getData().subscriptions, [])
  })
  it("persists preferences, templates, rules and batch keys through a database backup/reopen", () => diskFixture((path, folder) => {
    let db = openDatabase(path)
    let store = createStore(db)
    store.assistant.saveTemplate({ name: "Lunch", draft: { type: "expense", categoryId: "cat-food" } })
    store.assistant.setSubscription({ key: "spotify", status: "tracked", name: "Spotify" })
    const batch = { requestId: "persistent-batch-one", transactions: [expense({ rememberCategory: true })] }
    const saved = store.assistant.saveBatch(batch)
    const expected = store.assistant.getData()
    const before = ledger(store)
    const { backup } = store.backUp()
    db.close()
    db = openDatabase(join(folder, "backups", backup.name))
    store = createStore(db)
    assert.deepEqual(store.assistant.getData(), expected)
    assert.deepEqual(ledger(store), before)
    assert.deepEqual(store.assistant.saveBatch(batch).transactions, saved.transactions)
    assert.deepEqual(ledger(store), before)
    db.close()
  }))
  it("adds only empty assistant tables to a pre-expansion database", () => diskFixture(path => {
    let db = openDatabase(path)
    let store = createStore(db)
    const before = store.getData()
    for (const table of ["assistant_batch_requests", "assistant_templates", "assistant_subscriptions", "assistant_category_rules"]) db.exec(`DROP TABLE ${table}`)
    db.close()
    db = openDatabase(path)
    store = createStore(db)
    assert.deepEqual(store.getData(), before)
    assert.deepEqual(store.assistant.getData(), { rules: [], templates: [], subscriptions: [] })
    assert.equal((db.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check, "ok")
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), [])
    db.close()
  }))
  it("reset clears every assistant table and restores only the original sample ledger", () => {
    const { db, store } = fresh()
    store.assistant.saveTemplate({ name: "Lunch", draft: { type: "expense" } })
    store.assistant.setSubscription({ key: "spotify", status: "tracked", name: "Spotify" })
    store.assistant.saveBatch({ requestId: "batch-reset-fixture", transactions: [expense({ rememberCategory: true })] })
    store.reset()
    assert.equal(store.getData().transactions.length, 41)
    assert.deepEqual(store.assistant.getData(), { rules: [], templates: [], subscriptions: [] })
    assert.equal((db.prepare("SELECT count(*) AS count FROM assistant_batch_requests").get() as { count: number }).count, 0)
  })
})

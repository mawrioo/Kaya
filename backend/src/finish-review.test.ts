import assert from "node:assert/strict"
import { it, type TestContext } from "node:test"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"

function setup(t: TestContext) {
  const db = openDatabase(":memory:")
  t.after(() => db.close())
  const store = createStore(db, () => "2026-10-13")
  return { db, store }
}
const terms = { ratePercent: 5, startDate: "2025-10-13", tenorMonths: 12, rollover: false }
const deposit = { name: "Test deposit", kind: "deposito", startingBalance: 1_000_000, deposito: { ...terms, fromWalletId: "wallet-bca" } }
const expense = { type: "expense", amount: 25_000, date: "2026-10-13T12:00:00+07:00", walletId: "wallet-bca", categoryId: "cat-food", description: "Lunch" }
const transfer = { type: "transfer", amount: 25_000, date: expense.date, fromWalletId: "wallet-bca", toWalletId: "wallet-jago", description: "Transfer to Jago" }
const balance = (store: ReturnType<typeof createStore>, id = "wallet-bca") => store.getData().wallets.find((wallet) => wallet.id === id)!.balance

it("principal corrections move only the difference, record history and recalculate interest", (t) => {
  const { store } = setup(t)
  const { wallet } = store.createWallet(deposit)
  const before = balance(store)
  const count = store.getData().transactions.length
  const corrected = store.updateWallet(wallet.id, { name: wallet.name, deposito: { ...terms, principal: 1_500_000 } })!
  assert.equal(balance(store), before - 500_000)
  assert.equal(corrected.wallet.deposito?.interest, 75_000)
  assert.equal(corrected.adjustment?.change, -500_000)
  store.updateWallet(wallet.id, { name: wallet.name, deposito: { ...terms, principal: 800_000 } })
  assert.equal(balance(store), before + 200_000)
  assert.equal(store.getData().transactions.length, count)
  assert.equal(store.getWalletHistory("wallet-bca")?.[0].kind, "correction")
  const removed = store.deleteWallet(wallet.id)!
  assert.equal(balance(store), before + 1_000_000)
  store.undo(removed.undoId)
  assert.equal(balance(store), before + 200_000)
})

it("invalid or unfunded corrections and a missing source roll back the whole edit", (t) => {
  const { db, store } = setup(t)
  const { wallet } = store.createWallet(deposit)
  const before = store.getData()
  assert.throws(() => store.updateWallet(wallet.id, { name: "Changed", deposito: { ...terms, principal: 99_000_000 } }), /only holds/)
  assert.deepEqual(store.getData(), before)
  db.exec("PRAGMA foreign_keys = OFF")
  db.prepare("UPDATE wallets SET deposit_source_wallet_id = 'missing' WHERE id = ?").run(wallet.id)
  const missing = store.getData()
  assert.throws(() => store.updateWallet(wallet.id, { name: "Changed", deposito: { ...terms, principal: 500_000 } }), /source wallet is gone/)
  assert.deepEqual(store.getData(), missing)
})

it("settlement Undo restores principal, interest and the transfer list, preserving later spending", (t) => {
  const { store } = setup(t)
  const { wallet } = store.createWallet(deposit)
  const before = store.getData()
  const moved = store.settleDeposito(wallet.id, {})!
  assert.equal(moved.transaction.amount, 1_050_000)
  store.createTransaction(expense)
  const undone = store.undo(moved.undoId)!
  assert.equal(undone.kind, "settlement")
  assert.deepEqual(store.getData().wallets.find((entry) => entry.id === wallet.id), wallet)
  assert.equal(balance(store), before.wallets.find((entry) => entry.id === "wallet-bca")!.balance - 25_000)
  assert.equal(store.getData().transactions.some((tx) => tx.id === moved.transaction.id), false)
  assert.throws(() => store.undo(moved.undoId), /can't be undone any more/)
})

it("settlement Undo refuses a missing receiving wallet without partially reopening", (t) => {
  const { db, store } = setup(t)
  const { wallet } = store.createWallet(deposit)
  const moved = store.settleDeposito(wallet.id, {})!
  // Remove dependencies as wallet deletion would; use the throwaway database only.
  db.prepare("DELETE FROM transactions WHERE wallet_id = 'wallet-bca' OR from_wallet_id = 'wallet-bca' OR to_wallet_id = 'wallet-bca'").run()
  db.prepare("DELETE FROM goals WHERE wallet_id = 'wallet-bca'").run()
  db.prepare("DELETE FROM wallets WHERE id = 'wallet-bca'").run()
  const before = store.getData()
  assert.throws(() => store.undo(moved.undoId), /changed since/)
  assert.deepEqual(store.getData(), before)
})

it("a reviewed CSV match replaces the existing side once, and Undo restores its exact row", (t) => {
  const { store } = setup(t)
  const existing = store.createTransaction({ ...expense, type: "income", walletId: "wallet-jago", categoryId: "cat-salary", description: "Received" }).transaction
  const before = store.getData()
  const result = store.importTransactions({ transactions: [{ ...transfer, replaceTransactionId: existing.id }] })
  assert.equal(balance(store, "wallet-jago"), before.wallets.find((wallet) => wallet.id === "wallet-jago")!.balance)
  assert.equal(balance(store), before.wallets.find((wallet) => wallet.id === "wallet-bca")!.balance - 25_000)
  assert.deepEqual(result.replacedTransactionIds, [existing.id])
  assert.equal(store.getData().transactions.some((tx) => tx.id === existing.id), false)
  const undone = store.undo(result.undoId)
  assert.equal(undone?.kind, "import")
  assert.deepEqual(store.getData(), before)
})

it("incoming CSV matches reverse an existing expense without debiting it again", (t) => {
  const { store } = setup(t)
  const existing = store.createTransaction(expense).transaction
  const before = balance(store)
  const result = store.importTransactions({ transactions: [{ ...transfer, replaceTransactionId: existing.id }] })
  assert.equal(balance(store), before)
  store.undo(result.undoId)
  assert.equal(balance(store), before)
})

it("stale, reused, wrong-direction and wrong-amount CSV matches roll back the entire import", (t) => {
  const { store } = setup(t)
  const existing = store.createTransaction(expense).transaction
  const valid = { ...transfer, replaceTransactionId: existing.id }
  const before = store.getData()
  for (const transactions of [
    [valid, valid], [valid, { ...valid, replaceTransactionId: "gone" }],
    [{ ...valid, amount: 100 }], [{ ...valid, fromWalletId: "wallet-jago", toWalletId: "wallet-bca" }],
    [{ ...expense, replaceTransactionId: existing.id }],
  ]) {
    assert.throws(() => store.importTransactions({ transactions }))
    assert.deepEqual(store.getData(), before)
  }
})

it("Undo of a replaced CSV line refuses subsequent edits, preserving all data", (t) => {
  const { store } = setup(t)
  const existing = store.createTransaction(expense).transaction
  const result = store.importTransactions({ transactions: [{ ...transfer, replaceTransactionId: existing.id }] })
  store.updateTransaction(result.transactions[0].id, { ...transfer, amount: 30_000 })
  const before = store.getData()
  assert.throws(() => store.undo(result.undoId), /changed since/)
  assert.deepEqual(store.getData(), before)
})

it("storage failures roll back principal corrections and settlement Undo", (t) => {
  const { db, store } = setup(t)
  const { wallet } = store.createWallet(deposit)
  const before = store.getData()
  db.exec(`CREATE TRIGGER fail_correction BEFORE INSERT ON wallet_value_updates BEGIN SELECT RAISE(ABORT, 'test failure'); END`)
  assert.throws(() => store.updateWallet(wallet.id, { name: "Changed", deposito: { ...terms, principal: 500_000 } }), /test failure/)
  assert.deepEqual(store.getData(), before)
  const moved = store.settleDeposito(wallet.id, {})!
  db.exec(`CREATE TRIGGER fail_reopen BEFORE UPDATE OF deposit_settled_at ON wallets WHEN NEW.deposit_settled_at IS NULL BEGIN SELECT RAISE(ABORT, 'test failure'); END`)
  const settled = store.getData()
  assert.throws(() => store.undo(moved.undoId), /test failure/)
  assert.deepEqual(store.getData(), settled)
  db.exec("DROP TRIGGER fail_reopen")
  store.undo(moved.undoId)
  assert.deepEqual(store.getData(), before)
})

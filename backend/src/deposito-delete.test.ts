import assert from "node:assert/strict"
import { it, type TestContext } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { DeleteWalletResult, UndoResult } from "./types.ts"

const BCA = 8_742_300
const PRINCIPAL = 1_000_000
const deletedAt = new Date("2026-10-13T10:00:00+07:00")

function fresh(t: TestContext) {
  const db = openDatabase(":memory:")
  t.after(() => db.close())
  const store = createStore(db, () => "2026-10-13")
  return { db, store }
}

function deposit(name = "Deposit", rollover = false, fromWalletId = "wallet-bca") {
  return {
    name, kind: "deposito", startingBalance: PRINCIPAL,
    deposito: { ratePercent: 5, startDate: "2025-10-13", tenorMonths: 12, rollover, fromWalletId },
  }
}

it("deleting a matured or renewing deposito returns only principal, without income or spending", (t) => {
  for (const rollover of [false, true]) {
    const { store } = fresh(t)
    const original = store.getData()
    const { wallet } = store.createWallet(deposit("Deposit", rollover))
    const opening = store.getData().transactions.find((entry) => entry.type === "transfer" && entry.toWalletId === wallet.id)!
    assert.equal(wallet.deposito?.interest, 50_000)
    const result = store.deleteWallet(wallet.id, deletedAt)!
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA)
    assert.deepEqual(result.wallets.map(({ id, balance }) => ({ id, balance })), original.wallets.map(({ id, balance }) => ({ id, balance })))
    assert.deepEqual(store.getData().transactions, original.transactions)
    assert.deepEqual(result.balanceAdjustments, store.getData().balanceAdjustments)
    assert.deepEqual(result.balanceAdjustments.at(-1), {
      walletId: "wallet-bca", at: "2026-10-13T10:00:00+07:00", change: PRINCIPAL,
    })
    assert.deepEqual(result.deletedTransactionIds, [opening.id])
    const history = store.getWalletHistory("wallet-bca")!.at(0)!
    assert.equal(history.kind, "correction")
    assert.equal(history.oldBalance, BCA - PRINCIPAL)
    assert.equal(history.newBalance, BCA)
  }
})

it("delete and Undo restore all data and source history, and Undo cannot return principal twice", (t) => {
  const { store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  const before = store.getData()
  const history = store.getWalletHistory("wallet-bca")
  const removed = store.deleteWallet(wallet.id, deletedAt)!
  const restored = store.undo(removed.undoId)
  assert.ok(restored.kind === "wallet")
  assert.deepEqual(store.getData(), before)
  assert.deepEqual(restored.balanceAdjustments, before.balanceAdjustments)
  assert.deepEqual(store.getWalletHistory("wallet-bca"), history)
  assert.throws(() => store.undo(removed.undoId), /can't be undone any more/)
  assert.deepEqual(store.getData(), before)
})

it("Undo takes back just the principal and preserves later spending", (t) => {
  const { store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  const removed = store.deleteWallet(wallet.id, deletedAt)!
  store.createTransaction({ type: "expense", amount: 25_000, walletId: "wallet-bca", categoryId: "cat-food", date: "2026-10-13T12:00:00+07:00", description: "Lunch" })
  store.undo(removed.undoId)
  assert.equal(store.getData().wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA - PRINCIPAL - 25_000)
  assert.equal(store.getData().transactions.at(-1)?.description, "Lunch")
  assert.equal(store.getWalletHistory("wallet-bca")!.length, 0)
})

it("two deposited principals can be returned and undone in either order", (t) => {
  for (const reversed of [false, true]) {
    const { store } = fresh(t)
    const first = store.createWallet(deposit("First")).wallet
    const second = store.createWallet(deposit("Second", true)).wallet
    const before = store.getData()
    const deletions = [store.deleteWallet(first.id, deletedAt)!, store.deleteWallet(second.id, deletedAt)!]
    assert.equal(store.getData().wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA)
    for (const result of reversed ? deletions.reverse() : deletions) store.undo(result.undoId)
    assert.deepEqual(store.getData(), before)
  }
})

it("a settled deposito is deleted without returning money again", (t) => {
  const { store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  store.settleDeposito(wallet.id, {}, deletedAt)
  const before = store.getData()
  const deleted = store.deleteWallet(wallet.id, deletedAt)!
  assert.equal(deleted.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA + 50_000)
  assert.deepEqual(deleted.balanceAdjustments, before.balanceAdjustments)
  store.undo(deleted.undoId)
  assert.deepEqual(store.getData(), before)
})

it("a missing source refuses deletion, leaving every balance and transaction untouched", (t) => {
  const { db, store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  db.prepare("UPDATE wallets SET deposit_source_wallet_id = NULL WHERE id = ?").run(wallet.id)
  const before = store.getData()
  assert.throws(() => store.deleteWallet(wallet.id, deletedAt), /no source wallet/)
  assert.deepEqual(store.getData(), before)
})

it("a failed deletion rolls back the returned principal and its history", (t) => {
  const { db, store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  const before = store.getData()
  db.exec("CREATE TRIGGER refuse_wallet_delete BEFORE DELETE ON wallets BEGIN SELECT RAISE(ABORT, 'test refusal'); END")
  assert.throws(() => store.deleteWallet(wallet.id, deletedAt), /test refusal/)
  assert.deepEqual(store.getData(), before)
  assert.equal(store.getWalletHistory("wallet-bca")!.length, 0)
})

it("Undo is refused without changes if the return wallet was deleted afterwards", (t) => {
  const { store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  const deleted = store.deleteWallet(wallet.id, deletedAt)!
  store.deleteWallet("wallet-bca", deletedAt)
  const before = store.getData()
  assert.throws(() => store.undo(deleted.undoId), /can't be undone/)
  assert.deepEqual(store.getData(), before)
})

it("principal can return to an investment source without being counted as a market gain", (t) => {
  const { store } = fresh(t)
  const before = store.getData().wallets.find((entry) => entry.id === "wallet-pluang")!.balance
  const { wallet } = store.createWallet(deposit("Deposit", false, "wallet-pluang"))
  store.deleteWallet(wallet.id, deletedAt)
  const source = store.getData().wallets.find((entry) => entry.id === "wallet-pluang")!
  assert.equal(source.balance, before)
  assert.equal(source.lastValueChange, undefined)
})

it("HTTP delete and Undo return the new balances and complete balance history", async (t) => {
  const { store } = fresh(t)
  const { wallet } = store.createWallet(deposit())
  const app = createApp(store)
  const deleted = await app.request(`/api/wallets/${wallet.id}`, { method: "DELETE" })
  assert.equal(deleted.status, 200)
  const result = await deleted.json() as DeleteWalletResult
  assert.equal(result.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA)
  assert.equal(result.balanceAdjustments.at(-1)?.change, PRINCIPAL)
  const undone = await app.request(`/api/undo/${result.undoId}`, { method: "POST" })
  assert.equal(undone.status, 201)
  const back = await undone.json() as UndoResult
  assert.ok(back.kind === "wallet")
  assert.equal(back.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA - PRINCIPAL)
  assert.deepEqual(back.balanceAdjustments, [])
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { ImportTransactionsResult, UndoResult } from "./types.ts"
import { MAX_IMPORT_ROWS, ValidationError } from "./validate.ts"

const BCA = 8_742_300
const JAGO = 2_315_500

function freshStore() {
  return createStore(openDatabase(":memory:"))
}
type Store = ReturnType<typeof freshStore>
const balanceOf = (store: Store, id: string) => store.getData().wallets.find((wallet) => wallet.id === id)?.balance

const spent = (amount: number, over: Record<string, unknown> = {}) => ({
  type: "expense",
  amount,
  date: "2026-10-05T12:00:00+07:00",
  description: "KOPI KENANGAN",
  walletId: "wallet-bca",
  categoryId: "cat-food",
  ...over,
})
const earned = (amount: number, over: Record<string, unknown> = {}) => ({
  type: "income",
  amount,
  date: "2026-10-06T12:00:00+07:00",
  description: "GAJI OKTOBER",
  walletId: "wallet-bca",
  categoryId: "cat-salary",
  ...over,
})

const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

describe("importing transactions from a bank's file", () => {
  it("saves every row, and moves the wallet balance exactly as adding them by hand would", () => {
    const store = freshStore()
    const before = store.getData().transactions.length
    const result = store.importTransactions({ transactions: [spent(25_000), spent(40_000, { description: "GRAB" }), earned(500_000)] })

    assert.equal(result.transactions.length, 3)
    assert.ok(result.transactions.every((tx) => tx.id.startsWith("tx-")))
    assert.equal(new Set(result.transactions.map((tx) => tx.id)).size, 3, "each has its own id")
    assert.equal(store.getData().transactions.length, before + 3)
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 25_000 - 40_000 + 500_000)
    assert.equal(result.wallets.find((wallet) => wallet.id === "wallet-bca")?.balance, BCA - 25_000 - 40_000 + 500_000)
  })

  it("can fill several wallets at once", () => {
    const store = freshStore()
    store.importTransactions({ transactions: [spent(10_000), spent(20_000, { walletId: "wallet-jago" })] })
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 10_000)
    assert.equal(balanceOf(store, "wallet-jago"), JAGO - 20_000)
  })

  it("keeps rows with the same date in the order they were given", () => {
    const store = freshStore()
    const rows = ["one", "two", "three"].map((description, index) => spent(1_000 + index, { description }))
    store.importTransactions({ transactions: rows })
    const listed = store.getData().transactions.filter((tx) => tx.date.startsWith("2026-10-05")).map((tx) => tx.description)
    assert.deepEqual(listed, ["one", "two", "three"])
  })

  it("is all or nothing: one bad row stops the whole import, and says which row", () => {
    const store = freshStore()
    const before = store.getData()
    refuses(() => store.importTransactions({ transactions: [spent(25_000), spent(0), spent(30_000)] }), /^Row 2: .*whole number of rupiah above zero/)
    refuses(() => store.importTransactions({ transactions: [spent(25_000), spent(30_000, { walletId: "wallet-nope" })] }), /^Row 2: .*isn't a wallet that exists/)
    refuses(() => store.importTransactions({ transactions: [spent(25_000, { categoryId: "cat-nope" })] }), /^Row 1: The category isn't one that exists/)
    refuses(() => store.importTransactions({ transactions: [spent(25_000, { categoryId: "cat-salary" })] }), /^Row 1: That category is for income, not expense/)
    refuses(() => store.importTransactions({ transactions: [spent(25_000, { date: "05/10/2026" })] }), /^Row 1: The date must look like/)
    refuses(() => store.importTransactions({ transactions: [spent(25_000, { description: "x".repeat(101) })] }), /^Row 1: The note can be at most 100/)
    assert.deepEqual(store.getData(), before, "nothing was saved and no balance moved")
  })

  it("refuses transfers: a bank's file can't tell them from payments", () => {
    const store = freshStore()
    const transfer = { type: "transfer", amount: 5_000, date: "2026-10-05T12:00:00+07:00", description: "", fromWalletId: "wallet-bca", toWalletId: "wallet-jago" }
    refuses(() => store.importTransactions({ transactions: [spent(1_000), transfer] }), /^Row 2: An import can only hold income and spending/)
  })

  it("refuses an empty list, a list that isn't a list, and too many rows", () => {
    const store = freshStore()
    refuses(() => store.importTransactions({ transactions: [] }), /nothing to import/)
    refuses(() => store.importTransactions({}), /as a list/)
    refuses(() => store.importTransactions({ transactions: "no" }), /as a list/)
    refuses(() => store.importTransactions(null), /as a list/)
    refuses(() => store.importTransactions({ transactions: Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => spent(1_000)) }), /at most 2000/)
    assert.doesNotThrow(() => store.importTransactions({ transactions: Array.from({ length: MAX_IMPORT_ROWS }, () => spent(1_000)) }))
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000 * MAX_IMPORT_ROWS)
  })

  it("never fills a deposito: its balance follows its rate and dates", () => {
    const store = freshStore()
    const { wallet } = store.createWallet({
      name: "Deposito BCA",
      kind: "deposito",
      startingBalance: 1_000_000,
      deposito: { ratePercent: 5, startDate: "2026-10-01", tenorMonths: 12, rollover: false, fromWalletId: "wallet-bca" },
    })
    const before = store.getData()
    refuses(() => store.importTransactions({ transactions: [spent(1_000), spent(1_000, { walletId: wallet.id })] }), /deposito/)
    assert.deepEqual(store.getData(), before, "the first row was rolled back too")
  })
})

describe("undoing an import", () => {
  it("takes every imported transaction out again and gives the balances back, so the data is as it was", () => {
    const store = freshStore()
    const before = store.getData()
    const { undoId } = store.importTransactions({ transactions: [spent(25_000), earned(500_000), spent(9_000, { walletId: "wallet-jago" })] })
    assert.notDeepEqual(store.getData(), before)

    const result = store.undo(undoId)
    assert.equal(result.kind, "import")
    assert.ok(result.kind === "import" && result.removedTransactionIds.length === 3)
    assert.deepEqual(store.getData(), before)
  })

  it("can only be undone once", () => {
    const store = freshStore()
    const { undoId } = store.importTransactions({ transactions: [spent(25_000)] })
    store.undo(undoId)
    refuses(() => store.undo(undoId), /can't be undone any more/)
  })

  it("skips a transaction that has been deleted since, and reverses the others", () => {
    const store = freshStore()
    const { transactions, undoId } = store.importTransactions({ transactions: [spent(25_000), spent(40_000), spent(60_000)] })
    store.deleteTransaction(transactions[1].id)
    const result = store.undo(undoId) as Extract<UndoResult, { kind: "import" }>
    assert.deepEqual(result.removedTransactionIds, [transactions[0].id, transactions[2].id])
    assert.equal(balanceOf(store, "wallet-bca"), BCA)
  })

  it("takes an imported transaction that was edited since out with its edited amount", () => {
    const store = freshStore()
    const { transactions, undoId } = store.importTransactions({ transactions: [spent(25_000)] })
    store.updateTransaction(transactions[0].id, spent(30_000))
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 30_000)
    store.undo(undoId)
    assert.equal(balanceOf(store, "wallet-bca"), BCA)
    assert.equal(store.getData().transactions.some((tx) => tx.id === transactions[0].id), false)
  })

  it("leaves every other transaction alone", () => {
    const store = freshStore()
    const mine = store.createTransaction(spent(7_000, { description: "typed by hand" })).transaction
    const { undoId } = store.importTransactions({ transactions: [spent(25_000)] })
    store.undo(undoId)
    assert.ok(store.getData().transactions.some((tx) => tx.id === mine.id))
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 7_000)
  })
})

describe("the import route", () => {
  const json = (payload: unknown): RequestInit => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })

  it("answers 201 with what was saved, the new balances and an undo id", async () => {
    const api = createApp(freshStore())
    const res = await api.request("/api/transactions/import", json({ transactions: [spent(25_000)] }))
    assert.equal(res.status, 201)
    const body = (await res.json()) as ImportTransactionsResult
    assert.equal(body.transactions.length, 1)
    assert.equal(body.wallets.find((wallet) => wallet.id === "wallet-bca")?.balance, BCA - 25_000)
    assert.match(body.undoId, /^undo-/)

    const undone = await api.request(`/api/undo/${body.undoId}`, { method: "POST" })
    assert.equal(undone.status, 201)
    assert.equal(((await undone.json()) as UndoResult).kind, "import")
  })

  it("answers 400 with the row and the reason, and saves nothing", async () => {
    const store = freshStore()
    const api = createApp(store)
    const res = await api.request("/api/transactions/import", json({ transactions: [spent(25_000), spent(-5)] }))
    assert.equal(res.status, 400)
    assert.match(((await res.json()) as { error: string }).error, /^Row 2:/)
    assert.equal(balanceOf(store, "wallet-bca"), BCA)
  })

  it("is not mistaken for a transaction id", async () => {
    const api = createApp(freshStore())
    const res = await api.request("/api/transactions/import", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(spent(1_000)) })
    assert.equal(res.status, 404, "only POST /import exists; a PUT there is just an unknown transaction")
  })
})

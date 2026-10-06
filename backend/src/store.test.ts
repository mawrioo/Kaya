import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { Wallet } from "./types.ts"
import { ValidationError } from "./validate.ts"

const DATE = "2026-09-30T14:05:00+07:00"

function freshStore() {
  return createStore(openDatabase(":memory:"))
}

function balance(wallets: Wallet[], id: string): number {
  const wallet = wallets.find((entry) => entry.id === id)
  assert.ok(wallet, `wallet ${id} should exist`)
  return wallet.balance
}

const expense = (over: Record<string, unknown> = {}) => ({
  type: "expense",
  amount: 45_000,
  date: DATE,
  description: "Nasi goreng",
  walletId: "wallet-jago",
  categoryId: "cat-food",
  ...over,
})

describe("a fresh database", () => {
  it("is filled with the sample data", () => {
    const data = freshStore().getData()
    assert.equal(data.user.name, "Mario")
    assert.equal(data.wallets.length, 4)
    assert.equal(data.categories.length, 13)
    assert.equal(data.transactions.length, 41)
    assert.equal(data.goals.length, 3)
    assert.equal(balance(data.wallets, "wallet-jago"), 2_315_500)
  })

  it("does not bring the sample data back on the next start", () => {
    const db = openDatabase(":memory:")
    const first = createStore(db)
    first.deleteTransaction("tx-041")
    const second = createStore(db) // like restarting the backend on the same file
    assert.equal(second.getData().transactions.length, 40)
  })
})

describe("adding a transaction", () => {
  it("takes spending out of the wallet", () => {
    const store = freshStore()
    const { transaction, wallets } = store.createTransaction(expense())
    assert.match(transaction.id, /^tx-/)
    assert.equal(balance(wallets, "wallet-jago"), 2_315_500 - 45_000)
    assert.equal(store.getData().transactions.length, 42)
  })

  it("adds income to the wallet", () => {
    const { wallets } = freshStore().createTransaction(
      expense({ type: "income", categoryId: "cat-salary", walletId: "wallet-bca", amount: 1_000_000 })
    )
    assert.equal(balance(wallets, "wallet-bca"), 8_742_300 + 1_000_000)
  })

  it("moves a transfer from one wallet to the other, leaving the total alone", () => {
    const { wallets } = freshStore().createTransaction({
      type: "transfer",
      amount: 100_000,
      date: DATE,
      description: "",
      fromWalletId: "wallet-bca",
      toWalletId: "wallet-pluang",
    })
    assert.equal(balance(wallets, "wallet-bca"), 8_742_300 - 100_000)
    assert.equal(balance(wallets, "wallet-pluang"), 15_430_000 + 100_000)
    assert.equal(wallets.reduce((sum, w) => sum + w.balance, 0), 51_337_800)
  })

  it("trims the note", () => {
    const { transaction } = freshStore().createTransaction(expense({ description: "  Lunch  " }))
    assert.equal(transaction.description, "Lunch")
  })
})

describe("changing a transaction", () => {
  it("adjusts the wallet by the difference", () => {
    const store = freshStore()
    const { transaction } = store.createTransaction(expense())
    const { wallets } = store.updateTransaction(transaction.id, expense({ amount: 50_000 }))!
    assert.equal(balance(wallets, "wallet-jago"), 2_315_500 - 50_000)
  })

  it("moves the money when the wallet changes", () => {
    const store = freshStore()
    const { transaction } = store.createTransaction(expense())
    const { wallets } = store.updateTransaction(transaction.id, expense({ walletId: "wallet-bca" }))!
    assert.equal(balance(wallets, "wallet-jago"), 2_315_500)
    assert.equal(balance(wallets, "wallet-bca"), 8_742_300 - 45_000)
  })

  it("flips the effect when spending becomes income", () => {
    const store = freshStore()
    const { transaction } = store.createTransaction(expense())
    const { wallets } = store.updateTransaction(
      transaction.id,
      expense({ type: "income", categoryId: "cat-salary" })
    )!
    assert.equal(balance(wallets, "wallet-jago"), 2_315_500 + 45_000)
  })

  it("returns undefined for a transaction that doesn't exist", () => {
    assert.equal(freshStore().updateTransaction("tx-nope", expense()), undefined)
  })
})

describe("deleting a transaction", () => {
  it("puts the balance back", () => {
    const store = freshStore()
    const { transaction } = store.createTransaction(expense())
    const { wallets } = store.deleteTransaction(transaction.id)!
    assert.equal(balance(wallets, "wallet-jago"), 2_315_500)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("puts both wallets back after deleting a transfer from the sample data", () => {
    const store = freshStore()
    const { wallets } = store.deleteTransaction("tx-039")! // BCA to Pluang, Rp 2.000.000
    assert.equal(balance(wallets, "wallet-bca"), 8_742_300 + 2_000_000)
    assert.equal(balance(wallets, "wallet-pluang"), 15_430_000 - 2_000_000)
  })

  it("returns undefined for a transaction that doesn't exist", () => {
    assert.equal(freshStore().deleteTransaction("tx-nope"), undefined)
  })
})

describe("refusing bad data", () => {
  const rejects = (body: unknown, message: RegExp) => {
    const store = freshStore()
    assert.throws(() => store.createTransaction(body), (error: unknown) => error instanceof ValidationError && message.test(error.message))
    // Nothing may have changed.
    const data = store.getData()
    assert.equal(data.transactions.length, 41)
    assert.equal(balance(data.wallets, "wallet-jago"), 2_315_500)
  }

  it("rejects amounts that are zero, negative, fractional or not numbers", () => {
    rejects(expense({ amount: 0 }), /whole number/)
    rejects(expense({ amount: -5 }), /whole number/)
    rejects(expense({ amount: 10.5 }), /whole number/)
    rejects(expense({ amount: "10" }), /whole number/)
    rejects(expense({ amount: 1_000_000_000_000 }), /too large/)
  })

  it("rejects a bad type or date", () => {
    rejects(expense({ type: "gift" }), /type must be/)
    rejects(expense({ date: "yesterday" }), /date must look like/)
    rejects(expense({ date: "2026-13-45T99:99:99+07:00" }), /date must look like/)
  })

  it("rejects a category that doesn't exist or is for the other kind", () => {
    rejects(expense({ categoryId: "cat-nope" }), /category isn't one that exists/)
    rejects(expense({ categoryId: "cat-salary" }), /for income, not expense/)
  })

  it("rejects an unknown wallet", () => {
    rejects(expense({ walletId: "wallet-nope" }), /isn't a wallet that exists/)
  })

  it("rejects a transfer to the same wallet", () => {
    rejects(
      { type: "transfer", amount: 1000, date: DATE, description: "", fromWalletId: "wallet-bca", toWalletId: "wallet-bca" },
      /two different wallets/
    )
  })

  it("rejects a note that is too long, and things that aren't objects", () => {
    rejects(expense({ description: "x".repeat(101) }), /at most 100/)
    rejects("nope", /JSON object/)
    rejects(null, /JSON object/)
  })

  it("leaves everything unchanged when an edit is refused", () => {
    const store = freshStore()
    const { transaction } = store.createTransaction(expense())
    assert.throws(() => store.updateTransaction(transaction.id, expense({ amount: 0 })), ValidationError)
    const data = store.getData()
    assert.equal(balance(data.wallets, "wallet-jago"), 2_315_500 - 45_000)
  })
})

describe("resetting", () => {
  it("wipes what was added and restores the sample data", () => {
    const store = freshStore()
    store.createTransaction(expense())
    store.deleteTransaction("tx-001")
    store.reset()
    const data = store.getData()
    assert.equal(data.transactions.length, 41)
    assert.equal(balance(data.wallets, "wallet-jago"), 2_315_500)
    assert.equal(balance(data.wallets, "wallet-bca"), 8_742_300)
  })
})

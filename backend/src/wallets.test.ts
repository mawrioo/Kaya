import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, SaveWalletResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))

const newWallet = (over: Record<string, unknown> = {}) => ({
  name: "GoPay",
  kind: "e-wallet",
  description: "Rides and food",
  startingBalance: 250_000,
  ...over,
})

const total = (store: ReturnType<typeof freshStore>) =>
  store.getData().wallets.reduce((sum, wallet) => sum + wallet.balance, 0)

describe("adding a wallet", () => {
  it("adds it with its starting balance and returns every wallet", () => {
    const store = freshStore()
    const { wallet, wallets } = store.createWallet(newWallet())
    assert.match(wallet.id, /^wallet-/)
    assert.equal(wallet.name, "GoPay")
    assert.equal(wallet.kind, "e-wallet")
    assert.equal(wallet.description, "Rides and food")
    assert.equal(wallet.balance, 250_000)
    assert.equal(wallets.length, 5)
    assert.equal(wallets.at(-1)?.id, wallet.id) // new wallets go last
  })

  it("does not count the starting balance as income: no transaction is created", () => {
    const store = freshStore()
    store.createWallet(newWallet())
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(total(store), 51_337_800 + 250_000)
  })

  it("starts at zero when no balance is given, and trims the text", () => {
    const { wallet } = freshStore().createWallet({ name: "  Cash  ", kind: "cash" })
    assert.equal(wallet.balance, 0)
    assert.equal(wallet.name, "Cash")
    assert.equal(wallet.description, "")
  })

  it("gives each new wallet a colour that is not already in use", () => {
    const store = freshStore()
    const first = store.createWallet(newWallet({ name: "One" })).wallet
    const second = store.createWallet(newWallet({ name: "Two" })).wallet
    const sampleColors = ["sky", "marigold", "plum", "moss"]
    assert.ok(!sampleColors.includes(first.color))
    assert.ok(!sampleColors.includes(second.color))
    assert.notEqual(first.color, second.color)
  })

  const rejects = (body: unknown, message: RegExp) => {
    const store = freshStore()
    assert.throws(() => store.createWallet(body), (error: unknown) => error instanceof ValidationError && message.test(error.message))
    assert.equal(store.getData().wallets.length, 4) // nothing was added
  }

  it("refuses a missing, blank, long or duplicate name", () => {
    rejects(newWallet({ name: "" }), /Give the wallet a name/)
    rejects(newWallet({ name: "   " }), /Give the wallet a name/)
    rejects(newWallet({ name: "x".repeat(41) }), /at most 40/)
    rejects(newWallet({ name: "bca" }), /already have a wallet called BCA/)
  })

  it("refuses an unknown kind, a bad balance or a long note", () => {
    rejects(newWallet({ kind: "piggy-bank" }), /what kind of wallet/)
    rejects(newWallet({ startingBalance: -1 }), /whole number of rupiah, zero or more/)
    rejects(newWallet({ startingBalance: 10.5 }), /whole number of rupiah, zero or more/)
    rejects(newWallet({ startingBalance: "100" }), /whole number of rupiah, zero or more/)
    rejects(newWallet({ description: "x".repeat(81) }), /at most 80/)
    rejects(null, /JSON object/)
  })
})

describe("editing a wallet", () => {
  it("renames it and changes its note without touching the balance", () => {
    const store = freshStore()
    const { wallet, wallets } = store.updateWallet("wallet-bca", { name: "BCA Main", description: "Everything I earn" })!
    assert.equal(wallet.name, "BCA Main")
    assert.equal(wallet.description, "Everything I earn")
    assert.equal(wallet.balance, 8_742_300)
    assert.equal(wallets.length, 4)
  })

  it("lets you save without renaming, but not take another wallet's name", () => {
    const store = freshStore()
    assert.ok(store.updateWallet("wallet-bca", { name: "BCA", description: "New note" }))
    assert.throws(() => store.updateWallet("wallet-bca", { name: "Bank Jago", description: "" }), ValidationError)
  })

  it("can clear the note", () => {
    const { wallet } = freshStore().updateWallet("wallet-bca", { name: "BCA", description: "" })!
    assert.equal(wallet.description, "")
  })

  it("returns undefined for a wallet that doesn't exist", () => {
    assert.equal(freshStore().updateWallet("wallet-nope", { name: "X", description: "" }), undefined)
  })
})

describe("updating an investment's value", () => {
  const NOW = new Date(2026, 8, 30, 14, 5, 0)

  it("sets the balance and remembers how much it moved, without creating a transaction", () => {
    const store = freshStore()
    const { wallet } = store.updateWalletValue("wallet-pluang", { value: 15_550_000 }, NOW)!
    assert.equal(wallet.balance, 15_550_000)
    assert.equal(wallet.lastValueChange?.change, 120_000)
    assert.match(wallet.lastValueChange?.at ?? "", /^2026-09-30T14:05:00[+-]\d{2}:\d{2}$/)
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(total(store), 51_337_800 + 120_000)
  })

  it("shows a loss as a negative change, and keeps only the latest", () => {
    const store = freshStore()
    store.updateWalletValue("wallet-pluang", { value: 15_550_000 }, NOW)
    const { wallet } = store.updateWalletValue("wallet-pluang", { value: 15_500_000 }, NOW)!
    assert.equal(wallet.lastValueChange?.change, -50_000)
  })

  it("has no recorded change until the first update", () => {
    const wallets = freshStore().getData().wallets
    assert.equal(wallets.find((w) => w.id === "wallet-pluang")?.lastValueChange, undefined)
  })

  it("comes back after a transfer into the wallet, which still adds to the balance", () => {
    const store = freshStore()
    store.updateWalletValue("wallet-pluang", { value: 16_000_000 }, NOW)
    const { wallets } = store.createTransaction({
      type: "transfer",
      amount: 1_000_000,
      date: "2026-09-30T15:00:00+07:00",
      description: "",
      fromWalletId: "wallet-bca",
      toWalletId: "wallet-pluang",
    })
    assert.equal(wallets.find((w) => w.id === "wallet-pluang")?.balance, 17_000_000)
  })

  it("only works for investment wallets", () => {
    const store = freshStore()
    assert.throws(() => store.updateWalletValue("wallet-bca", { value: 1 }), /Only investment wallets/)
    assert.equal(store.getData().wallets.find((w) => w.id === "wallet-bca")?.balance, 8_742_300)
  })

  it("refuses a value that is negative, fractional or not a number, and allows zero", () => {
    const store = freshStore()
    for (const value of [-1, 1.5, "100", null]) {
      assert.throws(() => store.updateWalletValue("wallet-pluang", { value }), ValidationError)
    }
    assert.equal(store.updateWalletValue("wallet-pluang", { value: 0 })?.wallet.balance, 0)
  })

  it("returns undefined for a wallet that doesn't exist", () => {
    assert.equal(freshStore().updateWalletValue("wallet-nope", { value: 1 }), undefined)
  })

  it("is forgotten when the data is reset", () => {
    const store = freshStore()
    store.updateWalletValue("wallet-pluang", { value: 15_550_000 }, NOW)
    store.createWallet(newWallet())
    store.reset()
    const wallets = store.getData().wallets
    assert.equal(wallets.length, 4)
    assert.equal(wallets.find((w) => w.id === "wallet-pluang")?.balance, 15_430_000)
    assert.equal(wallets.find((w) => w.id === "wallet-pluang")?.lastValueChange, undefined)
  })
})

describe("the wallet API", () => {
  const app = () => createApp(freshStore())
  const send = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  it("adds, renames and updates the value of a wallet", async () => {
    const api = app()

    const created = await api.request("/api/wallets", send("POST", newWallet({ kind: "investment", name: "Bibit" })))
    assert.equal(created.status, 201)
    const { wallet } = (await created.json()) as SaveWalletResult

    const renamed = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "Bibit Saham", description: "Stocks" }))
    assert.equal(renamed.status, 200)
    assert.equal(((await renamed.json()) as SaveWalletResult).wallet.name, "Bibit Saham")

    const valued = await api.request(`/api/wallets/${wallet.id}/value`, send("POST", { value: 300_000 }))
    assert.equal(valued.status, 200)
    const result = (await valued.json()) as SaveWalletResult
    assert.equal(result.wallet.balance, 300_000)
    assert.equal(result.wallet.lastValueChange?.change, 50_000)

    const data = (await (await api.request("/api/data")).json()) as AppData
    assert.equal(data.wallets.length, 5)
    assert.equal(data.wallets.find((w) => w.id === wallet.id)?.lastValueChange?.change, 50_000)
  })

  it("answers 400 with a plain message, and 404 for a wallet that doesn't exist", async () => {
    const api = app()
    const bad = await api.request("/api/wallets", send("POST", newWallet({ name: "BCA" })))
    assert.equal(bad.status, 400)
    assert.match(((await bad.json()) as { error: string }).error, /already have a wallet called BCA/)

    const notInvestment = await api.request("/api/wallets/wallet-bca/value", send("POST", { value: 5 }))
    assert.equal(notInvestment.status, 400)

    assert.equal((await api.request("/api/wallets/wallet-nope", send("PUT", { name: "X" }))).status, 404)
    assert.equal((await api.request("/api/wallets/wallet-nope/value", send("POST", { value: 1 }))).status, 404)
  })
})

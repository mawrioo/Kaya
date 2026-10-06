import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import { isoWithOffset } from "./time.ts"
import type { AppData, SaveWalletResult } from "./types.ts"

function freshStack() {
  const db = openDatabase(":memory:")
  return { db, store: createStore(db) }
}

describe("balances set by hand, as the screens need them for the balance line", () => {
  it("has none in the sample data", () => {
    assert.deepEqual(freshStack().store.getData().balanceAdjustments, [])
  })

  it("lists an investment's value update with how much it moved the wallet", () => {
    const { store } = freshStack()
    const now = new Date(2026, 9, 1, 10, 30)
    const result = store.updateWalletValue("wallet-pluang", { value: 15_550_000 }, now)
    const expected = { walletId: "wallet-pluang", at: isoWithOffset(now), change: 120_000 }
    assert.deepEqual(result?.adjustment, expected)
    assert.deepEqual(store.getData().balanceAdjustments, [expected])
  })

  it("lists a correction that lowers a balance as a negative change", () => {
    const { store } = freshStack()
    const now = new Date(2026, 9, 1, 11, 0)
    const result = store.correctWalletBalance("wallet-bca", { value: 8_700_000 }, now)
    assert.deepEqual(result?.adjustment, { walletId: "wallet-bca", at: isoWithOffset(now), change: -42_300 })
  })

  it("lists every wallet's, oldest first", () => {
    const { store } = freshStack()
    store.updateWalletValue("wallet-pluang", { value: 15_500_000 }, new Date(2026, 9, 1, 9, 0))
    store.correctWalletBalance("wallet-bca", { value: 8_000_000 }, new Date(2026, 9, 1, 10, 0))
    store.updateWalletValue("wallet-pluang", { value: 15_400_000 }, new Date(2026, 9, 1, 11, 0))
    assert.deepEqual(
      store.getData().balanceAdjustments.map((entry) => [entry.walletId, entry.change]),
      [
        ["wallet-pluang", 70_000],
        ["wallet-bca", -742_300],
        ["wallet-pluang", -100_000],
      ]
    )
  })

  it("is not part of a plain change such as renaming a wallet", () => {
    const { store } = freshStack()
    const result = store.updateWallet("wallet-bca", { name: "BCA main", description: "Salary" })
    assert.equal(result !== undefined && "adjustment" in result, false)
    assert.deepEqual(store.getData().balanceAdjustments, [])
  })

  it("goes with the wallet when the wallet is deleted", () => {
    const { store } = freshStack()
    store.correctWalletBalance("wallet-bca", { value: 8_000_000 })
    store.updateWalletValue("wallet-pluang", { value: 15_500_000 })
    store.deleteWallet("wallet-bca")
    assert.deepEqual(
      store.getData().balanceAdjustments.map((entry) => entry.walletId),
      ["wallet-pluang"]
    )
  })

  it("is sent by the API, both in /api/data and in the reply to saving the value", async () => {
    const app = createApp(createStore(openDatabase(":memory:")))
    const saved = await app.request("/api/wallets/wallet-pluang/value", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: 15_550_000 }),
    })
    const { adjustment } = (await saved.json()) as SaveWalletResult
    assert.equal(adjustment?.change, 120_000)
    const data = (await (await app.request("/api/data")).json()) as AppData
    assert.deepEqual(data.balanceAdjustments, [adjustment])
  })
})

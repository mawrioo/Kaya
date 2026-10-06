import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, SaveTransactionResult } from "./types.ts"

const body = {
  type: "expense",
  amount: 45_000,
  date: "2026-09-30T14:05:00+07:00",
  description: "Nasi goreng",
  walletId: "wallet-jago",
  categoryId: "cat-food",
}

function freshApp() {
  return createApp(createStore(openDatabase(":memory:")))
}

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
})

describe("the API", () => {
  it("answers the health check", async () => {
    const res = await freshApp().request("/api/health")
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
  })

  it("sends everything from /api/data", async () => {
    const res = await freshApp().request("/api/data")
    const data = (await res.json()) as AppData
    assert.equal(res.status, 200)
    assert.equal(data.transactions.length, 41)
    assert.equal(data.wallets.length, 4)
  })

  it("adds, changes and deletes a transaction, returning the new balances each time", async () => {
    const app = freshApp()

    const created = await app.request("/api/transactions", json("POST", body))
    assert.equal(created.status, 201)
    const { transaction, wallets } = (await created.json()) as SaveTransactionResult
    assert.equal(wallets.find((w) => w.id === "wallet-jago")?.balance, 2_315_500 - 45_000)

    const updated = await app.request(`/api/transactions/${transaction.id}`, json("PUT", { ...body, amount: 50_000 }))
    assert.equal(updated.status, 200)
    const afterUpdate = (await updated.json()) as SaveTransactionResult
    assert.equal(afterUpdate.wallets.find((w) => w.id === "wallet-jago")?.balance, 2_315_500 - 50_000)

    const deleted = await app.request(`/api/transactions/${transaction.id}`, { method: "DELETE" })
    assert.equal(deleted.status, 200)
    const afterDelete = (await deleted.json()) as { wallets: SaveTransactionResult["wallets"] }
    assert.equal(afterDelete.wallets.find((w) => w.id === "wallet-jago")?.balance, 2_315_500)
  })

  it("answers 400 with a plain message for bad data", async () => {
    const res = await freshApp().request("/api/transactions", json("POST", { ...body, amount: 0 }))
    assert.equal(res.status, 400)
    const { error } = (await res.json()) as { error: string }
    assert.match(error, /whole number of rupiah above zero/)
  })

  it("answers 400 for something that isn't JSON", async () => {
    const res = await freshApp().request("/api/transactions", { method: "POST", body: "not json" })
    assert.equal(res.status, 400)
  })

  it("answers 404 for a transaction that doesn't exist", async () => {
    const app = freshApp()
    assert.equal((await app.request("/api/transactions/tx-nope", json("PUT", body))).status, 404)
    assert.equal((await app.request("/api/transactions/tx-nope", { method: "DELETE" })).status, 404)
    assert.equal((await app.request("/api/nothing-here")).status, 404)
  })
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import { createApp } from "./app.ts"
import type { AssistantBatchResult, CategoryRule, TransactionPreview, TransactionTemplate } from "./types.ts"
import { splitTransactionMessage } from "./batch-preview.ts"

const now = new Date("2026-10-28T05:00:00Z")
const input = { type: "expense", amount: 35000, walletId: "wallet-bca", categoryId: "cat-food", description: "Unique kiosk", date: "2026-10-28T12:00:00+07:00" }
function setup() {
  const db = openDatabase(":memory:")
  const store = createStore(db)
  let calls = 0
  const app = createApp(store, { enabled: true, now: () => now, model: async ({ categories }) => { calls++; return { categoryId: categories[0]?.id ?? null } } })
  const send = (path: string, body?: unknown, method = "POST") => app.request(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }) })
  return { db, store, app, send, calls: () => calls }
}

describe("assistant API integration", () => {
  it("learns only a confirmed opt-in and applies it without inference", async () => {
    const { db, send, store, calls } = setup()
    assert.equal((await send("/api/transactions", { ...input, categoryId: "cat-shopping", rememberCategory: true })).status, 201)
    assert.equal(store.assistant.getData().rules.length, 1)
    const preview = await send("/api/transactions/preview", { text: "paid 25rb for Unique kiosk from BCA" })
    assert.equal(preview.status, 200)
    assert.equal(((await preview.json()) as TransactionPreview).draft.categoryId, "cat-shopping")
    assert.equal(calls(), 0)
    assert.equal(store.getData().transactions.length, 42)
    assert.equal((await send("/api/transactions", { ...input, rememberCategory: "yes" })).status, 400)
    assert.equal(store.getData().transactions.length, 42)
    db.close()
  })
  it("learned exact notes override incidental category words, while an explicit category command wins", async () => {
    const { db, send, store } = setup()
    store.assistant.saveRule({ type: "expense", phrase: "Food court", categoryId: "cat-shopping" })
    const result = await (await send("/api/transactions/preview", { text: "paid 25rb Food court BCA" })).json() as TransactionPreview
    assert.equal(result.draft.categoryId, "cat-shopping")
    assert.match(result.message, /remembered/i)
    db.close()
  })
  it("previews separate rows without writes or invisible wallet/date inheritance", async () => {
    const { db, send, store } = setup()
    const before = store.getData()
    const response = await send("/api/assistant/preview-batch", { text: "Food 35rb BCA last Friday; Salary 5jt Bank Jago; transfer from BCA to Bank Jago", defaultWalletId: "wallet-bca" })
    assert.equal(response.status, 200)
    const result = await response.json() as { items: { preview: TransactionPreview & { conversation: NonNullable<TransactionPreview["conversation"]> } }[] }
    assert.equal(result.items.length, 3)
    assert.equal(result.items[0].preview.draft.date, "2026-10-23")
    assert.equal(result.items[1].preview.draft.date, "2026-10-28")
    assert.equal(result.items[2].preview.conversation.pending!.field, "amount")
    assert.deepEqual(store.getData(), before)
    assert.equal((await send("/api/assistant/preview-batch", { text: Array(6).fill("Food 1rb BCA").join(";") })).status, 400)
    assert.equal((await send("/api/assistant/preview-batch", { text: "x".repeat(20000) })).status, 400)
    db.close()
  })
  it("saves a reviewed batch atomically and replays the same key without another write", async () => {
    const { db, send, store } = setup()
    const before = store.getData()
    const body = { requestId: "batch-api-test-1", transactions: [input, { ...input, type: "income", categoryId: "cat-salary", amount: 5000000, walletId: "wallet-jago", description: "Salary" }] }
    const response = await send("/api/assistant/batch", body)
    assert.equal(response.status, 201)
    const first = await response.json() as AssistantBatchResult
    const second = await (await send("/api/assistant/batch", body)).json() as AssistantBatchResult
    assert.deepEqual(second.transactions, first.transactions)
    assert.equal(store.getData().transactions.length, before.transactions.length + 2)
    assert.equal((await send("/api/assistant/batch", { ...body, transactions: [input] })).status, 400)
    const invalid = { requestId: "batch-api-invalid", transactions: [input, { ...input, walletId: "missing" }] }
    assert.equal((await send("/api/assistant/batch", invalid)).status, 400)
    assert.equal(store.getData().transactions.length, before.transactions.length + 2)
    assert.equal((await send("/api/assistant/batch", { requestId: "no-csv-replace", transactions: [{ ...input, replaceTransactionId: before.transactions[0].id }] })).status, 400)
    db.close()
  })
  it("manages templates/rules separately from ledger writes", async () => {
    const { db, send, store } = setup()
    const before = store.getData()
    const template = await send("/api/assistant/templates", { name: "Lunch", draft: { type: "expense", walletId: "wallet-bca", categoryId: "cat-food", description: "Lunch" } }, "PUT")
    assert.equal(template.status, 200)
    const saved = await template.json() as TransactionTemplate
    assert.equal(store.assistant.getData().templates.length, 1)
    assert.equal((await send(`/api/assistant/templates/${saved.id}`, undefined, "DELETE")).status, 200)
    assert.equal(store.assistant.getData().templates.length, 0)
    const rule = await send("/api/assistant/rules", { type: "expense", phrase: "Local kiosk", categoryId: "cat-food" }, "PUT")
    assert.equal(rule.status, 200)
    const remembered = await rule.json() as CategoryRule
    assert.equal((await send(`/api/assistant/rules/${remembered.id}`, undefined, "DELETE")).status, 200)
    assert.deepEqual(store.getData(), before)
    db.close()
  })
  it("keeps questions and subscription discovery read-only, bounded and PIN protected", async () => {
    const { db, send, store } = setup()
    const before = store.getData()
    assert.equal((await send("/api/assistant/questions", { text: "How much did I spend in September 2026?" })).status, 200)
    assert.equal((await send("/api/assistant/subscriptions", undefined, "GET")).status, 200)
    assert.equal((await send("/api/assistant/subscriptions", { key: "invented", status: "tracked", name: "fake" }, "PUT")).status, 400)
    assert.deepEqual(store.getData(), before)
    assert.equal((await send("/api/auth/pin", { pin: "2468" }, "PUT")).status, 200)
    for (const path of ["/api/assistant", "/api/assistant/subscriptions"]) assert.equal((await send(path, undefined, "GET")).status, 401)
    for (const path of ["/api/assistant/questions", "/api/assistant/preview-batch", "/api/assistant/batch"]) assert.equal((await send(path, { text: "Food 25rb BCA" })).status, 401)
    db.close()
  })
})

describe("bounded multi-entry message boundaries", () => {
  it("handles separators and amount-bearing conjunctions without splitting decimal rupiah", () => {
    assert.deepEqual(splitTransactionMessage("Food 1,5jt BCA; Parking 5rb Cash", now), ["Food 1,5jt BCA", "Parking 5rb Cash"])
    assert.equal(splitTransactionMessage("Food 35rb BCA and parking 5rb Cash", now).length, 2)
    assert.equal(splitTransactionMessage("Food 35rb BCA, parking 5rb Cash", now).length, 2)
    assert.equal(splitTransactionMessage("fish and chips 35rb BCA", now).length, 1)
    assert.equal(splitTransactionMessage("Food BCA and parking 5rb Cash", now).length, 1)
  })
})

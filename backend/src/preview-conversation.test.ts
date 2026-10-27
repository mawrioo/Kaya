import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { previewConversation } from "./preview-conversation.ts"
import type { PreviewContext } from "./transaction-preview.ts"
import type { TransactionPreviewDraft } from "./types.ts"

const context: PreviewContext = {
  wallets: [{ id: "bca", name: "BCA", kind: "bank" }, { id: "jago", name: "Bank Jago", nickname: "Jago", kind: "digital-bank" }, { id: "cash", name: "Cash", kind: "cash" }],
  categories: [{ id: "food", name: "Food", type: "expense" }, { id: "other", name: "Other", type: "expense" }, { id: "salary", name: "Salary", type: "income" }], transactions: [],
}
const now = new Date("2026-10-31T18:00:00Z")
const base = "paid 35rb for Food from BCA yesterday"
const transfer = "transfer 500rb from BCA to Jago yesterday"
// Fixed acceptance corpus, established before tuning the conversation flow. Financial fields are exact.
const cases: { initial: string; replies: string[]; expected: TransactionPreviewDraft; pending?: string }[] = [
  { initial: "Bought lunch from BCA yesterday", replies: ["35rb"], expected: { amount: 35000, walletId: "bca", date: "2026-10-31", description: "lunch", categoryId: "food" } },
  { initial: "beli makan dari BCA kemarin", replies: ["40rb"], expected: { amount: 40000, walletId: "bca", description: "makan" } },
  { initial: "gaji masuk Jago kemarin", replies: ["5jt"], expected: { type: "income", amount: 5000000, walletId: "jago" } },
  { initial: "transfer from BCA to Jago yesterday", replies: ["500rb"], expected: { type: "transfer", amount: 500000, walletId: "bca", toWalletId: "jago" } },
  { initial: "transfer 500rb to Jago", replies: ["BCA"], expected: { walletId: "bca", toWalletId: "jago" } },
  { initial: "transfer 500rb from BCA", replies: ["Jago"], expected: { walletId: "bca", toWalletId: "jago" } },
  { initial: "Food 35rb", replies: ["Cash"], expected: { walletId: "cash", amount: 35000 } },
  { initial: "Food BCA", replies: ["Rp 1.250"], expected: { amount: 1250 } },
  { initial: "Food BCA", replies: ["1,5jt"], expected: { amount: 1500000 } },
  { initial: "Food BCA", replies: ["1.25k"], expected: { amount: 1250 } },
  { initial: base, replies: ["make that 40rb"], expected: { amount: 40000, walletId: "bca", date: "2026-10-31" } },
  { initial: base, replies: ["ganti jadi 50rb"], expected: { amount: 50000 } },
  { initial: base, replies: ["actually use Bank Jago"], expected: { walletId: "jago", amount: 35000, categoryId: "food" } },
  { initial: base, replies: ["pakai Cash"], expected: { walletId: "cash" } },
  { initial: transfer, replies: ["from Cash"], expected: { walletId: "cash", toWalletId: "jago" } },
  { initial: transfer, replies: ["dari Cash"], expected: { walletId: "cash", toWalletId: "jago" } },
  { initial: transfer, replies: ["to Cash"], expected: { walletId: "bca", toWalletId: "cash" } },
  { initial: transfer, replies: ["ke Cash"], expected: { walletId: "bca", toWalletId: "cash" } },
  { initial: base, replies: ["actually today"], expected: { date: "2026-11-01" } },
  { initial: base, replies: ["tanggalnya kemarin"], expected: { date: "2026-10-31" } },
  { initial: base, replies: ["date 2026-02-28"], expected: { date: "2026-02-28" } },
  { initial: base, replies: ["category Other"], expected: { categoryId: "other" } },
  { initial: base, replies: ["kategori Other"], expected: { categoryId: "other" } },
  { initial: base, replies: ["note: lunch with friends"], expected: { description: "lunch with friends", categoryId: "food" } },
  { initial: base, replies: ["catatan: makan bersama"], expected: { description: "makan bersama" } },
  { initial: base, replies: ["this was income", "Salary"], expected: { type: "income", categoryId: "salary", amount: 35000 } },
  { initial: base, replies: ["this was transfer", "Cash"], expected: { type: "transfer", categoryId: undefined, toWalletId: "cash" } },
  { initial: transfer, replies: ["use Cash", "destination"], expected: { walletId: "bca", toWalletId: "cash" } },
  { initial: transfer, replies: ["pakai Cash", "asal"], expected: { walletId: "cash", toWalletId: "jago" } },
  { initial: transfer, replies: ["use Cash"], expected: { walletId: "bca", toWalletId: "jago" }, pending: "transferEnd" },
  { initial: "Food BCA", replies: ["zero"], expected: { amount: undefined, walletId: "bca" }, pending: "amount" },
  { initial: "Food BCA", replies: ["0"], expected: { amount: undefined }, pending: "amount" },
  { initial: "Food BCA", replies: ["-25rb"], expected: { amount: undefined }, pending: "amount" },
  { initial: "Food BCA", replies: ["1,2345rb"], expected: { amount: undefined }, pending: "amount" },
  { initial: "Food BCA", replies: ["1000000000000"], expected: { amount: undefined }, pending: "amount" },
  { initial: "Food 35rb", replies: ["Unknown Bank"], expected: { walletId: undefined }, pending: "walletId" },
  { initial: base, replies: ["use Unknown Bank"], expected: { walletId: "bca", amount: 35000 } },
  { initial: transfer, replies: ["to BCA"], expected: { walletId: "bca", toWalletId: "jago" } },
  { initial: base, replies: ["category Salary"], expected: { categoryId: "food", type: "expense" } },
  { initial: base, replies: ["date 2026-02-30"], expected: { date: "2026-10-31" } },
  { initial: base, replies: ["paid 50rb dinner Jago"], expected: { amount: 35000, walletId: "bca", description: "Food" } },
  { initial: base, replies: ["yes", "okay", "save it"], expected: { amount: 35000 } },
  { initial: base, replies: ["make that 40rb and use Cash"], expected: { amount: 35000, walletId: "bca" } },
  { initial: base, replies: ["use Cash", "make that 1rb", "note: corrected"], expected: { walletId: "cash", amount: 1000, description: "corrected", date: "2026-10-31" } },
]

describe("fixed multi-turn acceptance corpus", () => {
  for (const [index, c] of cases.entries()) it(`${index + 1}: ${c.initial} -> ${c.replies.join(" -> ")}`, async () => {
    let calls = 0
    const model = async (input: { categories: { id: string }[] }) => { calls++; return { categoryId: input.categories[0]?.id ?? null } }
    let result = await previewConversation({ text: c.initial }, context, model, { now })
    const initialCalls = calls
    for (const reply of c.replies) {
      const revision = result.conversation!.revision
      result = await previewConversation({ text: reply, conversation: result.conversation }, context, model, { now })
      assert.equal(result.conversation!.revision, revision + 1)
    }
    assert.equal(calls, initialCalls, "deterministic replies must not infer")
    for (const [key, value] of Object.entries(c.expected)) assert.equal(result.draft[key as keyof TransactionPreviewDraft], value, key)
    assert.equal(result.conversation?.pending?.field, c.pending)
    assert.equal(result.status, c.pending ? "clarify" : "ready")
  })
  it("preserves manual choices and resolves new relative dates across midnight", async () => {
    let result = await previewConversation({ text: base }, context, async () => ({}), { now })
    result.conversation!.draft.categoryId = "other"
    result.conversation!.sources.categoryId = "manual"
    result = await previewConversation({ text: "make that 40rb", conversation: result.conversation }, context, async () => { throw Error("No model") }, { now: new Date("2026-11-01T18:00:00Z") })
    assert.equal(result.draft.date, "2026-10-31")
    assert.equal(result.draft.categoryId, "other")
    assert.equal(result.conversation?.sources.categoryId, "manual")
    result = await previewConversation({ text: "actually yesterday", conversation: result.conversation }, context, async () => ({}), { now: new Date("2026-11-01T18:00:00Z") })
    assert.equal(result.draft.date, "2026-11-01")
  })
  it("rejects forged context rather than trusting IDs, provenance or dates", async () => {
    for (const draft of [{ amount: -1 }, { walletId: "unknown" }, { date: "2026-02-30" }, { type: "expense", categoryId: "salary" }, { balance: 123 }, { type: "transfer", walletId: "bca", toWalletId: "bca" }]) {
      await assert.rejects(previewConversation({ text: "35rb", conversation: { revision: 1, draft, sources: {} } }, context, async () => ({})), /context is invalid/)
    }
  })
  it("preserves every unrelated field and its provenance during valid and rejected patches", async () => {
    const first = await previewConversation({ text: base }, context, async () => ({}), { now })
    assert.equal(first.conversation?.sources.categoryId, "sentence")
    for (const text of ["use Unknown Bank", "date 2026-02-30", "category Salary", "make that 40rb and use Cash", "save it", "this was __proto__"]) {
      const result = await previewConversation({ text, conversation: first.conversation }, context, async () => { throw Error("No inference") }, { now })
      assert.deepEqual(result.draft, first.draft)
      assert.deepEqual(result.conversation?.sources, first.conversation?.sources)
    }
    const changed = await previewConversation({ text: "make that 40rb", conversation: first.conversation }, context, async () => ({}), { now })
    assert.deepEqual(changed.draft, { ...first.draft, amount: 40000 })
    assert.deepEqual(changed.conversation?.sources, { ...first.conversation?.sources, amount: "reply" })
  })
  it("keeps independent fields when amount and date both need clarification", async () => {
    let result = await previewConversation({ text: "paid Food from BCA 2026-02-30" }, context, async () => ({}), { now })
    assert.deepEqual(result.draft, { type: "expense", walletId: "bca", description: "Food", categoryId: "food" })
    assert.equal(result.conversation?.pending?.field, "amount")
    result = await previewConversation({ text: "35rb", conversation: result.conversation }, context, async () => ({}), { now })
    assert.equal(result.conversation?.pending?.field, "date")
    result = await previewConversation({ text: "2026-02-28", conversation: result.conversation }, context, async () => ({}), { now })
    assert.deepEqual(result.draft, { type: "expense", amount: 35000, walletId: "bca", description: "Food", categoryId: "food", date: "2026-02-28" })
  })
  it("never converts colliding transfer wallet labels into a ready draft", async () => {
    const collision = { ...context, wallets: [...context.wallets, { id: "another", name: "Another", nickname: "BCA", kind: "bank" as const }] }
    let result = await previewConversation({ text: "transfer from BCA to Jago" }, collision, async () => ({}), { now })
    assert.equal(result.draft.walletId, undefined)
    result = await previewConversation({ text: "35rb", conversation: result.conversation }, collision, async () => ({}), { now })
    assert.equal(result.status, "clarify")
    assert.equal(result.conversation?.pending?.field, "walletId")
  })
})

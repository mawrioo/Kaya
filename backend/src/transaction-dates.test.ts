import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extractTransactionDate, resolveTransactionDate } from "./transaction-dates.ts"
import { previewConversation } from "./preview-conversation.ts"
import type { PreviewContext } from "./transaction-preview.ts"

const now = new Date("2026-10-28T04:00:00Z") // Wednesday in Jakarta.
describe("bounded transaction date phrases", () => {
  for (const [text, expected] of [
    ["last Friday", "2026-10-23"], ["Jumat lalu", "2026-10-23"], ["last Wednesday", "2026-10-21"], ["rabu lalu", "2026-10-21"],
    ["last Thursday", "2026-10-22"], ["hari Minggu lalu", "2026-10-25"], ["two days ago", "2026-10-26"], ["dua hari lalu", "2026-10-26"],
    ["1 day ago", "2026-10-27"], ["10 hari lalu", "2026-10-18"], ["the 25th of last month", "2026-09-25"], ["tanggal 25 bulan lalu", "2026-09-25"],
    ["tgl 1 bulan lalu", "2026-09-01"], ["today", "2026-10-28"], ["kemarin", "2026-10-27"], ["2024-02-29", "2024-02-29"],
  ]) it(`${text} = ${expected}`, () => assert.equal(resolveTransactionDate(text, now).date, expected))
  for (const text of ["Friday", "Jumat", "minggu lalu", "03/04/2026", "last week", "next Friday", "2026-02-30", "tanggal 31 bulan lalu", "the 11st of last month", "0 days ago", "366 days ago"]) {
    it(`asks instead of guessing ${text}`, () => {
      const result = resolveTransactionDate(text, now)
      assert.equal(result.recognized, true)
      assert.equal(result.date, undefined)
      assert.ok(result.message)
    })
  }
  it("handles leap years, year boundaries, Friday itself and Jakarta midnight", () => {
    assert.equal(resolveTransactionDate("last Friday", new Date("2026-10-30T05:00:00Z")).date, "2026-10-23")
    assert.equal(resolveTransactionDate("tanggal 29 bulan lalu", new Date("2024-03-01T05:00:00Z")).date, "2024-02-29")
    assert.equal(resolveTransactionDate("tanggal 29 bulan lalu", new Date("2025-03-01T05:00:00Z")).date, undefined)
    assert.equal(resolveTransactionDate("the 31st of last month", new Date("2026-01-01T05:00:00Z")).date, "2025-12-31")
    assert.equal(resolveTransactionDate("two days ago", new Date("2026-01-01T17:00:00Z")).date, "2025-12-31")
    assert.equal(resolveTransactionDate("yesterday", new Date("2026-10-28T16:59:59Z")).date, "2026-10-27")
    assert.equal(resolveTransactionDate("yesterday", new Date("2026-10-28T17:00:00Z")).date, "2026-10-28")
  })
  it("removes date numbers before extracting money and rejects competing dates", () => {
    const result = extractTransactionDate("paid 35rb Food BCA tanggal 25 bulan lalu", now)
    assert.equal(result.date, "2026-09-25")
    assert.equal(result.remaining.trim(), "paid 35rb Food BCA")
    for (const text of ["paid 35rb Friday BCA", "paid 35rb 03/04/2026 BCA", "paid 35rb yesterday last Friday BCA", "paid 35rb today next Friday BCA"]) {
      assert.equal(extractTransactionDate(text, now).date, undefined)
    }
  })
})

describe("dates in the complete preview flow", () => {
  const context: PreviewContext = { wallets: [{ id: "bca", name: "BCA", kind: "bank" }], categories: [{ id: "food", name: "Food", type: "expense" }], transactions: [] }
  const noModel = async () => { throw Error("Explicit categories and date corrections do not need inference") }
  for (const [phrase, date] of [["last Friday", "2026-10-23"], ["dua hari lalu", "2026-10-26"], ["tanggal 25 bulan lalu", "2026-09-25"]]) {
    it(`prepares exact amount and date for ${phrase}`, async () => {
      const result = await previewConversation({ text: `paid 35rb Food BCA ${phrase}` }, context, noModel, { now })
      assert.equal(result.status, "ready")
      assert.equal(result.draft.amount, 35000)
      assert.equal(result.draft.date, date)
      assert.equal(result.draft.description, "Food")
    })
  }
  it("answers an ambiguous date without losing the amount, wallet or category", async () => {
    let result = await previewConversation({ text: "paid 35rb Food BCA Friday" }, context, noModel, { now })
    assert.equal(result.conversation?.pending?.field, "date")
    assert.equal(result.conversation?.pending?.reason, "ambiguous")
    result = await previewConversation({ text: "last Friday", conversation: result.conversation }, context, noModel, { now })
    assert.equal(result.status, "ready")
    assert.deepEqual(result.draft, { type: "expense", amount: 35000, date: "2026-10-23", walletId: "bca", categoryId: "food", description: "Food" })
    const invalid = await previewConversation({ text: "tanggalnya tanggal 31 bulan lalu", conversation: result.conversation }, context, noModel, { now })
    assert.deepEqual(invalid.draft, result.draft)
  })
  it("preserves a resolved date while new corrections use the new Jakarta day", async () => {
    let result = await previewConversation({ text: "paid 35rb Food BCA last Friday" }, context, noModel, { now })
    result = await previewConversation({ text: "make that 40rb", conversation: result.conversation }, context, noModel, { now: new Date("2026-11-02T05:00:00Z") })
    assert.equal(result.draft.date, "2026-10-23")
    result = await previewConversation({ text: "actually last Friday", conversation: result.conversation }, context, noModel, { now: new Date("2026-11-02T05:00:00Z") })
    assert.equal(result.draft.date, "2026-10-30")
    assert.equal(result.draft.amount, 40000)
  })
})

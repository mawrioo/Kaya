import assert from "node:assert/strict"
import { test } from "node:test"
import { dayNet, totalsOf } from "../lib/transaction-totals.ts"

const income = (amount) => ({ id: `i${amount}`, type: "income", amount, date: "2026-09-25T12:00:00+07:00", description: "", walletId: "bca", categoryId: "salary" })
const spend = (amount) => ({ id: `s${amount}`, type: "expense", amount, date: "2026-09-26T12:00:00+07:00", description: "", walletId: "bca", categoryId: "food" })
const move = (amount) => ({ id: `t${amount}`, type: "transfer", amount, date: "2026-09-26T12:00:00+07:00", description: "", fromWalletId: "bca", toWalletId: "jago" })

test("adds income and spending apart, and the difference is the net", () => {
  assert.deepEqual(totalsOf([income(12_500_000), spend(215_000), spend(1_500_000), income(3_200_000)]), {
    income: 15_700_000,
    spending: 1_715_000,
    net: 13_985_000,
    transfers: 0,
  })
})

test("a transfer is counted on its own and never added to money in or out", () => {
  assert.deepEqual(totalsOf([spend(1_000), move(3_000_000), move(2_000_000)]), { income: 0, spending: 1_000, net: -1_000, transfers: 2 })
})

test("more going out than coming in makes the net negative, and nothing at all makes everything zero", () => {
  assert.equal(totalsOf([income(1_000), spend(4_000)]).net, -3_000)
  assert.deepEqual(totalsOf([]), { income: 0, spending: 0, net: 0, transfers: 0 })
})

test("a day comes to its income minus its spending", () => {
  assert.equal(dayNet([spend(215_000)]), -215_000)
  assert.equal(dayNet([income(500), spend(200), move(9_999)]), 300)
  assert.equal(dayNet([income(100), spend(100)]), 0, "a day that broke even is zero, not nothing")
})

test("a day that held only transfers has no total", () => {
  assert.equal(dayNet([move(3_000_000), move(2_000_000)]), undefined)
})

test("handles the biggest amounts without losing a rupiah", () => {
  const big = 999_999_999_999
  assert.equal(totalsOf([income(big), income(big), spend(1)]).net, 2 * big - 1)
})

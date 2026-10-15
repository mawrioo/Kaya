import assert from "node:assert/strict"
import { test } from "node:test"
import { buildReview, findDuplicates, importedChange, suggestTransfers, toTransactions } from "../lib/bank-csv.ts"

const wallets = [{ id: "bca", name: "BCA", kind: "bank" }, { id: "jago", name: "Bank Jago", nickname: "jago", kind: "digital-bank" }, { id: "deposit", name: "Deposit", kind: "deposito" }]
const row = { line: 2, date: "2026-10-13", note: "Transfer to Jago", amount: -25000, balance: null }
const income = { id: "in", type: "income", walletId: "jago", amount: 25000, date: "2026-10-13T12:00:00+07:00", description: "From BCA", categoryId: "salary" }
const categories = [{ id: "other", name: "Other", type: "expense", preset: true }]

test("a wallet name or nickname suggests a transfer but the default stays spending", () => {
  const rows = buildReview([row], { walletId: "bca", wallets, categories, transactions: [] })
  assert.equal(rows[0].transferSuggestions[0].walletId, "jago")
  assert.equal(rows[0].transfer, undefined)
  assert.equal(toTransactions(rows, "bca")[0].type, "expense")
  rows[0].transfer = rows[0].transferSuggestions[0]
  const [tx] = toTransactions(rows, "bca")
  assert.equal(tx.type, "transfer")
  assert.equal(tx.fromWalletId, "bca")
  assert.equal(tx.toWalletId, "jago")
  assert.equal(importedChange(rows), -25000)
  rows[0].transfer = undefined
  assert.equal(toTransactions(rows, "bca")[0].type, "expense")
})

test("the already recorded opposite side is suggested with its id and note", () => {
  const [suggestion] = suggestTransfers({ ...row, note: "Bank transfer" }, "bca", wallets, [income])
  assert.equal(suggestion.transactionId, "in")
  assert.equal(suggestion.description, "From BCA")
  const rows = buildReview([row], { walletId: "bca", wallets, categories, transactions: [income] })
  rows[0].transfer = suggestion
  assert.equal(toTransactions(rows, "bca")[0].replaceTransactionId, "in")
})

test("ambiguous matches stay separate for review and neither is chosen", () => {
  const rows = buildReview([row], { walletId: "bca", wallets, categories, transactions: [income, { ...income, id: "in2", description: "Second" }] })
  assert.equal(rows[0].transferSuggestions.length, 2)
  assert.equal(rows[0].transfer, undefined)
})

test("matching needs an exact day, amount and opposite direction; names need whole words", () => {
  for (const tx of [{ ...income, amount: 24999 }, { ...income, type: "expense" }, { ...income, date: "2026-10-12T12:00:00+07:00" }]) {
    assert.deepEqual(suggestTransfers({ ...row, note: "Jagoan shop" }, "bca", wallets, [tx]), [])
  }
  assert.deepEqual(suggestTransfers({ ...row, note: "BCA Deposit" }, "bca", wallets, []), [])
  assert.deepEqual(suggestTransfers({ ...row, problem: "Can't read date" }, "bca", wallets, [income]), [])
})

test("incoming lines create transfers in the other direction only after choosing", () => {
  const rows = buildReview([{ ...row, amount: 25000 }], { walletId: "bca", wallets, categories, transactions: [] })
  rows[0].transfer = rows[0].transferSuggestions[0]
  const [tx] = toTransactions(rows, "bca")
  assert.equal(tx.fromWalletId, "jago")
  assert.equal(tx.toWalletId, "bca")
  assert.equal(importedChange(rows), 25000)
})

test("reimporting either bank side of a transfer starts unticked, with one duplicate per transaction", () => {
  const tx = { id: "tx", type: "transfer", fromWalletId: "bca", toWalletId: "jago", amount: 25000, date: income.date, description: "" }
  const rows = buildReview([row, row], { walletId: "bca", wallets, categories, transactions: [tx] })
  assert.equal(rows[0].include, false)
  assert.equal(rows[1].include, true)
  assert.deepEqual([...findDuplicates([{ ...row, amount: 25000 }], [tx], "jago")], [0])
})

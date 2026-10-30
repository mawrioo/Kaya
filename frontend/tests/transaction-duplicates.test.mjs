import assert from "node:assert/strict"
import { test } from "node:test"
import { duplicateSignature, findTransactionDuplicates } from "../lib/transaction-duplicates.ts"

const form = { type: "expense", amount: "35000", walletId: "bca", toWalletId: "", categoryId: "food", date: "2026-10-28", note: "Lunch!" }
const tx = { id: "one", type: "expense", amount: 35000, walletId: "bca", categoryId: "food", date: "2026-10-28T12:00:00+07:00", description: "lunch" }

test("same amount, wallet and Jakarta day are advisory, even with another note/category", () => {
  const matches = findTransactionDuplicates(form, [{ ...tx, id: "two", description: "Parking", categoryId: "transport" }, tx])
  assert.equal(matches.length, 2)
  assert.equal(matches[0].transaction.id, "one")
  assert.equal(matches[0].sameNote, true)
  assert.equal(matches[1].sameNote, false)
})
test("type, amount, wallet and day each distinguish another entry", () => {
  for (const change of [{ type: "income" }, { amount: 35001 }, { walletId: "jago" }, { date: "2026-10-27T12:00:00+07:00" }]) {
    assert.deepEqual(findTransactionDuplicates(form, [{ ...tx, ...change }]), [])
  }
  assert.deepEqual(findTransactionDuplicates(form, [tx], "one"), [])
})
test("uses Jakarta calendar days rather than slicing UTC timestamps", () => {
  assert.equal(findTransactionDuplicates(form, [{ ...tx, date: "2026-10-27T17:00:00Z" }]).length, 1)
  assert.equal(findTransactionDuplicates(form, [{ ...tx, date: "2026-10-27T16:59:59Z" }]).length, 0)
})
test("transfers match both endpoints in the same direction", () => {
  const draft = { ...form, type: "transfer", toWalletId: "jago" }
  const transfer = { id: "transfer", type: "transfer", amount: 35000, date: tx.date, description: "Savings", fromWalletId: "bca", toWalletId: "jago" }
  assert.equal(findTransactionDuplicates(draft, [transfer]).length, 1)
  assert.equal(findTransactionDuplicates(draft, [{ ...transfer, fromWalletId: "jago", toWalletId: "bca" }]).length, 0)
  assert.equal(findTransactionDuplicates(draft, [{ ...transfer, toWalletId: "cash" }]).length, 0)
  assert.equal(findTransactionDuplicates(draft, [tx]).length, 0)
})
test("incomplete or invalid drafts do not show misleading matches", () => {
  for (const change of [{ amount: "" }, { amount: "0" }, { amount: "NaN" }, { walletId: "" }, { date: "" }, { type: "transfer", toWalletId: "" }, { type: "transfer", toWalletId: "bca" }]) {
    assert.deepEqual(findTransactionDuplicates({ ...form, ...change }, [tx]), [])
  }
})
test("recheck signatures detect new and changed records without depending on display order", () => {
  const first = findTransactionDuplicates(form, [tx])
  const second = findTransactionDuplicates(form, [tx, { ...tx, id: "two" }])
  assert.notEqual(duplicateSignature(first), duplicateSignature(second))
  assert.notEqual(duplicateSignature(first), duplicateSignature(findTransactionDuplicates(form, [{ ...tx, description: "Updated note" }])))
  assert.equal(duplicateSignature(second), duplicateSignature([...second].reverse()))
})

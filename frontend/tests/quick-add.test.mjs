import assert from "node:assert/strict"
import { test } from "node:test"
import { parseQuickExpense, prepareQuickExpense } from "../lib/quick-add.ts"

const wallets = [{ id: "bca", name: "BCA" }, { id: "jago", name: "Bank Jago" }, { id: "gojek", name: "Gojek" }]
const form = { type: "expense", amount: "1000", note: "Old note", walletId: "jago", categoryId: "", toWalletId: "", date: "2026-10-06" }
const categories = [
  { id: "food", name: "Food", type: "expense", color: "clay", icon: "utensils" },
  { id: "other", name: "Other", type: "expense", color: "sage", icon: "tag" },
  { id: "salary", name: "Salary", type: "income", color: "moss", icon: "briefcase" },
]
const transactions = [
  { id: "1", type: "expense", description: "Nasi goreng", amount: 20000, walletId: "bca", categoryId: "food", date: "2026-10-01T12:00:00+07:00" },
  { id: "2", type: "income", description: "Salary", amount: 1000000, walletId: "bca", categoryId: "salary", date: "2026-10-01T12:00:00+07:00" },
]

for (const [input, amount] of [
  ["25rb", "25000"], ["25k", "25000"], ["25 ribu", "25000"], ["2jt", "2000000"], ["2 juta", "2000000"],
  ["25.000", "25000"], ["25000", "25000"], ["Rp25.000", "25000"], ["Rp. 25.000", "25000"],
  ["1,5jt", "1500000"], ["1.5 juta", "1500000"], ["12,5rb", "12500"], ["0,001k", "1"],
  ["0.000001jt", "1"], ["1.500rb", "1500000"], ["1.250.000", "1250000"], ["25 RB", "25000"],
  ["999.999.999.999", "999999999999"], ["00025rb", "25000"],
]) {
  test(`reads ${input} as ${amount} rupiah`, () => {
    assert.deepEqual(parseQuickExpense(`Nasi goreng ${input} BCA`, wallets), {
      ok: true, expense: { amount, note: "Nasi goreng", walletId: "bca" },
    })
  })
}

for (const input of ["0", "0rb", "-25rb", "+25rb", "- 25rb", "+ 25rb", "Rp - 25rb", "1,000", "25.00", "1.234.56", "1,5", "0,0001rb", "1000000000000", "1000000jt", "25rb 30rb", "25000 30000", "1e3", "Infinity", "NaN", "25/000", "25rb-30rb", "", "nasi goreng"]) {
  test(`asks for correction instead of guessing: ${JSON.stringify(input)}`, () => {
    assert.equal(parseQuickExpense(input, wallets).ok, false)
  })
}

test("supports amount first and wallet names in any case with flexible spaces", () => {
  assert.deepEqual(parseQuickExpense("25rb nasi goreng bAnK   jAgO", wallets), {
    ok: true, expense: { amount: "25000", note: "nasi goreng", walletId: "jago" },
  })
})

test("keeps quantities in the note when money has an explicit unit", () => {
  assert.deepEqual(parseQuickExpense("2 nasi goreng 25rb gojek", wallets), {
    ok: true, expense: { amount: "25000", note: "2 nasi goreng", walletId: "gojek" },
  })
})

test("unknown wallets and partial names remain in the note", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb BCAX Jago OVO", wallets), {
    ok: true, expense: { amount: "25000", note: "kopi BCAX Jago OVO" },
  })
})

test("matches wallet names literally, including regex punctuation and numbers", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb Cash (2)+", [{ id: "cash", name: "Cash (2)+" }]), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "cash" },
  })
})

test("prefers the longest overlapping wallet name", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb Bank Jago", [...wallets, { id: "short", name: "Jago" }]), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "jago" },
  })
})

test("two different wallets need clarification; repeating one does not", () => {
  assert.equal(parseQuickExpense("kopi 25rb BCA Bank Jago", wallets).ok, false)
  assert.deepEqual(parseQuickExpense("BCA kopi 25rb BCA", wallets), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "bca" },
  })
})

test("an empty note is allowed but overlong notes and lines are rejected without truncating", () => {
  assert.deepEqual(parseQuickExpense("25rb", wallets), { ok: true, expense: { amount: "25000", note: "" } })
  assert.equal(parseQuickExpense(`${"a".repeat(100)} 25rb`, wallets).ok, true)
  assert.equal(parseQuickExpense(`${"a".repeat(101)} 25rb`, wallets).ok, false)
  assert.equal(parseQuickExpense(`${"a".repeat(241)} 25rb`, wallets).ok, false)
})

test("fills the form using previous category choices, preserving the date", () => {
  const result = prepareQuickExpense("nasi goreng 25rb BCA", form, wallets, categories, transactions, false)
  assert.equal(result.ok, true)
  assert.deepEqual(result.form, { ...form, amount: "25000", note: "nasi goreng", walletId: "bca", categoryId: "food" })
  assert.equal(result.suggestion.basedOn, "Nasi goreng")
  assert.equal(result.walletMatched, true)
  assert.equal(form.amount, "1000", "the original draft was not mutated")
})

test("keeps the selected wallet when none is named, and never invents a category", () => {
  const result = prepareQuickExpense("new merchant 25rb", { ...form, categoryId: "food" }, wallets, categories, transactions, false)
  assert.equal(result.ok, true)
  assert.equal(result.form.walletId, "jago")
  assert.equal(result.form.categoryId, "")
  assert.equal(result.suggestion, undefined)
  assert.equal(result.walletMatched, false)
})

test("a manually picked category wins over suggestions", () => {
  const result = prepareQuickExpense("nasi goreng 25rb", { ...form, categoryId: "other" }, wallets, categories, transactions, true)
  assert.equal(result.ok, true)
  assert.equal(result.form.categoryId, "other")
  assert.equal(result.suggestion, undefined)
})

test("income history cannot suggest an expense category", () => {
  const result = prepareQuickExpense("Salary 25rb", form, wallets, categories, transactions, false)
  assert.equal(result.ok, true)
  assert.equal(result.form.categoryId, "")
})

test("invalid lines return no draft, and other transaction types cannot be overwritten", () => {
  assert.equal(prepareQuickExpense("25rb 30rb", form, wallets, categories, transactions, false).ok, false)
  for (const type of ["income", "transfer"]) {
    assert.equal(prepareQuickExpense("25rb", { ...form, type }, wallets, categories, transactions, false).ok, false)
  }
})

const nicknamed = [
  { id: "bca", name: "BCA Tabungan", nickname: "bca" },
  { id: "jago", name: "Bank Jago", nickname: "jago" },
  { id: "cash", name: "Dompet Tunai", nickname: "kas 2" },
  { id: "plain", name: "Superbank" },
]

for (const [line, walletId, note] of [
  ["kopi 25rb jago", "jago", "kopi"],
  ["JAGO kopi 25rb", "jago", "kopi"],
  ["kopi jAgO 25rb", "jago", "kopi"],
  ["kopi 25rb bca", "bca", "kopi"],
  ["kopi 25rb Bank Jago", "jago", "kopi"],
  ["kopi 25rb Superbank", "plain", "kopi"],
]) {
  test(`a nickname or a full name picks the wallet: ${line}`, () => {
    assert.deepEqual(parseQuickExpense(line, nicknamed), { ok: true, expense: { amount: "25000", note, walletId } })
  })
}

test("a full name that contains a nickname is one wallet, not two", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb bca tabungan", nicknamed), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "bca" },
  })
  assert.deepEqual(parseQuickExpense("kopi 25rb bank jago jago", nicknamed), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "jago" },
  })
})

test("a nickname with a number in it is a wallet, not an amount", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb kas 2", nicknamed), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "cash" },
  })
  assert.deepEqual(parseQuickExpense("kas   2 kopi 25rb", nicknamed), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "cash" },
  })
})

test("two wallets named by nickname or name still need clarification", () => {
  assert.equal(parseQuickExpense("kopi 25rb jago bca", nicknamed).ok, false)
  assert.equal(parseQuickExpense("kopi 25rb jago Superbank", nicknamed).ok, false)
  assert.equal(parseQuickExpense("kopi 25rb jago bank jago", nicknamed).ok, true)
})

test("only whole words count as a nickname", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb jagoan bcaX", nicknamed), {
    ok: true, expense: { amount: "25000", note: "kopi jagoan bcaX" },
  })
})

test("a wallet without a nickname, or with an empty one, behaves as before", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb jago", wallets), { ok: true, expense: { amount: "25000", note: "kopi jago" } })
  assert.deepEqual(parseQuickExpense("kopi 25rb jago", [{ id: "x", name: "Bank Jago", nickname: "" }]), {
    ok: true, expense: { amount: "25000", note: "kopi jago" },
  })
})

test("nicknames match literally, even with regex punctuation", () => {
  assert.deepEqual(parseQuickExpense("kopi 25rb gopay (2)", [{ id: "g", name: "GoPay", nickname: "gopay (2)" }]), {
    ok: true, expense: { amount: "25000", note: "kopi", walletId: "g" },
  })
})

test("filling the form with a nickname picks that wallet and says it was found", () => {
  const result = prepareQuickExpense("kopi 25rb jago", { ...form, walletId: "bca" }, nicknamed, categories, transactions, false)
  assert.equal(result.ok, true)
  assert.equal(result.form.walletId, "jago")
  assert.equal(result.form.note, "kopi")
  assert.equal(result.walletMatched, true)
})

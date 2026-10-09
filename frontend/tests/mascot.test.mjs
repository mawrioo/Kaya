import assert from "node:assert/strict"
import { test } from "node:test"
import { petMood, petNextStep, petStatus } from "../lib/mascot.ts"

const income = (amount, date = "2026-10-03") => ({ type: "income", amount, date })
const expense = (amount, date = "2026-10-04") => ({ type: "expense", amount, date })
const transfer = (amount, date = "2026-10-05") => ({ type: "transfer", amount, date })

test("the saving rate picks one of five states, with the lines at 20%", () => {
  const at = (spending) => petMood({ income: 10_000_000, spending })
  assert.equal(at(0), "thriving")
  assert.equal(at(8_000_000), "thriving") // kept exactly 20%
  assert.equal(at(8_000_001), "happy")
  assert.equal(at(9_999_999), "happy")
  assert.equal(at(10_000_000), "okay") // break-even
  assert.equal(at(10_000_001), "wilting")
  assert.equal(at(12_000_000), "wilting") // exactly 20% over
  assert.equal(at(12_000_001), "melted")
  assert.equal(at(50_000_000), "melted")
})

test("with no income yet it is okay, however much has been spent (the owner is paid weekly)", () => {
  assert.equal(petMood({ income: 0, spending: 0 }), "okay")
  assert.equal(petMood({ income: 0, spending: 2_500_000 }), "okay")
})

test("only this month's income and spending count; transfers and other months don't", () => {
  const transactions = [
    income(10_000_000),
    expense(9_000_000),
    transfer(5_000_000),
    expense(30_000_000, "2026-09-28"),
    income(1_000_000, "2026-11-01"),
  ]
  const status = petStatus(transactions, "2026-10")
  assert.equal(status.mood, "happy")
  assert.equal(status.title, "Happy")
})

test("every state has a plain sentence for screen readers, with no amounts in it", () => {
  for (const [transactions, mood] of [
    [[income(10_000_000)], "thriving"],
    [[income(10_000_000), expense(9_500_000)], "happy"],
    [[], "okay"],
    [[expense(500_000)], "okay"],
    [[income(10_000_000), expense(10_000_000)], "okay"],
    [[income(10_000_000), expense(11_000_000)], "wilting"],
    [[income(10_000_000), expense(15_000_000)], "melted"],
  ]) {
    const status = petStatus(transactions, "2026-10")
    assert.equal(status.mood, mood)
    assert.match(status.sentence, /^Your pet /)
    assert.doesNotMatch(status.sentence, /\d/)
  }
  assert.match(petStatus([expense(500_000)], "2026-10").sentence, /no income/i)
})

test("the next step says how much more kept (or how much less spent) moves it up one state", () => {
  // Happy, kept 1.000.000 of 10.000.000: thriving needs 2.000.000 kept.
  assert.deepEqual(petNextStep({ income: 10_000_000, spending: 9_000_000 }), { mood: "thriving", amount: 1_000_000 })
  // Okay at break-even: one rupiah kept makes it happy.
  assert.deepEqual(petNextStep({ income: 10_000_000, spending: 10_000_000 }), { mood: "happy", amount: 1 })
  // Wilting, 1.500.000 over: back to okay at break-even.
  assert.deepEqual(petNextStep({ income: 10_000_000, spending: 11_500_000 }), { mood: "okay", amount: 1_500_000 })
  // Melted, 3.500.000 over: wilting from 2.000.000 over (a fifth of the income).
  assert.deepEqual(petNextStep({ income: 10_000_000, spending: 13_500_000 }), { mood: "wilting", amount: 1_500_000 })
  // A fifth that isn't a whole rupiah rounds up, so the amount is always enough.
  assert.deepEqual(petNextStep({ income: 10_000_003, spending: 10_000_003 }), { mood: "happy", amount: 1 })
  // A fifth of 10.000.003 is 2.000.000,6, so thriving needs 2.000.001 kept: 999.998 more than the 1.000.003 kept.
  assert.deepEqual(petNextStep({ income: 10_000_003, spending: 9_000_000 }), { mood: "thriving", amount: 999_998 })
  // Nothing above thriving, and nothing to say before any income.
  assert.equal(petNextStep({ income: 10_000_000, spending: 0 }), null)
  assert.equal(petNextStep({ income: 0, spending: 500_000 }), null)
})

test("the status carries the month's income and spending", () => {
  const status = petStatus([income(10_000_000), expense(9_000_000)], "2026-10")
  assert.equal(status.income, 10_000_000)
  assert.equal(status.spending, 9_000_000)
})

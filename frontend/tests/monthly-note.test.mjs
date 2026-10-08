import assert from "node:assert/strict"
import { test } from "node:test"
import { monthlyNote } from "../lib/monthly-note.ts"

const cat = (id, name, extra = {}) => ({ id, name, type: "expense", icon: "tag", color: "moss", preset: false, ...extra })
const categories = [
  cat("food", "Food"),
  cat("transport", "Transport"),
  cat("fun", "Fun"),
  { ...cat("salary", "Salary"), type: "income" },
]
let n = 0
const tx = (date, type, amount, categoryId) => ({ id: `t${n++}`, date: `${date}T12:00:00+07:00`, type, amount, walletId: "w", categoryId, description: "" })
const budgeted = categories.map((c) => (c.id === "fun" ? { ...c, budget: 100_000 } : c))
const note = (transactions, over = {}) =>
  monthlyNote({ transactions, categories, goals: [], month: "2026-09", today: "2026-10-05", ...over })
const nbsp = (text) => text.replaceAll("Rp ", "Rp ")

test("a month with no money in it has no note", () => {
  assert.deepEqual(note([]), [])
  assert.deepEqual(note([{ id: "x", date: "2026-09-02T10:00:00+07:00", type: "transfer", amount: 5, fromWalletId: "a", toWalletId: "b", description: "" }]), [])
})

test("slide one says what came in, what went out, what was left and how it compares with the month before", () => {
  const slides = note([
    tx("2026-08-10", "expense", 1_000_000, "food"),
    tx("2026-09-01", "income", 5_000_000, "salary"),
    tx("2026-09-10", "expense", 1_500_000, "food"),
  ])
  assert.equal(slides[0].id, "month")
  assert.equal(slides[0].title, "September")
  assert.deepEqual(slides[0].lines, [
    nbsp("You earned Rp 5.000.000 and spent Rp 1.500.000."),
    nbsp("That left Rp 3.500.000, 70% of what came in."),
    nbsp("Spending was Rp 500.000 more than in August."),
  ])
})

test("spending more than was earned is described, not scolded", () => {
  const [first] = note([tx("2026-09-01", "income", 1_000_000, "salary"), tx("2026-09-02", "expense", 1_400_000, "food")])
  assert.equal(first.lines[1], nbsp("You spent Rp 400.000 more than you earned."))
})

test("a month still going is 'so far' and is compared with the same days of the month before", () => {
  const slides = note(
    [
      tx("2026-08-03", "expense", 100_000, "food"),
      tx("2026-08-25", "expense", 9_000_000, "food"), // after the 6th: must not count
      tx("2026-09-04", "expense", 300_000, "food"),
    ],
    { month: "2026-09", today: "2026-09-06" }
  )
  assert.equal(slides[0].title, "September so far")
  assert.equal(slides[0].lines.at(-1), nbsp("Spending is Rp 200.000 more than at this point in August."))
})

test("slide two names the biggest share, the biggest mover and the days spent", () => {
  const slides = note([
    tx("2026-08-05", "expense", 200_000, "food"),
    tx("2026-08-06", "expense", 400_000, "transport"),
    tx("2026-09-01", "expense", 300_000, "food"),
    tx("2026-09-02", "expense", 100_000, "food"),
    tx("2026-09-02", "expense", 100_000, "food"),
    tx("2026-09-03", "expense", 100_000, "food"),
    tx("2026-09-04", "expense", 100_000, "food"),
    tx("2026-09-08", "expense", 400_000, "transport"),
  ])
  const notice = slides.find((slide) => slide.id === "notice")
  assert.deepEqual(notice.lines, [
    "Food was the biggest share of spending, 64%.",
    "Food was 250% higher than in August.",
    "You spent money on 5 of 30 days.",
  ])
})

test("the busiest weekday is named only when there are enough payments and one day clearly leads", () => {
  // 1 to 6 Sep 2026 are Tuesday to Sunday; the 8th is a Tuesday again.
  const six = [1, 2, 3, 4, 5, 6].map((day) => tx(`2026-09-0${day}`, "expense", 100_000 + day, "food"))
  const spent = (list) => note(list).flatMap((slide) => slide.lines)
  const busiest = (list) => spent(list).find((line) => /most spending/.test(line))
  assert.equal(busiest([...six, tx("2026-09-08", "expense", 900_000, "food")]), "Tuesday was the day with the most spending.")
  assert.equal(busiest(six.slice(0, 5)), undefined, "five payments is too few")
  assert.equal(busiest([...six.slice(0, 5), tx("2026-09-06", "expense", 100_001, "food")].map((t) => ({ ...t, amount: 100_000 }))), undefined, "a tie names no day")
})

test("a category that moved only a little, or by a few rupiah, is not called out", () => {
  const slides = note([tx("2026-08-05", "expense", 100_000, "food"), tx("2026-09-05", "expense", 110_000, "food")])
  const notice = slides.find((slide) => slide.id === "notice")
  assert.ok(!notice.lines.some((line) => /higher|lower/.test(line)))
})

test("slide three counts the budgets and says which went over", () => {
  const slides = note([tx("2026-09-02", "expense", 160_000, "fun"), tx("2026-09-03", "expense", 50_000, "food")], { monthlyBudget: 1_000_000, categories: budgeted })
  const progress = slides.find((slide) => slide.id === "progress")
  assert.deepEqual(progress.lines, ["1 of 2 budgets stayed within their limits.", nbsp("Fun went over by Rp 60.000.")])
})

test("slide three mentions the goals reached that month, and nothing about wallets or balances", () => {
  const goals = [
    { id: "g1", name: "Japan in spring", reachedAt: "2026-09-20T09:00:00+07:00" },
    { id: "g2", name: "Laptop", reachedAt: "2026-08-02T09:00:00+07:00" },
  ]
  const slides = note([tx("2026-09-02", "expense", 10_000, "food")], { goals })
  const progress = slides.find((slide) => slide.id === "progress")
  assert.deepEqual(progress.lines, ["Japan in spring reached its target."])
  for (const slide of slides) for (const line of slide.lines) assert.ok(!/balance|wallet/i.test(line), line)
})

test("a slide with nothing true to say is left out", () => {
  const slides = note([tx("2026-09-01", "income", 1_000_000, "salary")])
  assert.deepEqual(slides.map((slide) => slide.id), ["month"])
})

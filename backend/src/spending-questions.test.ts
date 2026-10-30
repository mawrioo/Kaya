import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { answerSpendingQuestion } from "./spending-questions.ts"
import { sampleWallets, sampleCategories } from "./sample-data.ts"
import type { AppData, Transaction } from "./types.ts"

const now = new Date("2026-10-28T05:00:00Z")
const expense = (id: string, amount: number, date: string, extra = {}): Transaction => ({ id, type: "expense", amount, date: `${date}T12:00:00+07:00`, walletId: "bca", categoryId: "food", description: `Lunch ${id}`, ...extra })
const data: Pick<AppData, "wallets" | "categories" | "transactions"> = {
  wallets: [{ ...sampleWallets[0], defaultColor: sampleWallets[0].color, id: "bca", name: "BCA" }, { ...sampleWallets[1], defaultColor: sampleWallets[1].color, id: "jago", name: "Bank Jago", nickname: "Jago" }],
  categories: [{ ...sampleCategories[0], id: "food", name: "Food", type: "expense" }, { ...sampleCategories[1], id: "bills", name: "Bills", type: "expense" }, { ...sampleCategories[0], id: "salary", name: "Salary", type: "income" }, { ...sampleCategories[0], id: "other-expense", name: "Other", type: "expense" }, { ...sampleCategories[0], id: "other-income", name: "Other", type: "income" }],
  transactions: [expense("sep-food", 35000, "2026-09-12"), expense("oct-food", 40000, "2026-10-23"), expense("oct-jago", 20000, "2026-10-26", { walletId: "jago" }), expense("oct-bills", 100000, "2026-10-27", { categoryId: "bills" }), { id: "salary", type: "income", amount: 5000000, walletId: "bca", categoryId: "salary", description: "Salary", date: "2026-10-25T12:00:00+07:00" }, { id: "transfer", type: "transfer", amount: 500000, fromWalletId: "bca", toWalletId: "jago", description: "Savings", date: "2026-10-25T12:00:00+07:00" }],
}
describe("recorded spending questions", () => {
  for (const [text, total, count] of [
    ["How much did I spend this month?", 160000, 3], ["Berapa pengeluaran bulan ini?", 160000, 3], ["How much did I spend on Food last month?", 35000, 1],
    ["total spending from BCA this month", 140000, 2], ["total pengeluaran dari Jago bulan ini", 20000, 1], ["total income this month", 5000000, 1], ["How much did I receive this month?", 5000000, 1], ["Berapa uang masuk bulan ini?", 5000000, 1], ["How much did I spend on Food in September 2026?", 35000, 1],
    ["total spending from 2026-10-23 to 2026-10-26", 60000, 2], ["berapa pengeluaran dari 2026-10-23 sampai 2026-10-26", 60000, 2],
    ["total spending last week", 40000, 1], ["total spending this week", 120000, 2], ["total spending in 2026", 195000, 4],
    ["total spending September 2026", 35000, 1], ["total spending 2026-09", 35000, 1], ["total spending last Friday", 40000, 1],
    ["total spending last year", 0, 0], ["total spending in 2026-10-28", 0, 0], ["total spending category Other this month", 0, 0],
  ] as const) it(`${text}: ${total}`, () => {
    const result = answerSpendingQuestion(text, data, now)
    assert.equal(result.status, "answer", result.message)
    assert.equal(result.parts[0].amount, total)
    assert.equal(result.parts[0].count, count)
    const link = new URL(result.parts[0].href, "http://localhost")
    assert.equal(link.pathname, "/transactions")
    assert.ok(link.searchParams.get("from"))
    assert.ok(link.searchParams.get("to"))
  })
  for (const text of ["What should I invest in?", "why did I spend more this month", "delete last month", "what is my balance", "total spending", "total spending from Unknown Bank this month", "total spending on UnknownCategory last month", "total spending on Food and Bills last month", "total income category Food this month", "total spending from 2026-02-30 to 2026-03-05", "total spending from 2026-10-28 to 2026-10-01", "total spending this month last year", "How much did I spend last month and today?", "total spending last month on 2026-09-01", "compare spending this month with last week", "compare spending September 2026 and July 2026", "Total groceries last month", "pengeluaran bensin bulan lalu", "How much did I spend excluding Food last month?", "total spending without BCA this month", "total spending over 50000 last month", "total spending in 2026-02-30", "compare spending this month with banana"]) {
    it(`clarifies ${text}`, () => assert.equal(answerSpendingQuestion(text, data, now).status, "clarify"))
  }
  it("comparison preserves period order and links each independently", () => {
    const answer = answerSpendingQuestion("compare spending this month with last month", data, now)
    assert.equal(answer.status, "answer", answer.message)
    assert.deepEqual(answer.parts.map(p => p.amount), [160000, 35000])
    assert.equal(new URL(answer.parts[0].href, "http://localhost").searchParams.get("from"), "2026-10-01")
    assert.equal(new URL(answer.parts[1].href, "http://localhost").searchParams.get("from"), "2026-09-01")
    const named = answerSpendingQuestion("compare spending September 2026 with October 2026", data, now)
    assert.equal(named.status, "answer", named.message)
    assert.deepEqual(named.parts.map(p => p.amount), [35000, 160000])
  })
  it("largest expenses use exact selected-record links and never include a transfer or income", () => {
    const answer = answerSpendingQuestion("show top 2 largest expenses this month", data, now)
    assert.equal(answer.status, "answer")
    assert.deepEqual(answer.parts.map(p => p.amount), [100000, 40000])
    assert.deepEqual(answer.parts.map(p => new URL(p.href, "http://localhost").searchParams.get("ids")), ["oct-bills", "oct-food"])
  })
  it("honours a requested number before largest rather than silently using five", () => {
    const many = { ...data, transactions: Array.from({ length: 8 }, (_, index) => expense(`many-${index}`, (index + 1) * 1000, "2026-10-15")) }
    const answer = answerSpendingQuestion("Show my 10 largest expenses this month", many, now)
    assert.equal(answer.status, "answer", answer.message)
    assert.equal(answer.parts.length, 8)
    assert.deepEqual(answer.parts.map(part => part.amount), [8000, 7000, 6000, 5000, 4000, 3000, 2000, 1000])
  })
  for (const text of ["Show my 10 highest expenses this month", "Show my highest 10 expenses this month", "Show my 10 biggest expenses this month", "Show my 10 terbesar expenses this month"]) {
    it(`honours the count with every supported largest-expense synonym: ${text}`, () => {
      const many = { ...data, transactions: Array.from({ length: 12 }, (_, index) => expense(`ranked-${index}`, (index + 1) * 1000, "2026-10-15")) }
      const answer = answerSpendingQuestion(text, many, now)
      assert.equal(answer.status, "answer", answer.message)
      assert.equal(answer.parts.length, 10)
      assert.deepEqual(answer.parts.map(part => part.amount), [12000, 11000, 10000, 9000, 8000, 7000, 6000, 5000, 4000, 3000])
      assert.ok(answer.parts.every(part => part.count === 1 && new URL(part.href, "http://localhost").searchParams.get("ids")))
    })
  }
  for (const text of ["Show 2 largest 3 expenses this month", "Show top 3 largest 3 expenses this month", "Show my 1,5 highest expenses this month"]) {
    it(`clarifies competing largest-expense counts: ${text}`, () => {
      const answer = answerSpendingQuestion(text, data, now)
      assert.equal(answer.status, "clarify")
      assert.equal(answer.parts.length, 0)
    })
  }
  for (const text of ["Show my -2 highest expenses this month", "Show my highest -2 expenses this month", "Show my \u22122 highest expenses this month", "Show my +2 highest expenses this month"]) {
    it(`clarifies signed largest-expense counts: ${text}`, () => assert.equal(answerSpendingQuestion(text, data, now).status, "clarify"))
  }
  for (const wallet of [{ name: "Food account" }, { name: "BCA", nickname: "Food card" }]) {
    it(`does not infer a category from wallet label ${wallet.nickname ?? wallet.name}`, () => {
      const local = { ...data, wallets: [{ ...data.wallets[0], ...wallet }], transactions: [expense("food", 5000, "2026-10-10"), expense("bills", 10000, "2026-10-11", { categoryId: "bills" })] }
      const label = wallet.nickname ?? wallet.name
      const total = answerSpendingQuestion(`Total spending from ${label} this month`, local, now)
      assert.equal(total.status, "answer", total.message)
      assert.equal(total.parts[0].amount, 15000)
      assert.equal(new URL(total.parts[0].href, "http://localhost").searchParams.get("category"), null)
      const explicit = answerSpendingQuestion(`Total spending on Food from ${label} this month`, local, now)
      assert.equal(explicit.status, "answer", explicit.message)
      assert.equal(explicit.parts[0].amount, 5000)
      assert.equal(new URL(explicit.parts[0].href, "http://localhost").searchParams.get("category"), "food")
    })
  }
  it("keeps an explicit Food category distinct from an identical wallet nickname", () => {
    const local = { ...data, wallets: [{ ...data.wallets[0], nickname: "Food" }], transactions: [expense("food", 5000, "2026-10-10"), expense("bills", 10000, "2026-10-11", { categoryId: "bills" })] }
    const answer = answerSpendingQuestion("Total spending on Food this month", local, now)
    assert.equal(answer.status, "answer", answer.message)
    assert.equal(answer.parts[0].amount, 5000)
    assert.equal(new URL(answer.parts[0].href, "http://localhost").searchParams.get("wallet"), null)
  })
  it("asks when a bare name could mean both a wallet and a category", () => {
    const local = { ...data, wallets: [{ ...data.wallets[0], nickname: "Food" }] }
    assert.equal(answerSpendingQuestion("Total spending Food this month", local, now).status, "clarify")
    const explicit = answerSpendingQuestion("Total spending from Food this month", local, now)
    assert.equal(explicit.status, "answer", explicit.message)
    assert.equal(new URL(explicit.parts[0].href, "http://localhost").searchParams.get("category"), null)
  })
  it("does not use a wallet's month-name word as an extra period", () => {
    const local = { ...data, wallets: [{ ...data.wallets[0], name: "September account" }] }
    const answer = answerSpendingQuestion("Total spending from September account this month", local, now)
    assert.equal(answer.status, "answer", answer.message)
    assert.equal(answer.parts[0].amount, 140000)
    assert.equal(new URL(answer.parts[0].href, "http://localhost").searchParams.get("from"), "2026-10-01")
  })
  it("does not mutate records or depend on a model", () => {
    const before = structuredClone(data)
    answerSpendingQuestion("total spending this month", data, now)
    assert.deepEqual(data, before)
  })
})

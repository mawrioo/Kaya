import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { detectSubscriptions } from "./subscription-detection.ts"
import { sampleWallets } from "./sample-data.ts"
import type { AppData, Transaction, SubscriptionPreference } from "./types.ts"
const now = new Date("2026-10-28T05:00:00Z")
const rows = (dates: string[], amounts = [50000, 50000, 50000], description = "Spotify"): Transaction[] => dates.map((date, i) => ({ id: `tx-${i}`, type: "expense", amount: amounts[i] ?? amounts[0], date: `${date}T12:00:00+07:00`, walletId: "bca", categoryId: "entertainment", description }))
const data = (transactions: Transaction[]): Pick<AppData, "wallets" | "transactions"> => ({ wallets: [{ ...sampleWallets[0], defaultColor: sampleWallets[0].color, id: "bca", name: "BCA" }], transactions })
describe("explainable recurring-payment candidates", () => {
  it("requires three separate expense occurrences", () => {
    assert.equal(detectSubscriptions(data(rows(["2026-08-20", "2026-09-20"])), [], now).length, 0)
    const result = detectSubscriptions(data(rows(["2026-08-20", "2026-09-20", "2026-10-20"])), [], now)
    assert.equal(result.length, 1)
    assert.equal(result[0].cadence, "monthly")
    assert.equal(result[0].nextDate, "2026-11-20")
    assert.deepEqual(result[0].transactionIds, ["tx-0", "tx-1", "tx-2"])
    assert.equal(result[0].status, "candidate")
  })
  it("handles weekly patterns and variable amounts", () => {
    const result = detectSubscriptions(data(rows(["2026-10-07", "2026-10-14", "2026-10-21"], [45000, 55000, 50000], "Internet top up")), [], now)[0]
    assert.equal(result.cadence, "weekly")
    assert.equal(result.variable, true)
    assert.equal(result.amount, 50000)
    assert.equal(result.nextDate, "2026-10-28")
  })
  it("clamps a month-end schedule without permanently shifting it to February's day", () => {
    const result = detectSubscriptions(data(rows(["2026-12-31", "2027-01-31", "2027-02-28"])), [], new Date("2027-03-01T05:00:00Z"))[0]
    assert.equal(result.nextDate, "2027-03-31")
    const thirtieth = detectSubscriptions(data(rows(["2026-12-30", "2027-01-30", "2027-02-28"])), [], new Date("2027-03-01T05:00:00Z"))[0]
    assert.equal(thirtieth.nextDate, "2027-03-30")
  })
  it("detects annual patterns across leap years", () => {
    const result = detectSubscriptions(data(rows(["2024-02-29", "2025-02-28", "2026-02-28"])), [], now)[0]
    assert.equal(result.cadence, "annual")
    assert.equal(result.nextDate, "2027-02-28")
  })
  it("does not treat irregular shopping or duplicate-day charges as a clear subscription", () => {
    assert.equal(detectSubscriptions(data(rows(["2026-08-01", "2026-09-16", "2026-10-03"], [50000], "Shopping")), [], now).length, 0)
    assert.equal(detectSubscriptions(data(rows(["2026-10-01", "2026-10-01", "2026-10-08"])), [], now).length, 0)
  })
  it("excludes transfers, income, future records and generic notes", () => {
    const recurring = rows(["2026-08-20", "2026-09-20", "2026-10-20"])
    assert.equal(detectSubscriptions(data(recurring.map(t => ({ ...t, type: "income" } as Transaction))), [], now).length, 0)
    assert.equal(detectSubscriptions(data(rows(["2026-11-20", "2026-12-20", "2027-01-20"])), [], now).length, 0)
    assert.equal(detectSubscriptions(data(rows(["2026-08-20", "2026-09-20", "2026-10-20"], [50000], "Other")), [], now).length, 0)
  })
  it("keeps key stable and honours explicit tracked/dismissed choices", () => {
    const input = data(rows(["2026-08-20", "2026-09-20", "2026-10-20"]))
    const first = detectSubscriptions(input, [], now)[0]
    const prefs: SubscriptionPreference[] = [{ key: first.key, name: "Music plan", status: "dismissed" }]
    const updated = detectSubscriptions({ ...input, transactions: [...input.transactions].reverse() }, prefs, now)[0]
    assert.equal(updated.key, first.key)
    assert.equal(updated.status, "dismissed")
    assert.equal(updated.name, "Music plan")
    assert.notEqual(detectSubscriptions(data(rows(["2026-08-20", "2026-09-20", "2026-10-20"], [50000], "Spotify premium")), [], now)[0].key, first.key)
  })
  it("does not mutate records or preferences", () => {
    const input = data(rows(["2026-08-20", "2026-09-20", "2026-10-20"]))
    const before = structuredClone(input)
    detectSubscriptions(input, [], now)
    assert.deepEqual(input, before)
  })
})

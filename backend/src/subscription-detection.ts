import { createHash } from "node:crypto"
import type { AppData, SubscriptionCandidate, SubscriptionPreference, Transaction } from "./types.ts"
import { jakartaDate } from "./transaction-dates.ts"

const normal = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
const monthNumber = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1
function advance(day: string, cadence: SubscriptionCandidate["cadence"], anchorDay: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  if (cadence === "weekly") date.setUTCDate(date.getUTCDate() + 7)
  else {
    const targetMonth = date.getUTCMonth() + (cadence === "annual" ? 12 : 1)
    const end = new Date(Date.UTC(date.getUTCFullYear(), targetMonth + 1, 0))
    end.setUTCDate(Math.min(anchorDay, end.getUTCDate()))
    return end.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}
function detectCadence(days: string[]): SubscriptionCandidate["cadence"] | undefined {
  const gaps = days.slice(1).map((day, index) => daysBetween(days[index], day))
  if (gaps.every(gap => gap >= 5 && gap <= 9)) return "weekly"
  const monthGaps = days.slice(1).map((day, index) => monthNumber(day) - monthNumber(days[index]))
  // Require similar calendar positions, while allowing the end of shorter months.
  const aligned = days.slice(1).every((day, index) => {
    const before = days[index]
    const a = Number(before.slice(8)), b = Number(day.slice(8))
    const endA = new Date(Date.UTC(Number(before.slice(0, 4)), Number(before.slice(5, 7)), 0)).getUTCDate()
    const endB = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate()
    return Math.abs(a - b) <= 4 || (endA - a <= 2 && endB - b <= 2)
  })
  if (aligned && monthGaps.every(gap => gap === 1) && gaps.every(gap => gap >= 24 && gap <= 36)) return "monthly"
  if (aligned && monthGaps.every(gap => gap === 12) && gaps.every(gap => gap >= 359 && gap <= 371)) return "annual"
}

/** Recurring evidence, not a claim that a contract or unpaid charge exists. */
export function detectSubscriptions(data: Pick<AppData, "transactions" | "wallets">, preferences: SubscriptionPreference[] = [], now = new Date()): SubscriptionCandidate[] {
  const today = jakartaDate(now)
  const wallets = new Set(data.wallets.filter(w => w.kind !== "deposito" && w.kind !== "investment").map(w => w.id))
  const groups = new Map<string, Extract<Transaction, { type: "expense" }>[]>()
  for (const tx of data.transactions) {
    if (tx.type !== "expense" || !wallets.has(tx.walletId) || tx.date.slice(0, 10) > today || Number.isNaN(Date.parse(tx.date))) continue
    const note = normal(tx.description)
    if (note.length < 3 || /^(other|lainnya|expense|pengeluaran)$/.test(note)) continue
    const key = JSON.stringify([tx.walletId, note])
    const found = groups.get(key) ?? []
    found.push(tx)
    groups.set(key, found)
  }
  const candidates: SubscriptionCandidate[] = []
  for (const [group, rows] of groups) {
    // Multiple charges on one day make the sequence ambiguous; never count them as separate occurrences.
    const byDay = new Map<string, typeof rows>()
    for (const row of rows) { const date = row.date.slice(0, 10); const set = byDay.get(date) ?? []; set.push(row); byDay.set(date, set) }
    if (byDay.size < 3 || [...byDay.values()].some(day => day.length !== 1)) continue
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    // A bounded recent window allows an old isolated payment not to hide a newer clear pattern.
    const recent = sorted.slice(-12)
    let evidence = recent
    let cadence = detectCadence(evidence.map(t => t.date.slice(0, 10)))
    if (!cadence && recent.length > 3) {
      evidence = recent.slice(-3)
      cadence = detectCadence(evidence.map(t => t.date.slice(0, 10)))
    }
    if (!cadence) continue
    const latest = evidence[evidence.length - 1]
    const key = `recurring-${createHash("sha256").update(group).digest("hex").slice(0, 32)}`
    const preference = preferences.find(p => p.key === key)
    const nextDate = advance(latest.date.slice(0, 10), cadence, Math.max(...evidence.map(t => Number(t.date.slice(8, 10)))))
    // Stale undismissed history should not be presented as a newly expected subscription.
    if (!preference && daysBetween(nextDate, today) > (cadence === "weekly" ? 28 : cadence === "monthly" ? 90 : 400)) continue
    candidates.push({ key, name: preference?.name || latest.description.trim(), walletId: latest.walletId, categoryId: latest.categoryId, cadence, amount: latest.amount, variable: evidence.some(t => t.amount !== latest.amount), nextDate, transactionIds: evidence.map(t => t.id), status: preference?.status ?? "candidate" })
  }
  return candidates.sort((a, b) => a.nextDate.localeCompare(b.nextDate) || a.name.localeCompare(b.name))
}

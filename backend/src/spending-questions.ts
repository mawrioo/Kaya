import type { AppData, SpendingAnswer, Transaction } from "./types.ts"
import { jakartaDate, resolveTransactionDate, validCalendarDate } from "./transaction-dates.ts"

type MoneyType = "expense" | "income"
interface Range { from: string; to: string }
const normal = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim()
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const mentions = (text: string, label: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(label)}(?![\\p{L}\\p{N}])`, "iu").test(text)
const clarify = (message: string): SpendingAnswer => ({ status: "clarify", message, parts: [] })
const monthNames = ["january|januari", "february|februari", "march|maret", "april", "may|mei", "june|juni", "july|juli", "august|agustus", "september", "october|oktober", "november", "december|desember"]
function add(day: string, n: number) { return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10) }
function monthRange(year: number, month: number): Range {
  const start = new Date(Date.UTC(year, month, 1))
  return { from: start.toISOString().slice(0, 10), to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10) }
}
function period(text: string, now: Date): Range | undefined {
  const today = jakartaDate(now)
  const [year, month] = today.split("-").map(Number)
  const exact = /\b(?:from|dari) (\d{4}-\d{2}-\d{2}) (?:to|through|until|sampai|hingga) (\d{4}-\d{2}-\d{2})\b/.exec(text)
  if (exact) return validCalendarDate(exact[1]) && validCalendarDate(exact[2]) && exact[1] <= exact[2] ? { from: exact[1], to: exact[2] } : undefined
  const relative = /\b(this month|bulan ini|last month|bulan lalu|this week|minggu ini|last week|minggu lalu|this year|tahun ini|last year|tahun lalu)\b/.exec(text)?.[0]
  if (relative && /^(this month|bulan ini)$/.test(relative)) return monthRange(year, month - 1)
  if (relative && /^(last month|bulan lalu)$/.test(relative)) return monthRange(year, month - 2)
  if (relative && /^(this week|minggu ini|last week|minggu lalu)$/.test(relative)) {
    const monday = add(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) - (/^(last week|minggu lalu)$/.test(relative!) ? 7 : 0))
    return { from: monday, to: add(monday, 6) }
  }
  if (relative && /^(this year|tahun ini|last year|tahun lalu)$/.test(relative)) {
    const y = year - (/^(last year|tahun lalu)$/.test(relative!) ? 1 : 0)
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  }
  const ym = /\b(\d{4})-(0[1-9]|1[0-2])\b(?!-)/.exec(text)
  if (ym) return monthRange(Number(ym[1]), Number(ym[2]) - 1)
  const named = monthNames.flatMap((names, m) => { const match = new RegExp(`\\b(?:${names})(?: (\\d{4}))?\\b`).exec(text); return match ? [{ match, m }] : [] }).sort((a, b) => a.match.index - b.match.index)[0]
  if (named) return monthRange(named.match[1] ? Number(named.match[1]) : year, named.m)
  const y = /\b(?:in|during|tahun) (\d{4})\b/.exec(text)
  if (y) return { from: `${y[1]}-01-01`, to: `${y[1]}-12-31` }
  const datePhrase = /\b(\d{4}-\d{2}-\d{2}|today|hari ini|yesterday|kemarin|last (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:senin|selasa|rabu|kamis|jumat|sabtu) lalu|(?:\d+|one|two|three|satu|dua|tiga) (?:days? ago|hari lalu))\b/.exec(text)
  if (datePhrase) { const date = resolveTransactionDate(datePhrase[0], now).date; if (date) return { from: date, to: date } }
}
interface PeriodToken { start: number; end: number; text: string; range?: Range }
function periodTokens(text: string, now: Date): { tokens: PeriodToken[]; residue: string } {
  const patterns = [
    /\b(?:from|dari) \d{4}-\d{2}-\d{2} (?:to|through|until|sampai|hingga) \d{4}-\d{2}-\d{2}\b/g,
    /\b(?:this|last) (?:month|week|year)\b|\b(?:bulan|minggu|tahun) (?:ini|lalu)\b/g,
    /\b\d{4}-\d{2}-\d{2}\b/g,
    /\b\d{4}-(?:0[1-9]|1[0-2])\b(?!-\d{2})/g,
    new RegExp(`\\b(?:${monthNames.join("|")})(?: \\d{4})?\\b`, "g"),
    /\b(?:in|during|tahun) \d{4}\b/g,
    /\b(?:today|hari ini|yesterday|kemarin|last (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:senin|selasa|rabu|kamis|jumat|sabtu) lalu|(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh) (?:days? ago|hari lalu))\b/g,
  ]
  const tokens: PeriodToken[] = []
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) {
    const start = match.index, end = start + match[0].length
    if (tokens.some(t => start < t.end && end > t.start)) continue
    tokens.push({ start, end, text: match[0], range: period(match[0], now) })
  }
  tokens.sort((a, b) => a.start - b.start)
  let residue = text
  for (const token of [...tokens].reverse()) residue = residue.slice(0, token.start) + " ".repeat(token.end - token.start) + residue.slice(token.end)
  return { tokens, residue }
}
export function spendingEvidenceLink(range: Range, type: MoneyType, walletId?: string, categoryId?: string, ids?: string[]): string {
  const params = new URLSearchParams({ from: range.from, to: range.to, type })
  if (walletId) params.set("wallet", walletId)
  if (categoryId) params.set("category", categoryId)
  if (ids?.length) params.set("ids", ids.slice(0, 50).join(","))
  return `/transactions?${params}`
}

/** Allowlisted read-only interpretation; all arithmetic and evidence selection happen here. */
export function answerSpendingQuestion(input: unknown, data: Pick<AppData, "transactions" | "categories" | "wallets">, now = new Date()): SpendingAnswer {
  if (typeof input !== "string" || !input.trim() || input.length > 500) return clarify("Ask a spending or income question in 500 characters or fewer.")
  const text = normal(input)
  if (/\b(why|kenapa|forecast|predict|will|should|delete|hapus|save|simpan|transfer|balance|saldo|budget|anggaran)\b/.test(text)) return clarify("I can total recorded spending or income, compare months, or show the largest expenses. Try: How much did I spend last month?")
  const income = /\b(income|earn|earned|receive|received|got|money in|coming in|uang masuk|terima|pendapatan|pemasukan)\b/.test(text)
  const expense = /\b(spend|spent|spending|expenses?|pengeluaran|belanja)\b/.test(text)
  const largest = /\b(largest|biggest|highest|terbesar)\b/.test(text)
  const compare = /\b(compare|compared|comparison|versus|vs|bandingkan|dibanding)\b/.test(text)
  if (largest && compare) return clarify("Choose a month comparison or largest expenses, one question at a time.")
  if (income && expense) return clarify("Ask about spending or income separately so the linked records match the answer.")
  const type: MoneyType = income ? "income" : "expense"
  if (!income && !expense && !largest && !/\b(how much|berapa|total)\b/.test(text)) return clarify("Try: How much did I spend on Food last month? Or: Show my largest expenses this year.")
  if (largest && income) return clarify("Largest-record questions currently cover expenses. Ask for total income instead.")
  const walletMentions = (label: string) => [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escape(label)}(?![\\p{L}\\p{N}])`, "giu"))]
    .filter(match => !/\b(?:on|for|category|kategori|untuk)\s+$/iu.test(text.slice(0, match.index)))
  const wallets = data.wallets.filter(w => [w.name, w.nickname].some(label => label && walletMentions(label).length))
  const ambiguousLabel = wallets.some(wallet => [wallet.name, wallet.nickname].some(label => label && data.categories.some(category => normal(category.name) === normal(label)) && walletMentions(label).some(match => !/\b(?:from|dari|using|pakai|wallet|dompet|menggunakan)\s+$/iu.test(text.slice(0, match.index)))))
  if (ambiguousLabel) return clarify("That name can mean a wallet or category. Use from for a wallet, or on/category for a category.")
  // A word inside a wallet label is not a second category or a date restriction.
  // Keep separate category-introduced mentions, even when a nickname shares that label.
  let filterText = text
  const walletSpans = wallets.flatMap(w => [w.name, w.nickname].filter((label): label is string => !!label).flatMap(walletMentions))
  for (const match of walletSpans) filterText = filterText.slice(0, match.index) + " ".repeat(match[0].length) + filterText.slice(match.index + match[0].length)
  const allCategories = data.categories.filter(c => mentions(filterText, c.name))
  const categories = allCategories.filter(c => c.type === type)
  const categoryIds = new Set(categories.map(c => c.id))
  if (wallets.length > 1 || categoryIds.size > 1) return clarify("Choose one wallet and one category for this question.")
  if (!categories.length && allCategories.length) return clarify(`Choose a category for ${type === "expense" ? "spending" : "income"}, or ask about its matching transaction type.`)
  // Category labels can also contain a month name; only remaining words supply periods.
  for (const category of categories) filterText = filterText.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escape(category.name)}(?![\\p{L}\\p{N}])`, "giu"), match => " ".repeat(match.length))
  const parsed = periodTokens(filterText, now)
  if (parsed.tokens.some(token => !token.range) || /\b(?:last|next|today|yesterday|tomorrow|hari|kemarin|besok|ago|lalu|monday|tuesday|wednesday|thursday|friday|saturday|sunday|senin|selasa|rabu|kamis|jumat|sabtu|bulan|minggu|tahun)\b|\b\d{4}(?:-\d{2}(?:-\d{2})?)?\b|\b\d{1,2}[/-]\d{1,2}\b/.test(parsed.residue)) return clarify("Use one clear supported period, or compare two whole months with 'with'.")
  if (!parsed.tokens.length) return clarify("Which period? Use this month, last month, last week, September 2026, or from YYYY-MM-DD to YYYY-MM-DD.")
  if ((!compare && parsed.tokens.length !== 1) || parsed.tokens.length > 2) return clarify("Use one clear period, or ask to compare two months.")
  let queryWords = parsed.residue
  for (const w of wallets) for (const name of [w.name, w.nickname]) if (name) queryWords = queryWords.replace(new RegExp(escape(name), "ig"), " ")
  for (const c of categories) queryWords = queryWords.replace(new RegExp(escape(c.name), "ig"), " ")
  const allowed = new Set("how much did do i we my me have has total show please recorded records record spend spent spending expense expenses income earn earned receive received got money coming uang masuk terima largest biggest highest top compare compared comparison versus vs with to from through until in during on for category wallet and against previous month before berapa pengeluaran belanja lihat tampilkan saya pendapatan pemasukan kategori dompet dari pakai menggunakan sampai hingga selama pada untuk bandingkan dibanding dengan terbesar yang transaksi catatan sebelumnya".split(" "))
  const unknown = queryWords.match(/[\p{L}\p{N}]+/gu)?.filter(word => !allowed.has(word) && !(largest && /^\d{1,2}$/.test(word))) ?? []
  if (unknown.length) return clarify("I could not match every filter in that question. Use an existing category/wallet and a supported period; exclusions and amount conditions are not supported yet.")
  const range = parsed.tokens[0].range!
  const wallet = wallets[0]
  const category = categories[0]
  const matching = (r: Range) => data.transactions.filter((t): t is Extract<Transaction, { type: "expense" | "income" }> => t.type === type && t.date.slice(0, 10) >= r.from && t.date.slice(0, 10) <= r.to && (!wallet || t.walletId === wallet.id) && (!category || t.categoryId === category.id))
  const label = (r: Range) => `${r.from} to ${r.to}${category ? `  /  ${category.name}` : ""}${wallet ? `  /  ${wallet.name}` : ""}`
  const part = (r: Range) => { const rows = matching(r); return { label: label(r), amount: rows.reduce((sum, row) => sum + row.amount, 0), count: rows.length, href: spendingEvidenceLink(r, type, wallet?.id, category?.id) } }
  if (compare) {
    if (range.from.slice(8) !== "01" || range.to !== monthRange(Number(range.from.slice(0, 4)), Number(range.from.slice(5, 7)) - 1).to) return clarify("Comparisons currently cover whole months. Try: Compare spending this month with last month.")
    let previous = monthRange(Number(range.from.slice(0, 4)), Number(range.from.slice(5, 7)) - 2)
    const marker = /\b(?:with|versus|vs|against|dengan|dibanding)\b/.exec(text)
    if (parsed.tokens.length === 2) {
      if (!marker || marker.index <= parsed.tokens[0].end || marker.index >= parsed.tokens[1].start) return clarify("Name two whole months separated by with, versus or dengan.")
      previous = parsed.tokens[1].range!
    } else if (marker && (marker.index < parsed.tokens[0].start || !/^(?:the )?(?:previous month|month before|bulan sebelumnya)[?.!\s]*$/.test(text.slice(marker.index + marker[0].length).trim()))) return clarify("Name both months, or ask to compare one month with the previous month.")
    if (previous.from.slice(8) !== "01" || previous.to !== monthRange(Number(previous.from.slice(0, 4)), Number(previous.from.slice(5, 7)) - 1).to) return clarify("Comparisons currently cover two whole months, not a month against a week or day.")
    if (previous.from === range.from && previous.to === range.to) return clarify("Choose two different months to compare.")
    const a = part(range), b = part(previous)
    if (![a.amount, b.amount].every(Number.isSafeInteger)) return clarify("That total is too large to display safely. Narrow the period or choose a category.")
    return { status: "answer", message: `Recorded ${type === "expense" ? "spending" : "income"} for each period. Transfers and balance adjustments are excluded. Open either set of records to check the figures.`, parts: [a, b] }
  }
  if (largest) {
    // Periods and known wallet/category labels are already removed from queryWords.
    // A count can precede or follow any supported largest-expense synonym.
    if (/[-+\u2212]\s*\d/u.test(queryWords)) return clarify("Use an unsigned whole-number count between 1 and 10 for the largest expenses.")
    const requested = queryWords.match(/\b\d+\b/g) ?? []
    if (requested.length > 1) return clarify("Use one count for the largest expenses, between 1 and 10.")
    const limit = requested.length ? Number(requested[0]) : 5
    if (limit < 1 || limit > 10) return clarify("Ask for between 1 and 10 largest expenses.")
    const rows = matching(range).sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date)).slice(0, limit)
    return { status: "answer", message: rows.length ? `Largest recorded expenses, ${label(range)}. Each link shows that record.` : `No recorded expenses, ${label(range)}.`, parts: rows.length ? rows.map(t => ({ label: `${t.description || "Expense"}  /  ${t.date.slice(0, 10)}`, amount: t.amount, count: 1, href: spendingEvidenceLink(range, type, wallet?.id, category?.id, [t.id]) })) : [part(range)] }
  }
  const total = part(range)
  if (!Number.isSafeInteger(total.amount)) return clarify("That total is too large to display safely. Narrow the period or choose a category.")
  return { status: "answer", message: total.count ? `Recorded ${type === "expense" ? "spending" : "income"}. Transfers and balance adjustments are excluded.` : "No matching recorded entries in this period. This reflects what is recorded in Kaya.", parts: [total] }
}

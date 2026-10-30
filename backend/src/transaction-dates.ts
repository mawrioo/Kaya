/** Calendar arithmetic only. Money and the model never interpret relative dates. */
const weekdays = ["sunday|minggu", "monday|senin", "tuesday|selasa", "wednesday|rabu", "thursday|kamis", "friday|jumat", "saturday|sabtu"]
const weekday = weekdays.join("|")
const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10 }
const count = `(?:\\d{1,4}|${Object.keys(words).join("|")})`
const grammar = `\\d{4}-\\d{2}-\\d{2}|(?:last\\s+(?:${weekday}))|(?:(?:hari\\s+)?(?:${weekday})\\s+lalu)|(?:${count}\\s+days?\\s+ago)|(?:${count}\\s+hari\\s+lalu)|(?:(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\s+of\\s+last\\s+month)|(?:(?:tanggal|tgl)\\s+\\d{1,2}\\s+bulan\\s+lalu)|yesterday|kemarin|today|hari\\s+ini`
const unsupported = `\\d{1,4}[/-]\\d{1,2}(?:[/-]\\d{1,4})?|${weekday}|last|next|ago|tomorrow|besok|lalu|bulan|january|february|march|april|may|june|july|august|september|october|november|december|januari|februari|maret|mei|juni|juli|agustus|oktober|desember`
export const DATE_HELP = "Use today, yesterday, last Friday, two days ago, or YYYY-MM-DD."

export function jakartaDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}
export function validCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
interface DateResult { date?: string; message?: string; recognized: boolean }
export function resolveTransactionDate(value: string, now = new Date()): DateResult {
  const text = value.trim().toLowerCase().replace(/\s+/g, " ")
  const today = jakartaDate(now)
  const day = new Date(`${today}T00:00:00Z`)
  const result = () => ({ date: day.toISOString().slice(0, 10), recognized: true })
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return validCalendarDate(text) ? { date: text, recognized: true } : { recognized: true, message: "Choose a valid calendar date." }
  if (/^(today|hari ini)$/.test(text)) return result()
  if (/^(yesterday|kemarin)$/.test(text)) { day.setUTCDate(day.getUTCDate() - 1); return result() }
  if (text === "minggu lalu") return { recognized: true, message: "Do you mean last Sunday or a day last week? Use hari Minggu lalu or an exact date." }
  const last = new RegExp(`^(?:last (${weekday})|(?:hari )?(${weekday}) lalu)$`).exec(text)
  if (last) {
    const index = weekdays.findIndex(names => names.split("|").includes(last[1] ?? last[2]))
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() - index + 7) % 7 || 7))
    return result()
  }
  const ago = new RegExp(`^(${count}) (?:days? ago|hari lalu)$`).exec(text)
  if (ago) {
    const n = /^\d+$/.test(ago[1]) ? Number(ago[1]) : words[ago[1]]
    if (n < 1 || n > 365) return { recognized: true, message: "Use between 1 and 365 days ago, or an exact date." }
    day.setUTCDate(day.getUTCDate() - n)
    return result()
  }
  const month = /^(?:(?:the )?(\d{1,2})(st|nd|rd|th)? of last month|(?:tanggal|tgl) (\d{1,2}) bulan lalu)$/.exec(text)
  if (month) {
    const n = Number(month[1] ?? month[3])
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"
    day.setUTCDate(0)
    if (n < 1 || n > day.getUTCDate() || (month[2] && month[2] !== suffix)) return { recognized: true, message: "That day does not fit the previous month. Choose an exact calendar date." }
    day.setUTCDate(n)
    return result()
  }
  return { recognized: new RegExp(`\\b(?:${unsupported})\\b`, "i").test(text), message: `That date is unclear. ${DATE_HELP}` }
}

/** Remove date phrases before money extraction, including invalid/ambiguous dates. */
export function extractTransactionDate(text: string, now = new Date()) {
  const matches = [...text.matchAll(new RegExp(`\\b(?:${grammar})\\b`, "gi"))]
  let remaining = text
  for (const m of [...matches].reverse()) remaining = remaining.slice(0, m.index) + " " + remaining.slice(m.index + m[0].length)
  const unresolved = new RegExp(`\\b(?:${unsupported})\\b`, "gi")
  const ambiguous = [...remaining.matchAll(unresolved)]
  for (const m of [...ambiguous].reverse()) remaining = remaining.slice(0, m.index) + " " + remaining.slice(m.index + m[0].length)
  if (matches.length > 1 || (matches.length && ambiguous.length)) return { remaining, defaulted: false, message: "Use one clear date for this transaction." }
  if (ambiguous.length) return { remaining, defaulted: false, message: `That date is unclear. ${DATE_HELP}` }
  if (!matches.length) return { remaining, defaulted: true, date: jakartaDate(now) }
  const result = resolveTransactionDate(matches[0][0], now)
  return { remaining, defaulted: false, date: result.date, message: result.message }
}

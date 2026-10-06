/**
 * Calendar-date helpers for forms and filters. A "date input" is the plain
 * "2026-09-30" text used by <input type="date"> and by the filters, always in
 * the local time zone.
 */

const pad = (n: number) => String(n).padStart(2, "0")

/** The local calendar date of a Date: "2026-09-30". */
export function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The reverse: a local Date at midnight, or undefined when the text is empty or not a date. */
export function fromDateInput(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** "2026-09-30" plus or minus whole days, still as a calendar date. Returns the input unchanged if it isn't a date. */
export function addDays(dateInput: string, days: number): string {
  const date = fromDateInput(dateInput)
  if (!date) return dateInput
  return toDateInput(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
}

/** True for a month written "2026-09": four digits, a dash, and 01 to 12. */
export function isMonth(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

/** True for a year written "2026": four digits. */
export function isYear(value: string | undefined): value is string {
  return value !== undefined && /^\d{4}$/.test(value)
}

/** The first and last day of a year: "2026" gives "2026-01-01" and "2026-12-31". */
export function yearDates(year: string): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** The first and last day of a month: "2026-09" gives "2026-09-01" and "2026-09-30". */
export function monthDates(month: string): { from: string; to: string } {
  const [year, number] = month.split("-").map(Number)
  return { from: toDateInput(new Date(year, number - 1, 1)), to: toDateInput(new Date(year, number, 0)) }
}

export interface DatePreset {
  id: string
  label: string
  /** "2026-09-01" */
  from: string
  /** "2026-09-30" */
  to: string
}

/**
 * Ready-made ranges for the date filter, worked out from today's date.
 * "Last 3 months" is this month plus the two before it.
 */
export function datePresets(today: string): DatePreset[] {
  const date = fromDateInput(today) ?? new Date()
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstOf = (offset: number) => toDateInput(new Date(year, month + offset, 1))
  const lastOf = (offset: number) => toDateInput(new Date(year, month + offset + 1, 0))
  return [
    { id: "this-month", label: "This month", from: firstOf(0), to: lastOf(0) },
    { id: "last-month", label: "Last month", from: firstOf(-1), to: lastOf(-1) },
    { id: "last-3-months", label: "Last 3 months", from: firstOf(-2), to: lastOf(0) },
  ]
}

/**
 * Joins a calendar date with the current time of day into the ISO string a
 * transaction stores, keeping the local UTC offset: "2026-09-30T14:05:00+07:00".
 * Keeping the offset is what lets a transaction stay in the month it was made.
 */
export function toIsoDateTime(dateInput: string, time: Date): string {
  const offset = -time.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const abs = Math.abs(offset)
  return `${dateInput}T${pad(time.getHours())}:${pad(time.getMinutes())}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

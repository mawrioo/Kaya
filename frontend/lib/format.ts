/**
 * Display formatting for money and dates.
 *
 * Both functions are hand-rolled rather than built on Intl so the output is
 * identical on the server and in every browser (Intl's en-GB now prints
 * "Sept", and ICU versions differ), which keeps hydration mismatch-free.
 */
import type { Rupiah } from "@/lib/types"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/** U+00A0 keeps "Rp" from wrapping away from its number. */
const NBSP = "\u00A0"
/** U+2212, the typographic minus: same width as "+", aligns in columns. */
const MINUS = "\u2212"

/** 1250000 → "1.250.000". Just the digits with dot separators, no "Rp". */
export function formatThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export interface FormatRupiahOptions {
  /**
   * "auto" (default) marks only negatives, "always" also prefixes "+" on
   * positives (for income rows), "never" drops the sign entirely.
   */
  sign?: "auto" | "always" | "never"
}

/**
 * Formats whole rupiah with dot thousands separators and no decimals.
 *
 * formatRupiah(1250000)                      → "Rp 1.250.000"
 * formatRupiah(-45000)                       → "−Rp 45.000"
 * formatRupiah(12500000, { sign: "always" }) → "+Rp 12.500.000"
 */
export function formatRupiah(amount: Rupiah, { sign = "auto" }: FormatRupiahOptions = {}): string {
  const rounded = Math.round(amount)
  const digits = formatThousands(Math.abs(rounded))

  let prefix = ""
  if (sign !== "never" && rounded !== 0) {
    if (rounded < 0) prefix = MINUS
    else if (sign === "always") prefix = "+"
  }

  return `${prefix}Rp${NBSP}${digits}`
}

export interface FormatDateOptions {
  /** Prefix the full weekday: "Tuesday, 29 Sep 2026". */
  weekday?: boolean
}

/**
 * Formats a date as "29 Sep 2026" in the viewer's local time zone.
 *
 * Accepts a Date, a timestamp, an ISO date-time ("2026-09-28T19:40:00+07:00"),
 * or a calendar date ("2026-09-29"). Calendar dates are read as local dates,
 * not UTC midnight, so they never shift a day.
 */
export function formatDate(input: Date | string | number, { weekday = false }: FormatDateOptions = {}): string {
  const date = toDate(input)
  const formatted = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
  return weekday ? `${WEEKDAYS[date.getDay()]}, ${formatted}` : formatted
}

/**
 * "2026-10-04T15:30:12+07:00" → "4 Oct, 15:30": the day and the time as the backend wrote them, so the viewer's time
 * zone never shifts them.
 */
export function formatBackupTime(at: string): string {
  const [, month, day] = at.slice(0, 10).split("-").map(Number)
  return `${day} ${MONTHS[month - 1]}, ${at.slice(11, 16)}`
}

/** "2026-09" → "September 2026". */
export function formatMonth(month: string): string {
  const [year, number] = month.split("-")
  return `${FULL_MONTHS[Number(number) - 1]} ${year}`
}

/** "2026-09" → "September", without the year. */
export function formatMonthName(month: string): string {
  return FULL_MONTHS[Number(month.split("-")[1]) - 1]
}

/** "2026-09" → "Sep", the way a chart labels a month. */
export function formatMonthShort(month: string): string {
  return MONTHS[Number(month.split("-")[1]) - 1]
}

/** Whole percent. Anything above zero but under 1% reads "<1%" rather than "0%". */
export function formatPercent(value: number): string {
  if (value > 0 && value < 1) return "<1%"
  return `${Math.round(value)}%`
}

/**
 * A change as a share of what it changed from: "+3%", "−3%", "+908%". Empty when
 * there is no change, nothing to compare with, or the change is under 1% (a
 * "<1%" would only be noise). Big shares stand out, which is the point: it
 * makes a stray extra zero easy to spot.
 */
export function formatChangePercent(change: number, base: number): string {
  if (base <= 0 || change === 0) return ""
  const share = (Math.abs(change) / base) * 100
  if (share < 1) return ""
  return `${change > 0 ? "+" : MINUS}${formatPercent(share)}`
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input
  if (typeof input === "string") {
    const match = CALENDAR_DATE.exec(input)
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  return new Date(input)
}

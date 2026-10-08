/**
 * Plain helpers for a deposito (time deposit): reading the rate the owner types and writing it back, and the one line
 * a wallet card says about it. No React in here. The interest itself is worked out by the backend.
 */
import { formatDate } from "./format.ts"
import { monthsBetween, timeLeft } from "./goals.ts"
import type { Deposito } from "@/lib/types"

/** The same limits the backend enforces. */
export const MAX_RATE_PERCENT = 50
export const MAX_TENOR_MONTHS = 120

/** Said once, where the owner fills in a deposito. */
export const TAX_NOTE = "Interest is shown before tax. A final tax of 20% applies to deposit interest above Rp 7.500.000 a year."

/**
 * The yearly rate as typed: "5", "5,25", "5.5" or "5%". Up to two decimals, above 0 and at most 50. A comma or a dot both
 * work for the decimals (the app writes numbers the Indonesian way, but a keyboard may not). Anything else gives undefined.
 */
export function parseRate(text: string): number | undefined {
  const cleaned = text.trim().replace(/%$/, "").trim().replace(",", ".")
  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(cleaned)) return undefined
  const rate = Number(cleaned)
  return rate > 0 && rate <= MAX_RATE_PERCENT ? rate : undefined
}

/** A rate written for the screen: "5%" and "5,25%". */
export function formatRate(percent: number): string {
  return `${String(percent).replace(".", ",")}%`
}

/** A rate written for the box the owner edits it in: "5" and "5,25". */
export function rateToInput(percent: number): string {
  return String(percent).replace(".", ",")
}

/** The tenor as typed: whole months, 1 to 120. Anything else gives undefined. */
export function parseTenor(text: string): number | undefined {
  if (!/^[0-9]+$/.test(text.trim())) return undefined
  const months = Number(text.trim())
  return months >= 1 && months <= MAX_TENOR_MONTHS ? months : undefined
}

/** "12 months", "1 month". */
export function formatTenor(months: number): string {
  return `${months} ${months === 1 ? "month" : "months"}`
}

/**
 * The line under a deposito's name, by where it stands on `today` ("2026-10-08"):
 * running, "5% a year · ends 1 Oct 2027 · 11 months left"; renewing, "5% a year · renews on 1 Oct 2027";
 * matured, "5% a year · matured on 1 Oct 2027 · goes back to BCA" (the last part when it is known where the money came from);
 * settled, "Money moved out on 8 Oct 2026".
 */
export function depositoLine(deposito: Deposito, today: string, backTo?: string): string {
  if (deposito.status === "settled") {
    return `Money moved out on ${formatDate(deposito.settledAt ? deposito.settledAt.slice(0, 10) : deposito.endDate)}`
  }
  const rate = `${formatRate(deposito.ratePercent)} a year`
  if (deposito.status === "matured") {
    return `${rate} · matured on ${formatDate(deposito.endDate)}${backTo ? ` · goes back to ${backTo}` : ""}`
  }
  if (deposito.rollover) return `${rate} · renews on ${formatDate(deposito.endDate)}`
  return `${rate} · ends ${formatDate(deposito.endDate)} · ${timeLeft(monthsBetween(today, deposito.endDate))}`
}

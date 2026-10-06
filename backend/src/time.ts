/**
 * A moment in local time with its UTC offset, written the way transactions
 * store their dates: "2026-09-30T14:05:00+07:00". The offset is what keeps a
 * date from drifting into the wrong day or month.
 */
const pad = (n: number) => String(n).padStart(2, "0")

/** The local calendar day of a moment: "2026-09-30". */
export function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? "+" : "-"
  const abs = Math.abs(offset)
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${day}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

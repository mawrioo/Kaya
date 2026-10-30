"use client"

import { BrandMark } from "@/components/brand-mark"
import { useLiveDate } from "@/components/use-live-date"
import { formatDate } from "@/lib/format"
import { toDateInput } from "@/lib/dates"

/** The menu and dialogs return keyboard focus to this button. */
export const MENU_BUTTON_ID = "open-menu-button"

/** A wordmark and live date on the page surface, with no separate sticky strip. */
export function MobileTopbar({ nowIso }: { nowIso: string }) {
  const date = new Date(useLiveDate(nowIso))
  const label = formatDate(date, { weekday: true }).replace(/^[A-Za-z]+/, day => day.slice(0, 3))
  return (
    <header className="mobile-brand-header print-hidden md:hidden">
      <BrandMark appearance="phone" />
      <time dateTime={toDateInput(date)} className="text-[0.625rem] text-muted-foreground whitespace-nowrap">{label}</time>
    </header>
  )
}

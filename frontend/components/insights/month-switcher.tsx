"use client"

import { StepSwitcher } from "@/components/insights/step-switcher"
import { formatMonth } from "@/lib/format"
import { shiftMonth } from "@/lib/stats"

interface MonthSwitcherProps {
  /** The month being shown, "2026-09". */
  month: string
  /** The earliest and latest month that can be reached. */
  first: string
  last: string
  onChange: (month: string) => void
}

/** A month with an arrow on each side, to step back and forward. The arrows go off at either end. */
export function MonthSwitcher({ month, first, last, onChange }: MonthSwitcherProps) {
  const previous = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)

  return (
    <StepSwitcher
      groupLabel="Month"
      label={formatMonth(month)}
      previousLabel={`Previous month, ${formatMonth(previous)}`}
      nextLabel={`Next month, ${formatMonth(next)}`}
      canGoBack={month > first}
      canGoForward={month < last}
      backReachesStart={previous <= first}
      forwardReachesEnd={next >= last}
      onBack={() => onChange(previous)}
      onForward={() => onChange(next)}
    />
  )
}

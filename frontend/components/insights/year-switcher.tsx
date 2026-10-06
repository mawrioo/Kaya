"use client"

import { StepSwitcher } from "@/components/insights/step-switcher"

interface YearSwitcherProps {
  /** The year being shown, "2026". */
  year: string
  /** The earliest and latest year that can be reached. */
  first: string
  last: string
  onChange: (year: string) => void
}

/** A year with an arrow on each side, to step back and forward. The arrows go off at either end. */
export function YearSwitcher({ year, first, last, onChange }: YearSwitcherProps) {
  const previous = String(Number(year) - 1)
  const next = String(Number(year) + 1)

  return (
    <StepSwitcher
      groupLabel="Year"
      label={year}
      previousLabel={`Previous year, ${previous}`}
      nextLabel={`Next year, ${next}`}
      canGoBack={year > first}
      canGoForward={year < last}
      backReachesStart={previous <= first}
      forwardReachesEnd={next >= last}
      onBack={() => onChange(previous)}
      onForward={() => onChange(next)}
    />
  )
}

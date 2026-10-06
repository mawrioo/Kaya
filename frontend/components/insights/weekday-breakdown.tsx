import { Panel } from "@/components/panel"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

interface WeekdayBreakdownProps {
  /** Seven days, Monday first (0 is Monday): what was spent on each, or what a typical such day cost. */
  days: { day: number; amount: number }[]
  title: string
  /** What the figures are for, which starts the caption: "September 2026". */
  period: string
  /** A little more for the caption, between the period and the busiest day: "average over 3 months with transactions". */
  note?: string
  /** What to say when nothing was spent. */
  emptyText: string
}

/**
 * What was spent on each day of the week, Monday first, with a bar for each day: in one month (the Month view) or, as a typical
 * day, over a year's months (the Year view). The bars are measured against the busiest day, so the pattern shows; the amounts
 * are in text beside them.
 */
export function WeekdayBreakdown({ days, title, period, note, emptyText }: WeekdayBreakdownProps) {
  const busiest = days.reduce((best, day) => (day.amount > best.amount ? day : best), days[0])
  const total = days.reduce((sum, day) => sum + day.amount, 0)

  return (
    <Panel title={title} caption={total === 0 ? period : [period, note, `busiest day: ${DAY_NAMES[busiest.day]}`].filter(Boolean).join(" · ")}>
      {total === 0 ? (
        <p className="text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {days.map((day) => (
            <li key={day.day} data-slot="weekday-row">
              <div className="flex items-baseline justify-between gap-3">
                <span data-slot="weekday-name" className="font-medium">
                  {DAY_NAMES[day.day]}
                </span>
                <span
                  data-slot="weekday-amount"
                  className={cn("tabular-nums", day.amount === 0 ? "text-muted-foreground" : "font-medium text-negative")}
                >
                  {formatRupiah(-day.amount)}
                </span>
              </div>
              {/* A picture of the amount beside it in text, so it is hidden from screen readers. */}
              <div aria-hidden className="mt-1.5 h-2 rounded-full bg-track">
                <div
                  className="h-full rounded-full bg-cat-sand"
                  style={{ width: day.amount === 0 ? "0%" : `${Math.max((day.amount / busiest.amount) * 100, 1.5)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

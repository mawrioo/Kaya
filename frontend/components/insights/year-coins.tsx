import { Panel } from "@/components/panel"
import { formatMonthName, formatMonthShort } from "@/lib/format"
import type { KeptMonth } from "@/lib/recap"
import { cn } from "@/lib/utils"

/**
 * Twelve coins, one for each month of the year: an orange coin with a milled rim for a month that kept some money, and an
 * empty dashed ring for every other month (nothing in it, broke even, went over, or hasn't come yet). Nothing is counted
 * and nothing is scolded: it is a row of coins. Each month is also said in words for screen readers.
 */
export function YearCoins({ months }: { months: KeptMonth[] }) {
  return (
    <Panel title="Months that kept money" caption="A coin for each month that kept some money.">
      <div className="@container">
        <ol className="grid grid-cols-6 gap-x-2 gap-y-4 @xl:grid-cols-12" data-slot="year-coins">
          {months.map(({ month, kept }) => (
            <li key={month} data-month={month} data-kept={kept ? "yes" : "no"} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "size-9 rounded-full",
                  kept
                    ? "coin-rim bg-highlight text-highlight-foreground shadow-xs"
                    : "border-2 border-dashed border-muted-foreground/75"
                )}
              />
              <span aria-hidden className="text-sm text-muted-foreground">
                {formatMonthShort(month)}
              </span>
              <span className="sr-only">
                {formatMonthName(month)}: {kept ? "kept some money" : "no coin"}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  )
}

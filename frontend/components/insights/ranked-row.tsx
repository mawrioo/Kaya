import { formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"

interface RankedRowProps {
  /** The round badge at the left. */
  badge: React.ReactNode
  /** The name: a link (whose overlay makes the whole row clickable) or plain text. */
  name: React.ReactNode
  /** What it came to, and the colour of that (clay for spending, green for income). */
  amount: { text: string; className: string }
  /** 0 to 100: its share of the whole, written next to the amount and drawn as the bar. */
  share: number
  /** One quiet line under the name: how many transactions, and how it compares. */
  meta?: string
  /** The bar's colour, as a Tailwind class such as "bg-cat-sky". */
  barClass: string
}

/**
 * One line of a ranked list on Insights: a badge, a name, the amount and its share, a quiet line of detail, and a bar
 * that pictures the share (the share is also in text, so the bar is only a picture). The amount sits at the right of
 * the name when the row is wide enough for both, and under it when it isn't (a container query), so a name never
 * breaks in the middle of a word.
 */
export function RankedRow({ badge, name, amount, share, meta, barClass }: RankedRowProps) {
  return (
    <li data-slot="insight-row" className="group @container relative flex items-start gap-3 py-3 first:pt-0 last:pb-0 sm:gap-4">
      {badge}

      {/* The top padding puts the first line level with the middle of the badge. */}
      <div className="min-w-0 flex-1 pt-2">
        <div className="flex flex-col @md:flex-row @md:items-baseline @md:justify-between @md:gap-4">
          <p data-slot="insight-name" className="min-w-0 font-medium break-words">
            {name}
          </p>
          <p data-slot="insight-amount" className="flex shrink-0 items-baseline gap-3 whitespace-nowrap tabular-nums">
            <span className={cn("font-medium", amount.className)}>{amount.text}</span>
            <span data-slot="insight-share" className="w-10 text-right text-sm text-muted-foreground">
              {formatPercent(share)}
            </span>
          </p>
        </div>

        {meta ? (
          <p data-slot="insight-meta" className="mt-0.5 text-sm text-muted-foreground">
            {meta}
          </p>
        ) : null}

        <div aria-hidden className="mt-2.5 h-2 rounded-full bg-track">
          <div className={cn("h-full rounded-full", barClass)} style={{ width: `${Math.max(share, 1.5)}%` }} />
        </div>
      </div>
    </li>
  )
}

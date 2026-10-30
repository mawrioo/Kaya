import { MobileDetails } from "@/components/mobile-details"
import { formatRupiah } from "@/lib/format"
import type { Totals } from "@/lib/transaction-totals"
import { cn } from "@/lib/utils"

interface TotalsStripProps {
  /** "Showing 30 of 41 transactions": what the list below is showing. Read out politely when a filter changes it. */
  summary: string
  totals: Totals
  /** Short facts about the figures ("Totals cover all 41."), under the summary. */
  notes?: string[]
}

/**
 * One quiet strip between the filters and the list: how many transactions are showing, and what they add up to. Money in is
 * green with "+", money out is clay with "−", and the net, which is only their difference, is plain. It is a single band, not
 * three cards: the list is the page, and this is the sum at the bottom of its column.
 */
export function TotalsStrip({ summary, totals, notes = [] }: TotalsStripProps) {
  // The layout follows the room the strip has (a container query on this wrapper), not the window: a tablet with the menu
  // open leaves it about 490px, a laptop about 900.
  return (
    <div className="@container">
      <section
        aria-label="Totals"
        className="flex flex-col gap-0 md:gap-3 rounded-xl border bg-card px-3 py-2 md:px-5 md:py-4 shadow-sm @[50rem]:flex-row @[50rem]:items-center @[50rem]:justify-between @[50rem]:gap-8 md:px-6"
      >
        <div className="min-w-0 text-sm text-muted-foreground">
          <p aria-live="polite">{summary}</p>
        </div>

        {/* Narrow, the three sit one under another like a receipt; with room for them they are three columns with a hairline between. */}
        <MobileDetails label={`Net ${formatRupiah(totals.net, { sign: "always" })} · Totals`}>
          {notes.length > 0 ? <p className="mb-2 text-sm wrap-anywhere text-muted-foreground">{notes.join(" · ")}</p> : null}
          <dl className="grid grid-cols-1 gap-y-1.5 @[34rem]:grid-cols-3 @[34rem]:gap-y-0 @[34rem]:divide-x @[34rem]:divide-border">
            <Figure label="Money in" className="text-positive">
              {formatRupiah(totals.income, { sign: "always" })}
            </Figure>
            <Figure label="Money out" className="text-negative">
              {formatRupiah(-totals.spending)}
            </Figure>
            <Figure label="Net">{formatRupiah(totals.net, { sign: "always" })}</Figure>
          </dl>
        </MobileDetails>
      </section>
    </div>
  )
}

function Figure({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 @[34rem]:block @[34rem]:px-5 @[34rem]:first:pl-0 @[34rem]:last:pr-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("type-figure @[34rem]:mt-1", className)}>{children}</dd>
    </div>
  )
}

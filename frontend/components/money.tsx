import { RollingText } from "@/components/rolling-text"
import { formatRupiah, type FormatRupiahOptions } from "@/lib/format"
import type { Rupiah } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MoneyProps extends FormatRupiahOptions {
  amount: Rupiah
  /** Show a row of dots instead of the number. The dots are always the same length, so they say nothing about the amount. */
  hidden?: boolean
  /** Digits that change pop in as they change, for a balance that moves while you are looking at it. */
  roll?: boolean
  className?: string
}

const MASK = "•••••••"

/** The thousands dots, a little softer than the digits, so a long number reads in groups. */
function SoftDots({ text }: { text: string }) {
  return text
    .split(".")
    .flatMap((part, index) => (index === 0 ? [part] : [<span key={index} className="opacity-70">.</span>, part]))
}

/**
 * A display amount (roughly 20px and up) with a quieter "Rp", so long figures
 * read by their digits. For amounts inside body text or lists, use
 * formatRupiah() directly. The text content is exactly formatRupiah()'s output.
 */
export function Money({ amount, sign, hidden = false, roll = false, className }: MoneyProps) {
  const rp = (
    <span
      aria-hidden={hidden ? true : undefined}
      className="font-sans text-[length:max(0.5em,0.75rem)] font-medium tracking-wide opacity-[0.92]"
    >
      Rp{"\u00A0"}
    </span>
  )

  if (hidden) {
    return (
      <span className={cn("whitespace-nowrap", className)}>
        {rp}
        <span aria-hidden className="text-[0.72em] tracking-[0.2em] text-muted-foreground">
          {MASK}
        </span>
        <span className="sr-only">Amount hidden</span>
      </span>
    )
  }

  const [head, digits] = formatRupiah(amount, { sign }).split("\u00A0")
  const signMark = head.slice(0, -2)

  return (
    <span className={cn("whitespace-nowrap", className)}>
      {signMark}
      {rp}
      {roll ? <RollingText text={digits} /> : <SoftDots text={digits} />}
    </span>
  )
}

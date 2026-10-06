import Link from "next/link"

import { cn } from "@/lib/utils"

/** Round "K" badge plus the KAYA wordmark. Sits on the forest-green sidebar. */
export function BrandMark({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="KAYA, home"
      onClick={onNavigate}
      className={cn(
        "group/brand tap-area flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-4 focus-visible:ring-offset-sidebar",
        className
      )}
    >
      <span
        aria-hidden
        className="coin-rim grid size-9 shrink-0 place-items-center rounded-full bg-highlight pb-px font-serif text-lg font-semibold text-highlight-foreground group-hover/brand:animate-coin-flip group-focus-visible/brand:animate-coin-flip"
      >
        K
      </span>
      <span aria-hidden className="font-serif text-[1.0625rem] tracking-[0.08em] text-sidebar-primary">
        <span className="font-semibold">KAYA</span>
      </span>
    </Link>
  )
}

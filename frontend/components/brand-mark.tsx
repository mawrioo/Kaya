import Link from "next/link"

import { KayaMark } from "@/components/kaya-mark"
import { cn } from "@/lib/utils"

/**
 * The Kaya mark plus the Kaya wordmark, on the forest green of the sidebar and of the phone's top bar. That ground is
 * dark in both themes, so the mark always wears its on-dark colours: cream blades and the light clay diamond. It is
 * drawn under 48px, so it is the simple version (no seed holes).
 */
export function BrandMark({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      aria-label="Kaya, home"
      onClick={onNavigate}
      className={cn(
        "group/brand tap-area flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-4 focus-visible:ring-offset-sidebar",
        className
      )}
    >
      {/* 44px, so the blades fill about the space the 36px coin did. The negative margin keeps its box 36px, so nothing around it moves. */}
      <KayaMark
        simple
        aria-hidden
        focusable={false}
        className="pointer-events-none -m-1 size-11 shrink-0 text-sidebar-primary [--kaya-accent:var(--kaya-accent-on-dark)] group-hover/brand:animate-coin-flip group-focus-visible/brand:animate-coin-flip"
      />
      <span aria-hidden className="font-serif text-[1.25rem] tracking-[0.04em] text-sidebar-primary">
        <span className="font-semibold">Kaya</span>
      </span>
    </Link>
  )
}

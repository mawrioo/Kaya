import Link from "next/link"

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
      {/* The logo mark is switched off for now (owner's try-out, 7 Oct 2026): only the name shows. KayaMark is still in the code. */}
      <span aria-hidden className="font-serif text-[1.25rem] tracking-[0.04em] text-sidebar-primary">
        <span className="font-semibold">Kaya</span>
      </span>
    </Link>
  )
}

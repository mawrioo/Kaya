import Link from "next/link"

import { cn } from "@/lib/utils"

/** The phone header and sidebar share Kaya's serif lettering. */
export function BrandMark({ className, onNavigate, appearance = "sidebar" }: { className?: string; onNavigate?: () => void; appearance?: "sidebar" | "phone" }) {
  return (
    <Link
      href="/"
      aria-label="Kaya, home"
      onClick={onNavigate}
      className={cn(
        "group/brand tap-area flex w-fit items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-4 focus-visible:ring-offset-sidebar",
        appearance === "phone" && "phone-wordmark focus-visible:ring-ring focus-visible:ring-offset-background",
        className
      )}
    >
      {/* The logo mark is switched off for now (owner's try-out, 7 Oct 2026): only the name shows. KayaMark is still in the code. */}
      <span aria-hidden className={appearance === "phone" ? "phone-wordmark-text" : "font-serif text-[1.25rem] tracking-[0.04em] text-sidebar-primary"}>
        <span className="font-semibold">Kaya</span>
      </span>
    </Link>
  )
}

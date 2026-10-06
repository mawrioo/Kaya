import Link from "next/link"
import { ArrowRight } from "lucide-react"

/** The small "See all" link in a card header. The padding makes it easy to hit. */
export function SeeAllLink({ href, label = "See all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="tap-area group -mt-1.5 -mr-3 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-primary transition-[color,background-color,transform] duration-150 hover:bg-accent active:scale-95"
    >
      {label}
      <ArrowRight
        className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  )
}

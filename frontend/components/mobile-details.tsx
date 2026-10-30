"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** Supporting information folds on a phone and stays visible on larger screens. */
export function MobileDetails({
  label,
  children,
  className,
  contentClassName,
}: {
  label: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="relative z-10 flex min-h-11 w-full items-center justify-between gap-2 rounded-md text-left text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
      >
        {label}
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      <div id={id} className={cn(!open && "hidden md:block", contentClassName)}>
        {children}
      </div>
    </div>
  )
}

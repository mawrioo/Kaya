import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * The browser's own dropdown, drawn to match the app's: the same border, height and focus ring as the other boxes, and the same
 * small chevron. For long lists of choices (one per line of an import), where a phone's own picker is easier than a popover and
 * hundreds of popovers would be slow. Everything else uses the app's own dropdown.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <select
        {...props}
        className="h-9 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-input bg-card pr-8 pl-2.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card"
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

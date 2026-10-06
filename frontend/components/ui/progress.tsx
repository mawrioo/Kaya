"use client"

import * as React from "react"
import { cn } from "cn"
import { Progress as ProgressPrimitive } from "radix-ui"

// KAYA: thin orange fill on a sand track. Always pair a bar with its
// value in text; the fill alone is below 3:1 on the light track by design.
function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string
}) {
  const clamped = Math.min(100, Math.max(0, value ?? 0))

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={cn(
        "relative flex h-1.5 w-full items-center overflow-hidden rounded-full bg-track",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "size-full flex-1 rounded-full bg-highlight transition-transform duration-500 ease-out",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

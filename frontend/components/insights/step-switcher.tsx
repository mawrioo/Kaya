"use client"

import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

interface StepSwitcherProps {
  /** Names the pill for screen readers: "Month" or "Year". */
  groupLabel: string
  /** What is shown between the arrows: "September 2026". */
  label: string
  /** Where each arrow goes, for its spoken name: "Previous month, August 2026". */
  previousLabel: string
  nextLabel: string
  /** False at the end of the range, where the arrow is dimmed and can't be pressed. */
  canGoBack: boolean
  canGoForward: boolean
  /** True when one more step in that direction reaches the end of the range, so the arrow is about to go off. */
  backReachesStart: boolean
  forwardReachesEnd: boolean
  onBack: () => void
  onForward: () => void
}

/**
 * A pill (40px high, white, with a hairline) with an arrow on each side of what is shown. Used for the month and for the
 * year on Insights. An arrow that has just reached the end of the range goes off, and a button that goes off drops keyboard
 * focus, so the other arrow takes it. The label is announced politely when it changes.
 */
export function StepSwitcher({
  groupLabel,
  label,
  previousLabel,
  nextLabel,
  canGoBack,
  canGoForward,
  backReachesStart,
  forwardReachesEnd,
  onBack,
  onForward,
}: StepSwitcherProps) {
  const backButton = useRef<HTMLButtonElement>(null)
  const forwardButton = useRef<HTMLButtonElement>(null)

  return (
    <div role="group" aria-label={groupLabel} className="inline-flex h-10 items-center gap-1 rounded-full border bg-card px-1 shadow-xs">
      <Button
        ref={backButton}
        type="button"
        variant="ghost"
        size="icon"
        className="tap-area rounded-full text-muted-foreground"
        aria-label={previousLabel}
        disabled={!canGoBack}
        onClick={() => {
          onBack()
          // After the page has re-drawn: the other arrow may be dimmed right now and only come on with this step.
          if (backReachesStart) requestAnimationFrame(() => forwardButton.current?.focus())
        }}
      >
        <ChevronLeft className="size-[1.125rem]" aria-hidden />
      </Button>
      <p aria-live="polite" className="min-w-36 px-1 text-center text-sm font-medium whitespace-nowrap">
        {label}
      </p>
      <Button
        ref={forwardButton}
        type="button"
        variant="ghost"
        size="icon"
        className="tap-area rounded-full text-muted-foreground"
        aria-label={nextLabel}
        disabled={!canGoForward}
        onClick={() => {
          onForward()
          if (forwardReachesEnd) requestAnimationFrame(() => backButton.current?.focus())
        }}
      >
        <ChevronRight className="size-[1.125rem]" aria-hidden />
      </Button>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { formatMonth } from "@/lib/format"
import { monthlyNote } from "@/lib/monthly-note"
import { cn } from "@/lib/utils"

/**
 * The monthly note: up to three short slides about one month (the month, what is worth noticing, progress), in a calm voice
 * that describes and never advises. It slides sideways: swipe on a touch screen, or use the arrows or the dots. Nothing is
 * hidden from screen readers, who simply get all the slides one after another. Left out when the month has no money in it.
 * `today` is "2026-10-04", from the server, so the server and the browser agree on whether the month is still going.
 */
export function MonthlyNote(props: { month: string; today: string; className?: string }) {
  // Keyed by the month, so choosing another month starts again from the first slide.
  return <NoteCard key={props.month} {...props} />
}

function NoteCard({ month, today, className }: { month: string; today: string; className?: string }) {
  const { transactions, categories, goals, monthlyBudget } = useData()
  const slides = monthlyNote({ transactions, categories, goals, monthlyBudget, month, today })

  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const count = slides.length
  const hasSlides = count > 0

  // Keep the slide in view when the card changes width (a phone turned on its side, the sidebar opening). It only acts on a real
  // change of width, so it never interrupts a slide that is on its way.
  const indexRef = useRef(0)
  useEffect(() => {
    indexRef.current = index
  }, [index])
  useEffect(() => {
    const element = track.current
    if (!element) return
    let width = element.clientWidth
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      element.scrollLeft = indexRef.current * width
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasSlides])

  const goTo = useCallback((next: number) => {
    const element = track.current
    if (!element) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    element.scrollTo({ left: next * element.clientWidth, behavior: reduce ? "auto" : "smooth" })
  }, [])

  if (count === 0) return null
  const safeIndex = Math.min(index, count - 1)

  return (
    <section
      aria-labelledby="monthly-note-title"
      data-slot="monthly-note"
      className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-sm md:p-6", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="monthly-note-title" className="type-title">
            Monthly note
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{formatMonth(month)}</p>
        </div>
        {count > 1 ? (
          <div className="-mt-1 -mr-2 flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              aria-label="Previous slide"
              aria-disabled={safeIndex === 0}
              onClick={() => safeIndex > 0 && goTo(safeIndex - 1)}
              data-slot="note-previous"
            >
              <ChevronLeft className={cn(safeIndex === 0 && "opacity-40")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className="rounded-full"
              aria-label="Next slide"
              aria-disabled={safeIndex === count - 1}
              onClick={() => safeIndex < count - 1 && goTo(safeIndex + 1)}
              data-slot="note-next"
            >
              <ChevronRight className={cn(safeIndex === count - 1 && "opacity-40")} />
            </Button>
          </div>
        ) : null}
      </div>

      <div
        ref={track}
        tabIndex={0}
        role="group"
        aria-label="Monthly note slides"
        onScroll={(event) => {
          const element = event.currentTarget
          if (element.clientWidth > 0) setIndex(Math.round(element.scrollLeft / element.clientWidth))
        }}
        className="mt-5 flex snap-x snap-mandatory overflow-x-auto rounded-md [scrollbar-width:none] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, position) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${position + 1} of ${count}: ${slide.title}`}
            data-slot="note-slide"
            className="w-full shrink-0 snap-center px-px"
          >
            <p className="text-sm font-medium text-muted-foreground">{slide.title}</p>
            <div className="mt-2 flex flex-col gap-2">
              {slide.lines.map((line) => (
                <p key={line} className="type-title font-normal wrap-anywhere text-foreground max-sm:text-lg">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {count > 1 ? (
        <div className="mt-5 flex justify-center gap-1" role="group" aria-label="Choose a slide">
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`${slide.title}, slide ${position + 1} of ${count}`}
              aria-current={position === safeIndex ? "true" : undefined}
              onClick={() => goTo(position)}
              data-slot="note-dot"
              className="tap-area group/dot flex size-6 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span
                aria-hidden
                className={cn(
                  "block h-2 rounded-full transition-all",
                  position === safeIndex ? "w-5 bg-primary" : "w-2 bg-muted-foreground/50 group-hover/dot:bg-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

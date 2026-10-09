"use client"

import { useEffect, useSyncExternalStore } from "react"
import { SlidersHorizontal } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/**
 * TEMPORARY, for the owner to compare versions and choose. Each choice sets a `data-cmp-*` attribute on the page's root
 * element (the look is plain CSS at the end of `globals.css`) and is kept in this browser only. Delete this file, its line
 * in `app/layout.tsx` and the "TEMPORARY" CSS once the owner has chosen.
 */

const groups = [
  {
    key: "bg",
    title: "Sidebar background colour",
    hint: "The forest green behind the menu (light and dark mode).",
    choices: [
      { value: "darker", label: "Slightly darker" },
      { value: "now", label: "Now" },
      { value: "lighter", label: "Slightly lighter" },
    ],
  },
] as const

type Choices = Record<(typeof groups)[number]["key"], string>

const STORAGE_KEY = "kaya-compare-sidebar-bg"
const defaults: Choices = { bg: "now" }
let current: Choices = defaults
const listeners = new Set<() => void>()

function set(next: Choices) {
  current = next
  for (const group of groups) document.documentElement.dataset[`cmp${group.key[0].toUpperCase()}${group.key.slice(1)}`] = next[group.key]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private windows can refuse storage: the choice still works until the page is closed.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Keeps only known values; anything else falls back to today's look. */
function clean(input: unknown): Choices {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  const result = { ...defaults }
  for (const group of groups) {
    const value = source[group.key]
    if (group.choices.some((choice) => choice.value === value)) result[group.key] = value as string
  }
  return result
}

export function CompareOptions() {
  const choices = useSyncExternalStore(subscribe, () => current, () => defaults)

  useEffect(() => {
    let kept: unknown
    try {
      kept = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    } catch {
      kept = null
    }
    // An address like ?bg=darker sets them too.
    const params = new URLSearchParams(window.location.search)
    set(clean({ ...clean(kept), ...Object.fromEntries(params) }))
  }, [])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="print-hidden fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-4 z-30 flex cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium shadow-md transition-shadow hover:shadow-lg md:left-[calc(var(--sidebar-width)+1.5rem)]"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Compare options
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" side="top" className="w-[min(22rem,calc(100vw-2rem))]">
        <p className="text-sm text-muted-foreground">Try each one, then tell me which to keep. This panel goes away when you have chosen.</p>
        <div className="mt-4 flex flex-col gap-5">
          {groups.map((group) => (
            <fieldset key={group.key} className="min-w-0">
              <legend className="text-sm font-medium">{group.title}</legend>
              <p className="mt-0.5 text-xs text-muted-foreground">{group.hint}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.choices.map((choice) => {
                  const on = choices[group.key] === choice.value
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set({ ...current, [group.key]: choice.value })}
                      className={cn(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                      )}
                    >
                      {choice.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

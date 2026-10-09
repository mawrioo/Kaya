"use client"

import { useSyncExternalStore } from "react"

import { useData } from "@/components/data-provider"
import { Pet } from "@/components/mascot/pet"
import { petStatus, type PetStatus } from "@/lib/mascot"
import { monthKey } from "@/lib/stats"
import { cn } from "@/lib/utils"

const noChange = () => () => {}

/**
 * The pet for this calendar month, from the shared data, so it changes the moment a transaction is saved. The month is
 * read in the browser after the page has loaded (the server draws an empty space of the same size), so the server and the
 * browser never disagree around midnight at the end of a month.
 */
export function usePetStatus(): PetStatus | null {
  const { transactions } = useData()
  const month = useThisMonth()
  return month ? petStatus(transactions, month) : null
}

/** This calendar month ("2026-10"), read in the browser only: null on the server and while the page is loading. */
export function useThisMonth(): string | null {
  return useSyncExternalStore(noChange, () => monthKey(new Date()), () => null)
}

/** The pet on its own, named for screen readers by one plain sentence. `className` sets its size. */
export function MoneyPet({ className }: { className?: string }) {
  const status = usePetStatus()
  if (!status) return <span aria-hidden className={cn("block aspect-[200/172]", className)} />
  return <Pet mood={status.mood} label={status.sentence} className={className} />
}

/** The pet in a card of its own, with its state in a word and a sentence under it. */
export function PetCard({ className }: { className?: string }) {
  const status = usePetStatus()
  return (
    <section
      aria-label="Your pet"
      className={cn("pet-home flex flex-col items-center justify-center rounded-xl border bg-card p-5 text-center shadow-sm md:p-6", className)}
    >
      {status ? <Pet mood={status.mood} className="w-40" /> : <span aria-hidden className="block aspect-[200/172] w-40" />}
      <p className="type-title mt-3">{status?.title ?? " "}</p>
      <p className="mt-1 max-w-[24ch] text-sm text-muted-foreground">{status ? captionFor(status) : " "}</p>
    </section>
  )
}

/** The sentence without "Your pet is …:", which the title already says. */
function captionFor(status: PetStatus): string {
  const [, rest] = status.sentence.split(": ")
  if (!rest) return "This month so far."
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

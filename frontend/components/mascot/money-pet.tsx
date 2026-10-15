"use client"

import { useSyncExternalStore } from "react"

import { useData } from "@/components/data-provider"
import { petStatus, type PetStatus } from "@/lib/mascot"
import { monthKey } from "@/lib/stats"

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

/**
 * All the money that has come in so far: every income transaction plus what the goals have saved. When it goes up (a new
 * income, or "Add money" on a goal), the pet perks up.
 */
export function useMoneyIn(): number {
  const { transactions, goals } = useData()
  let total = 0
  for (const transaction of transactions) if (transaction.type === "income") total += transaction.amount
  for (const goal of goals) total += goal.savedAmount
  return total
}

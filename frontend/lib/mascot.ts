/**
 * The money pet's state, from one thing: this month's saving rate, (income − spending) ÷ income. The same income and
 * spending as Home and Insights (transfers between the owner's own wallets don't count). Pure, no React.
 */
import { monthTotals } from "./stats.ts"
import type { Transaction } from "./types"

/** How the pet is doing, best first. */
export type PetMood = "thriving" | "happy" | "okay" | "wilting" | "melted"

/**
 * The lines are at a fifth (20%) of the income: keeping that much or more is thriving, spending more than that beyond it
 * is melted. Compared in whole rupiah (kept × 5 against income), so a month exactly on a line never lands on the wrong
 * side by a rounding error.
 */
const PARTS = 5

export function petMood({ income, spending }: { income: number; spending: number }): PetMood {
  // No income yet this month (the owner is paid every week): nothing to judge, so it is okay whatever has been spent.
  if (income <= 0) return "okay"
  const kept = income - spending
  if (kept * PARTS >= income) return "thriving"
  if (kept > 0) return "happy"
  if (kept === 0) return "okay"
  if (-kept * PARTS <= income) return "wilting"
  return "melted"
}

/**
 * What moves the pet up one state this month: how many rupiah more kept (more income, or less spending) it takes, rounded
 * up so it is always enough. Nothing above thriving, and nothing to say before any income has come in.
 */
export function petNextStep({ income, spending }: { income: number; spending: number }): { mood: PetMood; amount: number } | null {
  if (income <= 0) return null
  const kept = income - spending
  switch (petMood({ income, spending })) {
    case "thriving":
      return null
    case "happy":
      return { mood: "thriving", amount: Math.ceil(income / PARTS) - kept }
    case "okay":
      return { mood: "happy", amount: 1 }
    case "wilting":
      return { mood: "okay", amount: -kept }
    case "melted":
      return { mood: "wilting", amount: -kept - Math.floor(income / PARTS) }
  }
}

export interface PetStatus {
  mood: PetMood
  income: number
  spending: number
  /** One word, for a caption. */
  title: string
  /** One plain sentence with no amounts, for screen readers and the card's caption. */
  sentence: string
}

const TITLES: Record<PetMood, string> = {
  thriving: "Thriving",
  happy: "Happy",
  okay: "Okay",
  wilting: "Wilting",
  melted: "Melted",
}

/** The pet for a month ("2026-10"). */
export function petStatus(transactions: Pick<Transaction, "type" | "amount" | "date">[], month: string): PetStatus {
  const { income, spending } = monthTotals(transactions as Transaction[], month)
  const mood = petMood({ income, spending })
  return { mood, income, spending, title: TITLES[mood], sentence: sentenceFor(mood, income, spending) }
}

function sentenceFor(mood: PetMood, income: number, spending: number): string {
  switch (mood) {
    case "thriving":
      return "Your pet is thriving: you've kept a fifth or more of this month's income."
    case "happy":
      return "Your pet is happy: you've kept some of this month's income."
    case "okay":
      if (income <= 0) return "Your pet is okay: no income has come in this month yet."
      return spending === income
        ? "Your pet is okay: this month's spending matches what came in."
        : "Your pet is okay."
    case "wilting":
      return "Your pet is wilting: this month's spending is a little above what came in."
    case "melted":
      return "Your pet has melted: this month's spending is well above what came in."
  }
}

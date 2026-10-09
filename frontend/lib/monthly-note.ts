/**
 * The monthly note: three short slides in Kaya's calm voice, worked out from the numbers. Every sentence is a fill-in-the-blank
 * template (no AI, nothing leaves the computer), so a sentence can only say what the figures say. The note describes and never
 * advises. Pure functions, no React; it imports with relative paths so the node tests can run it.
 *
 * It never mentions a wallet or the total balance, so it has nothing the balance eye would need to hide.
 */
import { formatDate, formatMonthName, formatPercent, formatRupiah } from "./format.ts"
import { monthKey, shiftMonth } from "./stats.ts"
import type { Category, Goal, Transaction } from "./types"

export interface NoteSlide {
  id: "month" | "notice" | "progress"
  /** A few words: "The month", "Worth noticing", "Progress". */
  title: string
  /** One or two to three sentences. */
  lines: string[]
}

export interface NoteInput {
  transactions: Transaction[]
  categories: Category[]
  goals: Goal[]
  /** The budget for the whole month, or undefined when there isn't one. */
  monthlyBudget?: number
  /** "2026-09" */
  month: string
  /** Today, "2026-09-29". */
  today: string
  /** The biggest treat of the month (worked out by `biggestTreat`), or undefined when there wasn't one. */
  treat?: Transaction
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

/** A day of the month, 1 to 31, from a date or date-time as written. */
const dayOf = (date: string) => Number(date.slice(8, 10))

const daysInMonth = (month: string) => {
  const [year, number] = month.split("-").map(Number)
  return new Date(year, number, 0).getDate()
}

/** 0 is Monday, 6 is Sunday, for a calendar date as written. */
const weekdayOf = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number)
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

/** What a category is called in a sentence. */
const nameOf = (categories: Category[], id: string) => categories.find((category) => category.id === id)?.name ?? "Other"

/** "more" or "less", by how an amount stands against another. */
const moreOrLess = (amount: number, other: number) => (amount > other ? "more" : "less")

/**
 * The slides for a month, in order. Fewer than three when a slide has nothing true to say, and none at all when no money came in
 * or went out (the page has its own message for that). A month that is still going is described "so far" and compared with the
 * same days of the month before, never with the whole of it.
 */
export function monthlyNote({ transactions, categories, goals, monthlyBudget, month, today, treat }: NoteInput): NoteSlide[] {
  const ongoing = monthKey(today) === month
  const lastDay = ongoing ? dayOf(today) : Infinity
  const before = shiftMonth(month, -1)
  const monthName = formatMonthName(month)
  const beforeName = formatMonthName(before)

  // Money in and out. Transfers never count. A month still going only counts up to today when it is compared with another.
  const inMonth = transactions.filter((tx): tx is Exclude<Transaction, { type: "transfer" }> => tx.type !== "transfer" && monthKey(tx.date) === month)
  const earlier = transactions.filter((tx): tx is Exclude<Transaction, { type: "transfer" }> => tx.type !== "transfer" && monthKey(tx.date) === before && dayOf(tx.date) <= lastDay)
  const sum = (list: typeof inMonth, type: "income" | "expense") => list.reduce((total, tx) => total + (tx.type === type ? tx.amount : 0), 0)
  const income = sum(inMonth, "income")
  const spending = sum(inMonth, "expense")
  if (income === 0 && spending === 0) return []
  const left = income - spending
  const spendingBefore = sum(earlier, "expense")
  const compareWith = ongoing ? `at this point in ${beforeName}` : `in ${beforeName}`

  // ---- slide 1: the month -------------------------------------------------------------------
  const month1: string[] = []
  if (income > 0 && spending > 0) month1.push(`You earned ${formatRupiah(income)} and spent ${formatRupiah(spending)}.`)
  else if (income > 0) month1.push(`You earned ${formatRupiah(income)}.`)
  else month1.push(`You spent ${formatRupiah(spending)}.`)

  if (income > 0 && spending > 0) {
    if (left > 0) month1.push(`${ongoing ? "That leaves" : "That left"} ${formatRupiah(left)}, ${formatPercent((left / income) * 100)} of what came in.`)
    else if (left < 0) month1.push(`You spent ${formatRupiah(-left)} more than you earned.`)
    else month1.push("What came in and what went out were the same.")
  }
  if (spending > 0 && spendingBefore > 0) {
    month1.push(
      spending === spendingBefore
        ? `Spending is the same as ${compareWith}.`
        : `Spending ${ongoing ? "is" : "was"} ${formatRupiah(Math.abs(spending - spendingBefore))} ${moreOrLess(spending, spendingBefore)} than ${compareWith}.`
    )
  }

  const slides: NoteSlide[] = [{ id: "month", title: ongoing ? `${monthName} so far` : monthName, lines: month1 }]

  // ---- slide 2: worth noticing --------------------------------------------------------------
  const expenses = inMonth.filter((tx) => tx.type === "expense")
  const byCategory = new Map<string, number>()
  for (const tx of expenses) byCategory.set(tx.categoryId, (byCategory.get(tx.categoryId) ?? 0) + tx.amount)
  const ranked = [...byCategory].sort((a, b) => b[1] - a[1])

  const top = ranked[0] ? `${nameOf(categories, ranked[0][0])} ${ongoing ? "is" : "was"} the biggest share of spending, ${formatPercent((ranked[0][1] / spending) * 100)}.` : undefined

  // The category that moved the most against the month before: at least Rp 50.000 and a fifth of what it was.
  const earlierBy = new Map<string, number>()
  for (const tx of earlier) if (tx.type === "expense") earlierBy.set(tx.categoryId, (earlierBy.get(tx.categoryId) ?? 0) + tx.amount)
  const mover = [...byCategory]
    .flatMap(([id, amount]) => {
      const was = earlierBy.get(id) ?? 0
      const change = amount - was
      return was > 0 && Math.abs(change) >= 50_000 && Math.abs(change) >= was / 5 ? [{ id, amount, was, change }] : []
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.id.localeCompare(b.id))[0]
  const moved = mover
    ? `${nameOf(categories, mover.id)} ${ongoing ? "is" : "was"} ${formatPercent((Math.abs(mover.change) / mover.was) * 100)} ${mover.change > 0 ? "higher" : "lower"} than ${compareWith}.`
    : undefined

  const spendDays = new Set(expenses.map((tx) => tx.date.slice(0, 10))).size
  const dayCount = ongoing ? dayOf(today) : daysInMonth(month)
  const days = spendDays > 0 ? `You spent money on ${spendDays} of ${ongoing ? `the ${dayCount} days so far` : `${dayCount} days`}.` : undefined

  // The weekday that cost the most, only when there is enough to say and one day clearly leads.
  const perDay = Array.from({ length: 7 }, () => 0)
  for (const tx of expenses) perDay[weekdayOf(tx.date)] += tx.amount
  const best = Math.max(...perDay)
  const busiest = expenses.length >= 6 && perDay.filter((amount) => amount === best).length === 1 ? WEEKDAYS[perDay.indexOf(best)] : undefined
  const busy = busiest ? `${busiest} ${ongoing ? "is" : "was"} the day with the most spending.` : undefined

  // The biggest treat always gets a place on this slide, so the other sentences make room for it.
  const treatLine =
    treat?.type === "expense" ? `${ongoing ? "Your biggest treat so far is" : "Your biggest treat was"} ${nameOf(categories, treat.categoryId)}, ${formatRupiah(treat.amount)} on ${formatDate(treat.date)}.` : undefined
  const others = [moved, days, busy].filter((line): line is string => line !== undefined).slice(0, treatLine ? 1 : 2)
  const notice = [top, treatLine, ...others].filter((line): line is string => line !== undefined)
  if (notice.length > 0) slides.push({ id: "notice", title: "Worth noticing", lines: notice })

  // ---- slide 3: progress --------------------------------------------------------------------
  const budgets = [
    ...(monthlyBudget === undefined ? [] : [{ name: "The whole month", budget: monthlyBudget, spent: spending }]),
    ...categories.flatMap((category) =>
      category.type === "expense" && category.budget !== undefined ? [{ name: category.name, budget: category.budget, spent: byCategory.get(category.id) ?? 0 }] : []
    ),
  ]
  const progress: string[] = []
  if (budgets.length > 0) {
    const over = budgets.filter((entry) => entry.spent > entry.budget).sort((a, b) => b.spent - b.budget - (a.spent - a.budget))
    const within = budgets.length - over.length
    if (over.length === 0) {
      progress.push(budgets.length === 1 ? `Your budget ${ongoing ? "is" : "stayed"} within its limit.` : `All ${budgets.length} budgets ${ongoing ? "are" : "stayed"} within their limits.`)
    } else {
      progress.push(`${within} of ${budgets.length} budgets ${ongoing ? "are" : "stayed"} within their limits.`)
      for (const entry of over.slice(0, 2)) {
        progress.push(`${entry.name} ${ongoing ? "has gone" : "went"} over by ${formatRupiah(entry.spent - entry.budget)}.`)
      }
    }
  }
  const reached = goals.filter((goal) => goal.reachedAt !== undefined && monthKey(goal.reachedAt) === month)
  if (reached.length === 1) progress.push(`${reached[0].name} reached its target.`)
  else if (reached.length === 2) progress.push(`${reached[0].name} and ${reached[1].name} reached their targets.`)
  else if (reached.length > 2) progress.push(`${reached[0].name}, ${reached[1].name} and ${reached.length - 2} more reached their targets.`)
  if (progress.length > 0) slides.push({ id: "progress", title: "Progress", lines: progress })

  return slides
}

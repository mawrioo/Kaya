/**
 * Small pure functions that turn a goal into what its card says: how far along
 * it is, and how much to save each month to get there in time. Nothing here
 * knows about React. It also imports nothing at run time, so it can be tried
 * out on its own.
 */
import type { Goal, Rupiah, Wallet } from "@/lib/types"

type Amounts = Pick<Goal, "targetAmount" | "savedAmount">

export interface GoalProgress {
  /** True once as much has been saved as the goal asks for. */
  done: boolean
  /** How full the bar is, 0 to 100, exactly as far as the goal has come. */
  fill: number
  /** The percentage to print. It never says 100 until the goal is really reached, so 99.6% reads "99%". */
  percent: number
  /** What is still missing. Zero once the goal is reached. */
  remaining: number
}

export function goalProgress(goal: Amounts): GoalProgress {
  const done = goal.savedAmount >= goal.targetAmount
  const share = (goal.savedAmount / goal.targetAmount) * 100
  return {
    done,
    fill: done ? 100 : share,
    // A sliver above zero is kept as it is, so it can read "<1%" instead of "0%".
    percent: done ? 100 : share > 0 && share < 1 ? share : Math.min(99, Math.round(share)),
    remaining: Math.max(0, goal.targetAmount - goal.savedAmount),
  }
}

export type GoalMilestone = 25 | 50 | 75

/**
 * The quarter mark that an addition just passed: 25, 50 or 75 when the percentage on the goal's card (the one the
 * owner sees) has reached it and hadn't before. An addition that passes several gives the highest. Never once the goal
 * is reached, because that has a message of its own.
 */
export function milestonePassed(before: number, after: number, target: number): GoalMilestone | undefined {
  const goal = (savedAmount: number) => goalProgress({ savedAmount, targetAmount: target })
  if (goal(after).done) return undefined
  const [was, now] = [goal(before).percent, goal(after).percent]
  return ([75, 50, 25] as const).find((mark) => was < mark && now >= mark)
}

/** What the message says at each quarter mark. */
export const milestoneTitle: Record<GoalMilestone, string> = {
  25: "A quarter of the way",
  50: "Halfway there",
  75: "Three quarters of the way",
}

/** The goals still being saved for come first, in the order they were made. Reached goals go to the end. */
export function sortGoals(goals: Goal[]): Goal[] {
  return [...goals.filter((goal) => !goalProgress(goal).done), ...goals.filter((goal) => goalProgress(goal).done)]
}

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Whole calendar months from one date to another, rounded down: from 30 Sep to
 * 31 Mar is 6, and from 30 Sep to 29 Mar is 5. Zero means under a month, and a
 * date that has passed gives a negative number. Both are "2026-09-30".
 */
export function monthsBetween(from: string, to: string): number {
  const a = CALENDAR_DATE.exec(from)
  const b = CALENDAR_DATE.exec(to)
  if (!a || !b) return 0
  const months = (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]))
  return Number(b[3]) < Number(a[3]) ? months - 1 : months
}

/** A no-break space, so a number stays with its unit ("4 months") when a line wraps. */
const NBSP = String.fromCharCode(160)
const count = (n: number, one: string, many: string) => `${n}${NBSP}${n === 1 ? one : many}`

/**
 * "6 months left", "1 year, 3 months left", "less than a month left". It always
 * follows something else on the line, so it starts small. A line can only break
 * after the comma, never between a number and its unit.
 */
export function timeLeft(months: number): string {
  if (months < 1) return `less than a month${NBSP}left`
  if (months < 12) return `${count(months, "month", "months")}${NBSP}left`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0
    ? `${count(years, "year", "years")}${NBSP}left`
    : `${count(years, "year", "years")}, ${count(rest, "month", "months")}${NBSP}left`
}

/**
 * Whole days from one calendar date to another: "2026-07-01" to "2026-09-30" is
 * 91. Negative if the second is earlier. Both are read as local dates.
 */
export function daysBetween(from: string, to: string): number {
  const a = CALENDAR_DATE.exec(from)
  const b = CALENDAR_DATE.exec(to)
  if (!a || !b) return 0
  const at = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  const bt = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]))
  return Math.round((bt - at) / 86_400_000)
}

export type GoalPace =
  /** Nothing to compare with yet: no date, the goal is reached, the date has passed, or it began today. */
  | { kind: "none" }
  /** Saving as fast as it needs to, or faster. */
  | { kind: "on-pace" }
  /** Behind, by this much. Never called "late": the goal's date can always be moved. */
  | { kind: "behind"; shortfall: Rupiah }

/**
 * Whether a goal is keeping up. It compares what has been saved since the goal
 * began (or since money was last taken out) with what an even pace over the whole
 * stretch to the target date would have put aside by now.
 *
 * Kept gentle on purpose: a goal counts as on pace while it is within a tenth of
 * where it should be, so a day or two of lag never reads as a warning.
 */
export function goalPace(goal: Goal, today: string): GoalPace {
  const { done, remaining } = goalProgress(goal)
  if (!goal.targetDate || done || !goal.paceFrom) return { kind: "none" }
  const whole = daysBetween(goal.paceFrom, goal.targetDate)
  const gone = daysBetween(goal.paceFrom, today)
  // Before it starts, after the date has passed, or on the first day: nothing to say.
  if (whole <= 0 || gone <= 0 || gone >= whole) return { kind: "none" }

  const toSave = goal.targetAmount - goal.paceAmount
  if (toSave <= 0) return { kind: "on-pace" }
  const expected = (toSave * gone) / whole
  const saved = goal.savedAmount - goal.paceAmount
  const shortfall = expected - saved
  if (shortfall <= expected / 10) return { kind: "on-pace" }
  // It is an estimate, so it is shown as a round number rather than to the rupiah.
  return { kind: "behind", shortfall: Math.min(Math.ceil(shortfall / 1000) * 1000, remaining) }
}

export type GoalPlan =
  /** Nothing to plan: no target date, or the goal is already reached. */
  | { kind: "none" }
  /** The date has come and gone and the goal isn't reached. */
  | { kind: "passed" }
  /** Save this much each month to be there by the date. */
  | { kind: "monthly"; perMonth: number; timeLeft: string }

/**
 * How much to save each month to reach the goal by its date. Months are counted
 * whole, rounded down, and never fewer than one, so the figure is never too
 * small. `today` is "2026-09-30".
 */
export function goalPlan(goal: Goal, today: string): GoalPlan {
  const { done, remaining } = goalProgress(goal)
  if (!goal.targetDate || done) return { kind: "none" }
  if (goal.targetDate < today) return { kind: "passed" }
  const months = monthsBetween(today, goal.targetDate)
  return { kind: "monthly", perMonth: Math.ceil(remaining / Math.max(1, months)), timeLeft: timeLeft(months) }
}

export interface WalletGoals {
  /** How much of this wallet is spoken for by goals saved in it. */
  reserved: Rupiah
  /** How many goals are saved in it. */
  count: number
  /** True when the goals ask for more than the wallet holds. */
  overcommitted: boolean
  /** What is left over once the goals are covered. Zero when they ask for more than there is. */
  free: Rupiah
}

/** What a wallet's goals mean for it: how much is set aside, and whether that is more than it holds. */
export function walletGoals(goals: Goal[], wallet: Pick<Wallet, "id" | "balance">): WalletGoals {
  const mine = goals.filter((goal) => goal.walletId === wallet.id)
  const reserved = mine.reduce((sum, goal) => sum + goal.savedAmount, 0)
  return {
    reserved,
    count: mine.length,
    overcommitted: reserved > wallet.balance,
    free: Math.max(0, wallet.balance - reserved),
  }
}

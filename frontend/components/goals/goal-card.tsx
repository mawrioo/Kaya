"use client"

import { useRef, useState } from "react"
import { Check, Clock, Ellipsis, History, Pencil, Trash2, TrendingUp } from "lucide-react"

import { MoveMoneyPopover, type MoveMoneyInput } from "@/components/goals/move-money-popover"
import { MobileDetails } from "@/components/mobile-details"
import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { formatDate, formatPercent, formatRupiah } from "@/lib/format"
import { goalPace, goalPlan, goalProgress, type GoalPace, type GoalPlan } from "@/lib/goals"
import { goalIconChoices } from "@/lib/icons"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The id of a goal's "more" button, so a dialog opened from its menu can hand keyboard focus back to it. */
export const goalMenuId = (goalId: string) => `goal-menu-${goalId}`

interface GoalCardProps {
  goal: Goal
  /** The name of the wallet the money is kept in. */
  walletName: string
  /** Today's date, "2026-09-30", which the monthly figure and the pace note are worked out from. */
  today: string
  /** True for a goal that was just added, so it eases in. */
  isNew?: boolean
  onEdit: (goal: Goal) => void
  onHistory: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  /** Adds money to the goal, or takes it out. Throws if it couldn't be saved, which keeps the box open. */
  onMoveMoney: (goal: Goal, input: MoveMoneyInput) => Promise<void>
}

/**
 * One goal: what it is for, how far along it is, and (when it has a date) how
 * much to save each month to get there and whether it is keeping up. "Add money"
 * sits at the bottom. A goal that has been reached turns green, says when, and
 * swaps that button for a quiet "Take money out", for when the money is spent.
 */
export function GoalCard({ goal, walletName, today, isNew, onEdit, onHistory, onDelete, onMoveMoney }: GoalCardProps) {
  const Icon = goalIconChoices[goal.icon]
  const { done, fill, percent, remaining } = goalProgress(goal)
  const pace = goalPace(goal, today)
  const detailsLabel = pace.kind === "on-pace" ? "On pace · Details" : pace.kind === "behind" ? "A little behind · Details" : "Details"
  // When more has been saved than before, a coin drops into the bar (not on the first paint).
  const [lastSaved, setLastSaved] = useState(goal.savedAmount)
  const [drops, setDrops] = useState(0)
  if (goal.savedAmount !== lastSaved) {
    setLastSaved(goal.savedAmount)
    if (goal.savedAmount > lastSaved) setDrops((count) => count + 1)
  }

  return (
    <li
      id={`goal-card-${goal.id}`}
      className={cn("flex scroll-mt-24", isNew && "animate-in duration-500 fade-in-0 slide-in-from-bottom-3")}
    >
      <div className="flex w-full flex-col rounded-xl border bg-card p-3 md:p-6 md:shadow-sm">
        <div className="flex items-center gap-2.5 md:items-start md:gap-3.5">
          <span
            className={cn(
              "coin-rim grid size-8 shrink-0 md:size-11 place-items-center rounded-full",
              done ? "bg-positive/15 text-positive" : "bg-sage text-sage-foreground"
            )}
          >
            <Icon className="size-4 md:size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 md:pt-0.5">
            <h2 className="text-sm font-medium md:text-base wrap-anywhere">{goal.name}</h2>
            <p className="text-xs wrap-anywhere md:mt-0.5 md:text-sm text-muted-foreground">Saved in {walletName}</p>
          </div>
          {/* Negative margins let the round button bleed into the padding so the row stays as tall as the icon */}
          <div className="-mt-1 -mr-2 flex shrink-0">
            <GoalMenu goal={goal} onEdit={onEdit} onHistory={onHistory} onDelete={onDelete} />
          </div>
        </div>

        <div className="md:mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="min-w-0 text-base font-semibold tabular-nums wrap-anywhere md:type-amount">
              <span className="md:hidden">{formatRupiah(goal.savedAmount)}</span>
              <span className="hidden md:inline"><Money amount={goal.savedAmount} roll /></span>
              <span className="ml-1 text-xs font-normal text-muted-foreground md:hidden">of {formatRupiah(goal.targetAmount)}</span>
            </p>
            {done ? (
              <span className="inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-sage px-2.5 py-0.5 text-xs font-medium text-sage-foreground">
                <Check className="size-3.5" aria-hidden />
                Goal reached
              </span>
            ) : (
              <p className="shrink-0 text-sm font-medium tabular-nums">{formatPercent(percent)}</p>
            )}
          </div>
          <div className="relative mt-1.5 md:mt-3">
            <Progress value={fill} aria-label={`${goal.name} progress`} indicatorClassName={done ? "bg-positive" : undefined} />
            {drops > 0 && !done ? (
              <span
                key={drops}
                aria-hidden
                className="coin-rim pointer-events-none absolute -top-1 size-3.5 animate-coin-drop rounded-full bg-highlight text-highlight-foreground ring-1 ring-highlight-foreground/40"
                style={{ left: `${Math.min(97, Math.max(3, fill))}%` }}
              />
            ) : null}
          </div>
          <div className="mt-2.5 hidden flex-wrap justify-between md:flex gap-x-4 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <p>of {formatRupiah(goal.targetAmount)}</p>
            {done ? (
              // A goal reached before dates were kept has none to show.
              goal.reachedAt ? <p>Reached on {formatDate(goal.reachedAt)}</p> : null
            ) : (
              <p>{formatRupiah(remaining)} to go</p>
            )}
          </div>
        </div>

        {done ? (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 md:justify-end md:pt-6">
            {goal.reachedAt ? <p className="text-xs text-muted-foreground md:hidden">Reached on {formatDate(goal.reachedAt)}</p> : null}
            <MoveMoneyPopover goal={goal} walletName={walletName} directions={["take-out"]} onSave={onMoveMoney}>
              <Button variant="outline" size="lg" className="w-auto max-md:px-3 max-md:text-sm">
                Take money out
                <span className="sr-only"> of {goal.name}</span>
              </Button>
            </MoveMoneyPopover>
          </div>
        ) : (
          <div className="mt-auto flex flex-wrap items-start justify-between gap-x-2 gap-y-1 pt-1 md:items-end md:gap-x-4 md:gap-y-3 md:pt-6">
            <div className="min-w-0 flex-1">
              <MobileDetails label={detailsLabel} contentClassName="pb-2 md:pb-0">
                <p className="mb-2 text-sm text-muted-foreground tabular-nums md:hidden">{formatRupiah(remaining)} to go</p>
                <Pace pace={pace} />
                {goal.targetDate ? <Plan plan={goalPlan(goal, today)} date={goal.targetDate} /> : null}
              </MobileDetails>
            </div>
            <div className="ml-auto w-auto">
              <MoveMoneyPopover goal={goal} walletName={walletName} onSave={onMoveMoney}>
                <Button variant="secondary" size="lg" className="w-auto max-md:px-3 max-md:text-sm">
                  Add money
                  <span className="sr-only"> to {goal.name}</span>
                </Button>
              </MoveMoneyPopover>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Whether the goal is keeping up with its own date. Good news is green and short.
 * Falling behind stays calm: no red, no alarm, just how much would catch it up,
 * because the date can always be moved.
 */
function Pace({ pace }: { pace: GoalPace }) {
  if (pace.kind === "none") return null

  if (pace.kind === "on-pace") {
    return (
      <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-positive">
        <TrendingUp className="size-4 shrink-0" aria-hidden />
        On pace
      </p>
    )
  }

  return (
    <p className="mb-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
      <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium text-foreground">A little behind</span>
        {" · about "}
        {formatRupiah(pace.shortfall)} to catch up
      </span>
    </p>
  )
}

/** What to save each month, or a calm note when the date has gone by. Nothing at all for a goal without a date. */
function Plan({ plan, date }: { plan: GoalPlan; date: string }) {
  if (plan.kind === "none") return null
  if (plan.kind === "passed") {
    return (
      <p className="text-sm text-muted-foreground">
        The target date was <span className="whitespace-nowrap">{formatDate(date)}</span>.
      </p>
    )
  }
  // On a narrow card the line wraps, so keep the date whole, and keep the dot with the date rather than starting the next line.
  return (
    <div className="text-sm">
      <p className="font-medium tabular-nums">{formatRupiah(plan.perMonth)} a&nbsp;month</p>
      <p className="text-muted-foreground">
        to reach it by <span className="whitespace-nowrap">{formatDate(date)}&nbsp;·</span> {plan.timeLeft}
      </p>
    </div>
  )
}

/** Everything else you can do with a goal, behind one round "more" button. */
function GoalMenu({ goal, onEdit, onHistory, onDelete }: Pick<GoalCardProps, "goal" | "onEdit" | "onHistory" | "onDelete">) {
  // When an item opens a dialog, the dialog takes the keyboard focus instead of the menu handing it back to its button.
  const chose = useRef(false)
  const choose = (action: () => void) => () => {
    chose.current = true
    action()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={goalMenuId(goal.id)}
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-muted-foreground hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.07]"
          aria-label={`More options for ${goal.name}`}
        >
          <Ellipsis className="size-[1.125rem]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => {
          if (!chose.current) return
          event.preventDefault()
          chose.current = false
        }}
      >
        <DropdownMenuItem onSelect={choose(() => onEdit(goal))}>
          <Pencil aria-hidden />
          Edit goal
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={choose(() => onHistory(goal))}>
          <History aria-hidden />
          History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={choose(() => onDelete(goal))}>
          <Trash2 aria-hidden />
          Delete goal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

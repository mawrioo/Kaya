import { Check } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { formatDate, formatPercent, formatRupiah } from "@/lib/format"
import { goalProgress } from "@/lib/goals"
import { goalIconChoices } from "@/lib/icons"
import type { Goal } from "@/lib/types"

/** One savings goal: icon, name, percent, thin progress bar, "Rp X of Rp Y". A goal that has been reached says so and turns green. */
export function GoalRow({ goal }: { goal: Goal }) {
  const Icon = goalIconChoices[goal.icon]
  const { done, fill, percent } = goalProgress(goal)

  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span className="coin-rim grid size-10 shrink-0 place-items-center rounded-full bg-sage text-sage-foreground">
        <Icon className="size-[1.125rem]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-4">
          <p className="min-w-0 font-medium wrap-anywhere">{goal.name}</p>
          {done ? (
            <p className="flex shrink-0 items-center gap-1 text-sm font-medium text-positive">
              <Check className="size-4" aria-hidden />
              Reached
            </p>
          ) : (
            <p className="shrink-0 text-sm font-medium tabular-nums">{formatPercent(percent)}</p>
          )}
        </div>
        <Progress
          value={fill}
          aria-label={`${goal.name} progress`}
          indicatorClassName={done ? "bg-positive" : undefined}
          className="mt-2.5"
        />
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{formatRupiah(goal.savedAmount)}</span> of{" "}
          {formatRupiah(goal.targetAmount)}
          {done && goal.reachedAt ? (
            <span className="tabular-nums"> · on {formatDate(goal.reachedAt)}</span>
          ) : null}
        </p>
      </div>
    </li>
  )
}

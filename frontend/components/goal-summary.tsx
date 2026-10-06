import { formatRupiah } from "@/lib/format"
import { goalProgress } from "@/lib/goals"
import type { Goal } from "@/lib/types"

/** One line about all the goals together: how much is left to save, across how many. Goals already reached don't count. */
export function GoalSummary({ goals }: { goals: Goal[] }) {
  const open = goals.map(goalProgress).filter((progress) => !progress.done)
  if (open.length === 0) return <>Every goal is fully funded.</>

  const left = open.reduce((sum, progress) => sum + progress.remaining, 0)
  return (
    <>
      <span className="font-medium text-foreground tabular-nums">{formatRupiah(left)}</span> left to save across{" "}
      {open.length} {open.length === 1 ? "goal" : "goals"}
    </>
  )
}

import Link from "next/link"

import { GoalRow } from "@/components/goal-row"
import { GoalSummary } from "@/components/goal-summary"
import { Panel } from "@/components/panel"
import { SeeAllLink } from "@/components/see-all-link"
import { sortGoals } from "@/lib/goals"
import type { Goal } from "@/lib/types"

/** More goals than this are left for the Goals page, so this panel never grows tall. */
const MOST_SHOWN = 4

export function SavingsGoals({ goals }: { goals: Goal[] }) {
  return (
    <Panel title="Savings goals" action={<SeeAllLink href="/goals" />}>
      {goals.length === 0 ? (
        <p className="text-muted-foreground">
          No goals yet.{" "}
          <Link href="/goals" className="font-medium text-foreground underline underline-offset-4">
            Start one
          </Link>{" "}
          on the Goals page.
        </p>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="divide-y">
            {sortGoals(goals)
              .slice(0, MOST_SHOWN)
              .map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
          </ul>
          <div className="mt-auto pt-6">
            <p className="border-t pt-4 text-sm text-muted-foreground">
              <GoalSummary goals={goals} />
            </p>
          </div>
        </div>
      )}
    </Panel>
  )
}

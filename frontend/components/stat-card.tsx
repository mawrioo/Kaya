import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

interface StatCardProps {
  icon: LucideIcon
  label: string
  /** Usually a <Money />; set in the serif amount style. */
  value: React.ReactNode
  /** One short line under the number. */
  helper?: string
  helperTone?: "positive" | "muted"
  className?: string
}

export function StatCard({ icon: Icon, label, value, helper, helperTone = "positive", className }: StatCardProps) {
  return (
    <div className={cn("flex flex-col rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="flex items-center gap-3">
        <span className="coin-rim grid size-10 shrink-0 place-items-center rounded-full bg-sage text-sage-foreground">
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-5 type-amount">{value}</div>
      {helper ? (
        <p className={cn("mt-2 text-sm", helperTone === "positive" ? "text-positive" : "text-muted-foreground")}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}

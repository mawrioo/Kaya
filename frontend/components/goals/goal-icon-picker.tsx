"use client"

import { iconTileClasses, legendClasses } from "@/components/wallets/look-pickers"
import { goalIconOptions } from "@/lib/goal-form"
import { goalIconChoices } from "@/lib/icons"
import type { GoalIconName } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Twelve icons for a goal, drawn in the same green as its badge. Real radio buttons, so arrow keys work. */
export function GoalIconPicker({ value, onChange }: { value: GoalIconName; onChange: (value: GoalIconName) => void }) {
  return (
    <fieldset>
      <legend className={legendClasses}>Icon</legend>
      {/* Narrow enough that twelve tiles fall as two even rows of six, not nine and three */}
      <div className="flex max-w-[17rem] flex-wrap items-center gap-2">
        {goalIconOptions.map(({ value: name, label }) => {
          const Icon = goalIconChoices[name]
          return (
            <label key={name} className="relative cursor-pointer">
              <input
                type="radio"
                name="goal-icon"
                value={name}
                checked={value === name}
                onChange={() => onChange(name)}
                aria-label={label}
                className="peer sr-only"
              />
              <span className={cn(iconTileClasses, "text-sage-foreground")}>
                <Icon className="size-[1.125rem]" aria-hidden />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

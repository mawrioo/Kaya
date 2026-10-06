"use client"

import { ColorSwatches, iconTileLook, legendClasses } from "@/components/wallets/look-pickers"
import { categoryIconOptions } from "@/lib/category-form"
import { icons } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { IconName, PaletteColor } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The ten colours, as round swatches. Real radio buttons, so arrow keys work. */
export function CategoryColorPicker({ value, onChange }: { value: PaletteColor; onChange: (value: PaletteColor) => void }) {
  return (
    <fieldset>
      <legend className={legendClasses}>Colour</legend>
      {/* Two even rows of five on a phone, one row of ten from 640px. */}
      <div className="flex max-w-[12.5rem] flex-wrap items-center gap-2 sm:max-w-none">
        <ColorSwatches name="category-color" value={value} onChange={onChange} />
      </div>
    </fieldset>
  )
}

interface CategoryIconPickerProps {
  value: IconName
  onChange: (value: IconName) => void
  /** The colour the icons are drawn in, so what you see is what you get. */
  color: PaletteColor
}

/** Twenty-four icons in the chosen colour. Real radio buttons, so arrow keys work. */
export function CategoryIconPicker({ value, onChange, color }: CategoryIconPickerProps) {
  const tint = paletteClasses[color].icon

  return (
    <fieldset>
      <legend className={legendClasses}>Icon</legend>
      {/* Even rows: six across on a phone, eight from 640px. */}
      <div className="grid max-w-[22rem] grid-cols-6 gap-2 sm:grid-cols-8">
        {categoryIconOptions.map(({ value: name, label }) => {
          const Icon = icons[name]
          return (
            <label key={name} className="relative cursor-pointer">
              <input
                type="radio"
                name="category-icon"
                value={name}
                checked={value === name}
                onChange={() => onChange(name)}
                aria-label={label}
                className="peer sr-only"
              />
              <span className={cn(iconTileLook, "aspect-square", tint)}>
                <Icon className="size-[1.125rem]" aria-hidden />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

"use client"

import { Check } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { walletIconChoices } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { PaletteColor, WalletIconName } from "@/lib/types"
import { walletColorChoices, walletIconOptions } from "@/lib/wallet-kinds"
import { cn } from "@/lib/utils"

/** The label above a group of choices. */
export const legendClasses = "mb-2.5 text-sm leading-none font-medium"

/** What every icon tile shares, without a size: a rounded square that shows as chosen when its hidden radio button is checked. */
export const iconTileLook =
  "grid place-items-center rounded-lg border bg-card transition-colors duration-150 hover:bg-muted peer-checked:border-foreground/60 peer-checked:bg-muted peer-checked:shadow-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"

/** One 36px icon tile in a picker. */
export const iconTileClasses = `size-9 ${iconTileLook}`

/** The "Default" choice, drawn as a small pill in front of the other options. */
const pillClasses =
  "flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground peer-checked:border-foreground/50 peer-checked:text-foreground peer-checked:shadow-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"

interface ColorSwatchesProps {
  /** The chosen colour. Leave it out when something else, such as "Default", is chosen. */
  value?: PaletteColor
  onChange: (color: PaletteColor) => void
  /** Groups the radio buttons, so each picker on a page needs a name of its own. */
  name: string
}

/** The ten round swatches, as real radio buttons so arrow keys work. They are meant to sit in a flex row of their own. */
export function ColorSwatches({ value, onChange, name }: ColorSwatchesProps) {
  return (
    <>
      {walletColorChoices.map(({ value: color, label }) => (
        <label key={color} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={color}
            checked={value === color}
            onChange={() => onChange(color)}
            aria-label={label}
            className="peer sr-only"
          />
          <span
            className={cn(
              "grid size-8 place-items-center rounded-full text-card ring-offset-2 ring-offset-popover transition-shadow duration-150 hover:ring-2 hover:ring-foreground/25 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ring [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100",
              paletteClasses[color].fill
            )}
          >
            <Check className="size-4" aria-hidden />
          </span>
        </label>
      ))}
    </>
  )
}

interface ColorPickerProps {
  value: PaletteColor | "default"
  onChange: (value: PaletteColor | "default") => void
  /** The colour "Default" stands for. Not known yet for a wallet that is still being added. */
  defaultColor?: PaletteColor
}

/** Ten round swatches, and "Default" for the colour the app picked. Real radio buttons, so arrow keys work. */
export function ColorPicker({ value, onChange, defaultColor }: ColorPickerProps) {
  return (
    <fieldset>
      <legend className={legendClasses}>Colour</legend>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative cursor-pointer">
          <input
            type="radio"
            name="wallet-color"
            value="default"
            checked={value === "default"}
            onChange={() => onChange("default")}
            className="peer sr-only"
          />
          <span className={pillClasses}>
            {defaultColor ? <span className={cn("size-3 rounded-full", paletteClasses[defaultColor].fill)} aria-hidden /> : null}
            Default
          </span>
        </label>

        <ColorSwatches name="wallet-color" value={value === "default" ? undefined : value} onChange={onChange} />
      </div>
    </fieldset>
  )
}

interface IconPickerProps {
  value: WalletIconName | "default"
  onChange: (value: WalletIconName | "default") => void
  /** The icon "Default" stands for: the one that goes with the wallet's kind. */
  defaultIcon: LucideIcon
  /** The colour the icons are drawn in, so what you see is what you get. */
  color?: PaletteColor
}

/** Twelve icons, and "Default" for the one that goes with the kind of wallet. */
export function IconPicker({ value, onChange, defaultIcon: DefaultIcon, color }: IconPickerProps) {
  const tint = color ? paletteClasses[color].icon : "text-foreground"

  return (
    <fieldset>
      <legend className={legendClasses}>Icon</legend>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative cursor-pointer">
          <input
            type="radio"
            name="wallet-icon"
            value="default"
            checked={value === "default"}
            onChange={() => onChange("default")}
            className="peer sr-only"
          />
          <span className={pillClasses}>
            <DefaultIcon className={cn("size-4", tint)} aria-hidden />
            Default
          </span>
        </label>

        {walletIconOptions.map(({ value: name, label }) => {
          const Icon = walletIconChoices[name]
          return (
            <label key={name} className="relative cursor-pointer">
              <input
                type="radio"
                name="wallet-icon"
                value={name}
                checked={value === name}
                onChange={() => onChange(name)}
                aria-label={label}
                className="peer sr-only"
              />
              <span className={cn(iconTileClasses, tint)}>
                <Icon className="size-[1.125rem]" aria-hidden />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

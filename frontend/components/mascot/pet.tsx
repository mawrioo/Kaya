"use client"

import { useCompareChoice } from "@/components/compare-options"
import { RemakePet } from "@/components/mascot/pet-remake"
import { StickerPet } from "@/components/mascot/pet-sticker"
import type { PetMood } from "@/lib/mascot"

export type { PetMood }

/**
 * Two drawings, still being compared (Compare options, "Pig"): "now", the first sticker look (pet-sticker.tsx), and
 * "remake", the same pig turned a little, shaded, calmer and with a sprout (pet-remake.tsx). Once the owner has chosen,
 * the other file goes and this chooser can go with it.
 */
export type PetLook = "now" | "remake"

/**
 * Kaya's pet: a pig whose look follows this month's saving rate, from thriving down to melted. It breathes and blinks on
 * its own; nothing runs under "reduce motion". Decorative unless it is given a label. Without a `look` it follows the
 * Compare options choice.
 */
export function Pet({ mood = "okay", look, label, className }: { mood?: PetMood; look?: PetLook; label?: string; className?: string }) {
  const chosen = useCompareChoice("pig")
  const which: PetLook = look ?? (chosen === "remake" ? "remake" : "now")
  return which === "remake" ? (
    <RemakePet mood={mood} label={label} className={className} />
  ) : (
    <StickerPet mood={mood} label={label} className={className} />
  )
}

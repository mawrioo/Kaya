import type { PaletteColor } from "@/lib/types"

interface PaletteClasses {
  /** Solid fill: dots, chart marks, bars. */
  fill: string
  /** Tinted background for chips and badges. */
  soft: string
  /** Icon color on a soft background (non-text, 3:1+ in both themes). */
  icon: string
}

// Written out in full so Tailwind can see every class at build time.
export const paletteClasses: Record<PaletteColor, PaletteClasses> = {
  moss: { fill: "bg-cat-moss", soft: "bg-cat-moss/14", icon: "text-cat-moss" },
  sage: { fill: "bg-cat-sage", soft: "bg-cat-sage/16", icon: "text-cat-sage" },
  marigold: { fill: "bg-cat-marigold", soft: "bg-cat-marigold/14", icon: "text-cat-marigold" },
  sand: { fill: "bg-cat-sand", soft: "bg-cat-sand/16", icon: "text-cat-sand" },
  clay: { fill: "bg-cat-clay", soft: "bg-cat-clay/14", icon: "text-cat-clay" },
  sky: { fill: "bg-cat-sky", soft: "bg-cat-sky/14", icon: "text-cat-sky" },
  plum: { fill: "bg-cat-plum", soft: "bg-cat-plum/14", icon: "text-cat-plum" },
  rose: { fill: "bg-cat-rose", soft: "bg-cat-rose/14", icon: "text-cat-rose" },
  teal: { fill: "bg-cat-teal", soft: "bg-cat-teal/14", icon: "text-cat-teal" },
  ochre: { fill: "bg-cat-ochre", soft: "bg-cat-ochre/16", icon: "text-cat-ochre" },
}

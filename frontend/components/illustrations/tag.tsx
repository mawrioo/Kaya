import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/** A hanging price tag on a loop of string, with two blank lines and a dashed ring where a coin would be: a category with nothing filed under it yet. */
export function TagArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 150"
      aria-hidden
      focusable="false"
      data-decorative
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-auto w-48 max-w-full", className)}
    >
      <ellipse cx="100" cy="139" rx="62" ry="6" fill="var(--illu-ground)" />

      {/* the string, and the tag hanging from it (turned a little, as if it had just swung) */}
      <g transform="rotate(-9 100 60)">
        <path d="M100 52 C 96 30 120 12 140 24 C 150 31 146 44 134 42" stroke={INK} strokeWidth="2.3" />
        <path
          d="M78 46 H122 L138 62 V122 Q138 130 130 130 H70 Q62 130 62 122 V62 Z"
          fill="var(--illu-paint)"
          stroke={INK}
          strokeWidth="2.5"
        />
        <path d="M70 124 H130" stroke="var(--illu-body)" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="1.8 4.2" />
        <circle cx="100" cy="58" r="5.2" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.3" />

        {/* two blank lines, and a ring where a coin would go */}
        <path d="M74 80 H112 M74 92 H100" stroke={INK} strokeOpacity="0.4" strokeWidth="2.6" />
        <circle cx="100" cy="108" r="9" stroke="var(--illu-coin)" strokeWidth="2.2" strokeDasharray="2.6 3.2" />
      </g>

      {/* a coin on the ground, and two sparkles */}
      <circle cx="160" cy="124" r="11" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.4" />
      <circle cx="160" cy="124" r="6.6" stroke="var(--illu-coin-rim)" strokeWidth="1.5" strokeDasharray="1.5 2.3" />
      <path d="M155.5 120 Q157.4 117.2 160.8 116.8" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" />
      <path d="M40 28 l2 5.2 5.2 2 -5.2 2 -2 5.2 -2 -5.2 -5.2 -2 5.2 -2z" fill="var(--illu-spark)" stroke="none" />
      <path d="M170 44 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

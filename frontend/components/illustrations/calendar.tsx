import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/** A tear-off calendar page with two rings and a grid of empty days, and a coin waiting to be dropped on one: a month with nothing in it yet. */
export function CalendarArt({ className }: { className?: string }) {
  const columns = [0, 1, 2, 3, 4]
  const rows = [0, 1, 2]

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
      <ellipse cx="100" cy="139" rx="66" ry="6" fill="var(--illu-ground)" />

      {/* the page underneath, a little crooked, so it reads as a pad */}
      <rect x="52" y="38" width="104" height="94" rx="10" fill="var(--illu-paper-shade)" stroke={INK} strokeWidth="2.5" transform="rotate(3 104 85)" />

      {/* the page on top, with its coloured header */}
      <rect x="44" y="32" width="104" height="94" rx="10" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.5" />
      <path d="M44 42 Q44 32 54 32 H138 Q148 32 148 42 V56 H44 Z" fill="var(--cat-moss)" stroke={INK} strokeWidth="2.5" />
      <path d="M58 44 H86" stroke="var(--illu-paper)" strokeOpacity="0.85" strokeWidth="3.2" />

      {/* two rings */}
      <rect x="66" y="22" width="9" height="20" rx="4.5" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.3" />
      <rect x="117" y="22" width="9" height="20" rx="4.5" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.3" />

      {/* the days: empty squares, and one dashed ring where the first coin will land */}
      <g stroke="var(--illu-line)" strokeWidth="2">
        {rows.flatMap((row) =>
          columns.map((column) =>
            row === 1 && column === 2 ? null : (
              <rect key={`${row}-${column}`} x={55 + column * 17.6} y={65 + row * 20} width="12" height="12" rx="3.5" />
            )
          )
        )}
      </g>
      <circle cx="96" cy="91" r="8.6" stroke="var(--illu-coin)" strokeWidth="2.2" strokeDasharray="2.6 3.2" />

      {/* a coin leaning on the page, and two sparkles */}
      <circle cx="162" cy="118" r="12.5" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.5" />
      <circle cx="162" cy="118" r="7.6" stroke="var(--illu-coin-rim)" strokeWidth="1.6" strokeDasharray="1.6 2.4" />
      <path d="M156.5 113.5 Q158.5 110.3 162.5 110" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" />
      <path d="M172 26 l2 5.2 5.2 2 -5.2 2 -2 5.2 -2 -5.2 -5.2 -2 5.2 -2z" fill="var(--illu-spark)" stroke="none" />
      <path d="M28 70 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

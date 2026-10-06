import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/** An open notebook with a pencil lying across it: the ledger page waiting for its first line. */
export function LedgerArt({ className }: { className?: string }) {
  const rows = [0, 1, 2, 3, 4]

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
      <ellipse cx="100" cy="139" rx="72" ry="6" fill="var(--illu-ground)" />

      {/* cover, then the two pages */}
      <path d="M28 46 L100 56 L172 46 L172 118 L100 128 L28 118 Z" fill="var(--cat-moss)" stroke={INK} strokeWidth="2.5" />
      <path d="M100 54 L36 45 L36 114 L100 124 Z" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.5" />
      <path d="M100 54 L164 45 L164 114 L100 124 Z" fill="var(--illu-paper)" stroke={INK} strokeWidth="2.5" />
      <path d="M100 54 V124" stroke={INK} strokeWidth="2.5" />
      <path d="M36 118 L100 128 L164 118" stroke={INK} strokeWidth="1.6" strokeOpacity="0.45" />

      {/* ruled lines, each one a little lower toward the spine */}
      <g stroke="var(--illu-line)" strokeWidth="2">
        {rows.map((i) => (
          <path key={`l${i}`} d={`M44 ${58 + i * 11.5} L93 ${65.5 + i * 11.5}`} />
        ))}
        {rows.map((i) => (
          <path key={`r${i}`} d={`M107 ${65.5 + i * 11.5} L156 ${58 + i * 11.5}`} />
        ))}
      </g>
      {/* a few entries: names on the left, amounts on the right */}
      <g stroke={INK} strokeOpacity="0.4" strokeWidth="2.4">
        <path d="M46 54 L62 56.4" />
        <path d="M46 65.5 L70 69" />
        <path d="M46 77 L58 78.8" />
        <path d="M128 70.6 L152 67" />
        <path d="M136 82 L152 79.6" />
      </g>
      <circle cx="116" cy="71" r="4.6" fill="var(--illu-coin)" stroke={INK} strokeWidth="1.8" />

      {/* a ribbon */}
      <path d="M128 46 V74 L133 69 L138 74 V47" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.2" />

      {/* the pencil */}
      <g transform="rotate(-30 142 108)">
        <rect x="112" y="103" width="52" height="10" rx="2.5" fill="var(--cat-marigold)" stroke={INK} strokeWidth="2.2" />
        <rect x="160" y="103" width="8" height="10" fill="var(--illu-paint)" stroke={INK} strokeWidth="2.2" />
        <rect x="168" y="103" width="9" height="10" rx="3" fill="var(--cat-rose)" stroke={INK} strokeWidth="2.2" />
        <path d="M112 103 L112 113 L98 108 Z" fill="var(--illu-paint)" stroke={INK} strokeWidth="2.2" />
        <path d="M98 108 L102 106.4 L102 109.6 Z" fill={INK} stroke="none" />
      </g>

      <path d="M170 24 l2 5.2 5.2 2 -5.2 2 -2 5.2 -2 -5.2 -5.2 -2 5.2 -2z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

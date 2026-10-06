import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/** A magnifying glass looking at a question mark, with two coins that were not what it wanted. */
export function MagnifierArt({ className }: { className?: string }) {
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

      {/* the two coins that did not match */}
      <g stroke={INK} strokeWidth="2.2">
        <circle cx="40" cy="118" r="9" fill="var(--illu-coin)" />
        <circle cx="62" cy="126" r="7" fill="var(--illu-coin)" />
      </g>
      <g stroke="var(--illu-coin-rim)" strokeWidth="1.3" strokeDasharray="1.3 2">
        <circle cx="40" cy="118" r="5.2" />
        <circle cx="62" cy="126" r="4" />
      </g>

      {/* handle, then the lens */}
      <g transform="rotate(42 128 100)">
        <rect x="128" y="93" width="50" height="15" rx="7.5" fill="var(--illu-body)" stroke={INK} strokeWidth="2.5" />
        <rect x="128" y="93" width="13" height="15" rx="5" fill="var(--illu-body-deep)" stroke={INK} strokeWidth="2.5" />
      </g>
      <circle cx="90" cy="64" r="42" fill="var(--illu-paper)" stroke={INK} strokeWidth="3.2" />
      <circle cx="90" cy="64" r="42" fill="var(--illu-paper-shade)" fillOpacity="0.55" stroke="none" />
      <path d="M60 46 Q68 33 84 28" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" />
      <text
        x="90"
        y="82"
        textAnchor="middle"
        fontSize="54"
        fill="var(--cat-moss)" fillOpacity="0.9"
        style={{ fontFamily: "var(--font-serif)", fontWeight: 500 }}
      >
        ?
      </text>

      <path d="M162 22 l2 5.2 5.2 2 -5.2 2 -2 5.2 -2 -5.2 -5.2 -2 5.2 -2z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

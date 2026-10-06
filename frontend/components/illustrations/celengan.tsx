import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/**
 * A celengan: the clay piggy bank people in Indonesia have saved coins in for generations. Flat shapes, forest-ink lines,
 * terracotta from the app's own clay colour, and a four-petal kawung flower painted on its flank. On first sight a coin
 * drops into the slot and the pig gives a small squash; after that a coin waits above the slot. Drawn here, not an icon.
 */
export function CelenganArt({ className, still = false }: { className?: string; still?: boolean }) {
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
      <ellipse cx="100" cy="139" rx="68" ry="6.5" fill="var(--illu-ground)" />

      <g className={still ? undefined : "illu-body"}>
        {/* legs: the far pair is deeper clay, and all four tuck under the belly */}
        <rect x="74" y="104" width="20" height="31" rx="9" fill="var(--illu-body-deep)" stroke={INK} strokeWidth="2.5" />
        <rect x="112" y="104" width="20" height="31" rx="9" fill="var(--illu-body-deep)" stroke={INK} strokeWidth="2.5" />
        <rect x="50" y="104" width="22" height="32" rx="10" fill="var(--illu-body)" stroke={INK} strokeWidth="2.5" />
        <rect x="134" y="104" width="22" height="32" rx="10" fill="var(--illu-body)" stroke={INK} strokeWidth="2.5" />

        {/* tail */}
        <path d="M31 85 C20 90 13 80 19 73 C24 68 33 70 31 77 C30 80 25 80 25 77" stroke={INK} strokeWidth="2.5" />

        {/* body */}
        <path
          d="M30 86 C28 56 58 40 96 40 C124 40 146 50 156 64 C162 72 162 80 160 88 C156 108 132 124 96 124 C56 124 32 112 30 86 Z"
          fill="var(--illu-body)"
          stroke={INK}
          strokeWidth="2.5"
        />

        {/* a painted kawung flower on the flank, and a row of dots along the belly */}
        <g transform="translate(82 84)" fill="var(--illu-paint)" stroke={INK} strokeWidth="1.5">
          <ellipse cx="0" cy="-8" rx="3.8" ry="8" />
          <ellipse cx="0" cy="8" rx="3.8" ry="8" />
          <ellipse cx="-8" cy="0" rx="8" ry="3.8" />
          <ellipse cx="8" cy="0" rx="8" ry="3.8" />
          <circle cx="0" cy="0" r="2.2" fill={INK} stroke="none" />
        </g>
        <g fill="var(--illu-paint)" stroke="none">
          {[56, 68, 80, 92, 104, 116].map((x) => (
            <circle key={x} cx={x} cy="112" r="1.9" />
          ))}
        </g>

        {/* ear, snout, eye and cheek */}
        <path d="M126 49 C128 32 146 28 153 36 C153 46 145 56 134 58 Z" fill="var(--illu-body-deep)" stroke={INK} strokeWidth="2.5" />
        <rect x="155" y="73" width="24" height="31" rx="12" fill="var(--illu-body-deep)" stroke={INK} strokeWidth="2.5" />
        <ellipse cx="168" cy="84" rx="1.7" ry="2.7" fill={INK} stroke="none" />
        <ellipse cx="168" cy="94" rx="1.7" ry="2.7" fill={INK} stroke="none" />
        <path d="M141 73 Q146.5 67 152 73" stroke={INK} strokeWidth="2.6" />
        <circle cx="139" cy="88" r="6.5" fill="var(--cat-rose)" opacity="0.38" stroke="none" />

        {/* the coin slot */}
        <rect x="79" y="37" width="35" height="8.5" rx="4.25" fill="var(--illu-slot)" stroke="none" />
      </g>

      {/* the coin that drops in (it starts above the picture and disappears into the slot) */}
      <g className={still ? "hidden" : "illu-coin"}>
        <circle cx="97" cy="17" r="12.5" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.5" />
        <circle cx="97" cy="17" r="7.8" stroke="var(--illu-coin-rim)" strokeWidth="1.6" strokeDasharray="1.6 2.4" />
        <path d="M91.5 12.5 Q93.5 9.3 97.5 9" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" />
      </g>

      {/* the coin that waits above the slot, and two sparkles */}
      <g style={still ? undefined : { animation: "illu-coin-wait 500ms ease-out 1.25s both" }}>
        <circle cx="97" cy="20" r="12.5" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.5" />
        <circle cx="97" cy="20" r="7.8" stroke="var(--illu-coin-rim)" strokeWidth="1.6" strokeDasharray="1.6 2.4" />
        <path d="M91.5 15.5 Q93.5 12.3 97.5 12" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" />
      </g>
      <path d="M160 18 l2.2 5.8 5.8 2.2 -5.8 2.2 -2.2 5.8 -2.2 -5.8 -5.8 -2.2 5.8 -2.2z" fill="var(--illu-spark)" stroke="none" />
      <path d="M42 34 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

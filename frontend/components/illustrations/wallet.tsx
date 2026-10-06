import { cn } from "@/lib/utils"

const INK = "var(--illu-ink)"

/** A small clay-coloured wallet with its flap shut by a coin, a banknote peeking out and a coin on the ground: a wallet with nothing in its list yet. */
export function WalletArt({ className }: { className?: string }) {
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
      <ellipse cx="100" cy="139" rx="70" ry="6" fill="var(--illu-ground)" />

      {/* a banknote peeking out of the top */}
      <g transform="rotate(-7 100 52)">
        <rect x="58" y="26" width="86" height="50" rx="5" fill="var(--illu-paper-shade)" stroke={INK} strokeWidth="2.5" />
        <rect x="64" y="32" width="74" height="38" rx="3" stroke="var(--cat-moss)" strokeWidth="1.7" />
        <circle cx="101" cy="51" r="10" stroke="var(--cat-moss)" strokeWidth="1.7" />
        <circle cx="101" cy="51" r="4" fill="var(--cat-moss)" stroke="none" />
        <path d="M70 40 H82 M70 46 H78 M120 56 H132 M124 62 H132" stroke="var(--cat-moss)" strokeWidth="1.7" strokeOpacity="0.7" />
      </g>

      {/* the wallet: body, then the flap */}
      <rect x="30" y="58" width="140" height="70" rx="15" fill="var(--illu-body)" stroke={INK} strokeWidth="2.5" />
      <rect x="37" y="104" width="126" height="17" rx="8" stroke="var(--illu-paint)" strokeWidth="1.8" strokeDasharray="1.8 4.2" />
      <path
        d="M30 74 Q30 58 46 58 H154 Q170 58 170 74 V82 Q170 98 154 98 H46 Q30 98 30 82 Z"
        fill="var(--illu-body-deep)"
        stroke={INK}
        strokeWidth="2.5"
      />

      {/* a painted kawung flower on the flap */}
      <g transform="translate(56 78)" fill="var(--illu-paint)" stroke={INK} strokeWidth="1.4">
        <ellipse cx="0" cy="-6" rx="2.9" ry="6" />
        <ellipse cx="0" cy="6" rx="2.9" ry="6" />
        <ellipse cx="-6" cy="0" rx="6" ry="2.9" />
        <ellipse cx="6" cy="0" rx="6" ry="2.9" />
        <circle cx="0" cy="0" r="1.7" fill={INK} stroke="none" />
      </g>

      {/* the coin that shuts it */}
      <circle cx="100" cy="98" r="12.5" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.5" />
      <circle cx="100" cy="98" r="7.6" stroke="var(--illu-coin-rim)" strokeWidth="1.6" strokeDasharray="1.6 2.4" />
      <path d="M94.5 93.5 Q96.5 90.3 100.5 90" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.7" />

      {/* a coin on the ground, and two sparkles */}
      <circle cx="184" cy="127" r="8.5" fill="var(--illu-coin)" stroke={INK} strokeWidth="2.3" />
      <circle cx="184" cy="127" r="4.8" stroke="var(--illu-coin-rim)" strokeWidth="1.4" strokeDasharray="1.4 2.2" />
      <path d="M168 20 l2 5.2 5.2 2 -5.2 2 -2 5.2 -2 -5.2 -5.2 -2 5.2 -2z" fill="var(--illu-spark)" stroke="none" />
      <path d="M32 36 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6z" fill="var(--illu-spark)" stroke="none" />
    </svg>
  )
}

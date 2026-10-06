/**
 * A round seal for the balance card, like the one on a banknote: two fine rings, "KAYA" running round the edge, and
 * the orange K coin in the middle. It is a watermark, so it is quiet; its colour is the text colour around it.
 */
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden focusable="false" data-decorative className={className}>
      <defs>
        <path id="seal-ring" d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      <circle cx="60" cy="60" r="52.5" fill="none" stroke="currentColor" strokeWidth="0.9" strokeDasharray="1.2 3" opacity="0.55" />
      <text fontSize="9.4" fontWeight="600" fill="currentColor" opacity="0.62" style={{ fontFamily: "var(--font-sans)" }}>
        <textPath href="#seal-ring" textLength="254" lengthAdjust="spacing">
          KAYA · NABUNG · BEGO · NABUNG ·
        </textPath>
      </text>
      <circle cx="60" cy="60" r="31" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="60" cy="60" r="24" fill="var(--highlight)" opacity="0.8" />
      <circle cx="60" cy="60" r="20" fill="none" stroke="var(--highlight-foreground)" strokeWidth="1.1" strokeDasharray="1.3 2.4" opacity="0.5" />
      <text x="60" y="68.5" textAnchor="middle" fontSize="23" fontWeight="600" fill="var(--highlight-foreground)" style={{ fontFamily: "var(--font-serif)" }}>
        K
      </text>
    </svg>
  )
}

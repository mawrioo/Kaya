"use client"

import { useId } from "react"

import { Ear, FrontPet } from "@/components/mascot/pet-front"
import { EAR, EYE, Eye, INK, LINE, Snout, Sparkles, Tear, useRandomBlink } from "@/components/mascot/pet-parts"
import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

/**
 * The pet ("Pink god", chosen by the owner on 12 Oct 2026): built on the front-facing pig (pet-front.tsx), it turns into a
 * different creature at each level. Thriving, a pink god meditating in a cloud with a halo; happy, a beaming pig hugging a
 * gold coin with hearts floating up; okay, the pig smiling with a butterfly near its head; wilting, cracked with a plaster
 * under a rain cloud; melted, broken into pieces with its ghost floating up.
 */
export function GodPet({ mood, label, className }: { mood: PetMood; label?: string; className?: string }) {
  if (mood === "thriving") return <PinkGod label={label} className={className} />
  if (mood === "melted") return <BrokenPig label={label} className={className} />
  if (mood === "happy") return <FrontPet mood="happy" label={label} className={className} onBody={<HugCoin />} above={<Hearts />} />
  if (mood === "wilting") return <FrontPet mood="wilting" label={label} className={className} onBody={<Cracks />} above={<RainCloud x={100} y={20} />} />
  return <FrontPet mood="okay" label={label} className={className} above={<Butterfly x={128} y={30} />} />
}

function Frame({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 200 172"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pet-art h-auto w-48 max-w-full overflow-visible", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" })}
    >
      {children}
    </svg>
  )
}

/* ------------------------------------------------------------------ the pink god */

const SIT_BODY = "M100 40 C140 40 166 60 166 90 C166 118 140 134 100 134 C60 134 34 118 34 90 C34 60 60 40 100 40 Z"
const FRONT_CLOUD =
  "M38 152 C26 152 26 134 40 134 C42 122 60 120 66 128 C72 117 92 117 98 126 C104 117 124 117 130 126 C138 118 156 122 158 134 C172 134 174 152 162 152 Z"
const CLOUD =
  "M24 160 C10 160 10 142 26 141 C26 128 46 124 54 134 C60 121 82 119 90 131 C98 121 118 121 122 133 C130 123 152 125 152 139 C166 133 184 143 176 156 C182 163 174 168 166 166 L34 166 C26 168 20 165 24 160 Z"

function PinkGod({ label, className }: { label?: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const skin = "var(--pet-pink-bright)"
  return (
    <Frame label={label} className={className}>
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0" style={{ stopColor: "var(--pet-aura)", stopOpacity: 0.75 }} />
          <stop offset="0.6" style={{ stopColor: "var(--pet-aura)", stopOpacity: 0.25 }} />
          <stop offset="1" style={{ stopColor: "var(--pet-aura)", stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id={`${id}-light`} cx="0.5" cy="0.25" r="0.85">
          <stop offset="0" style={{ stopColor: "#fff", stopOpacity: 0.3 }} />
          <stop offset="0.4" style={{ stopColor: "#fff", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "var(--pet-shade)", stopOpacity: 0.25 }} />
        </radialGradient>
      </defs>

      {/* a soft glow that breathes with it */}
      <circle className="pet-aura" cx="100" cy="84" r="88" fill={`url(#${id}-aura)`} />

      {/* small clouds drifting at the sides */}
      <g className="pet-coin pet-late">
        <SmallCloud x={18} y={62} />
      </g>
      <g className="pet-coin pet-later">
        <SmallCloud x={170} y={44} />
      </g>

      <g className="pet-float">
        <path d={CLOUD} fill="var(--pet-cloud)" />
        <path d={CLOUD} stroke={INK} strokeWidth={LINE} />

        <g className="pet-calm-breathe">
          <Ear x={64} y={48} turn={-18} twitch fill={skin} inner="var(--pet-pink-deep)" side="l" />
          <Ear x={136} y={48} turn={-18} twitch fill={skin} inner="var(--pet-pink-deep)" side="r" mirror />
          <path d={SIT_BODY} fill={skin} />
          <path d={SIT_BODY} fill={`url(#${id}-light)`} />
          <path d={SIT_BODY} stroke={INK} strokeWidth={LINE} />

          <g className="pet-look">
            <g fill="var(--pet-blush)" opacity="0.6">
              <ellipse cx="58" cy="102" rx="9" ry="5.6" />
              <ellipse cx="142" cy="102" rx="9" ry="5.6" />
            </g>
            {/* eyes closed in calm, a small smile; pointed at, it opens one eye for a peek (CSS: .pet-peek) */}
            <g className="pet-look-eyes">
              <path d="M68 84 Q76 90 84 84" stroke={INK} strokeWidth="3" />
              <path className="pet-peek-hide" d="M116 84 Q124 90 132 84" stroke={INK} strokeWidth="3" />
              <g className="pet-peek">
                <ellipse cx="124" cy="83" rx="7" ry="8.6" fill={EYE} />
                <circle cx="121.8" cy="80" r="2.5" fill="#fff" />
              </g>
            </g>
            <path d="M70 76 q6 -3 12 0 M118 76 q6 -3 12 0" stroke={INK} strokeWidth="1.6" opacity="0.5" />
            <Snout at={[100, 101]} scale={0.95} fill="var(--pet-pink-deep)" />
            <path d="M94 117 Q100 121 106 117" stroke={INK} strokeWidth="2.4" />
          </g>
        </g>

        {/* no legs: the bottom of it is sunk in the cloud, and its hands rest on the cloud's top */}
        <path d={FRONT_CLOUD} fill="var(--pet-cloud)" />
        <path d={FRONT_CLOUD} stroke={INK} strokeWidth={LINE} />
        <ellipse cx="45" cy="121" rx="17" ry="6.5" transform="rotate(70 45 121)" fill={skin} stroke={INK} strokeWidth={LINE} />
        <ellipse cx="155" cy="121" rx="17" ry="6.5" transform="rotate(-70 155 121)" fill={skin} stroke={INK} strokeWidth={LINE} />
        <circle cx="51" cy="137" r="4.6" fill="var(--pet-pink-deep)" stroke={INK} strokeWidth="1.5" />
        <circle cx="149" cy="137" r="4.6" fill="var(--pet-pink-deep)" stroke={INK} strokeWidth="1.5" />

        {/* puffs in front, so it sits in the cloud rather than on it */}
        <SmallCloud x={44} y={156} />
        <SmallCloud x={156} y={157} />

        <Halo cx={100} cy={0} />
      </g>

      {/* petals drifting down */}
      <g fill="var(--pet-petal)" stroke={INK} strokeWidth="0.9">
        <ellipse className="pet-petal" cx="28" cy="96" rx="3.2" ry="2" transform="rotate(30 28 96)" />
        <ellipse className="pet-petal pet-late" cx="176" cy="92" rx="3.2" ry="2" transform="rotate(-20 176 92)" />
        <ellipse className="pet-petal pet-later" cx="150" cy="18" rx="2.6" ry="1.7" />
        <ellipse className="pet-petal pet-late" cx="46" cy="24" rx="2.6" ry="1.7" transform="rotate(50 46 24)" />
      </g>
      <Sparkles />
    </Frame>
  )
}

function Halo({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="pet-halo">
      <ellipse cx={cx} cy={cy} rx="27" ry="7" stroke="var(--pet-ray)" strokeWidth="8" opacity="0.5" />
      <ellipse cx={cx} cy={cy} rx="27" ry="7" stroke="var(--pet-gold)" strokeWidth="3.6" />
      <ellipse cx={cx} cy={cy} rx="27" ry="7" stroke={INK} strokeWidth="1" opacity="0.5" />
    </g>
  )
}

function SmallCloud({ x, y }: { x: number; y: number }) {
  const d = `M${x - 14} ${y + 4} C${x - 20} ${y + 4} ${x - 20} ${y - 4} ${x - 13} ${y - 4} C${x - 12} ${y - 11} ${x - 2} ${y - 12} ${x + 1} ${y - 6} C${x + 5} ${y - 11} ${x + 15} ${y - 8} ${x + 13} ${y - 2} C${x + 20} ${y - 2} ${x + 20} ${y + 4} ${x + 14} ${y + 4} Z`
  return (
    <g>
      <path d={d} fill="var(--pet-cloud)" />
      <path d={d} stroke={INK} strokeWidth="1.8" />
    </g>
  )
}

/* ------------------------------------------------------------------ happy, okay and wilting extras */

/** Happy: it hugs a gold coin to its tummy. */
function HugCoin() {
  return (
    <g>
      <circle cx="100" cy="150" r="12" fill="var(--pet-gold)" stroke={INK} strokeWidth="1.8" />
      <circle cx="100" cy="150" r="7" stroke="var(--pet-gold-deep)" strokeWidth="1.6" />
      <path d="M93 144 q3 -3 8 -3" stroke="#fff" strokeWidth="1.6" opacity="0.8" />
      <ellipse cx="80" cy="142" rx="13" ry="5.5" transform="rotate(35 80 142)" fill="var(--pet-pink-bright)" stroke={INK} strokeWidth={LINE} />
      <ellipse cx="120" cy="142" rx="13" ry="5.5" transform="rotate(-35 120 142)" fill="var(--pet-pink-bright)" stroke={INK} strokeWidth={LINE} />
      <circle cx="89" cy="148" r="3.6" fill="var(--pet-pink-deep)" stroke={INK} strokeWidth="1.3" />
      <circle cx="111" cy="148" r="3.6" fill="var(--pet-pink-deep)" stroke={INK} strokeWidth="1.3" />
    </g>
  )
}

/** Happy: little hearts floating up. */
function Hearts() {
  const heart = (x: number, y: number, k: number) =>
    `M${x} ${y} c${-2 * k} ${-3 * k} ${-7 * k} ${-3 * k} ${-7 * k} ${k} c0 ${3 * k} ${4 * k} ${5 * k} ${7 * k} ${8 * k} c${3 * k} ${-3 * k} ${7 * k} ${-5 * k} ${7 * k} ${-8 * k} c0 ${-4 * k} ${-5 * k} ${-4 * k} ${-7 * k} ${-k} Z`
  return (
    <g fill="var(--pet-heart)" stroke={INK} strokeWidth="1.2">
      <path className="pet-heart" d={heart(36, 50, 1)} />
      <path className="pet-heart pet-late" d={heart(166, 44, 0.85)} />
      <path className="pet-heart pet-later" d={heart(150, 16, 0.65)} />
    </g>
  )
}

/** Okay: a butterfly visiting, near its head. */
function Butterfly({ x, y }: { x: number; y: number }) {
  return (
    <g className="pet-coin">
      <g transform={`translate(${x} ${y}) rotate(-12)`}>
        <g className="pet-flutter" fill="var(--pet-petal)" stroke={INK} strokeWidth="1">
          <ellipse cx="-4.6" cy="-2.4" rx="5" ry="4" transform="rotate(-30 -4.6 -2.4)" />
          <ellipse cx="4.6" cy="-2.4" rx="5" ry="4" transform="rotate(30 4.6 -2.4)" />
          <ellipse cx="-3.4" cy="3.2" rx="3" ry="2.4" />
          <ellipse cx="3.4" cy="3.2" rx="3" ry="2.4" />
        </g>
        <path d="M0 -5 v10 M0 -5 l-2.5 -4 M0 -5 l2.5 -4" stroke={INK} strokeWidth="1.4" />
      </g>
    </g>
  )
}

/** Cracks across the body, and a plaster over one. */
function Cracks() {
  return (
    <g>
      <path d="M128 64 l-5 9 l6 6 l-5 11 l4 5" stroke={INK} strokeWidth="1.8" />
      <path d="M44 104 l8 3 l-2 8 l8 5" stroke={INK} strokeWidth="1.8" />
      <path d="M150 126 l-7 3 l2 6" stroke={INK} strokeWidth="1.6" />
      <g transform="translate(130 84) rotate(-32)">
        <rect x="-13" y="-5" width="26" height="10" rx="3" fill="var(--pet-plaster)" stroke={INK} strokeWidth="1.4" />
        <rect x="-4.5" y="-5" width="9" height="10" fill="var(--pet-plaster-pad)" />
        <rect x="-13" y="-5" width="26" height="10" rx="3" stroke={INK} strokeWidth="1.4" />
      </g>
    </g>
  )
}

function RainCloud({ x, y }: { x: number; y: number }) {
  const d = `M${x - 30} ${y + 8} C${x - 40} ${y + 8} ${x - 40} ${y - 6} ${x - 28} ${y - 6} C${x - 26} ${y - 18} ${x - 8} ${y - 20} ${x - 3} ${y - 10} C${x + 4} ${y - 20} ${x + 24} ${y - 16} ${x + 24} ${y - 4} C${x + 36} ${y - 6} ${x + 40} ${y + 8} ${x + 28} ${y + 8} Z`
  return (
    <g>
      <g stroke="var(--pet-rain)" strokeWidth="2">
        {[-20, -6, 8, 22].map((dx, i) => (
          <path key={dx} className={cn("pet-rain", i % 2 && "pet-late", i === 2 && "pet-later")} d={`M${x + dx} ${y + 13} l-2 7`} />
        ))}
      </g>
      <path d={d} fill="var(--pet-rain-cloud)" />
      <path d={d} stroke={INK} strokeWidth="1.8" />
    </g>
  )
}

/* ------------------------------------------------------------------ broken */

const SHARD = "M48 152 C44 126 56 104 72 98 L80 108 L90 96 L100 106 L110 94 L120 106 L130 98 C146 106 156 126 152 152 Z"

/** Melted: the clay pig has broken. The bottom half sits in a puddle with its sad face, pieces around it, and its ghost rises. */
function BrokenPig({ label, className }: { label?: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const blinking = useRandomBlink(true)
  const clay = "var(--pet-clay-dull)"
  return (
    <Frame label={label} className={className}>
      <ellipse cx="100" cy="154" rx="90" ry="10" fill="var(--pet-puddle)" opacity="0.55" />

      {/* the ghost, floating up out of it */}
      <g className="pet-ghost">
        <path d="M83 54 l1 -13 l10 7 Z M117 54 l-1 -13 l-10 7 Z" fill="var(--pet-ghost)" stroke={INK} strokeWidth="1.4" opacity="0.8" />
        <path
          d="M78 66 C76 42 124 42 122 66 L122 82 q-5.5 6 -11 0 q-5.5 6 -11 0 q-5.5 6 -11 0 q-5.5 6 -11 0 Z"
          fill="var(--pet-ghost)"
          stroke={INK}
          strokeWidth="1.4"
          opacity="0.8"
        />
        <path d="M88 58 q3 3 6 0 M106 58 q3 3 6 0" stroke={INK} strokeWidth="1.6" opacity="0.7" />
        <ellipse cx="100" cy="68" rx="6" ry="4" stroke={INK} strokeWidth="1.3" opacity="0.6" />
      </g>

      {/* pieces lying about */}
      <g fill={clay} stroke={INK} strokeWidth="2">
        <path d="M14 154 L22 136 L40 132 L46 152 Z" />
        <path d="M156 154 L162 140 L180 142 L186 154 Z" />
        <path d="M58 160 l6 -7 l7 5 Z" />
        <path d="M134 162 l5 -6 l6 4 Z" />
      </g>
      <g transform="translate(28 138) rotate(-64)">
        <path d={EAR} fill={clay} />
        <path d={EAR} stroke={INK} strokeWidth="2" />
      </g>

      <g className="pet-calm-ooze">
        <path d={SHARD} fill={clay} />
        <path d={SHARD} stroke={INK} strokeWidth={LINE} />
        <path d="M66 118 l6 8 l-3 9 M138 120 l-5 7" stroke={INK} strokeWidth="1.6" opacity="0.6" />
        <g className="pet-look">
          <g className="pet-look-eyes">
            <Eye id={`${id}-l`} at={[84, 122]} rx={6.5} ry={8} mood="melted" blinking={blinking} inner={1} />
            <Eye id={`${id}-r`} at={[116, 122]} rx={6.5} ry={8} mood="melted" blinking={blinking} inner={-1} />
          </g>
          <Snout at={[100, 138]} scale={0.7} fill="var(--pet-clay-deep)" />
          <Tear x={81} y={130} />
        </g>
      </g>

      <RainCloud x={150} y={22} />
    </Frame>
  )
}

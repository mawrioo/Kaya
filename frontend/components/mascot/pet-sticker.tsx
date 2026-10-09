"use client"

import { useId } from "react"

import { EYE, Fly, INK, Sparkles, Stink, Tear, useRandomBlink } from "@/components/mascot/pet-parts"
import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

/** Where each state's face sits: the body sags lower as things get worse. */
const LAYOUT = {
  healthy: { eyeY: 92, eyeDX: 22, snoutY: 111, mouthY: 129, cheekY: 113, earY: 54, earDX: 31, droop: 0 },
  wilting: { eyeY: 101, eyeDX: 23, snoutY: 119, mouthY: 136, cheekY: 121, earY: 72, earDX: 46, droop: -100 },
  melted: { eyeY: 108, eyeDX: 21, snoutY: 124, mouthY: 140, cheekY: 126, earY: 104, earDX: 42, droop: -128 },
} as const

const BODY = {
  healthy: "M100 46 C142 46 164 70 164 100 C164 130 138 148 100 148 C62 148 36 130 36 100 C36 70 58 46 100 46 Z",
  wilting: "M100 60 C139 60 160 80 165 108 C170 136 143 151 100 151 C57 151 30 136 35 108 C40 80 61 60 100 60 Z",
  melted:
    "M100 86 C126 86 143 99 147 116 C149 127 157 133 173 138 C189 143 186 154 167 154 L33 154 C14 154 11 143 27 138 C43 133 51 127 53 116 C57 99 74 86 100 86 Z",
} as const

/**
 * The pet as first drawn ("Now" in Compare options): seen straight on, a thick brown outline, flat candy colours and big
 * shiny eyes, from thriving (bright pink, hopping) down to melted (an olive puddle with flies).
 */
export function StickerPet({ mood, label, className }: { mood: PetMood; label?: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const blinking = useRandomBlink(mood !== "thriving")

  const shape = mood === "melted" ? "melted" : mood === "wilting" ? "wilting" : "healthy"
  const at = LAYOUT[shape]
  const skin = {
    thriving: "var(--pet-pink-bright)",
    happy: "var(--pet-pink)",
    okay: "var(--pet-pink-soft)",
    wilting: `url(#${id}-wilt)`,
    melted: "var(--pet-olive)",
  }[mood]
  const snout = { healthy: "var(--pet-pink-deep)", wilting: "var(--pet-mustard-deep)", melted: "var(--pet-olive-deep)" }[shape]
  // Two layers of movement: a slow sway around its feet, and inside it the breathing, bouncing or oozing.
  const sway = { thriving: "pet-sway-quick", happy: "pet-sway", okay: "pet-sway", wilting: "pet-sway-slow", melted: undefined }[mood]
  const motion = { thriving: "pet-hop", happy: "pet-bob", okay: "pet-breathe", wilting: "pet-sigh", melted: "pet-ooze" }[mood]
  const lively = mood === "thriving" || mood === "happy" || mood === "okay"

  return (
    <svg
      viewBox="0 0 200 172"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-auto w-48 max-w-full overflow-visible", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" })}
    >
      <defs>
        {/* Wilting: still pink low on the left, turning mustard from the top right */}
        <linearGradient id={`${id}-wilt`} x1="0.1" y1="0.9" x2="0.9" y2="0.1">
          <stop offset="0.25" style={{ stopColor: "var(--pet-pink)" }} />
          <stop offset="0.62" style={{ stopColor: "var(--pet-mustard)" }} />
        </linearGradient>
      </defs>

      <ellipse
        cx="100"
        cy={shape === "melted" ? 157 : 161}
        rx={shape === "melted" ? 84 : 58}
        ry="7"
        fill="var(--pet-shadow)"
        className={mood === "thriving" ? "pet-hop-shadow" : undefined}
      />

      {mood === "melted" ? <Stink /> : null}

      <g className={sway}>
        <g className={motion}>
          {shape !== "melted" ? (
            <>
              <Leg x={80} short={shape === "wilting"} fill={shape === "wilting" ? "var(--pet-mustard)" : skin} />
              <Leg x={120} short={shape === "wilting"} fill={shape === "wilting" ? "var(--pet-mustard)" : skin} />
            </>
          ) : null}

          <Ear x={100 - at.earDX} y={at.earY} side="left" droop={at.droop} twitch={lively} fill={mood === "wilting" ? "var(--pet-pink)" : skin} inner={snout} />
          <Ear x={100 + at.earDX} y={at.earY} side="right" droop={at.droop} twitch={lively} fill={mood === "wilting" ? "var(--pet-mustard)" : skin} inner={snout} />

          <path d={BODY[shape]} fill={skin} stroke={INK} strokeWidth="3.5" />

          {/* a few patches as it goes off, and a crease where it has slumped */}
          {mood === "wilting" ? (
            <g fill="var(--pet-mustard-deep)" opacity="0.45">
              <ellipse cx="138" cy="84" rx="9" ry="6" transform="rotate(-20 138 84)" />
              <ellipse cx="150" cy="104" rx="4.5" ry="3.5" />
            </g>
          ) : null}
          {mood === "melted" ? (
            <g>
              <g fill="var(--pet-olive-deep)" opacity="0.4">
                <ellipse cx="72" cy="100" rx="9" ry="5.5" transform="rotate(-25 72 100)" />
                <ellipse cx="133" cy="134" rx="8" ry="4.5" />
                <ellipse cx="44" cy="146" rx="6" ry="3" />
              </g>
              <path d="M118 92 C122 100 121 108 117 113" stroke={INK} strokeWidth="2.4" opacity="0.5" />
            </g>
          ) : null}

          <Cheeks y={at.cheekY} mood={mood} />
          <Eyes id={id} y={at.eyeY} dx={at.eyeDX} mood={mood} blinking={blinking} />
          <Snout y={at.snoutY} fill={snout} small={shape === "melted"} />
          <Mouth y={at.mouthY} mood={mood} />
          {mood === "melted" ? (
            <>
              <Tear x={100 - at.eyeDX - 4} y={at.eyeY + 10} />
              <circle className="pet-bubble" cx="148" cy="145" r="4" fill="var(--pet-olive)" stroke={INK} strokeWidth="1.8" />
            </>
          ) : null}
        </g>
      </g>

      {mood === "melted" ? (
        <>
          <ellipse cx="186" cy="152" rx="5" ry="3" fill="var(--pet-olive)" stroke={INK} strokeWidth="2" />
          <Fly x={34} y={58} trail="M40 70 C48 80 30 88 22 78" />
          <Fly x={162} y={40} trail="M156 50 C148 62 166 70 172 60" late />
          <Fly x={176} y={92} trail="M170 100 C160 108 174 118 182 110" later />
        </>
      ) : null}
      {mood === "thriving" ? <Sparkles /> : null}
    </svg>
  )
}

function Leg({ x, short, fill }: { x: number; short: boolean; fill: string }) {
  return <rect x={x - 10} y={short ? 138 : 132} width="20" height={short ? 22 : 28} rx="9" fill={fill} stroke={INK} strokeWidth="3.5" />
}

function Ear({
  x,
  y,
  side,
  droop,
  twitch,
  fill,
  inner,
}: {
  x: number
  y: number
  side: "left" | "right"
  droop: number
  twitch: boolean
  fill: string
  inner: string
}) {
  // Drawn as the left ear; the right one is the same ear mirrored. A drooping ear tips outwards and down.
  return (
    <g transform={`translate(${x} ${y}) scale(${side === "right" ? -1 : 1} 1) rotate(${droop})`}>
      <g className={twitch ? (side === "left" ? "pet-ear-l" : "pet-ear-r") : undefined}>
        <path d="M-14 10 C-16 -8 -9 -22 1 -25 C9 -15 13 -3 12 10 Z" fill={fill} stroke={INK} strokeWidth="3.5" />
        <path d="M-7 6 C-8 -5 -4 -13 1 -15 C5 -8 7 -2 6 6 Z" fill={inner} opacity="0.7" />
      </g>
    </g>
  )
}

function Cheeks({ y, mood }: { y: number; mood: PetMood }) {
  if (mood === "melted") return null
  const opacity = { thriving: 0.75, happy: 0.6, okay: 0.32, wilting: 0.35 }[mood]
  return (
    <g fill="var(--pet-blush)" opacity={opacity}>
      <ellipse cx="62" cy={y} rx="9" ry="6" />
      <ellipse cx="138" cy={y} rx="9" ry="6" />
    </g>
  )
}

function Eyes({ id, y, dx, mood, blinking }: { id: string; y: number; dx: number; mood: PetMood; blinking: boolean }) {
  return (
    <g>
      <Eye id={`${id}-l`} x={100 - dx} y={y} mood={mood} blinking={blinking} inner={1} />
      <Eye id={`${id}-r`} x={100 + dx} y={y} mood={mood} blinking={blinking} inner={-1} />
    </g>
  )
}

/** inner: which way (+1 or −1 on x) points to the middle of the face. */
function Eye({ id, x, y, mood, blinking, inner }: { id: string; x: number; y: number; mood: PetMood; blinking: boolean; inner: 1 | -1 }) {
  if (mood === "thriving") {
    return <path d={`M${x - 8} ${y + 3} Q${x} ${y - 9} ${x + 8} ${y + 3}`} stroke={EYE} strokeWidth="4" />
  }

  const blink = blinking ? "pet-blink" : undefined
  if (mood === "happy" || mood === "okay") {
    const big = mood === "happy"
    return (
      <g transform={`translate(${x} ${y})`}>
        {/* now and then it glances to one side and the other */}
        <g className="pet-glance">
          <g className={blink}>
            <ellipse rx={big ? 8.5 : 8} ry={big ? 10.5 : 10} fill={EYE} />
            <circle cx="2.8" cy="-3.6" r={big ? 3.3 : 3} fill="#fff" />
            <circle cx="-2.6" cy="3.6" r={big ? 1.4 : 1.1} fill="#fff" opacity="0.85" />
          </g>
        </g>
      </g>
    )
  }

  // Wilting and melted: a heavy lid, lower on the outer side, under a worried brow (its inner end raised).
  const melted = mood === "melted"
  const outerLid = melted ? 2 : -1
  const innerLid = melted ? -3 : -7
  const lid = `M${-11 * inner} ${outerLid} L${11 * inner} ${innerLid}`
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={id}>
        <path d={`${lid} L${11 * inner} 14 L${-11 * inner} 14 Z`} />
      </clipPath>
      {melted ? <path d="M-8 12 Q0 16 8 12" stroke="var(--pet-olive-deep)" strokeWidth="3" /> : null}
      <g className={blink}>
        <g clipPath={`url(#${id})`}>
          <ellipse rx="8.5" ry="10.5" fill={EYE} />
          <circle cx={-2.5 * inner} cy={melted ? 4 : 1} r="2.4" fill="#fff" opacity="0.9" />
        </g>
        <path d={lid} stroke={INK} strokeWidth="3" />
      </g>
      <path d={`M${-9 * inner} -12 Q${-1 * inner} -14 ${7 * inner} -19`} stroke={INK} strokeWidth="3" />
    </g>
  )
}

function Snout({ y, fill, small }: { y: number; fill: string; small: boolean }) {
  const rx = small ? 13 : 16
  const ry = small ? 9 : 11
  return (
    <g>
      <ellipse cx="100" cy={y} rx={rx} ry={ry} fill={fill} stroke={INK} strokeWidth="3" />
      <ellipse cx={100 - rx * 0.36} cy={y + 1} rx="2.6" ry="3.6" fill={INK} />
      <ellipse cx={100 + rx * 0.36} cy={y + 1} rx="2.6" ry="3.6" fill={INK} />
    </g>
  )
}

function Mouth({ y, mood }: { y: number; mood: PetMood }) {
  switch (mood) {
    case "thriving":
      return (
        <g transform={`translate(100 ${y - 4})`}>
          <path d="M-13 -2 Q0 17 13 -2 Z" fill="var(--pet-mouth)" stroke={INK} strokeWidth="3" />
          <ellipse cx="0" cy="7.5" rx="5.5" ry="2.8" fill="var(--pet-blush)" />
        </g>
      )
    case "happy":
      return <path d={`M91 ${y - 2} Q100 ${y + 7} 109 ${y - 2}`} stroke={INK} strokeWidth="3.2" />
    case "okay":
      return <path d={`M94 ${y} Q100 ${y + 1.5} 106 ${y}`} stroke={INK} strokeWidth="3.2" />
    case "wilting":
      return <path d={`M91 ${y + 3} Q100 ${y - 5} 109 ${y + 3}`} stroke={INK} strokeWidth="3.2" />
    case "melted":
      return <path d={`M90 ${y + 4} Q100 ${y - 6} 110 ${y + 4}`} stroke={INK} strokeWidth="3.2" />
  }
}

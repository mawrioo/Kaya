"use client"

import { useId, type ReactNode } from "react"

import { EAR, EAR_INNER, Eye, Fly, INK, LINE, Leg, Mouth, Snout, Sparkles, Stink, Tear, useRandomBlink } from "@/components/mascot/pet-parts"
import type { Point } from "@/components/mascot/pet-parts"
import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

type Shape = "healthy" | "wilting" | "melted"

/** Seen straight from the front, so everything is mirrored about x = 100: two eyes, two ears, a centred snout. */
const POSE: Record<
  Shape,
  {
    body: string
    eyeX: number
    eyeY: number
    eyeScale: number
    snout: Point
    snoutScale: number
    mouth: Point
    cheekX: number
    cheekY: number
    earX: number
    earY: number
    earTurn: number
    legTop: number
    shadow: { cx: number; cy: number; rx: number }
  }
> = {
  healthy: {
    body: "M100 48 C142 48 170 70 170 102 C170 132 142 150 100 150 C58 150 30 132 30 102 C30 70 58 48 100 48 Z",
    eyeX: 26,
    eyeY: 92,
    eyeScale: 1,
    snout: [100, 113],
    snoutScale: 1,
    mouth: [100, 131],
    cheekX: 44,
    cheekY: 114,
    earX: 38,
    earY: 58,
    earTurn: -18,
    legTop: 132,
    shadow: { cx: 100, cy: 160, rx: 62 },
  },
  wilting: {
    body: "M100 60 C142 60 168 82 168 110 C168 138 142 152 100 152 C58 152 32 138 32 110 C32 82 58 60 100 60 Z",
    eyeX: 26,
    eyeY: 101,
    eyeScale: 1,
    snout: [100, 121],
    snoutScale: 1,
    mouth: [100, 138],
    cheekX: 44,
    cheekY: 122,
    earX: 36,
    earY: 74,
    earTurn: -100,
    legTop: 142,
    shadow: { cx: 100, cy: 160, rx: 64 },
  },
  melted: {
    body: "M100 86 C128 86 146 99 150 116 C152 127 160 133 176 138 C192 143 189 154 170 154 L30 154 C11 154 8 143 24 138 C40 133 48 127 50 116 C54 99 72 86 100 86 Z",
    eyeX: 21,
    eyeY: 109,
    eyeScale: 0.86,
    snout: [100, 125],
    snoutScale: 0.8,
    mouth: [100, 141],
    cheekX: 36,
    cheekY: 127,
    earX: 46,
    earY: 104,
    earTurn: -128,
    legTop: 0,
    shadow: { cx: 100, cy: 156, rx: 88 },
  },
}

/**
 * The pig drawn straight from the front: pet-god.tsx uses it for happy, okay and wilting and adds its own extras. Both
 * eyes, both ears and the snout are even; soft light from above, calm movement. Its face turns a little towards the
 * pointer (the `pet-look` groups, moved by pet.tsx).
 */
export function FrontPet({
  mood,
  label,
  className,
  behind,
  onBody,
  above,
}: {
  mood: PetMood
  label?: string
  className?: string
  /** Extra drawing for the god versions (pet-god.tsx): under the pig, on it (moving with it), and over everything. */
  behind?: ReactNode
  onBody?: ReactNode
  above?: ReactNode
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const blinking = useRandomBlink(mood !== "thriving")

  const shape: Shape = mood === "melted" ? "melted" : mood === "wilting" ? "wilting" : "healthy"
  const pose = POSE[shape]
  const skin = {
    thriving: "var(--pet-pink-bright)",
    happy: "var(--pet-pink-bright)",
    okay: "var(--pet-pink)",
    wilting: `url(#${id}-wilt)`,
    melted: "var(--pet-olive)",
  }[mood]
  const snout = { healthy: "var(--pet-pink-deep)", wilting: "var(--pet-mustard-deep)", melted: "var(--pet-olive-deep)" }[shape]
  const motion = { thriving: "pet-calm-hop", happy: "pet-calm-hop", okay: "pet-calm-breathe", wilting: "pet-calm-sigh", melted: "pet-calm-ooze" }[mood]
  const lively = shape === "healthy"
  const legFill = shape === "wilting" ? "var(--pet-mustard)" : skin
  const earFill = mood === "wilting" ? "var(--pet-mustard)" : skin
  const cheek = { thriving: 0.7, happy: 0.72, okay: 0.48, wilting: 0.32, melted: 0 }[mood]
  const eyeRx = 8 * pose.eyeScale
  const eyeRy = 10 * pose.eyeScale

  return (
    <svg
      viewBox="0 0 200 172"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pet-art h-auto w-48 max-w-full overflow-visible", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" })}
    >
      <defs>
        <linearGradient id={`${id}-wilt`} x1="0.1" y1="0.9" x2="0.9" y2="0.1">
          <stop offset="0.25" style={{ stopColor: "var(--pet-pink)" }} />
          <stop offset="0.62" style={{ stopColor: "var(--pet-mustard)" }} />
        </linearGradient>
        {/* Light from straight above, shade towards the bottom */}
        <radialGradient id={`${id}-light`} cx="0.5" cy="0.25" r="0.85">
          <stop offset="0" style={{ stopColor: "#fff", stopOpacity: 0.3 }} />
          <stop offset="0.38" style={{ stopColor: "#fff", stopOpacity: 0 }} />
          <stop offset="0.7" style={{ stopColor: "var(--pet-shade)", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "var(--pet-shade)", stopOpacity: 0.3 }} />
        </radialGradient>
        <radialGradient id={`${id}-cast`}>
          <stop offset="0" style={{ stopColor: "var(--pet-cast)", stopOpacity: "var(--pet-cast-strength)" }} />
          <stop offset="1" style={{ stopColor: "var(--pet-cast)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      <ellipse
        cx={pose.shadow.cx}
        cy={pose.shadow.cy}
        rx={pose.shadow.rx}
        ry="9"
        fill={`url(#${id}-cast)`}
        className={mood === "thriving" || mood === "happy" ? "pet-calm-hop-shadow" : undefined}
      />

      {mood === "melted" ? <Stink /> : null}
      {behind}

      <g className={motion}>
        {shape !== "melted" ? (
          <>
            <Leg x={68} top={pose.legTop} bottom={160} fill={legFill} />
            <Leg x={132} top={pose.legTop} bottom={160} fill={legFill} />
          </>
        ) : null}

        {/* a small curl peeking out on the right, behind the body */}
        {shape === "healthy" ? (
          <path className="pet-tail" d="M166 100 c9 -2 14 -9 10 -14 c-4 -5 -10 -1 -6 3 c2 2 6 1 6 -2" stroke={INK} strokeWidth={LINE} />
        ) : shape === "wilting" ? (
          <path d="M164 118 c7 1 10 5 9 10" stroke={INK} strokeWidth={LINE} />
        ) : null}

        <Ear x={100 - pose.earX} y={pose.earY} turn={pose.earTurn} twitch={lively} fill={earFill} inner={snout} side="l" />
        <Ear x={100 + pose.earX} y={pose.earY} turn={pose.earTurn} twitch={lively} fill={earFill} inner={snout} side="r" mirror />

        <path d={pose.body} fill={skin} />
        <path d={pose.body} fill={`url(#${id}-light)`} />
        <path d={pose.body} stroke={INK} strokeWidth={LINE} />

        {mood === "wilting" ? (
          <g fill="var(--pet-mustard-deep)" opacity="0.4">
            <ellipse cx="136" cy="84" rx="8" ry="5.5" transform="rotate(20 136 84)" />
            <ellipse cx="148" cy="100" rx="4" ry="3" />
          </g>
        ) : null}
        {mood === "melted" ? (
          <g>
            <g fill="var(--pet-olive-deep)" opacity="0.4">
              <ellipse cx="128" cy="104" rx="9" ry="5.5" transform="rotate(25 128 104)" />
              <ellipse cx="146" cy="138" rx="8" ry="4.5" />
              <ellipse cx="50" cy="146" rx="6" ry="3" />
            </g>
            <path d="M118 100 C122 106 121 112 117 116" stroke={INK} strokeWidth="1.8" opacity="0.45" />
          </g>
        ) : null}

        <g className="pet-look">
        {cheek > 0 ? (
          <g fill="var(--pet-blush)" opacity={cheek}>
            <ellipse cx={100 - pose.cheekX - 12} cy={pose.cheekY} rx="9" ry="5.8" />
            <ellipse cx={100 + pose.cheekX + 12} cy={pose.cheekY} rx="9" ry="5.8" />
          </g>
        ) : null}
        <g className="pet-look-eyes">
          <Eye id={`${id}-l`} at={[100 - pose.eyeX, pose.eyeY]} rx={eyeRx} ry={eyeRy} mood={mood} blinking={blinking} inner={1} />
          <Eye id={`${id}-r`} at={[100 + pose.eyeX, pose.eyeY]} rx={eyeRx} ry={eyeRy} mood={mood} blinking={blinking} inner={-1} />
        </g>
        <Snout at={pose.snout} scale={pose.snoutScale} fill={snout} />
        {mood === "okay" ? (
          // a small content smile
          <path d={`M${pose.mouth[0] - 6} ${pose.mouth[1] - 1} Q${pose.mouth[0]} ${pose.mouth[1] + 4} ${pose.mouth[0] + 6} ${pose.mouth[1] - 1}`} stroke={INK} strokeWidth="2.6" />
        ) : (
          <Mouth at={pose.mouth} mood={mood === "happy" ? "thriving" : mood} />
        )}
        {mood === "melted" ? (
          <>
            <Tear x={100 - pose.eyeX - 3} y={pose.eyeY + 7} />
            <circle className="pet-bubble" cx="148" cy="145" r="3.6" fill="var(--pet-olive)" stroke={INK} strokeWidth="1.4" />
          </>
        ) : null}
        </g>
        {onBody}
      </g>

      {mood === "melted" ? (
        <>
          <ellipse cx="186" cy="152" rx="5" ry="3" fill="var(--pet-olive)" stroke={INK} strokeWidth="1.6" />
          <Fly x={34} y={58} trail="M40 70 C48 80 30 88 22 78" />
          <Fly x={162} y={40} trail="M156 50 C148 62 166 70 172 60" late />
          <Fly x={176} y={92} trail="M170 100 C160 108 174 118 182 110" later />
        </>
      ) : null}
      {mood === "thriving" ? <Sparkles /> : null}
      {above}
    </svg>
  )
}

/** The left ear is the drawing as it is; the right one is the same ear mirrored about its own base. */
export function Ear({
  x,
  y,
  turn,
  twitch,
  fill,
  inner,
  side,
  mirror = false,
}: {
  x: number
  y: number
  turn: number
  twitch: boolean
  fill: string
  inner: string
  side: "l" | "r"
  mirror?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})${mirror ? " scale(-1 1)" : ""} rotate(${turn})`}>
      <g className={twitch ? (side === "r" ? "pet-ear-r" : "pet-ear-l") : undefined}>
        <path d={EAR} fill={fill} />
        <path d={EAR_INNER} fill={inner} opacity="0.65" />
        <path d={EAR} stroke={INK} strokeWidth={LINE} />
      </g>
    </g>
  )
}

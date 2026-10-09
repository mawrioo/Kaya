"use client"

import { useId } from "react"

import { EYE, Fly, INK, Sparkles, Stink, Tear, useRandomBlink } from "@/components/mascot/pet-parts"
import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

/** The outline: thinner than the sticker look's 3.5. */
const LINE = 2.4

type Shape = "healthy" | "wilting" | "melted"
type Point = readonly [number, number]
interface EarPose {
  x: number
  y: number
  /** Degrees; the far ear is mirrored first, so the same number tips it the other way. */
  turn: number
}

/**
 * Each shape, with the pig turned a little (about 20°) to the viewer's right: its face sits right of the body's middle,
 * the far eye and ear are smaller than the near ones, and the snout leans that way. The body sags as things get worse.
 */
const POSE: Record<
  Shape,
  {
    body: string
    nearEye: Point
    farEye: Point
    eyeScale: number
    snout: Point
    snoutScale: number
    mouth: Point
    nearCheek: Point
    farCheek: Point
    nearEar: EarPose
    farEar: EarPose
    legTop: number
    sprout: Point
    shadow: { cx: number; cy: number; rx: number }
  }
> = {
  healthy: {
    body: "M96 48 C138 46 166 70 166 101 C166 131 138 150 98 150 C58 150 30 133 30 101 C30 70 56 50 96 48 Z",
    nearEye: [101, 90],
    farEye: [137, 88],
    eyeScale: 1,
    snout: [122, 110],
    snoutScale: 1,
    mouth: [121, 129],
    nearCheek: [82, 112],
    farCheek: [151, 109],
    nearEar: { x: 68, y: 55, turn: -14 },
    farEar: { x: 126, y: 51, turn: -8 },
    legTop: 132,
    sprout: [104, 51],
    shadow: { cx: 106, cy: 160, rx: 62 },
  },
  wilting: {
    body: "M96 60 C137 60 160 81 165 109 C170 137 142 152 98 152 C55 152 29 137 33 109 C37 81 58 60 96 60 Z",
    nearEye: [102, 101],
    farEye: [137, 100],
    eyeScale: 1,
    snout: [122, 119],
    snoutScale: 1,
    mouth: [121, 136],
    nearCheek: [84, 121],
    farCheek: [151, 118],
    nearEar: { x: 62, y: 74, turn: -100 },
    farEar: { x: 134, y: 68, turn: -84 },
    legTop: 142,
    sprout: [104, 63],
    shadow: { cx: 104, cy: 160, rx: 64 },
  },
  melted: {
    body: "M100 86 C126 86 143 99 147 116 C149 127 157 133 173 138 C189 143 186 154 167 154 L33 154 C14 154 11 143 27 138 C43 133 51 127 53 116 C57 99 74 86 100 86 Z",
    nearEye: [106, 109],
    farEye: [134, 108],
    eyeScale: 0.86,
    snout: [121, 124],
    snoutScale: 0.8,
    mouth: [120, 140],
    nearCheek: [86, 126],
    farCheek: [148, 124],
    nearEar: { x: 64, y: 104, turn: -128 },
    farEar: { x: 140, y: 101, turn: -120 },
    legTop: 0,
    sprout: [100, 89],
    shadow: { cx: 102, cy: 156, rx: 88 },
  },
}

const EAR = "M-13 9 C-15 -8 -8 -21 2 -24 C9 -14 12 -3 11 9 Z"
const EAR_INNER = "M-6.5 5.5 C-7.5 -4.5 -3.5 -12.5 1 -14 C4.5 -7.5 6.5 -2 5.5 5.5 Z"

/**
 * The pet redrawn ("Remake" in Compare options): the same pig and colours as the sticker look, but turned a little, with
 * soft light from the top left and a shadow under it, a thinner outline, gentler movement, and the same colours in light
 * and dark mode. A sprout on its head tells the month too: a flower when thriving, drooping when wilting, fallen when melted.
 */
export function RemakePet({ mood, label, className }: { mood: PetMood; label?: string; className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "")
  const blinking = useRandomBlink(mood !== "thriving")

  const shape: Shape = mood === "melted" ? "melted" : mood === "wilting" ? "wilting" : "healthy"
  const pose = POSE[shape]
  const skin = {
    thriving: "var(--pet-pink-bright)",
    happy: "var(--pet-pink)",
    okay: "var(--pet-pink-soft)",
    wilting: `url(#${id}-wilt)`,
    melted: "var(--pet-olive)",
  }[mood]
  const snout = { healthy: "var(--pet-pink-deep)", wilting: "var(--pet-mustard-deep)", melted: "var(--pet-olive-deep)" }[shape]
  // One gentle movement for the whole pig; no swaying.
  const motion = { thriving: "pet-calm-hop", happy: "pet-calm-breathe", okay: "pet-calm-breathe", wilting: "pet-calm-sigh", melted: "pet-calm-ooze" }[mood]
  const lively = shape === "healthy"
  const legFill = shape === "wilting" ? "var(--pet-mustard)" : skin
  const light = `url(#${id}-light)`

  return (
    <svg
      viewBox="0 0 200 172"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("pet-remake h-auto w-48 max-w-full overflow-visible", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" })}
    >
      <defs>
        {/* Wilting: still pink low on the left, turning mustard from the top right */}
        <linearGradient id={`${id}-wilt`} x1="0.1" y1="0.9" x2="0.9" y2="0.1">
          <stop offset="0.25" style={{ stopColor: "var(--pet-pink)" }} />
          <stop offset="0.62" style={{ stopColor: "var(--pet-mustard)" }} />
        </linearGradient>
        {/* Light from the top left, shade towards the bottom right: laid over any skin, so it works for every state */}
        <radialGradient id={`${id}-light`} cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" style={{ stopColor: "#fff", stopOpacity: 0.32 }} />
          <stop offset="0.38" style={{ stopColor: "#fff", stopOpacity: 0 }} />
          <stop offset="0.7" style={{ stopColor: "var(--pet-shade)", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "var(--pet-shade)", stopOpacity: 0.34 }} />
        </radialGradient>
        {/* A soft shadow on the ground, falling a little to the right */}
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
        className={mood === "thriving" ? "pet-calm-hop-shadow" : undefined}
      />

      {mood === "melted" ? <Stink /> : null}

      <g className={motion}>
        {shape !== "melted" ? (
          <>
            {/* the far legs sit a little higher and darker, behind the near ones */}
            <Leg x={52} top={pose.legTop - 4} bottom={156} fill={legFill} far />
            <Leg x={138} top={pose.legTop - 4} bottom={156} fill={legFill} far />
            <Leg x={72} top={pose.legTop} bottom={160} fill={legFill} />
            <Leg x={116} top={pose.legTop} bottom={160} fill={legFill} />
          </>
        ) : null}

        {shape === "healthy" ? (
          <path className="pet-tail" d="M34 98 c-9 -2 -14 -9 -10 -14 c4 -5 10 -1 6 3 c-2 2 -6 1 -6 -2" stroke={INK} strokeWidth={LINE} />
        ) : shape === "wilting" ? (
          <path d="M36 116 c-7 1 -10 5 -9 10" stroke={INK} strokeWidth={LINE} />
        ) : null}

        <Ear {...pose.farEar} far twitch={lively} fill={mood === "wilting" ? "var(--pet-mustard)" : skin} inner={snout} />
        <Ear {...pose.nearEar} twitch={lively} fill={mood === "wilting" ? "var(--pet-pink)" : skin} inner={snout} />

        <path d={pose.body} fill={skin} />
        <path d={pose.body} fill={light} />
        <path d={pose.body} stroke={INK} strokeWidth={LINE} />

        {/* a few patches as it goes off, and a crease where it has slumped */}
        {mood === "wilting" ? (
          <g fill="var(--pet-mustard-deep)" opacity="0.4">
            <ellipse cx="70" cy="80" rx="8" ry="5.5" transform="rotate(-20 70 80)" />
            <ellipse cx="56" cy="97" rx="4" ry="3" />
          </g>
        ) : null}
        {mood === "melted" ? (
          <g>
            <g fill="var(--pet-olive-deep)" opacity="0.4">
              <ellipse cx="72" cy="100" rx="9" ry="5.5" transform="rotate(-25 72 100)" />
              <ellipse cx="140" cy="136" rx="8" ry="4.5" />
              <ellipse cx="44" cy="146" rx="6" ry="3" />
            </g>
            <path d="M80 104 C76 110 77 116 81 120" stroke={INK} strokeWidth="1.8" opacity="0.45" />
          </g>
        ) : null}

        <Sprout mood={mood} at={pose.sprout} />
        <Cheeks mood={mood} near={pose.nearCheek} far={pose.farCheek} />
        <Eye id={`${id}-n`} at={pose.nearEye} rx={8 * pose.eyeScale} ry={10 * pose.eyeScale} mood={mood} blinking={blinking} inner={1} />
        <Eye id={`${id}-f`} at={pose.farEye} rx={6.4 * pose.eyeScale} ry={9.4 * pose.eyeScale} mood={mood} blinking={blinking} inner={-1} />
        <Snout at={pose.snout} scale={pose.snoutScale} fill={snout} />
        <Mouth at={pose.mouth} mood={mood} />
        {mood === "melted" ? (
          <>
            <Tear x={pose.nearEye[0] - 3} y={pose.nearEye[1] + 7} />
            <circle className="pet-bubble" cx="150" cy="145" r="3.6" fill="var(--pet-olive)" stroke={INK} strokeWidth="1.4" />
          </>
        ) : null}
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
    </svg>
  )
}

function Leg({ x, top, bottom, fill, far = false }: { x: number; top: number; bottom: number; fill: string; far?: boolean }) {
  const box = { x: x - 8, y: top, width: 16, height: bottom - top, rx: 7 }
  return (
    <g>
      <rect {...box} fill={fill} />
      {far ? <rect {...box} fill="var(--pet-shade)" opacity="0.24" /> : null}
      <rect {...box} stroke={INK} strokeWidth={LINE} />
    </g>
  )
}

function Ear({
  x,
  y,
  turn,
  far = false,
  twitch,
  fill,
  inner,
}: EarPose & { far?: boolean; twitch: boolean; fill: string; inner: string }) {
  // Drawn as the near ear; the far one is the same ear mirrored and a little smaller, and in shade.
  return (
    <g transform={`translate(${x} ${y})${far ? " scale(-0.84 0.88)" : ""} rotate(${turn})`}>
      <g className={twitch ? (far ? "pet-ear-r" : "pet-ear-l") : undefined}>
        <path d={EAR} fill={fill} />
        <path d={EAR_INNER} fill={inner} opacity="0.65" />
        {far ? <path d={EAR} fill="var(--pet-shade)" opacity="0.2" /> : null}
        <path d={EAR} stroke={INK} strokeWidth={LINE} />
      </g>
    </g>
  )
}

function Cheeks({ mood, near, far }: { mood: PetMood; near: Point; far: Point }) {
  if (mood === "melted") return null
  const opacity = { thriving: 0.7, happy: 0.55, okay: 0.32, wilting: 0.32 }[mood]
  return (
    <g fill="var(--pet-blush)" opacity={opacity}>
      <ellipse cx={near[0]} cy={near[1]} rx="9" ry="5.8" />
      <ellipse cx={far[0]} cy={far[1]} rx="5.4" ry="5" />
    </g>
  )
}

/** inner: which way (+1 or −1 on x) points to the middle of the face. */
function Eye({
  id,
  at,
  rx,
  ry,
  mood,
  blinking,
  inner,
}: {
  id: string
  at: Point
  rx: number
  ry: number
  mood: PetMood
  blinking: boolean
  inner: 1 | -1
}) {
  const [x, y] = at
  if (mood === "thriving") {
    return <path d={`M${x - rx} ${y + 3} Q${x} ${y - ry - 1} ${x + rx} ${y + 3}`} stroke={EYE} strokeWidth="3.4" />
  }

  const blink = blinking ? "pet-blink" : undefined
  if (mood === "happy" || mood === "okay") {
    return (
      <g transform={`translate(${x} ${y})`}>
        {/* now and then it glances to one side and the other */}
        <g className="pet-glance">
          <g className={blink}>
            <ellipse rx={rx} ry={ry} fill={EYE} />
            {/* the shine sits towards the light, top left */}
            <circle cx={-rx * 0.3} cy={-ry * 0.34} r={rx * 0.36} fill="#fff" />
            {mood === "happy" ? <circle cx={rx * 0.32} cy={ry * 0.36} r={rx * 0.16} fill="#fff" opacity="0.85" /> : null}
          </g>
        </g>
      </g>
    )
  }

  // Wilting and melted: a heavy lid, lower on the outer side, under a worried brow (its inner end raised).
  const melted = mood === "melted"
  const w = rx + 2.5
  const outer = melted ? ry * 0.2 : -ry * 0.1
  const innerLid = melted ? -ry * 0.3 : -ry * 0.66
  const lid = `M${-w * inner} ${outer} L${w * inner} ${innerLid}`
  return (
    <g transform={`translate(${x} ${y})`}>
      <clipPath id={id}>
        <path d={`${lid} L${w * inner} ${ry + 4} L${-w * inner} ${ry + 4} Z`} />
      </clipPath>
      {melted ? <path d={`M${-rx} ${ry + 1.5} Q0 ${ry + 5} ${rx} ${ry + 1.5}`} stroke="var(--pet-olive-deep)" strokeWidth="2.4" /> : null}
      <g className={blink}>
        <g clipPath={`url(#${id})`}>
          <ellipse rx={rx} ry={ry} fill={EYE} />
          <circle cx={-rx * 0.3 * inner} cy={melted ? ry * 0.4 : ry * 0.1} r={rx * 0.28} fill="#fff" opacity="0.9" />
        </g>
        <path d={lid} stroke={INK} strokeWidth="2.4" />
      </g>
      <path d={`M${-(rx + 1) * inner} ${-ry - 1.5} Q${-1 * inner} ${-ry - 3.5} ${(rx - 1) * inner} ${-ry - 8}`} stroke={INK} strokeWidth="2.4" />
    </g>
  )
}

function Snout({ at, scale, fill }: { at: Point; scale: number; fill: string }) {
  // Tipped a little, the way the head is turned; the far nostril is the smaller one.
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(-6) scale(${scale})`}>
      <ellipse rx="14.5" ry="10.5" fill={fill} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="-3" cy="-5.6" rx="6.5" ry="2" fill="#fff" opacity="0.28" />
      <ellipse cx="-5" cy="0.8" rx="2.3" ry="3.3" fill={INK} />
      <ellipse cx="5.4" cy="0.4" rx="2" ry="3.1" fill={INK} />
    </g>
  )
}

function Mouth({ at, mood }: { at: Point; mood: PetMood }) {
  const [x, y] = at
  switch (mood) {
    case "thriving":
      return (
        <g transform={`translate(${x} ${y - 4})`}>
          <path d="M-11 -2 Q0 14 11 -2 Z" fill="var(--pet-mouth)" stroke={INK} strokeWidth="2.2" />
          <ellipse cx="0" cy="6.2" rx="4.6" ry="2.3" fill="var(--pet-blush)" />
        </g>
      )
    case "happy":
      return <path d={`M${x - 8} ${y - 2} Q${x} ${y + 6} ${x + 8} ${y - 2}`} stroke={INK} strokeWidth="2.6" />
    case "okay":
      return <path d={`M${x - 5} ${y} Q${x} ${y + 1.4} ${x + 5} ${y}`} stroke={INK} strokeWidth="2.6" />
    case "wilting":
      return <path d={`M${x - 8} ${y + 3} Q${x} ${y - 4} ${x + 8} ${y + 3}`} stroke={INK} strokeWidth="2.6" />
    case "melted":
      return <path d={`M${x - 9} ${y + 4} Q${x} ${y - 5} ${x + 9} ${y + 4}`} stroke={INK} strokeWidth="2.6" />
  }
}

/** The sprout on its head grows with the month: a flower when thriving, drooping when wilting, fallen when melted. */
function Sprout({ mood, at }: { mood: PetMood; at: Point }) {
  const [x, y] = at
  const leafLine = { stroke: INK, strokeWidth: 1.4 }

  if (mood === "melted") {
    // fallen over and dried brown, lying on the puddle
    return (
      <g>
        <path d={`M${x} ${y} C${x - 6} ${y - 4} ${x - 14} ${y - 4} ${x - 20} ${y + 1}`} stroke="var(--pet-leaf-dead)" strokeWidth="2.2" />
        <path d={`M${x - 20} ${y + 1} C${x - 26} ${y - 1} ${x - 31} ${y + 3} ${x - 29} ${y + 8} C${x - 24} ${y + 9} ${x - 21} ${y + 6} ${x - 20} ${y + 1} Z`} fill="var(--pet-leaf-dead)" {...leafLine} />
      </g>
    )
  }

  if (mood === "wilting") {
    // bent over, the leaves hanging and turning yellow
    return (
      <g>
        <path d={`M${x} ${y + 2} C${x} ${y - 6} ${x + 6} ${y - 11} ${x + 12} ${y - 8} C${x + 16} ${y - 6} ${x + 17} ${y - 1} ${x + 16} ${y + 3}`} stroke="var(--pet-stem-dry)" strokeWidth="2.2" />
        <path d={`M${x + 16} ${y + 3} C${x + 11} ${y + 5} ${x + 9} ${y + 11} ${x + 12} ${y + 15} C${x + 16} ${y + 13} ${x + 18} ${y + 8} ${x + 16} ${y + 3} Z`} fill="var(--pet-leaf-dry)" {...leafLine} />
        <path d={`M${x + 5} ${y - 9} C${x + 1} ${y - 13} ${x - 4} ${y - 12} ${x - 6} ${y - 9} C${x - 2} ${y - 6} ${x + 2} ${y - 6} ${x + 5} ${y - 9} Z`} fill="var(--pet-leaf-dry)" {...leafLine} />
      </g>
    )
  }

  // Healthy: a small sprout when okay, two good leaves when happy, and a little flower on top when thriving.
  const thriving = mood === "thriving"
  const height = thriving ? 22 : mood === "happy" ? 16 : 11
  const leavesAt = thriving ? -11 : -height
  const leafScale = mood === "okay" ? 0.68 : thriving ? 0.85 : 1
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="pet-sprout">
        <path d={`M0 2 C-1 ${-height * 0.4} 0 ${-height * 0.75} 2 ${-height}`} stroke="var(--pet-stem)" strokeWidth="2.2" />
        <g transform={`translate(${thriving ? 0.5 : 2} ${leavesAt}) scale(${leafScale})`}>
          <path d="M0 0 C-7 -1 -12 -6 -11 -11 C-5 -11 -1 -6 0 0 Z" fill="var(--pet-leaf)" {...leafLine} />
          <path d="M0 0 C5 -4 11 -5 15 -3 C12 3 6 4 0 0 Z" fill="var(--pet-leaf)" {...leafLine} />
        </g>
        {thriving ? (
          <g transform={`translate(2 ${-height - 3})`}>
            {[0, 72, 144, 216, 288].map((angle) => (
              <ellipse key={angle} cy="-4.2" rx="3" ry="4" transform={`rotate(${angle})`} fill="var(--pet-petal)" stroke={INK} strokeWidth="1.1" />
            ))}
            <circle r="2.6" fill="var(--pet-flower-heart)" stroke={INK} strokeWidth="1.1" />
          </g>
        ) : null}
      </g>
    </g>
  )
}

"use client"

import { useEffect, useState } from "react"

import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

/** The outline and the eyes (the colours are the `--pet-*` tokens in globals.css). */
export const INK = "var(--pet-ink)"
export const EYE = "var(--pet-eye)"
/** The outline's width. */
export const LINE = 2.4

export type Point = readonly [number, number]

export const EAR = "M-13 9 C-15 -8 -8 -21 2 -24 C9 -14 12 -3 11 9 Z"
export const EAR_INNER = "M-6.5 5.5 C-7.5 -4.5 -3.5 -12.5 1 -14 C4.5 -7.5 6.5 -2 5.5 5.5 Z"

/** Blinks every few seconds, at a random moment each time, so it never looks mechanical. Off under "reduce motion". */
export function useRandomBlink(enabled: boolean) {
  const [blinking, setBlinking] = useState(false)
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let timer: ReturnType<typeof setTimeout>
    const next = () => {
      timer = setTimeout(() => {
        setBlinking(true)
        timer = setTimeout(() => {
          setBlinking(false)
          next()
        }, 170)
      }, 2200 + Math.random() * 4200)
    }
    next()
    return () => clearTimeout(timer)
  }, [enabled])
  return blinking
}

export function Tear({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="pet-tear">
        <path d="M0 0 C-3.4 6 -4.6 9.5 0 11.5 C4.6 9.5 3.4 6 0 0 Z" fill="var(--pet-tear)" stroke={INK} strokeWidth="1.6" />
      </g>
    </g>
  )
}

export function Stink() {
  const wave = "c-5 -6 5 -10 0 -16 c-5 -6 5 -10 0 -16"
  return (
    <g stroke="var(--pet-stink)" strokeWidth="3">
      <path className="pet-stink" d={`M62 80 ${wave}`} />
      <path className="pet-stink pet-late" d={`M100 70 ${wave}`} />
      <path className="pet-stink pet-later" d={`M138 80 ${wave}`} />
    </g>
  )
}

export function Fly({ x, y, trail, late = false, later = false }: { x: number; y: number; trail: string; late?: boolean; later?: boolean }) {
  return (
    <g>
      <path d={trail} stroke="var(--pet-fly)" strokeWidth="1.8" strokeDasharray="1 4" opacity="0.7" />
      <g className={cn("pet-fly", late && "pet-late", later && "pet-later")}>
        <g transform={`translate(${x} ${y})`}>
          {/* the flutter goes on the wrapper: a CSS animation would replace each wing's own tilt */}
          <g className="pet-wing">
            <ellipse cx="-4.5" cy="-3.5" rx="5" ry="2" transform="rotate(35 -4.5 -3.5)" fill="var(--pet-wing)" stroke="var(--pet-fly)" strokeWidth="1" opacity="0.85" />
            <ellipse cx="4.5" cy="-3.5" rx="5" ry="2" transform="rotate(-35 4.5 -3.5)" fill="var(--pet-wing)" stroke="var(--pet-fly)" strokeWidth="1" opacity="0.85" />
          </g>
          <ellipse cx="0" cy="0.5" rx="2.8" ry="4" fill="var(--pet-fly)" />
          <circle cx="0" cy="-4" r="2.2" fill="var(--pet-fly)" />
        </g>
      </g>
    </g>
  )
}

export function Sparkles() {
  const star = "l2.6 6.6 6.6 2.6 -6.6 2.6 -2.6 6.6 -2.6 -6.6 -6.6 -2.6 6.6 -2.6z"
  const small = "l1.7 4.4 4.4 1.7 -4.4 1.7 -1.7 4.4 -1.7 -4.4 -4.4 -1.7 4.4 -1.7z"
  return (
    <g fill="var(--pet-spark)">
      <path className="pet-spark" d={`M164 36 ${star}`} />
      <path className="pet-spark pet-late" d={`M36 48 ${small}`} />
      <path className="pet-spark pet-later" d={`M176 84 ${small}`} />
    </g>
  )
}

export function Leg({ x, top, bottom, fill }: { x: number; top: number; bottom: number; fill: string }) {
  const box = { x: x - 8, y: top, width: 16, height: bottom - top, rx: 7 }
  return (
    <g>
      <rect {...box} fill={fill} />
      <rect {...box} stroke={INK} strokeWidth={LINE} />
    </g>
  )
}

/** inner: which way (+1 or −1 on x) points to the middle of the face. */
export function Eye({
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

export function Snout({ at, scale, fill }: { at: Point; scale: number; fill: string }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]}) scale(${scale})`}>
      <ellipse rx="14.5" ry="10.5" fill={fill} stroke={INK} strokeWidth="2.2" />
      <ellipse cx="-3" cy="-5.6" rx="6.5" ry="2" fill="#fff" opacity="0.28" />
      <ellipse cx="-5" cy="0.8" rx="2.3" ry="3.3" fill={INK} />
      <ellipse cx="5.4" cy="0.4" rx="2" ry="3.1" fill={INK} />
    </g>
  )
}

export function Mouth({ at, mood }: { at: Point; mood: PetMood }) {
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

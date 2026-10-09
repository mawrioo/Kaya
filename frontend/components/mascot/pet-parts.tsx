"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/** The outline and the eyes, shared by both drawings (the colours are the `--pet-*` tokens in globals.css). */
export const INK = "var(--pet-ink)"
export const EYE = "var(--pet-eye)"

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

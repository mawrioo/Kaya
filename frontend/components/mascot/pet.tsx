"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { useMoneyIn } from "@/components/mascot/money-pet"
import { GodPet } from "@/components/mascot/pet-god"
import type { PetMood } from "@/lib/mascot"
import { cn } from "@/lib/utils"

export type { PetMood }

/**
 * Kaya's pet: a pig whose look follows this month's saving rate, from a pink god down to broken (pet-god.tsx). It
 * breathes and blinks on its own; nothing runs under "reduce motion". Decorative unless it is given a label.
 * `lively` makes it react (only the big one on the Pet page): its face follows the pointer, it wiggles when pointed at
 * or tapped, and it perks up when money comes in.
 */
export function Pet({ mood = "okay", label, className, lively = false }: { mood?: PetMood; label?: string; className?: string; lively?: boolean }) {
  if (!lively) return <GodPet mood={mood} label={label} className={className} />
  return <LivelyPet mood={mood} label={label} className={className} />
}

type Reaction = "wiggle" | "perk"
const LENGTH: Record<Reaction, number> = { wiggle: 700, perk: 950 }

// What had come in when the pet last looked, kept while the app is open: money added on another page (a goal's "Add
// money") makes it perk up when you come back to it.
let moneySeen: number | null = null

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function LivelyPet({ mood, label, className }: { mood: PetMood; label?: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [reaction, setReaction] = useState<Reaction | null>(null)
  // Bumped on each perk, so the coins are drawn afresh and fly again.
  const [burst, setBurst] = useState(0)

  const react = useCallback((next: Reaction) => {
    if (reducedMotion()) return
    setReaction((current) => (current === "perk" ? current : next))
    if (next === "perk") setBurst((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => setReaction(null), LENGTH[reaction])
    return () => clearTimeout(timer)
  }, [reaction])

  // Money in: perk up when it has gone up since the pet last looked.
  const moneyIn = useMoneyIn()
  useEffect(() => {
    if (moneySeen === null || moneyIn <= moneySeen) {
      moneySeen = moneyIn
      return
    }
    // A moment later, so it happens once the saving form has closed. Noted as seen only then, so a page left at once
    // still perks up next time.
    const timer = setTimeout(() => {
      moneySeen = moneyIn
      react("perk")
    }, 300)
    return () => clearTimeout(timer)
  }, [moneyIn, react])

  // The face follows the pointer: a mouse anywhere on the page, or the spot a finger taps (it looks back after a moment).
  useEffect(() => {
    const element = box.current
    if (!element || reducedMotion()) return
    let frame = 0
    let back: ReturnType<typeof setTimeout> | undefined
    const look = (x: number, y: number) => {
      element.style.setProperty("--pet-look-x", x.toFixed(3))
      element.style.setProperty("--pet-look-y", y.toFixed(3))
    }
    const toward = (clientX: number, clientY: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        // Full turn about 300px from its middle; gentler closer in.
        const clamp = (n: number) => Math.max(-1, Math.min(1, n))
        look(clamp((clientX - (rect.left + rect.width / 2)) / 300), clamp((clientY - (rect.top + rect.height * 0.45)) / 300))
      })
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return
      toward(event.clientX, event.clientY)
    }
    const onTap = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return
      toward(event.clientX, event.clientY)
      clearTimeout(back)
      back = setTimeout(() => look(0, 0), 1600)
    }
    const onLeave = () => look(0, 0)
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerdown", onTap, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(back)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onTap)
      document.documentElement.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  return (
    <div
      ref={box}
      className={cn("pet-react relative", className)}
      data-wiggle={reaction === "wiggle" ? "" : undefined}
      data-perk={reaction === "perk" ? "" : undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") react("wiggle")
      }}
      onPointerDown={() => react("wiggle")}
    >
      <GodPet mood={mood} label={label} className="w-full" />
      {reaction === "perk" ? <Burst key={burst} /> : null}
    </div>
  )
}

/** A few coins and sparkles flying up out of it when money comes in. */
function Burst() {
  const coins: { x: number; y: number; drift: number; delay: number }[] = [
    { x: 52, y: 70, drift: -10, delay: 0 },
    { x: 100, y: 46, drift: 0, delay: 80 },
    { x: 148, y: 70, drift: 10, delay: 160 },
    { x: 76, y: 54, drift: -6, delay: 240 },
    { x: 124, y: 54, drift: 6, delay: 320 },
  ]
  return (
    <svg viewBox="0 0 200 172" aria-hidden focusable="false" className="pet-art pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {coins.map(({ x, y, drift, delay }, i) => (
        <g key={i} className="pet-burst-coin" style={{ animationDelay: `${delay}ms`, ["--burst-x" as string]: `${drift}px` }}>
          {i % 2 === 0 ? (
            <>
              <circle cx={x} cy={y} r="6" fill="var(--pet-gold)" stroke="var(--pet-ink)" strokeWidth="1.3" />
              <circle cx={x} cy={y} r="3.4" stroke="var(--pet-gold-deep)" strokeWidth="1.1" fill="none" />
            </>
          ) : (
            <path d={`M${x} ${y - 6} l1.7 4.3 4.3 1.7 -4.3 1.7 -1.7 4.3 -1.7 -4.3 -4.3 -1.7 4.3 -1.7z`} fill="var(--pet-spark)" />
          )}
        </g>
      ))}
    </svg>
  )
}

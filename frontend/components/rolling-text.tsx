"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * An amount's digits where each one that changes pops in from below and the rest stay still, like a counter ticking over.
 * The first paint never animates, and the text is always exactly the text it was given. The thousands dots are a little
 * softer than the digits.
 */
export function RollingText({ text }: { text: string }) {
  const [shown, setShown] = useState(text)
  // How many times each place (counted from the right, so a number that grows a digit still lines up) has changed.
  const [changes, setChanges] = useState<Record<number, number>>({})

  if (text !== shown) {
    const now = Array.from(text)
    const before = Array.from(shown)
    const next = { ...changes }
    now.forEach((char, index) => {
      const place = now.length - 1 - index
      if (before[before.length - 1 - place] !== char) next[place] = (next[place] ?? 0) + 1
    })
    setShown(text)
    setChanges(next)
  }

  const chars = Array.from(text)
  return (
    <>
      {chars.map((char, index) => {
        const place = chars.length - 1 - index
        const count = changes[place] ?? 0
        return (
          <span key={`${place}:${count}`} className={cn(char === "." && "opacity-70", count > 0 && "animate-digit-pop relative")}>
            {char}
          </span>
        )
      })}
    </>
  )
}

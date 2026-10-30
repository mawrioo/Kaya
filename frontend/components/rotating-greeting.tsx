"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import { useData } from "@/components/data-provider"
import { GREETING_LANGUAGES, greetingAt, type DayPart } from "@/lib/greetings"
import { START, letters, stepTypewriter, visibleCount, type Typewriter } from "@/lib/typewriter"
import { cn } from "@/lib/utils"

const phoneQuery = "(max-width: 767px)"
const subscribePhone = (notify: () => void) => {
  const query = window.matchMedia(phoneQuery)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}
const isPhone = () => window.matchMedia(phoneQuery).matches

/**
 * The greeting on Home, name included ("Good morning, Mario"). It opens whole, in English, so the first paint matches
 * what the server drew. Then it deletes itself letter by letter and types the same greeting in the next language,
 * round the whole list. Screen readers get the English greeting once and skip the typing. With "reduce motion" on,
 * nothing moves.
 */
export function RotatingGreeting({ part }: { part: DayPart }) {
  const { user } = useData()
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false)
  const [state, setState] = useState<Typewriter>(START)
  const { lang, text } = greetingAt(state.index, part)
  const line = letters(`${text}, ${user.name}`)
  const length = line.length

  useEffect(() => {
    if (phone || window.matchMedia(phoneQuery).matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const { next, wait } = stepTypewriter(state, length, GREETING_LANGUAGES.length)
    const timer = setTimeout(() => setState(next), wait)
    return () => clearTimeout(timer)
  }, [state, length, phone])

  if (phone) return <>{greetingAt(0, part).text}, {user.name}</>

  return (
    <>
      <span className="sr-only">
        {greetingAt(0, part).text}, {user.name}
      </span>
      {/* A little more line height than the title has: Thai and Hindi marks sit above and below the letters. */}
      <span aria-hidden lang={lang} className="leading-[1.3]">
        {line.slice(0, visibleCount(state, length)).join("")}
        <Caret blinking={state.phase === "hold"} />
      </span>
    </>
  )
}

/**
 * The thin orange bar after the last letter, like the one in a text box. It stays solid while letters come and go and
 * blinks while the line rests. It has no width at all, so it can never push a word onto the next line, and it keeps the
 * line's height while the line is empty.
 */
function Caret({ blinking }: { blinking: boolean }) {
  return (
    <span aria-hidden className="relative inline-block w-0 motion-reduce:hidden">
      &#8203;
      <span
        className={cn(
          "absolute bottom-[0.26em] left-[0.07em] h-[0.78em] w-[0.06em] rounded-full bg-highlight",
          blinking && "animate-caret-blink"
        )}
      />
    </span>
  )
}

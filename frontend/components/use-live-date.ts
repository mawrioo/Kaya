"use client"

import { useEffect, useState } from "react"
import { toDateInput } from "@/lib/dates"

/** Keep SSR's date for hydration, then follow local calendar days without resetting page or form state. */
export function useLiveDate(initial: string): string {
  const [date, setDate] = useState(initial)
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return
      const now = new Date()
      setDate((previous) => toDateInput(new Date(previous)) === toDateInput(now) ? previous : now.toISOString())
    }
    const first = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, 1000)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
    }
  }, [])
  return date
}

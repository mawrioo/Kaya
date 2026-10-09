"use client"

import { useEffect, useRef, useState, startTransition } from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, Sprout } from "lucide-react"

import { PinField } from "@/components/lock/pin-field"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import * as api from "@/lib/api"
import { MIN_PIN_LENGTH, waitText } from "@/lib/lock"

const PIN_ID = "lock-pin"
const ERROR_ID = "lock-pin-error"

/**
 * What Kaya shows instead of everything else while it is locked: the name, and one box for the PIN. The page behind it is
 * never sent (the backend refuses to send the data until the PIN is typed), so there is nothing here to peek at. A wrong PIN
 * shakes the dots once and says how many tries are left; too many wrong ones make it wait, with a countdown.
 */
export function LockScreen() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  // True from a right PIN until the page behind has taken over.
  const [opening, setOpening] = useState(false)
  // When a wait after too many wrong tries is over (a time in milliseconds), and the clock that counts it down.
  const [waitEnds, setWaitEnds] = useState<number>()
  const [now, setNow] = useState(() => Date.now())
  // Counts wrong tries, so the dots shake again each time (a new key restarts the animation).
  const [shakes, setShakes] = useState(0)
  const safetyNet = useRef<number | undefined>(undefined)

  const remaining = waitEnds === undefined ? 0 : Math.max(0, Math.ceil((waitEnds - now) / 1000))
  const waiting = remaining > 0

  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [waiting])

  // If the page behind doesn't take over by itself, open it again the plain way.
  useEffect(() => () => window.clearTimeout(safetyNet.current), [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (busy || opening || waiting || pin.length < MIN_PIN_LENGTH) return
    setBusy(true)
    setError("")
    try {
      await api.unlock(pin)
      setOpening(true)
      startTransition(() => router.refresh())
      safetyNet.current = window.setTimeout(() => window.location.reload(), 4000)
    } catch (caught) {
      if (caught instanceof api.ApiError && caught.retryAfterSeconds) {
        setNow(Date.now())
        setWaitEnds(Date.now() + caught.retryAfterSeconds * 1000)
      } else {
        setError(api.errorMessage(caught))
      }
      setPin("")
      setShakes((count) => count + 1)
      setBusy(false)
      requestAnimationFrame(() => document.getElementById(PIN_ID)?.focus())
    }
  }

  return (
    <main className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden bg-sidebar px-5 py-10 text-sidebar-foreground">
      {/* The batik lattice, quiet, rising from the bottom edge like it does in the sidebar. */}
      <div aria-hidden className="lock-lattice pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-3/5" />

      <div className="flex w-full max-w-sm flex-col items-center">
        <p aria-hidden className="font-serif text-[1.75rem] font-semibold tracking-[0.04em] text-sidebar-primary">
          Kaya
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-7 grid w-full grid-cols-1 gap-5 rounded-xl bg-card p-6 text-card-foreground shadow-lg sm:p-7"
        >
          <div className="grid gap-1.5">
            <h1 className="type-title">Kaya is locked</h1>
            <p className="text-sm text-muted-foreground">Enter your PIN to open it.</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <Label htmlFor={PIN_ID} className="sr-only">
              PIN
            </Label>
            <div key={shakes} className={shakes > 0 && error ? "animate-lock-shake" : undefined}>
              <PinField
                id={PIN_ID}
                value={pin}
                onChange={(digits) => {
                  setPin(digits)
                  if (error) setError("")
                }}
                invalid={!!error}
                describedBy={error ? ERROR_ID : undefined}
                autoFocus
                disabled={busy || opening || waiting}
              />
            </div>

            {waiting ? (
              <p role="status" className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
                <span>
                  Too many tries.
                  <span aria-hidden> Try again in {waitText(remaining)}.</span>
                  <span className="sr-only"> Wait a moment, then try again.</span>
                </span>
              </p>
            ) : error ? (
              <p id={ERROR_ID} role="alert" className="flex items-start gap-1.5 text-sm text-negative wrap-anywhere">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error}</span>
              </p>
            ) : null}
          </div>

          <Button type="submit" size="lg" className="h-11 w-full text-[0.9375rem]" disabled={busy || opening || waiting || pin.length < MIN_PIN_LENGTH}>
            {opening ? "Opening…" : busy ? "Checking…" : "Unlock"}
          </Button>

          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            Forgot it? The PIN can be turned off from the computer that runs Kaya. The README shows how.
          </p>
        </form>

        <p className="mt-6 flex items-center gap-2 text-[0.8125rem] text-sidebar-muted">
          <Sprout className="size-4 shrink-0" aria-hidden />
          Runs on this computer. Your numbers stay here.
        </p>
      </div>
    </main>
  )
}

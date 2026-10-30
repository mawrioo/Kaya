"use client"

import { createContext, useContext, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Money } from "@/components/money"
import { hiddenBalancesCookie } from "@/lib/balance-visibility"
import type { Rupiah } from "@/lib/types"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

interface BalanceVisibility {
  isHidden: (id: string) => boolean
  toggle: (id: string) => void
}

const BalanceVisibilityContext = createContext<BalanceVisibility | null>(null)

function useBalanceVisibility(): BalanceVisibility {
  const context = useContext(BalanceVisibilityContext)
  if (!context) throw new Error("Balance components must be used within a BalanceVisibilityProvider.")
  return context
}

/**
 * Remembers which balances are hidden. Sits in the root layout so every page
 * shares one answer, and starts from the cookie the server already read.
 */
export function BalanceVisibilityProvider({
  initialHidden,
  children,
}: {
  initialHidden: string[]
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(() => new Set(initialHidden))

  const value: BalanceVisibility = {
    isHidden: (id) => hidden.has(id),
    toggle: (id) => {
      const next = new Set(hidden)
      if (!next.delete(id)) next.add(id)
      setHidden(next)
      document.cookie = hiddenBalancesCookie(next)
    },
  }

  return <BalanceVisibilityContext value={value}>{children}</BalanceVisibilityContext>
}

interface BalanceToggleProps {
  /** TOTAL_BALANCE_ID or a wallet's id. */
  id: string
  /** Names the balance for screen readers: "total" reads "Hide total balance". */
  label: string
  className?: string
}

/** The eye button. An open eye means the amount is showing; a crossed eye means it is hidden. */
export function BalanceToggle({ id, label, className }: BalanceToggleProps) {
  const { isHidden, toggle } = useBalanceVisibility()
  const hidden = isHidden(id)
  const Icon = hidden ? EyeOff : Eye
  // Counts presses, so the eye blinks when pressed (and not when the page first draws).
  const [presses, setPresses] = useState(0)

  return (
    <button
      type="button"
      onClick={() => {
        toggle(id)
        setPresses((count) => count + 1)
      }}
      aria-label={`${hidden ? "Show" : "Hide"} ${label} balance`}
      className={cn(
        "grid size-11 md:size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-150 hover:bg-foreground/[0.07] hover:text-foreground active:scale-90 active:bg-foreground/[0.12]",
        className
      )}
    >
      <Icon key={presses} className={cn("size-[1.125rem]", presses > 0 && "animate-eye-blink")} aria-hidden />
    </button>
  )
}

/** Says whether a balance is hidden right now, for a message that would otherwise give the number away. */
export function useIsBalanceHidden(): (id: string) => boolean {
  return useBalanceVisibility().isHidden
}

/** True while the balance with this id is hidden, for the places that draw something else in its stead. */
export function useBalanceHidden(id: string): boolean {
  return useBalanceVisibility().isHidden(id)
}

/**
 * Shows its children only while the balance with this id is visible. Hidden
 * children are not drawn at all, not even in the server-sent HTML, so use it
 * for anything that would give the amount away (like the wallet-share bar).
 */
export function ShowWhenVisible({ id, children }: { id: string; children: React.ReactNode }) {
  const { isHidden } = useBalanceVisibility()
  return isHidden(id) ? null : children
}

export function HideableBalance({ id, amount, className }: { id: string; amount: Rupiah; className?: string }) {
  const hidden = useBalanceHidden(id)
  return <span className={cn("whitespace-nowrap tabular-nums", className)}>{hidden ? <><span aria-hidden>••••••</span><span className="sr-only">Balance hidden</span></> : formatRupiah(amount)}</span>
}

/** A <Money> that turns into dots when its balance is hidden. `sign="always"` puts a "+" on gains. */
export function HideableMoney({
  id,
  amount,
  sign,
  className,
  roll = true,
}: {
  id: string
  amount: Rupiah
  sign?: "auto" | "always" | "never"
  roll?: boolean
  className?: string
}) {
  const { isHidden } = useBalanceVisibility()
  const hidden = isHidden(id)
  // The amount (or its dots) fades in again each time the eye is pressed. The first paint stays still.
  const [seen, setSeen] = useState(hidden)
  const [swaps, setSwaps] = useState(0)
  if (hidden !== seen) {
    setSeen(hidden)
    setSwaps((count) => count + 1)
  }
  return (
    <span key={swaps} className={cn(swaps > 0 && "animate-in duration-200 fade-in-0")}>
      <Money amount={amount} sign={sign} hidden={hidden} roll={roll} className={className} />
    </span>
  )
}

"use client"

import { useLayoutEffect, useRef } from "react"

import { formatThousands } from "@/lib/format"
import { cn } from "@/lib/utils"

const MAX_DIGITS = 12

interface AmountInputProps {
  id: string
  /** Digits only, e.g. "1250000". */
  value: string
  onChange: (digits: string) => void
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
}

/**
 * A rupiah field that puts the dots in as you type: "1250000" shows as
 * "1.250.000". The caret stays next to the digit you were editing, so fixing a
 * number in the middle doesn't send you to the end.
 */
export function AmountInput({ id, value, onChange, invalid, describedBy, autoFocus }: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const digitsBeforeCaret = useRef<number | null>(null)
  const display = value ? formatThousands(Number(value)) : ""

  // After the dots are added, put the caret back after the same number of digits.
  useLayoutEffect(() => {
    const input = inputRef.current
    const wanted = digitsBeforeCaret.current
    if (!input || wanted === null) return
    digitsBeforeCaret.current = null
    let position = 0
    let seen = 0
    while (position < display.length && seen < wanted) {
      if (display[position] !== ".") seen++
      position++
    }
    input.setSelectionRange(position, position)
  })

  return (
    <div
      className={cn(
        "flex h-14 w-full min-w-0 items-center gap-3 rounded-lg border border-input bg-card px-4 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        invalid && "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/30"
      )}
    >
      <span aria-hidden className="text-base font-medium text-muted-foreground">
        Rp
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={display}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const raw = event.target.value
          const caret = event.target.selectionStart ?? raw.length
          digitsBeforeCaret.current = raw.slice(0, caret).replace(/\D/g, "").length
          const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS)
          onChange(digits)
        }}
        className="min-w-0 flex-1 bg-transparent font-serif text-[1.75rem] leading-none tracking-[-0.015em] tabular-nums outline-none placeholder:text-muted-foreground/75"
      />
    </div>
  )
}

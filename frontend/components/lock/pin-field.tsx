"use client"

import { cleanPin, MAX_PIN_LENGTH, MIN_PIN_LENGTH } from "@/lib/lock"
import { cn } from "@/lib/utils"

interface PinFieldProps {
  id: string
  /** Digits only. */
  value: string
  onChange: (digits: string) => void
  invalid?: boolean
  describedBy?: string
  autoFocus?: boolean
  disabled?: boolean
}

/**
 * A box for a PIN that shows what has been typed as dots, like a phone's lock screen. It is one real input (a password box
 * that asks a phone for its number pad), drawn invisibly over the dots, so the keyboard, pasting, the browser and screen
 * readers all work as they do for any box. Four dots are always there to show the shortest PIN; more appear as it gets longer.
 */
export function PinField({ id, value, onChange, invalid, describedBy, autoFocus, disabled }: PinFieldProps) {
  const slots = Math.max(MIN_PIN_LENGTH, value.length)

  return (
    <div
      className={cn(
        "relative flex h-14 items-center justify-center rounded-lg border border-input bg-card px-4 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
        invalid && "border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/30",
        disabled && "opacity-60"
      )}
    >
      <span aria-hidden className="flex items-center gap-3.5">
        {Array.from({ length: slots }, (_, index) => (
          <span
            key={index}
            data-filled={index < value.length ? "" : undefined}
            className={cn(
              "size-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-150",
              index < value.length ? "scale-100 border-foreground bg-foreground" : "scale-90 border-input bg-transparent"
            )}
          />
        ))}
      </span>
      <input
        id={id}
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="go"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={MAX_PIN_LENGTH}
        value={value}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(cleanPin(event.target.value))}
        // Drawn over the dots and see-through, so it takes the taps and the typing. 16px or more, so a phone doesn't zoom in on it.
        className="absolute inset-0 size-full cursor-text rounded-lg bg-transparent text-base text-transparent opacity-0 caret-transparent outline-none"
      />
    </div>
  )
}

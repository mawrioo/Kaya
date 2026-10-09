/**
 * The PIN that can lock Kaya, as the screens see it: what a PIN may look like, and the plain-English checks for the boxes
 * where one is typed. No React in here. The backend checks it all again; it never trusts the form.
 */

/** The cookie the backend gives a device that has typed the PIN (backend/src/auth.ts uses the same name). */
export const SESSION_COOKIE = "kaya_session"
export const MIN_PIN_LENGTH = 4
export const MAX_PIN_LENGTH = 8

/** What a PIN box keeps from what was typed or pasted: digits only, and no more than the longest PIN. */
export function cleanPin(typed: string): string {
  return typed.replace(/\D/g, "").slice(0, MAX_PIN_LENGTH)
}

/** A problem with a PIN being chosen, in plain words, or nothing when it is fine. */
export function pinProblem(pin: string): string | undefined {
  if (!pin) return "Enter a PIN."
  if (!/^\d+$/.test(pin)) return "Use digits only (0 to 9)."
  if (pin.length < MIN_PIN_LENGTH || pin.length > MAX_PIN_LENGTH) return `Use ${MIN_PIN_LENGTH} to ${MAX_PIN_LENGTH} digits.`
  return undefined
}

export type PinField = "currentPin" | "pin" | "repeat"
export type PinErrors = Partial<Record<PinField, string>>

/**
 * Checks the boxes of the "set a PIN" and "change PIN" forms. `needsCurrent` is true when a PIN already exists (changing it),
 * and then the current one has to be typed too.
 */
export function validatePinForm(form: { currentPin: string; pin: string; repeat: string }, needsCurrent: boolean): PinErrors {
  const errors: PinErrors = {}
  if (needsCurrent && !form.currentPin) errors.currentPin = "Enter your current PIN."
  const problem = pinProblem(form.pin)
  if (problem) errors.pin = problem
  else if (needsCurrent && form.pin === form.currentPin) errors.pin = "Choose a different PIN from the current one."
  if (!form.repeat) errors.repeat = "Type the new PIN again."
  else if (!problem && form.repeat !== form.pin) errors.repeat = "The two PINs don't match."
  return errors
}

/** How long a wait is, in words: "30 seconds", "1 minute". */
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
}

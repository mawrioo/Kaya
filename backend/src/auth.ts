/**
 * The PIN that can lock Kaya.
 *
 * Without a PIN nothing changes: the app opens as it always did. With one, a device (this computer's browser, or a phone on the
 * same Wi-Fi) has to type the PIN once, and is then remembered for SESSION_DAYS by a cookie. The PIN itself is never stored,
 * only a salted scrypt hash of it, and the cookie's token is never stored either, only its hash, so a copy of the database
 * file can't be used to open the app. Wrong tries are counted and, after a few, make the next try wait (longer each time).
 *
 * This keeps other people on the same Wi-Fi out. It is not a vault: whoever can open the database file on this computer
 * can read it, with or without the PIN. (A forgotten PIN is removed from this computer with `npm run pin:reset`.)
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { isoWithOffset } from "./time.ts"
import type { AuthStatus } from "./types.ts"
import { ValidationError } from "./validate.ts"

/** The name of the cookie that says "this device has typed the PIN". */
export const SESSION_COOKIE = "kaya_session"
/** How long a device stays unlocked after the PIN was typed on it. */
export const SESSION_DAYS = 1
export const MIN_PIN_LENGTH = 4
export const MAX_PIN_LENGTH = 8

/** This many wrong tries in a row are free. The next one starts a wait. */
const FREE_TRIES = 5
const FIRST_WAIT_SECONDS = 30
/** The wait doubles with every further wrong try, up to this. */
const LONGEST_WAIT_SECONDS = 15 * 60
const DAY_MS = 24 * 60 * 60 * 1000

/** A wrong PIN (401), or too many wrong tries (429, with how long to wait). The message is written for the owner to read. */
export class AuthError extends Error {
  status: 401 | 429
  retryAfterSeconds?: number
  constructor(message: string, status: 401 | 429, retryAfterSeconds?: number) {
    super(message)
    this.status = status
    if (retryAfterSeconds !== undefined) this.retryAfterSeconds = retryAfterSeconds
  }
}

interface LockRow {
  pin_hash: string
  pin_salt: string
  wrong_tries: number
  wait_until: number | null
}

/** "30 seconds", "1 minute", "5 minutes": how long a wait is, in words. */
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`
}

/** `now` can be handed in so the tests can move the clock. */
export function createAuth(db: DatabaseSync, now: () => Date = () => new Date()) {
  const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

  function getLock(): LockRow | undefined {
    return db.prepare("SELECT pin_hash, pin_salt, wrong_tries, wait_until FROM app_lock WHERE id = 1").get() as LockRow | undefined
  }

  function isPinSet(): boolean {
    return getLock() !== undefined
  }

  /** A PIN as typed: 4 to 8 digits. */
  function parsePin(value: unknown, label: string): string {
    if (typeof value !== "string") throw new ValidationError(`${label} must be typed as digits.`)
    if (!/^\d+$/.test(value)) throw new ValidationError(`${label} can only have digits (0 to 9).`)
    if (value.length < MIN_PIN_LENGTH || value.length > MAX_PIN_LENGTH) {
      throw new ValidationError(`${label} must be ${MIN_PIN_LENGTH} to ${MAX_PIN_LENGTH} digits.`)
    }
    return value
  }

  /** The PIN somebody typed to prove it is them. Not held to the length rules: a wrong guess is just a wrong guess. */
  function typedPin(value: unknown, label: string): string {
    if (typeof value !== "string") throw new ValidationError(`${label} must be typed as digits.`)
    return value
  }

  function newHash(pin: string) {
    const salt = randomBytes(16)
    return { salt: salt.toString("hex"), hash: scryptSync(pin, salt, 32).toString("hex") }
  }

  /**
   * Throws unless `pin` is the PIN. A wrong one is counted; after FREE_TRIES wrong ones in a row every further wrong one
   * starts a wait, and nothing (not even the right PIN) is accepted until it is over. A right one clears the count.
   */
  function checkPin(pin: string): void {
    const lock = getLock()
    if (!lock) throw new ValidationError("There is no PIN set.")
    const at = now().getTime()
    if (lock.wait_until !== null && lock.wait_until > at) {
      const seconds = Math.ceil((lock.wait_until - at) / 1000)
      throw new AuthError(`Too many tries. Wait ${waitText(seconds)}, then try again.`, 429, seconds)
    }

    const expected = Buffer.from(lock.pin_hash, "hex")
    const actual = scryptSync(pin, Buffer.from(lock.pin_salt, "hex"), expected.length)
    if (timingSafeEqual(expected, actual)) {
      if (lock.wrong_tries !== 0 || lock.wait_until !== null) {
        db.prepare("UPDATE app_lock SET wrong_tries = 0, wait_until = NULL WHERE id = 1").run()
      }
      return
    }

    const wrong = lock.wrong_tries + 1
    if (wrong >= FREE_TRIES) {
      const seconds = Math.min(LONGEST_WAIT_SECONDS, FIRST_WAIT_SECONDS * 2 ** (wrong - FREE_TRIES))
      db.prepare("UPDATE app_lock SET wrong_tries = ?, wait_until = ? WHERE id = 1").run(wrong, at + seconds * 1000)
      throw new AuthError(`That PIN isn't right, and that was the last free try. Wait ${waitText(seconds)}, then try again.`, 429, seconds)
    }
    db.prepare("UPDATE app_lock SET wrong_tries = ? WHERE id = 1").run(wrong)
    const left = FREE_TRIES - wrong
    throw new AuthError(`That PIN isn't right. ${left} ${left === 1 ? "try" : "tries"} left before a short wait.`, 401)
  }

  // ---- devices that have typed the PIN ------------------------------------------------------

  /** Remembers a device and hands back the token its cookie carries. Only the token's hash is kept. */
  function startSession(): { token: string; maxAgeSeconds: number } {
    const token = randomBytes(32).toString("base64url")
    const at = now().getTime()
    db.prepare("DELETE FROM app_sessions WHERE expires_at <= ?").run(at)
    db.prepare("INSERT INTO app_sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)").run(
      hashToken(token),
      at,
      at + SESSION_DAYS * DAY_MS
    )
    return { token, maxAgeSeconds: SESSION_DAYS * 24 * 60 * 60 }
  }

  function hasSession(token: string | undefined): boolean {
    if (!token) return false
    const row = db.prepare("SELECT expires_at FROM app_sessions WHERE token_hash = ?").get(hashToken(token)) as
      | { expires_at: number }
      | undefined
    return row !== undefined && row.expires_at > now().getTime()
  }

  // ---- what the routes use ------------------------------------------------------------------

  /** True when there is no PIN, or this device has typed it. Every route except the health check and these ones asks. */
  function isAllowed(token: string | undefined): boolean {
    return !isPinSet() || hasSession(token)
  }

  function status(token: string | undefined): AuthStatus {
    const pinSet = isPinSet()
    return { pinSet, unlocked: !pinSet || hasSession(token) }
  }

  /** Types the PIN on a device. Returns the token for its cookie. */
  function unlock(body: unknown): { token: string; maxAgeSeconds: number } {
    const pin = typedPin((body as { pin?: unknown } | null)?.pin, "The PIN")
    checkPin(pin)
    return startSession()
  }

  /** Forgets this device, so it has to type the PIN again. */
  function lock(token: string | undefined): void {
    if (token) db.prepare("DELETE FROM app_sessions WHERE token_hash = ?").run(hashToken(token))
  }

  function replaceLock(pin: string) {
    const { salt, hash } = newHash(pin)
    db.exec("BEGIN IMMEDIATE")
    try {
      db.prepare(
        `INSERT INTO app_lock (id, pin_hash, pin_salt, wrong_tries, wait_until, changed_at) VALUES (1, ?, ?, 0, NULL, ?)
         ON CONFLICT (id) DO UPDATE SET pin_hash = excluded.pin_hash, pin_salt = excluded.pin_salt,
                                        wrong_tries = 0, wait_until = NULL, changed_at = excluded.changed_at`
      ).run(hash, salt, isoWithOffset(now()))
      // Every device has to type the new PIN. The one that just did it is let in again below.
      db.exec("DELETE FROM app_sessions")
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }

  /**
   * Turns the PIN on, or changes it. Changing needs the current PIN (`currentPin`). Every other device is signed out, and
   * the one that did it stays in: it gets a token for its cookie.
   */
  function setPin(body: unknown): { token: string; maxAgeSeconds: number } {
    const input = (body ?? {}) as { pin?: unknown; currentPin?: unknown }
    const pin = parsePin(input.pin, "The new PIN")
    if (isPinSet()) checkPin(typedPin(input.currentPin, "The current PIN"))
    replaceLock(pin)
    return startSession()
  }

  /** Turns the PIN off. Needs the current PIN. */
  function removePin(body: unknown): void {
    const input = (body ?? {}) as { currentPin?: unknown }
    checkPin(typedPin(input.currentPin, "The PIN"))
    forceRemove()
  }

  /** Turns the PIN off without asking for it. Only for `npm run pin:reset`, which can only be run on this computer. */
  function forceRemove(): void {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec("DELETE FROM app_lock")
      db.exec("DELETE FROM app_sessions")
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }

  return { isPinSet, isAllowed, status, unlock, lock, setPin, removePin, forceRemove }
}

export type Auth = ReturnType<typeof createAuth>

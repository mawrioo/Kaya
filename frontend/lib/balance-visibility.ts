/**
 * Which balances the owner has hidden with the eye icon.
 *
 * The choice lives in a cookie, not localStorage, so the server can read it and
 * draw the dots from the very first paint. With localStorage the real numbers
 * would flash on screen for a moment on every reload, which is exactly what
 * hiding them is meant to prevent.
 *
 * Each hidden balance is an id: TOTAL_BALANCE_ID, or a wallet's own id.
 */

export const HIDDEN_BALANCES_COOKIE = "hidden_balances"

/** The id for the total balance card. Wallets use their own ids. */
export const TOTAL_BALANCE_ID = "total"

const SEPARATOR = "|"
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365

/** Turns the cookie's text back into a list of ids. Anything unreadable means nothing is hidden. */
export function parseHiddenBalances(raw: string | undefined): string[] {
  if (!raw) return []
  let text = raw
  try {
    text = decodeURIComponent(raw)
  } catch {
    // keep the raw text
  }
  return text.split(SEPARATOR).filter(Boolean)
}

/** The full `document.cookie` string for a set of hidden ids. Nothing hidden removes the cookie. */
export function hiddenBalancesCookie(ids: Iterable<string>): string {
  const list = [...ids]
  if (list.length === 0) return `${HIDDEN_BALANCES_COOKIE}=; path=/; max-age=0; samesite=lax`
  return `${HIDDEN_BALANCES_COOKIE}=${encodeURIComponent(list.join(SEPARATOR))}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`
}

/**
 * The colours and icons a wallet can wear. Kept here (not in types.ts) because
 * the database and the checks need the actual lists, not just their types.
 */
import type { PaletteColor, WalletIconName } from "./types.ts"

/** Every colour a wallet can wear, in the order new wallets are handed them (the least-used one goes first). */
export const WALLET_COLORS: PaletteColor[] = ["moss", "sky", "marigold", "plum", "teal", "rose", "sand", "clay", "sage", "ochre"]

/** Every icon a wallet can wear. */
export const WALLET_ICONS: WalletIconName[] = [
  "landmark",
  "smartphone",
  "wallet",
  "trending-up",
  "banknote",
  "credit-card",
  "coins",
  "piggy-bank",
  "gem",
  "house",
  "graduation-cap",
  "plane",
]

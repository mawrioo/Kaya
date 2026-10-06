import type { PaletteColor, WalletIconName, WalletKind } from "@/lib/types"

/** The kinds of wallet, in the order they are offered when adding one. */
export const walletKinds: { value: WalletKind; label: string }[] = [
  { value: "bank", label: "Bank account" },
  { value: "digital-bank", label: "Digital bank" },
  { value: "e-wallet", label: "E-wallet" },
  { value: "investment", label: "Investment" },
  { value: "cash", label: "Cash" },
]

/** The colours a wallet can wear, grouped by hue so the row of swatches reads as a spectrum. */
export const walletColorChoices: { value: PaletteColor; label: string }[] = [
  { value: "moss", label: "Moss" },
  { value: "sage", label: "Sage" },
  { value: "teal", label: "Teal" },
  { value: "sky", label: "Sky" },
  { value: "plum", label: "Plum" },
  { value: "rose", label: "Rose" },
  { value: "clay", label: "Clay" },
  { value: "marigold", label: "Marigold" },
  { value: "ochre", label: "Ochre" },
  { value: "sand", label: "Sand" },
]

/** The icons a wallet can wear, in the order they are offered, with a name for screen readers. */
export const walletIconOptions: { value: WalletIconName; label: string }[] = [
  { value: "landmark", label: "Bank" },
  { value: "smartphone", label: "Phone" },
  { value: "wallet", label: "Wallet" },
  { value: "credit-card", label: "Card" },
  { value: "banknote", label: "Cash" },
  { value: "coins", label: "Coins" },
  { value: "piggy-bank", label: "Piggy bank" },
  { value: "trending-up", label: "Growth" },
  { value: "gem", label: "Gem" },
  { value: "house", label: "House" },
  { value: "graduation-cap", label: "Education" },
  { value: "plane", label: "Travel" },
]

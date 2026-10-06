import {
  Banknote,
  Briefcase,
  Bus,
  Camera,
  Car,
  CircleEllipsis,
  Clapperboard,
  Coffee,
  Coins,
  CreditCard,
  Dumbbell,
  Gamepad2,
  Gem,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  HeartHandshake,
  HeartPulse,
  House,
  KeyRound,
  Laptop,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Tag,
  TrendingUp,
  Umbrella,
  Utensils,
  Wallet as WalletIcon,
  Zap,
  type LucideIcon,
} from "lucide-react"

import type { GoalIconName, IconName, Wallet, WalletIconName, WalletKind } from "@/lib/types"

/** Every icon a goal can wear, by name. */
export const goalIconChoices: Record<GoalIconName, LucideIcon> = {
  "piggy-bank": PiggyBank,
  umbrella: Umbrella,
  plane: Plane,
  "key-round": KeyRound,
  car: Car,
  laptop: Laptop,
  "graduation-cap": GraduationCap,
  heart: Heart,
  gift: Gift,
  "heart-pulse": HeartPulse,
  gem: Gem,
  camera: Camera,
}

/** Every icon a wallet can wear, by name. */
export const walletIconChoices: Record<WalletIconName, LucideIcon> = {
  landmark: Landmark,
  smartphone: Smartphone,
  wallet: WalletIcon,
  "trending-up": TrendingUp,
  banknote: Banknote,
  "credit-card": CreditCard,
  coins: Coins,
  "piggy-bank": PiggyBank,
  gem: Gem,
  house: House,
  "graduation-cap": GraduationCap,
  plane: Plane,
}

/** The icon a wallet wears until the owner picks another: one per kind of wallet. */
export const defaultWalletIconName: Record<WalletKind, WalletIconName> = {
  bank: "landmark",
  "digital-bank": "smartphone",
  "e-wallet": "wallet",
  investment: "trending-up",
  cash: "banknote",
}

/** The default icon for each kind of wallet. */
export const walletIcons = Object.fromEntries(
  Object.entries(defaultWalletIconName).map(([kind, name]) => [kind, walletIconChoices[name]])
) as Record<WalletKind, LucideIcon>

/** The name of the icon to draw for a wallet: the one the owner chose, or the default for its kind. */
export function walletIconName(wallet: Pick<Wallet, "kind" | "icon">): WalletIconName {
  return wallet.icon ?? defaultWalletIconName[wallet.kind]
}

/** Every icon a category can wear, by the name stored in the data. */
export const icons: Record<IconName, LucideIcon> = {
  tag: Tag,
  utensils: Utensils,
  coffee: Coffee,
  "shopping-basket": ShoppingBasket,
  "shopping-bag": ShoppingBag,
  shirt: Shirt,
  bus: Bus,
  car: Car,
  house: House,
  receipt: Receipt,
  zap: Zap,
  smartphone: Smartphone,
  clapperboard: Clapperboard,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  plane: Plane,
  "paw-print": PawPrint,
  "heart-handshake": HeartHandshake,
  gift: Gift,
  briefcase: Briefcase,
  "hand-coins": HandCoins,
  "circle-ellipsis": CircleEllipsis,
}

import { walletIconChoices, walletIconName } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

const SIZES = {
  /** In a dropdown list. */
  sm: { badge: "size-6", icon: "size-3.5", rim: false },
  /** In a dialog header or a list row. */
  md: { badge: "size-10", icon: "size-[1.125rem]", rim: true },
  /** On a wallet card. */
  lg: { badge: "size-11", icon: "size-5", rim: true },
}

/** A wallet's round badge: the icon it wears, in the colour it wears. */
export function WalletBadge({
  wallet,
  size = "lg",
  className,
}: {
  wallet: Pick<Wallet, "kind" | "icon" | "color">
  size?: keyof typeof SIZES
  className?: string
}) {
  const Icon = walletIconChoices[walletIconName(wallet)]
  const palette = paletteClasses[wallet.color]

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        SIZES[size].rim && "coin-rim",
        palette.soft,
        palette.icon,
        SIZES[size].badge,
        className
      )}
    >
      <Icon className={SIZES[size].icon} aria-hidden />
    </span>
  )
}

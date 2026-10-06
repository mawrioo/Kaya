import { WalletBadge } from "@/components/wallet-badge"
import { icons } from "@/lib/icons"
import { paletteClasses } from "@/lib/palette"
import type { Category, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

/** A category as it looks inside a dropdown: its tinted round icon, then its name. */
export function CategoryOption({ category }: { category: Category }) {
  const Icon = icons[category.icon]
  const palette = paletteClasses[category.color]

  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", palette.soft, palette.icon)}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      <span className="min-w-0 wrap-anywhere">{category.name}</span>
    </span>
  )
}

/** A wallet as it looks inside a dropdown: its badge (icon and colour), then its name. */
export function WalletOption({ wallet }: { wallet: Wallet }) {
  return (
    <span className="flex items-center gap-2.5">
      <WalletBadge wallet={wallet} size="sm" />
      <span className="min-w-0 wrap-anywhere">{wallet.name}</span>
    </span>
  )
}

/** The look shared by every dropdown trigger, so filters and form fields match. */
export const selectTriggerClasses = "w-full bg-card hover:bg-muted data-[size=default]:h-10 dark:bg-card dark:hover:bg-muted"

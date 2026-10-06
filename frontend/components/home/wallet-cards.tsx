import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { BalanceToggle, HideableMoney } from "@/components/balance-visibility"
import { WalletBadge } from "@/components/wallet-badge"
import type { Wallet } from "@/lib/types"

/**
 * One card per wallet: its badge, name and balance, with an eye to hide the
 * balance. The whole card is a link that opens that wallet's transactions.
 */
export function WalletCards({ wallets }: { wallets: Wallet[] }) {
  return (
    <section aria-label="Wallets">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {wallets.map((wallet) => (
          <li key={wallet.id} className="flex">
            <WalletCard wallet={wallet} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function WalletCard({ wallet }: { wallet: Wallet }) {
  return (
    <div className="group relative flex w-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-[box-shadow,translate] duration-200 hover:shadow-md has-[a:active]:translate-y-px has-[a:active]:shadow-xs has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring">
      <div className="flex items-center gap-3">
        <WalletBadge wallet={wallet} size="md" />
        {wallet.kind === "investment" ? (
          <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-sand-foreground">
            Investment
          </span>
        ) : null}
        {/* Sits above the card's link so it can be pressed on its own */}
        <BalanceToggle id={wallet.id} label={wallet.name} className="relative z-10 ml-auto -mr-2" />
      </div>
      <p className="mt-4 flex items-center justify-between gap-2 font-medium">
        <Link
          href={`/transactions?wallet=${encodeURIComponent(wallet.id)}`}
          className="min-w-0 break-words outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          {wallet.name}
        </Link>
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </p>
      {/* Pinned to the bottom (cards in a row are the same height), so the amounts line up even when a long name wraps. */}
      <p className="mt-auto pt-1 type-amount">
        <HideableMoney id={wallet.id} amount={wallet.balance} />
      </p>
    </div>
  )
}

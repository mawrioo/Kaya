import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { BalanceToggle, HideableBalance, HideableMoney } from "@/components/balance-visibility"
import { WalletBadge } from "@/components/wallet-badge"
import type { Wallet } from "@/lib/types"

/**
 * One card per wallet: its badge, name and balance, with an eye to hide the
 * balance. The whole card is a link that opens that wallet's transactions.
 */
export function WalletCards({ wallets }: { wallets: Wallet[] }) {
  return (
    <section aria-label="Wallets">
      <div className="mb-2 flex items-center justify-between md:hidden">
        <h2 className="text-sm font-semibold">Your wallets</h2>
        <Link href="/wallets" className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground">Manage <ArrowRight className="size-3" aria-hidden /></Link>
      </div>
      <ul className="home-wallet-list grid grid-cols-1 gap-2 md:gap-4 md:grid-cols-2 xl:grid-cols-4">
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
    <div className="home-wallet-card group relative grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 rounded-xl bg-card px-2.5 py-1.5 md:flex md:flex-col md:items-stretch md:gap-0 md:rounded-xl md:border md:bg-card md:p-5 md:shadow-sm transition-[box-shadow,translate] duration-200 md:hover:shadow-md has-[a:active]:translate-y-px has-[a:active]:shadow-xs has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring">
      <div className="contents md:flex md:items-center md:gap-3">
        <span className="hidden md:block"><WalletBadge wallet={wallet} size="md" /></span>
        {wallet.kind === "investment" || wallet.kind === "deposito" ? (
          <span className="hidden md:inline rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-sand-foreground">
            {wallet.kind === "deposito" ? "Deposito" : "Investment"}
          </span>
        ) : null}
        {/* Sits above the card's link so it can be pressed on its own */}
        <BalanceToggle id={wallet.id} label={wallet.name} className="relative z-10 col-start-3 row-start-1 ml-auto -mr-2" />
      </div>
      <p className="col-start-1 row-start-1 flex min-w-0 items-center justify-between gap-2 text-sm font-medium md:mt-4 md:text-base">
        <Link
          href={`/transactions?wallet=${encodeURIComponent(wallet.id)}`}
          className="min-w-0 break-words outline-none after:absolute after:inset-0 after:rounded-xl"
        >
          <span className="mr-2 inline-flex align-middle md:hidden"><WalletBadge wallet={wallet} size="sm" /></span>
          {wallet.name}
        </Link>
        <ArrowRight
          className="hidden md:block size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </p>
      <p className="home-wallet-amount col-start-2 row-start-1 text-right text-sm font-medium md:mt-1 md:text-left md:type-amount">
        <span className="md:hidden"><HideableBalance id={wallet.id} amount={wallet.balance} /></span>
        <span className="hidden md:inline"><HideableMoney id={wallet.id} amount={wallet.balance} /></span>
      </p>
    </div>
  )
}

import type { CSSProperties } from "react"
import { CircleAlert } from "lucide-react"

import { BalanceToggle, HideableMoney, ShowWhenVisible } from "@/components/balance-visibility"
import { TOTAL_BALANCE_ID } from "@/lib/balance-visibility"
import { formatPercent, formatRupiah } from "@/lib/format"
import { paletteClasses } from "@/lib/palette"
import { overdrawnWallets, totalBalance, walletShares } from "@/lib/stats"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Full balance and independent privacy, with a compact signature card on phones. */
export function TotalBalanceCard({ wallets, className }: { wallets: Wallet[]; className?: string }) {
  const total = totalBalance(wallets)
  const shares = walletShares(wallets)
  const overdrawn = overdrawnWallets(wallets)

  return (
    <section aria-labelledby="total-balance-label" className={cn("home-total-balance relative isolate overflow-hidden rounded-xl border bg-linear-to-br from-sage to-card p-4 shadow-sm md:p-8", className)}>
      <div aria-hidden className="kawung pointer-events-none absolute inset-y-0 right-0 -z-10 hidden w-2/3 text-sage-foreground opacity-[0.17] md:block" />
      {/* Desktop's kawung motif as a static background, without a phone filter or mask. */}
      <div aria-hidden className="phone-balance-pattern md:hidden" />
      <div className="flex items-center justify-between gap-4">
        <h2 id="total-balance-label" className="text-base font-medium text-muted-foreground">Total balance</h2>
        <span className="hidden md:contents"><BalanceToggle id={TOTAL_BALANCE_ID} label="total" className="-my-2 -mr-2" /></span>
      </div>
      <div className="phone-total-value md:hidden" style={{ "--balance-length": Math.max(13, formatRupiah(total).length) } as CSSProperties}>
        <HideableMoney id={TOTAL_BALANCE_ID} amount={total} roll={false} className="phone-total-money" />
        <BalanceToggle id={TOTAL_BALANCE_ID} label="total" />
      </div>
      <p className="mt-4 hidden md:block"><HideableMoney id={TOTAL_BALANCE_ID} amount={total} className="type-amount-hero" /></p>
      <p className="mt-1 text-sm md:mt-3 text-muted-foreground">Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"}</p>
      <ShowWhenVisible id={TOTAL_BALANCE_ID}>
        <div className="hidden md:block">
          <div className="mt-8 flex h-2.5 gap-1" aria-hidden>
            {shares.map(({ wallet }) => <span key={wallet.id} className={cn("h-full rounded-full", paletteClasses[wallet.color].fill)} style={{ flexGrow: wallet.balance, flexBasis: 0 }} />)}
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {shares.map(({ wallet, percent }) => (
              <li key={wallet.id} className="flex max-w-full min-w-0 items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", paletteClasses[wallet.color].fill)} aria-hidden />
                <span className="min-w-0 wrap-anywhere">{wallet.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{formatPercent(percent)}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Preserve below-zero information on phones when their chart is removed. */}
        {overdrawn.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground" data-slot="overdrawn-list">
            {overdrawn.map(wallet => (
              <ShowWhenVisible key={wallet.id} id={wallet.id}>
                <li className="flex items-start gap-1.5">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
                  <span className="min-w-0 wrap-anywhere">Below zero: <span className="font-medium text-foreground">{wallet.name}</span>{" "}<span className="font-medium whitespace-nowrap text-negative tabular-nums">{formatRupiah(wallet.balance)}</span></span>
                </li>
              </ShowWhenVisible>
            ))}
          </ul>
        ) : null}
      </ShowWhenVisible>
    </section>
  )
}

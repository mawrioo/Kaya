import { CircleAlert } from "lucide-react"

import { BalanceToggle, HideableMoney, ShowWhenVisible } from "@/components/balance-visibility"
import { TOTAL_BALANCE_ID } from "@/lib/balance-visibility"
import { formatPercent, formatRupiah } from "@/lib/format"
import { paletteClasses } from "@/lib/palette"
import { overdrawnWallets, totalBalance, walletShares } from "@/lib/stats"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * The most important number on the app. The bar under it shows how the total
 * splits across wallets, in the same colors as the legend below it. The eye
 * hides the number and the bar together, because the split would give the
 * amount away.
 */
export function TotalBalanceCard({ wallets }: { wallets: Wallet[] }) {
  const total = totalBalance(wallets)
  const shares = walletShares(wallets)
  const overdrawn = overdrawnWallets(wallets)

  return (
    <section
      aria-labelledby="total-balance-label"
      className="relative isolate overflow-hidden rounded-xl border bg-linear-to-br from-sage to-card p-6 shadow-sm md:p-8"
    >
      {/* The engraving: a batik lattice (kawung) fading in from the right. Decoration only. */}
      <div aria-hidden className="kawung pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 text-sage-foreground opacity-[0.17]" />
      <div className="flex items-center justify-between gap-4">
        <h2 id="total-balance-label" className="text-base font-medium text-muted-foreground">
          Total balance
        </h2>
        {/* Negative margins let the round button bleed into the padding so the row stays as tall as the label */}
        <BalanceToggle id={TOTAL_BALANCE_ID} label="total" className="-my-2 -mr-2" />
      </div>
      <p className="mt-3 md:mt-4">
        <HideableMoney id={TOTAL_BALANCE_ID} amount={total} className="type-amount-hero" />
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Across {wallets.length} {wallets.length === 1 ? "wallet" : "wallets"}
      </p>

      <ShowWhenVisible id={TOTAL_BALANCE_ID}>
        <div className="mt-8 flex h-2.5 gap-1" aria-hidden>
          {shares.map(({ wallet }) => (
            <span
              key={wallet.id}
              className={cn("h-full rounded-full", paletteClasses[wallet.color].fill)}
              style={{ flexGrow: wallet.balance, flexBasis: 0 }}
            />
          ))}
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
        {/* A wallet below zero isn't a slice of anything, so it is listed apart from the bar. Like the bar, it is left out while that balance is hidden. */}
        {overdrawn.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground" data-slot="overdrawn-list">
            {overdrawn.map((wallet) => (
              <ShowWhenVisible key={wallet.id} id={wallet.id}>
                <li className="flex items-start gap-1.5">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
                  <span className="min-w-0 wrap-anywhere">
                    Below zero: <span className="font-medium text-foreground">{wallet.name}</span>{" "}
                    <span className="font-medium whitespace-nowrap text-negative tabular-nums">{formatRupiah(wallet.balance)}</span>
                  </span>
                </li>
              </ShowWhenVisible>
            ))}
          </ul>
        ) : null}
      </ShowWhenVisible>
    </section>
  )
}

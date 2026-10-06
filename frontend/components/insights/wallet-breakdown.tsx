"use client"

import { RankedRow } from "@/components/insights/ranked-row"
import { Panel } from "@/components/panel"
import { WalletBadge } from "@/components/wallet-badge"
import { countText } from "@/lib/category-summary"
import { formatMonth, formatRupiah } from "@/lib/format"
import type { WalletSpend } from "@/lib/insights"
import { paletteClasses } from "@/lib/palette"

/**
 * Which wallets the month's spending came out of, biggest first, each with its share and how many payments that was.
 * Transfers between your own wallets are not spending, so they are not here. The rows are not links: a wallet's
 * transactions also include its income and transfers, so the list behind a link would not add up to the number.
 */
export function WalletBreakdown({ rows, month }: { rows: WalletSpend[]; month: string }) {
  return (
    <Panel title="Spending by wallet" caption={formatMonth(month)}>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nothing spent this month.</p>
      ) : (
        <ul className="divide-y">
          {rows.map(({ wallet, amount, count, share }) => (
            <RankedRow
              key={wallet.id}
              badge={<WalletBadge wallet={wallet} size="md" />}
              name={wallet.name}
              amount={{ text: formatRupiah(-amount), className: "text-negative" }}
              share={share}
              meta={countText(count)}
              barClass={paletteClasses[wallet.color].fill}
            />
          ))}
        </ul>
      )}
    </Panel>
  )
}

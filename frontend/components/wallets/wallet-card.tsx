"use client"

import { useRef } from "react"
import Link from "next/link"
import { CircleAlert, Ellipsis, History, Pencil, Scale, Trash2, TrendingDown, TrendingUp } from "lucide-react"

import { BalanceToggle, HideableMoney, ShowWhenVisible } from "@/components/balance-visibility"
import { useData } from "@/components/data-provider"
import { WalletBadge } from "@/components/wallet-badge"
import { depositoLine } from "@/lib/deposito"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatRupiah } from "@/lib/format"
import { walletGoals } from "@/lib/goals"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

/** The id of a wallet's "more" button, so a dialog opened from its menu can hand keyboard focus back to it. */
export const walletMenuId = (walletId: string) => `wallet-menu-${walletId}`

interface WalletCardProps {
  wallet: Wallet
  /** Today's calendar date from the server, "2026-10-08", for the months left on a deposito. */
  today: string
  /** True for a wallet that was just added, so it eases in. */
  isNew?: boolean
  onEdit: (wallet: Wallet) => void
  /** Opens "Update value" for an investment, or "Correct balance" for any other wallet. */
  onSetBalance: (wallet: Wallet) => void
  onHistory: (wallet: Wallet) => void
  /** Opens the box for moving a matured deposito's money into another wallet. */
  onSettle: (wallet: Wallet) => void
  onDelete: (wallet: Wallet) => void
}

/**
 * One wallet: what it is for and what is in it.
 * The whole card is a link to that wallet's transactions. The eye, the "more"
 * menu and "Update value" sit above that link so they can be pressed on their own.
 */
export function WalletCard({ wallet, today, isNew, onEdit, onSetBalance, onHistory, onSettle, onDelete }: WalletCardProps) {
  const isInvestment = wallet.kind === "investment"
  const isDeposito = wallet.kind === "deposito"

  return (
    <li
      id={`wallet-card-${wallet.id}`}
      className={cn(
        "flex",
        isNew && "animate-in duration-500 fade-in-0 slide-in-from-bottom-3"
      )}
    >
      <div className="group relative flex w-full flex-col rounded-xl border bg-card p-5 shadow-sm transition-[box-shadow,translate] duration-200 hover:shadow-md has-[a:active]:translate-y-px has-[a:active]:shadow-xs has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring md:p-6">
        <div className="flex items-start gap-3.5">
          <WalletBadge wallet={wallet} size="lg" />

          <div className="min-w-0 flex-1 pt-0.5">
            {/* A long name wraps rather than being cut off, and the chip drops to its own line if there is no room beside it */}
            <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
              <Link
                href={`/transactions?wallet=${encodeURIComponent(wallet.id)}`}
                className="max-w-full break-words underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-xl"
              >
                {wallet.name}
              </Link>
              {isInvestment || isDeposito ? (
                <span className="shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-sand-foreground">
                  {isDeposito ? "Deposito" : "Investment"}
                </span>
              ) : null}
            </h3>
            {wallet.description ? (
              <p className="mt-0.5 text-sm break-words text-muted-foreground">{wallet.description}</p>
            ) : null}
          </div>

          {/* Negative margins let the round buttons bleed into the padding so the row stays as tall as the icon */}
          <div className="relative z-10 -mt-1 -mr-2 flex shrink-0">
            <BalanceToggle id={wallet.id} label={wallet.name} />
            <WalletMenu
              wallet={wallet}
              onEdit={onEdit}
              onSetBalance={onSetBalance}
              onHistory={onHistory}
              onDelete={onDelete}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="type-amount">
            <HideableMoney id={wallet.id} amount={wallet.balance} />
          </p>
          {isInvestment ? (
            <Button variant="secondary" size="lg" className="relative z-10" onClick={() => onSetBalance(wallet)}>
              Update value
              <span className="sr-only"> for {wallet.name}</span>
            </Button>
          ) : null}
        </div>

        <SetAside wallet={wallet} />

        {isInvestment ? <ValueChange wallet={wallet} onHistory={onHistory} /> : null}
        {isDeposito ? <DepositoDetails wallet={wallet} today={today} onSettle={onSettle} /> : null}
      </div>
    </li>
  )
}

/**
 * How much of this wallet is already spoken for by goals saved in it, so the
 * balance isn't mistaken for money free to spend. Nothing shows for a wallet with
 * no goals. It is left out while the balance is hidden, because it would give it away.
 * When the goals ask for more than the wallet holds it says so, with one small clay
 * mark instead of a banner.
 */
function SetAside({ wallet }: { wallet: Wallet }) {
  const { goals } = useData()
  const { reserved, count, overcommitted, free } = walletGoals(goals, wallet)
  if (count === 0) return null

  const forGoals = count === 1 ? "a goal" : `${count} goals`
  const amount = <span className="font-medium text-foreground">{formatRupiah(reserved)}</span>

  return (
    <ShowWhenVisible id={wallet.id}>
      <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
        {overcommitted ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden /> : null}
        <span>
          {overcommitted ? (
            <>
              {amount} is set aside for {forGoals}, more than this wallet holds.
            </>
          ) : (
            <>
              {amount} set aside for {forGoals}
              {free > 0 ? <> · {formatRupiah(free)} free</> : null}
            </>
          )}
        </span>
      </p>
    </ShowWhenVisible>
  )
}

/** Everything else you can do with a wallet, behind one round "more" button. */
function WalletMenu({
  wallet,
  onEdit,
  onSetBalance,
  onHistory,
  onDelete,
}: Pick<WalletCardProps, "wallet" | "onEdit" | "onSetBalance" | "onHistory" | "onDelete">) {
  // When an item opens a dialog, the dialog takes the keyboard focus instead of the menu handing it back to its button.
  const chose = useRef(false)
  const choose = (action: () => void) => () => {
    chose.current = true
    action()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          id={walletMenuId(wallet.id)}
          variant="ghost"
          size="icon-lg"
          className="rounded-full text-muted-foreground hover:bg-foreground/[0.07] aria-expanded:bg-foreground/[0.07]"
          aria-label={`More options for ${wallet.name}`}
        >
          <Ellipsis className="size-[1.125rem]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => {
          if (!chose.current) return
          event.preventDefault()
          chose.current = false
        }}
      >
        <DropdownMenuItem onSelect={choose(() => onEdit(wallet))}>
          <Pencil aria-hidden />
          Edit details
        </DropdownMenuItem>
        {wallet.kind === "investment" || wallet.kind === "deposito" ? null : (
          <DropdownMenuItem onSelect={choose(() => onSetBalance(wallet))}>
            <Scale aria-hidden />
            Correct balance
          </DropdownMenuItem>
        )}
        {wallet.kind === "deposito" ? null : (
          <DropdownMenuItem onSelect={choose(() => onHistory(wallet))}>
            <History aria-hidden />
            History
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={choose(() => onDelete(wallet))}>
          <Trash2 aria-hidden />
          Delete wallet
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * What a deposito says about itself under its balance: the rate and the dates, then the money put in and the interest so
 * far (before tax; left out while the balance is hidden, because together they are the balance), and, once it has
 * matured and doesn't renew, the button that moves the money. Interest is never income and is never a transaction.
 */
function DepositoDetails({ wallet, today, onSettle }: { wallet: Wallet; today: string; onSettle: (wallet: Wallet) => void }) {
  const { wallets } = useData()
  const deposito = wallet.deposito
  if (!deposito) return null
  const source = deposito.sourceWalletId ? wallets.find((entry) => entry.id === deposito.sourceWalletId) : undefined

  return (
    <div className="mt-3 flex flex-col gap-1 text-sm" data-slot="deposito-details">
      <p className="text-muted-foreground">{depositoLine(deposito, today, source?.name)}</p>
      {deposito.status === "settled" ? null : (
        <ShowWhenVisible id={wallet.id}>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{formatRupiah(deposito.principal)}</span> put in ·{" "}
            <span className="font-medium text-positive">{formatRupiah(deposito.interest, { sign: "always" })}</span> interest so far, before tax
          </p>
        </ShowWhenVisible>
      )}
      {deposito.status === "matured" ? (
        <div className="mt-2">
          <Button variant="secondary" size="lg" className="relative z-10" onClick={() => onSettle(wallet)}>
            Move money
            <span className="sr-only"> from {wallet.name}</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * How an investment moved the last time the owner updated its value, with a
 * reminder that this is not income or spending, and a link to the full history.
 * The amount is left out while the balance is hidden, because it would give
 * the balance away.
 */
function ValueChange({ wallet, onHistory }: { wallet: Wallet; onHistory: (wallet: Wallet) => void }) {
  const change = wallet.lastValueChange?.change

  return (
    <div className="mt-3 flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {change === undefined ? (
          <p className="text-muted-foreground">No value update yet.</p>
        ) : (
          <>
            <ShowWhenVisible id={wallet.id}>
              <p
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  change > 0 ? "text-positive" : change < 0 ? "text-negative" : "text-muted-foreground"
                )}
              >
                {change > 0 ? <TrendingUp className="size-4 shrink-0" aria-hidden /> : null}
                {change < 0 ? <TrendingDown className="size-4 shrink-0" aria-hidden /> : null}
                {change === 0
                  ? "No change since last update"
                  : `${formatRupiah(change, { sign: "always" })} since last update`}
              </p>
            </ShowWhenVisible>
            <button
              type="button"
              onClick={() => onHistory(wallet)}
              className="relative z-10 rounded-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors duration-150 hover:text-foreground"
            >
              History
              <span className="sr-only"> of {wallet.name}</span>
            </button>
          </>
        )}
      </div>
      <p className="text-muted-foreground">Value changes don&apos;t count as income or spending.</p>
    </div>
  )
}

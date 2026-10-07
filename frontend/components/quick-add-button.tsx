"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { useIsBalanceHidden } from "@/components/balance-visibility"
import { useData } from "@/components/data-provider"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { errorMessage } from "@/lib/api"
import { balanceLine, walletIdsOf } from "@/lib/balance-message"
import { formatRupiah } from "@/lib/format"
import { opensQuickAdd } from "@/lib/quick-add-shortcut"
import type { NewTransaction } from "@/lib/types"

const subscribe = () => () => {}
const clientReady = () => true
const serverReady = () => false

/** Anything that is already on top of the page and has the keyboard. */
const OPEN_WINDOW = "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']"

/** "Ctrl+K", or "Cmd+K" on a Mac. Only used inside the tooltip, which is never part of the page the server sends. */
function shortcutName() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd+K" : "Ctrl+K"
}

/**
 * One entry point on every page: a round orange coin with a plus, bottom right.
 * Parsing fills the existing form; only its Save submits.
 */
export function QuickAddButton() {
  const { wallets, addTransaction } = useData()
  const isHidden = useIsBalanceHidden()
  const [open, setOpen] = useState(false)
  const [lastWalletId, setLastWalletId] = useState<string>()
  const [tipOpen, setTipOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Where the keyboard was when Ctrl+K opened the box, so closing it puts the keyboard back there.
  const returnTo = useRef<HTMLElement | null>(null)
  // Handing the keyboard back to the coin is not a visit: it must not pop the tooltip open.
  const quietTip = useRef(false)
  // The server-drawn button must wait for its click handler to be ready.
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady)
  const defaultWalletId = wallets.find((wallet) => wallet.id === lastWalletId)?.id ?? wallets[0]?.id ?? ""

  // Ctrl+K (Cmd+K) from anywhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const windowOpen = !!document.querySelector(OPEN_WINDOW)
      if (!opensQuickAdd(event, { windowOpen })) return
      event.preventDefault()
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
      setTipOpen(false)
      setOpen(true)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  async function save(input: NewTransaction) {
    try {
      const { transaction, wallets: current } = await addTransaction(input)
      setLastWalletId(transaction.type === "transfer" ? transaction.fromWalletId : transaction.walletId)
      toast.success("Transaction added", {
        description: <>
          <span>{transaction.description || "Expense"} · {formatRupiah(transaction.type === "expense" ? -transaction.amount : transaction.amount)}</span>
          <span className="block">{balanceLine(walletIdsOf(transaction), current, isHidden)}</span>
        </>,
      })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error
    }
  }

  return (
    <>
      <Tooltip open={tipOpen} onOpenChange={(next) => setTipOpen(next && !quietTip.current)}>
        <TooltipTrigger asChild>
          <button
            ref={buttonRef}
            type="button"
            aria-label="Quick add"
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+K Meta+K"
            disabled={!ready}
            onClick={() => {
              returnTo.current = null
              setOpen(true)
            }}
            className="group/coin fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 grid size-14 cursor-pointer place-items-center rounded-full shadow-md transition-[box-shadow,scale] duration-200 hover:shadow-lg active:scale-[0.94] disabled:cursor-default"
          >
            {/* The coin turns once when you point at it. The shadow stays put on the button. */}
            <span
              aria-hidden
              className="coin-rim grid size-14 place-items-center rounded-full bg-highlight text-highlight-foreground group-hover/coin:animate-coin-flip"
            >
              <Plus className="size-6" strokeWidth={2.25} />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={10}>
          Quick add <span className="text-background/70">{shortcutName()}</span>
        </TooltipContent>
      </Tooltip>
      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        quickAdd
        defaultWalletId={defaultWalletId}
        onSave={save}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          const back = returnTo.current?.isConnected ? returnTo.current : buttonRef.current
          returnTo.current = null
          quietTip.current = true
          back?.focus({ preventScroll: true })
          requestAnimationFrame(() => {
            quietTip.current = false
          })
        }}
      />
    </>
  )
}

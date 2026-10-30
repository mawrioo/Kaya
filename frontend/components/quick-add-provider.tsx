"use client"

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
import { errorMessage } from "@/lib/api"
import { formatRupiah } from "@/lib/format"
import { opensQuickAdd } from "@/lib/quick-add-shortcut"
import type { NewTransaction } from "@/lib/types"

const subscribe = () => () => {}
const clientReady = () => true
const serverReady = () => false
const OPEN_WINDOW = "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']"

interface QuickAddControl {
  ready: boolean
  openFrom: (trigger: HTMLButtonElement) => void
  tipOpen: boolean
  changeTip: (open: boolean) => void
}
const QuickAddContext = createContext<QuickAddControl | null>(null)

/** One draft, save handler and shortcut shared by the phone and desktop triggers. */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const { wallets, addTransaction } = useData()
  const [open, setOpen] = useState(false)
  const [lastWalletId, setLastWalletId] = useState<string>()
  const [tipOpen, setTipOpen] = useState(false)
  const origin = useRef<HTMLElement | null>(null)
  const quietTip = useRef(false)
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady)
  const spendable = wallets.filter(wallet => wallet.kind !== "deposito")
  const defaultWalletId = spendable.find(wallet => wallet.id === lastWalletId)?.id ?? spendable[0]?.id ?? ""

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!opensQuickAdd(event, { windowOpen: !!document.querySelector(OPEN_WINDOW) })) return
      origin.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
      event.preventDefault()
      setTipOpen(false)
      setOpen(true)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  async function save(input: NewTransaction) {
    try {
      const { transaction } = await addTransaction(input)
      setLastWalletId(transaction.type === "transfer" ? transaction.fromWalletId : transaction.walletId)
      toast.success("Transaction added", {
        description: `${transaction.description || (transaction.type === "transfer" ? "Transfer" : transaction.type === "income" ? "Income" : "Expense")} · ${formatRupiah(transaction.type === "expense" ? -transaction.amount : transaction.amount)}`,
      })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error
    }
  }

  return (
    <QuickAddContext value={{
      ready,
      openFrom: trigger => { origin.current = trigger; setTipOpen(false); setOpen(true) },
      tipOpen,
      changeTip: next => setTipOpen(next && !quietTip.current),
    }}>
      {children}
      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        quickAdd
        defaultWalletId={defaultWalletId}
        onSave={save}
        onCloseAutoFocus={event => {
          event.preventDefault()
          // A resize can unmount or hide the trigger while the draft is open.
          const visible = (element: HTMLElement | null): element is HTMLElement => !!element?.isConnected && element.getClientRects().length > 0
          const back = visible(origin.current) ? origin.current : Array.from(document.querySelectorAll<HTMLButtonElement>("[data-quick-add-trigger]")).find(visible)
          quietTip.current = true
          back?.focus({ preventScroll: true })
          requestAnimationFrame(() => { quietTip.current = false })
        }}
      />
    </QuickAddContext>
  )
}

export function useQuickAdd() {
  const control = useContext(QuickAddContext)
  if (!control) throw new Error("Quick add needs its shared provider.")
  return control
}

"use client"

import { useEffect, useState } from "react"
import { ArrowUpDown, Plus } from "lucide-react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { TotalBalanceCard } from "@/components/home/total-balance-card"
import { Button } from "@/components/ui/button"
import { BalanceDialog } from "@/components/wallets/balance-dialog"
import { DeleteWalletDialog } from "@/components/wallets/delete-wallet-dialog"
import { SettleDialog } from "@/components/wallets/settle-dialog"
import { HistoryDialog } from "@/components/wallets/history-dialog"
import { ReorderDialog } from "@/components/wallets/reorder-dialog"
import { WalletCard, walletMenuId } from "@/components/wallets/wallet-card"
import { WalletDialog } from "@/components/wallets/wallet-dialog"
import { useReturnFocus } from "@/hooks/use-return-focus"
import { errorMessage } from "@/lib/api"
import { toDateInput } from "@/lib/dates"
import { formatRupiah } from "@/lib/format"
import { walletDeleteImpact } from "@/lib/stats"
import type { Wallet } from "@/lib/types"
import { UNDO_FOR } from "@/lib/undo"
import { formToChanges, formToNewWallet, type WalletForm } from "@/lib/wallet-form"

/** Which dialog is open. Only one ever is. */
type DialogName = "add" | "edit" | "balance" | "history" | "delete" | "reorder" | "settle"

const ADD_BUTTON_ID = "add-wallet-button"

/**
 * Everything under the heading on the Wallets page: the total, a card for each
 * wallet, and the flows for adding, editing, correcting, viewing history,
 * deleting and reordering.
 */
export function WalletsView({ nowIso }: { nowIso: string }) {
  // "Today" comes from the server, so the months left on a deposito never disagree between the server and the browser.
  const today = toDateInput(new Date(nowIso))
  const {
    wallets,
    transactions,
    addWallet,
    updateWallet,
    updateWalletValue,
    correctWalletBalance,
    settleDeposito,
    deleteWallet,
    undoDelete,
    reorderWallets,
  } = useData()

  const [open, setOpen] = useState<DialogName>()
  // The wallet the open dialog is about. Kept after the dialog closes so its content doesn't vanish mid-fade.
  const [target, setTarget] = useState<Wallet>()
  // The wallet the add/edit form is changing (none when adding). Kept apart so the form doesn't flip to "Add" as it fades.
  const [editing, setEditing] = useState<Wallet>()
  // The wallet just added, so its card can ease in and be brought into view.
  const [newId, setNewId] = useState<string>()
  // Where keyboard focus goes when a dialog closes: the button that opened it.
  const returnFocus = useReturnFocus()

  // On a phone the new card is far down the page, so scroll to it if it isn't on screen.
  useEffect(() => {
    if (!newId) return
    const card = document.getElementById(`wallet-card-${newId}`)
    if (!card) return
    const { top, bottom } = card.getBoundingClientRect()
    if (top >= 0 && bottom <= window.innerHeight) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    card.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" })
  }, [newId])

  function openDialog(name: DialogName, wallet?: Wallet) {
    const active = document.activeElement
    if (wallet && active instanceof HTMLElement && active.closest('[role="menu"]')) {
      // A menu item is about to disappear, so come back to the "more" button that opened the menu.
      returnFocus.redirect(document.getElementById(walletMenuId(wallet.id)))
    } else {
      returnFocus.remember()
    }
    setTarget(wallet)
    if (name === "add" || name === "edit") setEditing(name === "edit" ? wallet : undefined)
    setOpen(name)
  }

  const closeDialog = (isOpen: boolean) => {
    if (!isOpen) setOpen(undefined)
  }

  async function handleSave(form: WalletForm) {
    try {
      if (editing) {
        await updateWallet(editing.id, formToChanges(form, editing))
        toast.success("Wallet updated")
      } else {
        const saved = await addWallet(formToNewWallet(form))
        setNewId(saved.id)
        toast.success("Wallet added", { description: saved.name })
      }
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the form to stay open
    }
  }

  async function handleSaveBalance(wallet: Wallet, value: number) {
    const isValue = wallet.kind === "investment"
    try {
      if (isValue) await updateWalletValue(wallet.id, value)
      else await correctWalletBalance(wallet.id, value)
      toast.success(isValue ? "Value updated" : "Balance corrected", {
        description: `${wallet.name} is now ${formatRupiah(value)}`,
      })
    } catch (error) {
      toast.error("Couldn't update that", { description: errorMessage(error) })
      throw error // tells the form to stay open
    }
  }

  async function handleSettle(wallet: Wallet, toWalletId?: string) {
    try {
      const { transaction } = await settleDeposito(wallet.id, toWalletId)
      const target = wallets.find((entry) => entry.id === (transaction.type === "transfer" ? transaction.toWalletId : ""))
      toast.success("Money moved", { description: `${formatRupiah(transaction.amount)} from ${wallet.name}${target ? ` to ${target.name}` : ""}` })
    } catch (error) {
      toast.error("Couldn't move that", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  async function handleDelete(wallet: Wallet) {
    const { transactions: count } = walletDeleteImpact(transactions, wallet.id)
    try {
      const undoId = await deleteWallet(wallet.id)
      // Its card is about to disappear, so keyboard focus goes to the Add button instead of nowhere.
      returnFocus.redirect(document.getElementById(ADD_BUTTON_ID))
      toast.success("Wallet deleted", {
        description: count === 0 ? wallet.name : `${wallet.name} and its ${count} ${count === 1 ? "transaction" : "transactions"}`,
        // Long enough to notice it and change your mind, and gone after that.
        duration: UNDO_FOR,
        action: { label: "Undo", onClick: () => void undoWalletDelete(undoId) },
      })
    } catch (error) {
      toast.error("Couldn't delete that", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  /** The Undo button in the "Wallet deleted" message: the wallet comes back with its transactions, its history and its place. */
  async function undoWalletDelete(undoId: string) {
    try {
      const result = await undoDelete(undoId)
      if (result.kind !== "wallet") return
      setNewId(result.wallet.id)
      toast.success("Wallet restored", { description: result.wallet.name })
    } catch (error) {
      toast.error("Couldn't undo that", { description: errorMessage(error) })
    }
  }

  async function handleReorder(ids: string[]) {
    try {
      await reorderWallets(ids)
      toast.success("Order saved")
    } catch (error) {
      toast.error("Couldn't save the order", { description: errorMessage(error) })
      throw error // tells the dialog to stay open
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-8 md:mt-10">
      <TotalBalanceCard wallets={wallets} />

      {/* The columns follow the room the cards really have (a container query), not the window: with the menu open a 768px tablet leaves them about 480px. */}
      <section aria-labelledby="wallets-heading" className="@container flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="wallets-heading" className="type-title">
            Your wallets
          </h2>
          <div className="flex items-center gap-2">
            {wallets.length > 1 ? (
              <Button variant="outline" size="lg" onClick={() => openDialog("reorder")} aria-label="Reorder wallets" className="max-sm:min-w-10">
                <ArrowUpDown aria-hidden />
                <span className="hidden sm:inline">Reorder</span>
              </Button>
            ) : null}
            <Button id={ADD_BUTTON_ID} size="lg" onClick={() => openDialog("add")}>
              <Plus aria-hidden />
              Add wallet
            </Button>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-4 @[44rem]:grid-cols-2">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              today={today}
              isNew={wallet.id === newId}
              onEdit={(w) => openDialog("edit", w)}
              onSetBalance={(w) => openDialog("balance", w)}
              onHistory={(w) => openDialog("history", w)}
              onSettle={(w) => openDialog("settle", w)}
              onDelete={(w) => openDialog("delete", w)}
            />
          ))}
        </ul>
      </section>

      <WalletDialog
        open={open === "add" || open === "edit"}
        onOpenChange={closeDialog}
        editing={editing}
        onSave={handleSave}
        onCloseAutoFocus={returnFocus.restore}
      />
      <BalanceDialog
        open={open === "balance"}
        onOpenChange={closeDialog}
        mode={target?.kind === "investment" ? "value" : "correction"}
        wallet={target}
        onSave={handleSaveBalance}
        onCloseAutoFocus={returnFocus.restore}
      />
      <SettleDialog
        open={open === "settle"}
        onOpenChange={closeDialog}
        wallet={target}
        onConfirm={handleSettle}
        onCloseAutoFocus={returnFocus.restore}
      />
      <HistoryDialog
        open={open === "history"}
        onOpenChange={closeDialog}
        wallet={target}
        onCloseAutoFocus={returnFocus.restore}
      />
      <DeleteWalletDialog
        open={open === "delete"}
        onOpenChange={closeDialog}
        wallet={target}
        onConfirm={handleDelete}
        onCloseAutoFocus={returnFocus.restore}
      />
      <ReorderDialog
        open={open === "reorder"}
        onOpenChange={closeDialog}
        onSave={handleReorder}
        onCloseAutoFocus={returnFocus.restore}
      />
    </div>
  )
}

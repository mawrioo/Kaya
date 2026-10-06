"use client"

import { useEffect, useRef, useState } from "react"
import { Reorder, useDragControls } from "motion/react"
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react"

import { useData } from "@/components/data-provider"
import { WalletBadge } from "@/components/wallet-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Wallet } from "@/lib/types"

interface ReorderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Saves the new order, as wallet ids. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (ids: string[]) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

/** The wallets in a simple list to drag into a new order. Nothing is saved until "Save order". */
export function ReorderDialog({ open, onOpenChange, onSave, onCloseAutoFocus }: ReorderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so it always starts from the current order. */}
        <ReorderBody
          onCancel={() => onOpenChange(false)}
          onSave={async (ids) => {
            await onSave(ids)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReorderBody({ onCancel, onSave }: { onCancel: () => void; onSave: (ids: string[]) => Promise<void> }) {
  const { wallets } = useData()
  const [order, setOrder] = useState<Wallet[]>(wallets)
  const [saving, setSaving] = useState(false)

  const changed = order.some((wallet, i) => wallet.id !== wallets[i]?.id)
  // Which arrow was just pressed, so keyboard focus can follow the row to its new place.
  const pressed = useRef<{ id: string; by: -1 | 1 }>(null)

  /** The arrow buttons: the same job as dragging, for the keyboard and for precise taps. */
  function move(from: number, by: -1 | 1) {
    const to = from + by
    if (to < 0 || to >= order.length) return
    const next = [...order]
    pressed.current = { id: order[from].id, by }
    next.splice(to, 0, ...next.splice(from, 1))
    setOrder(next)
  }

  // Moving a row takes it out of the page and puts it back, which drops keyboard focus. Put it back on the
  // same arrow, or on the opposite one when the row has reached the end of the list and that arrow is now off.
  useEffect(() => {
    const last = pressed.current
    if (!last) return
    pressed.current = null
    const same = document.getElementById(arrowId(last.id, last.by)) as HTMLButtonElement | null
    const other = document.getElementById(arrowId(last.id, last.by === -1 ? 1 : -1)) as HTMLButtonElement | null
    ;(same && !same.disabled ? same : other)?.focus()
  }, [order])

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(order.map((wallet) => wallet.id))
    } catch {
      // The page has already explained what went wrong. Stay open so the new order isn't lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="type-title">Reorder wallets</DialogTitle>
        <DialogDescription>
          Drag the handle, or use the arrows. This is the order on Home, here, and in every wallet list.
        </DialogDescription>
      </DialogHeader>

      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="grid grid-cols-1 gap-2">
        {order.map((wallet, index) => (
          <ReorderRow
            key={wallet.id}
            wallet={wallet}
            isFirst={index === 0}
            isLast={index === order.length - 1}
            onMove={(by) => move(index, by)}
          />
        ))}
      </Reorder.Group>

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="lg" disabled={!changed || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save order"}
        </Button>
      </DialogFooter>
    </>
  )
}

/** The DOM id of a row's up (-1) or down (1) arrow. */
const arrowId = (walletId: string, by: -1 | 1) => `move-${walletId}-${by === -1 ? "up" : "down"}`

function ReorderRow({
  wallet,
  isFirst,
  isLast,
  onMove,
}: {
  wallet: Wallet
  isFirst: boolean
  isLast: boolean
  onMove: (by: -1 | 1) => void
}) {
  // Only the handle starts a drag, so the rest of the row (and the page) can still be scrolled by touch.
  const controls = useDragControls()

  return (
    <Reorder.Item
      value={wallet}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 rounded-lg border bg-card p-2 pr-1 shadow-xs"
      whileDrag={{ scale: 1.02, boxShadow: "0 10px 28px -8px rgb(31 61 43 / 0.25)" }}
    >
      <button
        type="button"
        aria-label={`Drag ${wallet.name} to a new place`}
        onPointerDown={(event) => controls.start(event)}
        className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/[0.07] hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-[1.125rem]" aria-hidden />
      </button>
      <WalletBadge wallet={wallet} size="md" />
      <span className="min-w-0 flex-1 font-medium break-words">{wallet.name}</span>
      <Button
        id={arrowId(wallet.id, -1)}
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label={`Move ${wallet.name} up`}
        disabled={isFirst}
        onClick={() => onMove(-1)}
      >
        <ChevronUp className="size-[1.125rem]" aria-hidden />
      </Button>
      <Button
        id={arrowId(wallet.id, 1)}
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label={`Move ${wallet.name} down`}
        disabled={isLast}
        onClick={() => onMove(1)}
      >
        <ChevronDown className="size-[1.125rem]" aria-hidden />
      </Button>
    </Reorder.Item>
  )
}

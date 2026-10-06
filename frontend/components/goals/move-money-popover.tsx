"use client"

import { useState } from "react"

import { AmountInput } from "@/components/amount-input"
import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { WalletOption, selectTriggerClasses } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPercent, formatRupiah } from "@/lib/format"
import { goalProgress } from "@/lib/goals"
import type { Goal } from "@/lib/types"

/** Money going into a goal, or coming back out of it. */
export type MoveDirection = "add" | "take-out"

/** What the owner chose: how much, which way, and (when adding) where it comes from. */
export interface MoveMoneyInput {
  direction: MoveDirection
  amount: number
  /** The wallet the money is moved from. Left out when it is already in the goal's wallet. */
  fromWalletId?: string
}

/** The one place money is already in the goal's wallet, rather than a wallet to move it from. */
const ALREADY_THERE = "already-there"

interface MoveMoneyPopoverProps {
  goal: Goal
  /** The name of the wallet the goal is saved in. */
  walletName: string
  /**
   * What the box lets you do, the first being where it starts. A goal still being saved
   * for offers both, behind a switch. A goal that has been reached offers only taking
   * money out, with no switch, because it wants no more.
   */
  directions?: MoveDirection[]
  /** Saves the move. Throws if it couldn't be saved, which keeps the box open. */
  onSave: (goal: Goal, input: MoveMoneyInput) => Promise<void>
  children: React.ReactNode
}

/**
 * The box behind "Add money": one amount, a switch between adding and taking out,
 * and, when adding, where the money comes from. It is a popover rather than a
 * dialog so the goal's card stays in view while the amount is typed.
 */
export function MoveMoneyPopover({
  goal,
  walletName,
  directions = ["add", "take-out"],
  onSave,
  children,
}: MoveMoneyPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      {/* The form is mounted only while the box is open, so it starts empty every time. */}
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[min(21rem,calc(100vw-2.5rem))] gap-4 p-5"
      >
        <MoveMoneyForm
          goal={goal}
          walletName={walletName}
          directions={directions}
          onCancel={() => setOpen(false)}
          onSave={async (input) => {
            await onSave(goal, input)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

const COPY = {
  add: {
    title: "Add money",
    label: "Amount",
    button: "Add",
    saving: "Adding...",
    empty: "Enter an amount.",
  },
  "take-out": {
    title: "Take money out",
    label: "Amount to take out",
    button: "Take out",
    saving: "Taking out...",
    empty: "Enter an amount.",
  },
}

function MoveMoneyForm({
  goal,
  walletName,
  directions,
  onCancel,
  onSave,
}: {
  goal: Goal
  walletName: string
  directions: MoveDirection[]
  onCancel: () => void
  onSave: (input: MoveMoneyInput) => Promise<void>
}) {
  const { wallets } = useData()
  const [direction, setDirection] = useState<MoveDirection>(directions[0])
  // Digits only, e.g. "500000". Starts empty so pressing Enter by accident saves nothing.
  const [value, setValue] = useState("")
  const [from, setFrom] = useState<string>(ALREADY_THERE)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const copy = COPY[direction]
  const inputId = `goal-amount-${goal.id}`
  const amount = Number(value)
  const adding = direction === "add"
  // Where the goal would stand afterwards, once an amount has been typed.
  const after = adding ? goal.savedAmount + amount : goal.savedAmount - amount
  const preview = amount > 0 ? goalProgress({ targetAmount: goal.targetAmount, savedAmount: Math.max(0, after) }) : undefined
  const tooMuch = !adding && amount > goal.savedAmount
  const otherWallets = wallets.filter((wallet) => wallet.id !== goal.walletId)

  // Focus stays on the switch, as it does on the transaction form's Income / Expense / Transfer
  // switch, so the arrow keys can move between the two without the keyboard jumping away.
  function change(next: MoveDirection) {
    setDirection(next)
    setError(undefined)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const problem = !value
      ? copy.empty
      : amount <= 0
        ? "The amount must be more than zero."
        : tooMuch
          ? `Only ${formatRupiah(goal.savedAmount)} is saved for this goal.`
          : undefined
    if (problem) {
      setError(problem)
      requestAnimationFrame(() => document.getElementById(inputId)?.focus())
      return
    }
    setSaving(true)
    try {
      await onSave({
        direction,
        amount,
        ...(adding && from !== ALREADY_THERE ? { fromWalletId: from } : {}),
      })
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4">
      <PopoverHeader>
        <PopoverTitle>{copy.title}</PopoverTitle>
        <PopoverDescription className="break-words">
          {adding ? "to" : "from"} {goal.name}
        </PopoverDescription>
      </PopoverHeader>

      {directions.length > 1 ? (
        <fieldset>
          <legend className="sr-only">Add money or take it out</legend>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {directions.map((option) => (
              <label key={option} className="relative cursor-pointer">
                <input
                  type="radio"
                  name={`goal-direction-${goal.id}`}
                  value={option}
                  checked={direction === option}
                  onChange={() => change(option)}
                  className="peer sr-only"
                />
                <span className="flex h-8 items-center justify-center rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground peer-checked:bg-card peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  {option === "add" ? "Add" : "Take out"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Field
        label={copy.label}
        htmlFor={inputId}
        error={error}
        hint={<Hint goal={goal} amount={amount} after={after} adding={adding} preview={preview} walletName={walletName} from={from} wallets={wallets} />}
      >
        <AmountInput
          id={inputId}
          autoFocus
          value={value}
          onChange={(digits) => {
            setValue(digits)
            setError(undefined)
          }}
          invalid={!!error}
          describedBy={error ? `${inputId}-error` : undefined}
        />
      </Field>

      {adding && otherWallets.length > 0 ? (
        <Field label="Money comes from" htmlFor={`goal-from-${goal.id}`}>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger id={`goal-from-${goal.id}`} className={selectTriggerClasses}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={ALREADY_THERE}>It&apos;s already in {walletName}</SelectItem>
              {otherWallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  <WalletOption wallet={wallet} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? copy.saving : copy.button}
        </Button>
      </div>
    </form>
  )
}

/** The quiet line under the amount: what the move would do, or what it means while nothing is typed. */
function Hint({
  goal,
  amount,
  after,
  adding,
  preview,
  walletName,
  from,
  wallets,
}: {
  goal: Goal
  amount: number
  after: number
  adding: boolean
  preview?: ReturnType<typeof goalProgress>
  walletName: string
  from: string
  wallets: { id: string; name: string }[]
}) {
  if (!preview || amount <= 0) {
    if (!adding) return <>The money stays in {walletName}. This only changes the goal.</>
    return from === ALREADY_THERE ? (
      <>This only updates the goal. It doesn&apos;t move money between your wallets.</>
    ) : (
      <>
        {wallets.find((wallet) => wallet.id === from)?.name} to {walletName}, saved as a transfer.
      </>
    )
  }

  if (!adding && after < 0) return <>Only {formatRupiah(goal.savedAmount)} is saved for this goal.</>
  if (adding && preview.done) return <span className="font-medium text-positive">This reaches your target.</span>
  return (
    <>
      That {adding ? "makes" : "leaves"} {formatRupiah(Math.max(0, after))} of {formatRupiah(goal.targetAmount)} (
      {formatPercent(preview.percent)}).
    </>
  )
}

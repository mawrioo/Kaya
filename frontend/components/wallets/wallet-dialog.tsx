"use client"

import { useRef, useState } from "react"

import { AmountInput } from "@/components/amount-input"
import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { selectTriggerClasses, WalletOption } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DatePicker } from "@/components/date-picker"
import { SegmentedSwitch } from "@/components/segmented-switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ColorPicker, IconPicker } from "@/components/wallets/look-pickers"
import { MAX_TENOR_MONTHS, TAX_NOTE } from "@/lib/deposito"
import { formatRupiah } from "@/lib/format"
import { walletIconChoices, walletIcons } from "@/lib/icons"
import type { Wallet } from "@/lib/types"
import {
  MAX_NAME_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_NOTE_LENGTH,
  emptyWalletForm,
  validateWalletForm,
  walletToForm,
  type WalletForm,
  type WalletFormErrors,
  type WalletFormField,
} from "@/lib/wallet-form"
import { walletKinds } from "@/lib/wallet-kinds"

interface WalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The wallet being edited. Leave out to add a new one. */
  editing?: Wallet
  /** Saves the wallet. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (form: WalletForm) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function WalletDialog({ open, onOpenChange, editing, onSave, onCloseAutoFocus }: WalletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form is mounted only while the dialog is open, so it starts fresh every time. */}
        <WalletFormBody
          editing={editing}
          onCancel={() => onOpenChange(false)}
          onSave={async (form) => {
            await onSave(form)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

interface BodyProps {
  editing?: Wallet
  onCancel: () => void
  onSave: (form: WalletForm) => Promise<void>
}

function WalletFormBody({ editing, onCancel, onSave }: BodyProps) {
  const { wallets } = useData()
  const [form, setForm] = useState<WalletForm>(() => (editing ? walletToForm(editing) : emptyWalletForm()))
  const [errors, setErrors] = useState<WalletFormErrors>({})
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isDeposito = form.kind === "deposito"
  // A deposito whose money has been moved out can still be renamed, but its details are fixed.
  const frozen = editing?.deposito?.status === "settled"
  // An older deposito may not know where its money came from; it can be told here. A newer one is fixed to its source.
  const sourceId = editing?.deposito?.sourceWalletId
  const askSource = !frozen && (!editing || sourceId === undefined)
  const sources = wallets.filter((wallet) => wallet.kind !== "deposito")
  const chosenSource = sources.find((wallet) => wallet.id === form.fromWalletId)
  const lockedSource = sourceId ? wallets.find((wallet) => wallet.id === sourceId) : undefined

  function update<K extends keyof WalletForm>(field: K, value: WalletForm[K]) {
    setForm((current) => ({ ...current, [field]: value }))
    // Fixing a field clears its message straight away.
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field as WalletFormField]
        return next
      })
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const found = validateWalletForm(form, wallets, editing)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Send the keyboard to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } catch {
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      setSaving(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-5">
      <DialogHeader>
        <DialogTitle className="type-title">{editing ? "Edit wallet" : "Add wallet"}</DialogTitle>
        <DialogDescription className="sr-only">
          {editing ? "Change this wallet's name, nickname or note." : "Add a bank account, e-wallet, investment, deposito or cash on hand."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Name" htmlFor="wallet-name" error={errors.name}>
        <Input
          id="wallet-name"
          value={form.name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          placeholder="e.g. Mandiri"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "wallet-name-error" : undefined}
          onChange={(event) => update("name", event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      {/* A deposito has no nickname: only Quick add reads one, and nothing can be recorded in a deposito. */}
      {isDeposito ? null : (
      <Field
        label="Nickname (optional)"
        htmlFor="wallet-nickname"
        error={errors.nickname}
        hint="A short word Quick add understands, like jago for Bank Jago."
      >
        <Input
          id="wallet-nickname"
          value={form.nickname}
          maxLength={MAX_NICKNAME_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          placeholder="e.g. jago"
          aria-invalid={errors.nickname ? true : undefined}
          aria-describedby={errors.nickname ? "wallet-nickname-error" : undefined}
          onChange={(event) => update("nickname", event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>
      )}

      {editing ? null : (
        <Field label="Type" htmlFor="wallet-kind" error={errors.kind}>
          <Select value={form.kind} onValueChange={(value) => update("kind", value as WalletForm["kind"])}>
            <SelectTrigger
              id="wallet-kind"
              className={selectTriggerClasses}
              aria-invalid={errors.kind ? true : undefined}
              aria-describedby={errors.kind ? "wallet-kind-error" : undefined}
            >
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent position="popper">
              {walletKinds.map(({ value, label }) => {
                const Icon = walletIcons[value]
                return (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      {label}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </Field>
      )}

      {isDeposito && !frozen ? (
        <>
          {askSource ? (
            <Field
              label={editing ? "Money came from (optional)" : "Money comes from"}
              htmlFor="deposito-from"
              error={errors.fromWalletId}
              hint={
                chosenSource
                  ? `${chosenSource.name} holds ${formatRupiah(chosenSource.balance)}. The amount is taken out of it now, as a transfer, and goes back to it when the deposito matures.`
                  : editing
                    ? "Choose a wallet to take the amount out of it now. Leave it empty if you already did that yourself."
                    : "The amount is taken out of this wallet now, as a transfer, and goes back to it when the deposito matures."
              }
            >
              <Select
                value={form.fromWalletId || (editing ? "none" : "")}
                onValueChange={(value) => update("fromWalletId", value === "none" ? "" : value)}
              >
                <SelectTrigger
                  id="deposito-from"
                  className={selectTriggerClasses}
                  aria-invalid={errors.fromWalletId ? true : undefined}
                  aria-describedby={errors.fromWalletId ? "deposito-from-error" : undefined}
                >
                  <SelectValue placeholder="Choose a wallet" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {editing ? <SelectItem value="none">Not set</SelectItem> : null}
                  {sources.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <WalletOption wallet={wallet} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {sourceId ? (
            <Field
              label="Amount put in"
              htmlFor="wallet-balance"
              hint={`It came out of ${lockedSource?.name ?? "another wallet"}, so it can't be changed here. To change it, delete this deposito and add it again.`}
            >
              <div
                id="wallet-balance"
                className="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm tabular-nums"
              >
                {formatRupiah(Number(form.startingBalance || 0))}
              </div>
            </Field>
          ) : (
          <Field label="Amount put in" htmlFor="wallet-balance" error={errors.startingBalance}>
            <AmountInput
              id="wallet-balance"
              value={form.startingBalance}
              onChange={(digits) => update("startingBalance", digits)}
              invalid={!!errors.startingBalance}
              describedBy={errors.startingBalance ? "wallet-balance-error" : undefined}
            />
          </Field>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Yearly rate (%)" htmlFor="deposito-rate" error={errors.depositoRate}>
              <Input
                id="deposito-rate"
                value={form.depositoRate}
                inputMode="decimal"
                autoComplete="off"
                placeholder="e.g. 5 or 5,25"
                aria-invalid={errors.depositoRate ? true : undefined}
                aria-describedby={errors.depositoRate ? "deposito-rate-error" : undefined}
                onChange={(event) => update("depositoRate", event.target.value)}
                className="h-10 bg-card dark:bg-card"
              />
            </Field>
            <Field label="Tenor (months)" htmlFor="deposito-tenor" error={errors.depositoTenor}>
              <Input
                id="deposito-tenor"
                value={form.depositoTenor}
                inputMode="numeric"
                autoComplete="off"
                maxLength={String(MAX_TENOR_MONTHS).length}
                placeholder="e.g. 12"
                aria-invalid={errors.depositoTenor ? true : undefined}
                aria-describedby={errors.depositoTenor ? "deposito-tenor-error" : undefined}
                onChange={(event) => update("depositoTenor", event.target.value)}
                className="h-10 bg-card dark:bg-card"
              />
            </Field>
          </div>

          <Field label="Start date" htmlFor="deposito-start" error={errors.depositoStart}>
            <DatePicker
              id="deposito-start"
              value={form.depositoStart}
              onChange={(value) => update("depositoStart", value)}
              invalid={!!errors.depositoStart}
              describedBy={errors.depositoStart ? "deposito-start-error" : undefined}
            />
          </Field>

          <div className="grid grid-cols-1 content-start gap-2">
            <span className="text-sm leading-none font-medium select-none">Renews by itself?</span>
            <SegmentedSwitch
              name="deposito-rollover"
              legend="Whether the bank renews the deposito by itself when the tenor ends"
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              value={form.depositoRollover ? "yes" : "no"}
              onChange={(value) => update("depositoRollover", value === "yes")}
            />
            <p className="text-sm text-muted-foreground">
              Yes if the bank renews it at the end of each term instead of paying you out. No means you move the money yourself when it matures.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Its balance is the money you put in plus the interest earned so far, worked out from the dates. The interest is never counted as income. {TAX_NOTE}
          </p>
        </>
      ) : null}

      {isDeposito && frozen ? (
        <p className="text-sm text-muted-foreground">
          This deposito&apos;s money has been moved out, so its rate and dates can&apos;t be changed. You can still rename it and change its note and look.
        </p>
      ) : null}

      <Field label="Note (optional)" htmlFor="wallet-note">
        <Input
          id="wallet-note"
          value={form.note}
          maxLength={MAX_NOTE_LENGTH}
          autoComplete="off"
          placeholder="What is this wallet for?"
          onChange={(event) => update("note", event.target.value)}
          className="h-10 bg-card dark:bg-card"
        />
      </Field>

      {editing || isDeposito ? null : (
        <Field
          label="Starting balance (optional)"
          htmlFor="wallet-balance"
          hint="What is in it right now. It isn't counted as income."
        >
          <AmountInput
            id="wallet-balance"
            value={form.startingBalance}
            onChange={(digits) => update("startingBalance", digits)}
          />
        </Field>
      )}

      <ColorPicker value={form.color} onChange={(color) => update("color", color)} defaultColor={editing?.defaultColor} />

      <IconPicker
        value={form.icon}
        onChange={(icon) => update("icon", icon)}
        defaultIcon={form.kind ? walletIcons[form.kind] : walletIconChoices.wallet}
        color={form.color === "default" ? editing?.defaultColor : form.color}
      />

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving..." : editing ? "Save changes" : "Add wallet"}
        </Button>
      </DialogFooter>
    </form>
  )
}

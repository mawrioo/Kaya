/**
 * The add/edit wallet form as plain data: its starting values, its checks,
 * and how it turns into what the backend expects. No React in here.
 */
import type { NewWallet, PaletteColor, Wallet, WalletChanges, WalletIconName, WalletKind } from "@/lib/types"

/** The same limits the backend enforces. */
export const MAX_NAME_LENGTH = 40
export const MAX_NOTE_LENGTH = 80

export interface WalletForm {
  name: string
  /** Empty until the owner chooses. Only asked for when adding a wallet. */
  kind: WalletKind | ""
  note: string
  /** Digits only, e.g. "500000". Empty means zero. Only asked for when adding a wallet. */
  startingBalance: string
  /** A colour from the palette, or "default" for the colour the app picked. */
  color: PaletteColor | "default"
  /** An icon from the list, or "default" for the icon that goes with the wallet's kind. */
  icon: WalletIconName | "default"
}

export type WalletFormField = "name" | "kind"
export type WalletFormErrors = Partial<Record<WalletFormField, string>>

export function emptyWalletForm(): WalletForm {
  return { name: "", kind: "", note: "", startingBalance: "", color: "default", icon: "default" }
}

/** The form filled in from an existing wallet, for editing. */
export function walletToForm(wallet: Wallet): WalletForm {
  return {
    name: wallet.name,
    kind: wallet.kind,
    note: wallet.description,
    startingBalance: "",
    // Wearing the app's own colour is the same thing as choosing "Default".
    color: wallet.color === wallet.defaultColor ? "default" : wallet.color,
    icon: wallet.icon ?? "default",
  }
}

/**
 * Plain-English problems with the form. An empty object means it is ready to
 * save. `editing` is the wallet being changed, if any: it may keep its own
 * name, and its kind is not asked for again.
 */
export function validateWalletForm(form: WalletForm, wallets: Wallet[], editing?: Wallet): WalletFormErrors {
  const errors: WalletFormErrors = {}
  const name = form.name.trim()
  const clash = wallets.find((wallet) => wallet.id !== editing?.id && wallet.name.toLowerCase() === name.toLowerCase())

  if (!name) errors.name = "Give the wallet a name."
  else if (clash) errors.name = `You already have a wallet called ${clash.name}.`

  if (!editing && !form.kind) errors.kind = "Choose what kind of wallet this is."
  return errors
}

/** A new wallet from a form that has passed validateWalletForm, so a kind has been chosen. */
export function formToNewWallet(form: WalletForm): NewWallet {
  return {
    name: form.name.trim(),
    kind: form.kind as WalletKind,
    description: form.note.trim(),
    startingBalance: Number(form.startingBalance || 0),
    // Leaving these out is how the backend is told "use the default".
    ...(form.color === "default" ? {} : { color: form.color }),
    ...(form.icon === "default" ? {} : { icon: form.icon }),
  }
}

/** What to save on the wallet being edited. "Default" sends its default colour, and no icon. */
export function formToChanges(form: WalletForm, wallet: Wallet): WalletChanges {
  return {
    name: form.name.trim(),
    description: form.note.trim(),
    color: form.color === "default" ? wallet.defaultColor : form.color,
    icon: form.icon === "default" ? null : form.icon,
  }
}

/**
 * The add/edit wallet form as plain data: its starting values, its checks,
 * and how it turns into what the backend expects. No React in here.
 */
import type { NewWallet, PaletteColor, Wallet, WalletChanges, WalletIconName, WalletKind } from "@/lib/types"

/** The same limits the backend enforces. */
export const MAX_NAME_LENGTH = 40
export const MAX_NOTE_LENGTH = 80
export const MAX_NICKNAME_LENGTH = 20

export interface WalletForm {
  name: string
  /** A short word for Quick add. Empty means none. */
  nickname: string
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

export type WalletFormField = "name" | "nickname" | "kind"
export type WalletFormErrors = Partial<Record<WalletFormField, string>>

export function emptyWalletForm(): WalletForm {
  return { name: "", nickname: "", kind: "", note: "", startingBalance: "", color: "default", icon: "default" }
}

/** The form filled in from an existing wallet, for editing. */
export function walletToForm(wallet: Wallet): WalletForm {
  return {
    name: wallet.name,
    nickname: wallet.nickname ?? "",
    kind: wallet.kind,
    note: wallet.description,
    startingBalance: "",
    // Wearing the app's own colour is the same thing as choosing "Default".
    color: wallet.color === wallet.defaultColor ? "default" : wallet.color,
    icon: wallet.icon ?? "default",
  }
}

/** A nickname as it is saved: no extra spaces. */
function tidyNickname(text: string): string {
  return text.trim().replace(/\s+/g, " ")
}

/** Capitals and extra spaces don't matter when two names or nicknames are compared. */
function sameWords(a: string, b: string): boolean {
  return tidyNickname(a).toLowerCase() === tidyNickname(b).toLowerCase()
}

/**
 * Plain-English problems with the form. An empty object means it is ready to
 * save. `editing` is the wallet being changed, if any: it may keep its own
 * name, and its kind is not asked for again.
 */
export function validateWalletForm(form: WalletForm, wallets: Wallet[], editing?: Wallet): WalletFormErrors {
  const errors: WalletFormErrors = {}
  const name = form.name.trim()
  const others = wallets.filter((wallet) => wallet.id !== editing?.id)
  const clash = others.find((wallet) => wallet.name.toLowerCase() === name.toLowerCase())
  const nicknamed = others.find((wallet) => wallet.nickname !== undefined && sameWords(wallet.nickname, name))

  if (!name) errors.name = "Give the wallet a name."
  else if (clash) errors.name = `You already have a wallet called ${clash.name}.`
  else if (nicknamed) errors.name = `${name} is already the nickname of ${nicknamed.name}. Choose another name.`

  const nickname = tidyNickname(form.nickname)
  if (nickname) {
    const named = others.find((wallet) => sameWords(wallet.name, nickname))
    const taken = others.find((wallet) => wallet.nickname !== undefined && sameWords(wallet.nickname, nickname))
    if (nickname.length > MAX_NICKNAME_LENGTH) errors.nickname = `The nickname can be at most ${MAX_NICKNAME_LENGTH} characters.`
    else if (!/\p{L}/u.test(nickname)) errors.nickname = "A nickname needs at least one letter."
    else if (named) errors.nickname = `${named.name} is already the name of another wallet.`
    else if (taken) errors.nickname = `${nickname} is already the nickname of ${taken.name}.`
  }

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
    ...(tidyNickname(form.nickname) ? { nickname: tidyNickname(form.nickname) } : {}),
  }
}

/** What to save on the wallet being edited. "Default" sends its default colour, and no icon; an empty nickname takes it away. */
export function formToChanges(form: WalletForm, wallet: Wallet): WalletChanges {
  return {
    name: form.name.trim(),
    description: form.note.trim(),
    color: form.color === "default" ? wallet.defaultColor : form.color,
    icon: form.icon === "default" ? null : form.icon,
    nickname: tidyNickname(form.nickname) || null,
  }
}

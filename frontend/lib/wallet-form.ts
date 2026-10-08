/**
 * The add/edit wallet form as plain data: its starting values, its checks,
 * and how it turns into what the backend expects. No React in here.
 */
import { fromDateInput, toDateInput } from "./dates.ts"
import { MAX_RATE_PERCENT, MAX_TENOR_MONTHS, parseRate, parseTenor, rateToInput } from "./deposito.ts"
import { formatRupiah } from "./format.ts"
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
  /**
   * Digits only, e.g. "500000". Empty means zero. Asked for when adding a wallet. For a deposito it is the amount put in
   * (above zero), and it is also asked for when editing one.
   */
  startingBalance: string
  /** A colour from the palette, or "default" for the colour the app picked. */
  color: PaletteColor | "default"
  /** An icon from the list, or "default" for the icon that goes with the wallet's kind. */
  icon: WalletIconName | "default"
  /** Deposito only: the yearly rate as typed ("5" or "5,25"). */
  depositoRate: string
  /** Deposito only: the day the first term began, "2026-10-01". */
  depositoStart: string
  /** Deposito only: months per term, as typed. */
  depositoTenor: string
  /** Deposito only: whether the bank renews it by itself at the end of each term. */
  depositoRollover: boolean
  /**
   * Deposito only: the id of the wallet the money comes out of (and goes back to). Asked for when adding one; when editing,
   * only for an older deposito that doesn't have one yet, where empty means "leave it".
   */
  fromWalletId: string
}

export type WalletFormField =
  | "name"
  | "nickname"
  | "kind"
  | "startingBalance"
  | "fromWalletId"
  | "depositoRate"
  | "depositoStart"
  | "depositoTenor"
export type WalletFormErrors = Partial<Record<WalletFormField, string>>

/** `today` is the day a new deposito starts on until the owner picks another ("2026-10-08"). */
export function emptyWalletForm(today: string = toDateInput(new Date())): WalletForm {
  return {
    name: "",
    nickname: "",
    kind: "",
    note: "",
    startingBalance: "",
    color: "default",
    icon: "default",
    depositoRate: "",
    depositoStart: today,
    depositoTenor: "12",
    depositoRollover: false,
    fromWalletId: "",
  }
}

/** The form filled in from an existing wallet, for editing. */
export function walletToForm(wallet: Wallet): WalletForm {
  const deposito = wallet.deposito
  return {
    ...emptyWalletForm(deposito?.startDate),
    name: wallet.name,
    nickname: wallet.nickname ?? "",
    kind: wallet.kind,
    note: wallet.description,
    // Only a deposito's amount is edited here; any other wallet's balance is changed by "Correct balance".
    startingBalance: deposito ? String(deposito.principal) : "",
    // Wearing the app's own colour is the same thing as choosing "Default".
    color: wallet.color === wallet.defaultColor ? "default" : wallet.color,
    icon: wallet.icon ?? "default",
    ...(deposito
      ? {
          depositoRate: rateToInput(deposito.ratePercent),
          depositoTenor: String(deposito.tenorMonths),
          depositoRollover: deposito.rollover,
        }
      : {}),
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
 * name, and its kind is not asked for again. A deposito that has been settled has
 * no details to check, because they can't be changed any more.
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

  // A deposito has no nickname (only Quick add reads one, and nothing can be recorded in a deposito).
  const nickname = form.kind === "deposito" ? "" : tidyNickname(form.nickname)
  if (nickname) {
    const named = others.find((wallet) => sameWords(wallet.name, nickname))
    const taken = others.find((wallet) => wallet.nickname !== undefined && sameWords(wallet.nickname, nickname))
    if (nickname.length > MAX_NICKNAME_LENGTH) errors.nickname = `The nickname can be at most ${MAX_NICKNAME_LENGTH} characters.`
    else if (!/\p{L}/u.test(nickname)) errors.nickname = "A nickname needs at least one letter."
    else if (named) errors.nickname = `${named.name} is already the name of another wallet.`
    else if (taken) errors.nickname = `${nickname} is already the nickname of ${taken.name}.`
  }

  if (!editing && !form.kind) errors.kind = "Choose what kind of wallet this is."

  const frozen = editing?.deposito?.status === "settled"
  if (form.kind === "deposito" && !frozen) {
    if (!(Number(form.startingBalance || 0) > 0)) errors.startingBalance = "Enter the amount you put in."
    if (parseRate(form.depositoRate) === undefined) {
      errors.depositoRate = `Enter the yearly rate, like 5 or 5,25. It can be up to ${MAX_RATE_PERCENT}%.`
    }
    // The money comes out of a wallet that holds it. An older deposito may stay without one, so only a chosen one is checked.
    if (!editing || (!editing.deposito?.sourceWalletId && form.fromWalletId)) {
      const source = wallets.find((wallet) => wallet.id === form.fromWalletId && wallet.kind !== "deposito")
      const amount = Number(form.startingBalance || 0)
      if (!source) errors.fromWalletId = "Choose the wallet the money comes from."
      else if (amount > source.balance && !errors.startingBalance) {
        errors.startingBalance = `${source.name} only holds ${formatRupiah(source.balance)}.`
      }
    }
    if (!fromDateInput(form.depositoStart)) errors.depositoStart = "Choose the day it started."
    if (parseTenor(form.depositoTenor) === undefined) {
      errors.depositoTenor = `Enter the tenor in whole months, from 1 to ${MAX_TENOR_MONTHS}.`
    }
  }
  return errors
}

/** A deposito's details from a form that has passed validateWalletForm. */
function formToDeposito(form: WalletForm) {
  return {
    ratePercent: parseRate(form.depositoRate) as number,
    startDate: form.depositoStart,
    tenorMonths: parseTenor(form.depositoTenor) as number,
    rollover: form.depositoRollover,
  }
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
    ...(form.kind !== "deposito" && tidyNickname(form.nickname) ? { nickname: tidyNickname(form.nickname) } : {}),
    ...(form.kind === "deposito" ? { deposito: { ...formToDeposito(form), fromWalletId: form.fromWalletId } } : {}),
  }
}

/**
 * What to save on the wallet being edited. "Default" sends its default colour, and no icon; an empty nickname takes it away.
 * A deposito's details go along unless its money has been moved out (then only the name, note and look can change).
 */
export function formToChanges(form: WalletForm, wallet: Wallet): WalletChanges {
  const editable = wallet.deposito !== undefined && wallet.deposito.status !== "settled"
  return {
    name: form.name.trim(),
    description: form.note.trim(),
    color: form.color === "default" ? wallet.defaultColor : form.color,
    icon: form.icon === "default" ? null : form.icon,
    // A deposito never has one.
    nickname: wallet.deposito ? null : tidyNickname(form.nickname) || null,
    ...(editable
      ? {
          deposito: {
            ...formToDeposito(form),
            principal: Number(form.startingBalance || 0),
            // Only an older deposito with no source can be given one, and only if the owner chose a wallet.
            ...(wallet.deposito?.sourceWalletId === undefined && form.fromWalletId ? { fromWalletId: form.fromWalletId } : {}),
          },
        }
      : {}),
  }
}

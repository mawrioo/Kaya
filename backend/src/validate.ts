/**
 * Checks what the frontend sends before anything reaches the database, and
 * explains problems in plain English. The frontend checks its form too, but
 * the backend never trusts that: a wrong amount here would corrupt balances.
 */
import { CATEGORY_ICONS, presetCategories } from "./category-look.ts"
import { GOAL_ICONS } from "./goal-look.ts"
import type {
  Category,
  CategoryChanges,
  CategoryType,
  Goal,
  GoalIconName,
  GoalInput,
  IconName,
  NewCategory,
  NewTransaction,
  NewWallet,
  PaletteColor,
  RestoreCategory,
  Wallet,
  WalletChanges,
  WalletIconName,
  WalletKind,
} from "./types.ts"
import { WALLET_COLORS, WALLET_ICONS } from "./wallet-look.ts"

export class ValidationError extends Error {}

/** What a transaction is allowed to point at. */
export interface References {
  walletIds: Set<string>
  categoryTypes: Map<string, CategoryType>
}

export const MAX_AMOUNT = 999_999_999_999
const MAX_NOTE_LENGTH = 100
// "2026-09-30T14:05:00+07:00": the local time with its UTC offset, as the frontend writes it.
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireWallet(value: unknown, label: string, refs: References): string {
  if (typeof value !== "string" || !refs.walletIds.has(value)) throw new ValidationError(`${label} isn't a wallet that exists.`)
  return value
}

/** Turns the request body into a NewTransaction, or throws a ValidationError saying what is wrong. */
export function parseNewTransaction(body: unknown, refs: References): NewTransaction {
  if (!isObject(body)) throw new ValidationError("Send the transaction as a JSON object.")

  const { type, amount, date, description } = body
  if (type !== "income" && type !== "expense" && type !== "transfer") {
    throw new ValidationError("The type must be income, expense or transfer.")
  }
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError("The amount must be a whole number of rupiah above zero.")
  }
  if (amount > MAX_AMOUNT) throw new ValidationError("That amount is too large.")
  if (typeof date !== "string" || !DATE_TIME.test(date) || Number.isNaN(Date.parse(date))) {
    throw new ValidationError("The date must look like 2026-09-30T14:05:00+07:00.")
  }
  if (description !== undefined && typeof description !== "string") {
    throw new ValidationError("The note must be text.")
  }
  const note = (description ?? "").trim()
  if (note.length > MAX_NOTE_LENGTH) throw new ValidationError(`The note can be at most ${MAX_NOTE_LENGTH} characters.`)

  if (type === "transfer") {
    const fromWalletId = requireWallet(body.fromWalletId, "The wallet the money leaves", refs)
    const toWalletId = requireWallet(body.toWalletId, "The wallet the money goes to", refs)
    if (fromWalletId === toWalletId) throw new ValidationError("A transfer needs two different wallets.")
    return { type, amount, date, description: note, fromWalletId, toWalletId }
  }

  const walletId = requireWallet(body.walletId, "The wallet", refs)
  const categoryId = body.categoryId
  if (typeof categoryId !== "string" || !refs.categoryTypes.has(categoryId)) {
    throw new ValidationError("The category isn't one that exists.")
  }
  if (refs.categoryTypes.get(categoryId) !== type) {
    throw new ValidationError(`That category is for ${type === "income" ? "spending" : "income"}, not ${type}.`)
  }
  return { type, amount, date, description: note, walletId, categoryId }
}

// ---- wallets ---------------------------------------------------------------------------------

const WALLET_KINDS: WalletKind[] = ["bank", "digital-bank", "e-wallet", "investment", "cash"]
const MAX_WALLET_NAME_LENGTH = 40
const MAX_WALLET_NOTE_LENGTH = 80
export const MAX_WALLET_NICKNAME_LENGTH = 20

type NamedWallet = Pick<Wallet, "id" | "name" | "nickname">

/** Capitals and extra spaces don't matter when two names or nicknames are compared. */
function sameWords(a: string, b: string): boolean {
  const simple = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase()
  return simple(a) === simple(b)
}

function parseWalletName(value: unknown, wallets: NamedWallet[], ownId?: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ValidationError("Give the wallet a name.")
  const name = value.trim()
  if (name.length > MAX_WALLET_NAME_LENGTH) {
    throw new ValidationError(`The name can be at most ${MAX_WALLET_NAME_LENGTH} characters.`)
  }
  const clash = wallets.find((wallet) => wallet.id !== ownId && wallet.name.toLowerCase() === name.toLowerCase())
  if (clash) throw new ValidationError(`You already have a wallet called ${clash.name}.`)
  // Quick add would not know which wallet is meant if a name were also another wallet's nickname.
  const nicknamed = wallets.find((wallet) => wallet.id !== ownId && wallet.nickname !== undefined && sameWords(wallet.nickname, name))
  if (nicknamed) throw new ValidationError(`${name} is already the nickname of ${nicknamed.name}. Choose another name.`)
  return name
}

/**
 * The nickname for Quick add: nothing at all, null or "" mean "no nickname" and give back undefined. Otherwise it is
 * short, has a letter in it (so it can't be mistaken for an amount), and isn't another wallet's name or nickname.
 */
function parseWalletNickname(value: unknown, wallets: NamedWallet[], ownId?: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") throw new ValidationError("The nickname must be text.")
  const nickname = value.trim().replace(/\s+/g, " ")
  if (nickname === "") return undefined
  if (nickname.length > MAX_WALLET_NICKNAME_LENGTH) {
    throw new ValidationError(`The nickname can be at most ${MAX_WALLET_NICKNAME_LENGTH} characters.`)
  }
  if (!/\p{L}/u.test(nickname)) throw new ValidationError("A nickname needs at least one letter.")
  const others = wallets.filter((wallet) => wallet.id !== ownId)
  const named = others.find((wallet) => sameWords(wallet.name, nickname))
  if (named) throw new ValidationError(`${named.name} is already the name of another wallet.`)
  const nicknamed = others.find((wallet) => wallet.nickname !== undefined && sameWords(wallet.nickname, nickname))
  if (nicknamed) throw new ValidationError(`${nickname} is already the nickname of ${nicknamed.name}.`)
  return nickname
}

function parseWalletNote(value: unknown): string {
  if (value === undefined) return ""
  if (typeof value !== "string") throw new ValidationError("The note must be text.")
  const note = value.trim()
  if (note.length > MAX_WALLET_NOTE_LENGTH) {
    throw new ValidationError(`The note can be at most ${MAX_WALLET_NOTE_LENGTH} characters.`)
  }
  return note
}

function parseColor(value: unknown): PaletteColor {
  if (typeof value !== "string" || !WALLET_COLORS.includes(value as PaletteColor)) {
    throw new ValidationError("Choose one of the colours on offer.")
  }
  return value as PaletteColor
}

function parseIcon(value: unknown): WalletIconName {
  if (typeof value !== "string" || !WALLET_ICONS.includes(value as WalletIconName)) {
    throw new ValidationError("Choose one of the icons on offer.")
  }
  return value as WalletIconName
}

function parseRupiah(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${what} must be a whole number of rupiah, zero or more.`)
  }
  if (value > MAX_AMOUNT) throw new ValidationError("That amount is too large.")
  return value
}

/** Turns the request body into a NewWallet, or throws a ValidationError saying what is wrong. */
export function parseNewWallet(body: unknown, wallets: NamedWallet[]): NewWallet {
  if (!isObject(body)) throw new ValidationError("Send the wallet as a JSON object.")
  const name = parseWalletName(body.name, wallets)
  const kind = body.kind
  if (typeof kind !== "string" || !WALLET_KINDS.includes(kind as WalletKind)) {
    throw new ValidationError("Choose what kind of wallet this is.")
  }
  const nickname = parseWalletNickname(body.nickname, wallets)
  return {
    name,
    kind: kind as WalletKind,
    description: parseWalletNote(body.description),
    startingBalance: parseRupiah(body.startingBalance ?? 0, "The starting balance"),
    // Left out (or null) means "use the default".
    ...(body.color === undefined ? {} : { color: parseColor(body.color) }),
    ...(body.icon === undefined || body.icon === null ? {} : { icon: parseIcon(body.icon) }),
    ...(nickname === undefined ? {} : { nickname }),
  }
}

/** The name and note for an existing wallet. Its own current name is allowed, so saving without renaming works. */
export function parseWalletChanges(body: unknown, wallets: NamedWallet[], ownId: string): WalletChanges {
  if (!isObject(body)) throw new ValidationError("Send the wallet as a JSON object.")
  return {
    name: parseWalletName(body.name, wallets, ownId),
    description: parseWalletNote(body.description),
    // Left out means "keep it as it is"; a null icon means "back to the default icon", and a null (or empty) nickname takes it away.
    ...(body.color === undefined ? {} : { color: parseColor(body.color) }),
    ...(body.icon === undefined ? {} : { icon: body.icon === null ? null : parseIcon(body.icon) }),
    ...(body.nickname === undefined ? {} : { nickname: parseWalletNickname(body.nickname, wallets, ownId) ?? null }),
  }
}

/** The new market value for an investment wallet, or the real balance for any other: whole rupiah, zero or more. */
export function parseWalletValue(body: unknown, what = "The value"): number {
  if (!isObject(body)) throw new ValidationError("Send the value as a JSON object.")
  return parseRupiah(body.value, what)
}

/** A list of ids that must be every one in `known`, exactly once. `what` is "wallet" or "goal", and `plural` is how to say several of them. */
function parseOrder(body: unknown, known: string[], what: string, plural = `${what}s`): string[] {
  if (!isObject(body) || !Array.isArray(body.ids) || !body.ids.every((id) => typeof id === "string")) {
    throw new ValidationError(`Send the ${what} ids as a list.`)
  }
  const ids = body.ids as string[]
  const all = new Set(known)
  if (ids.length !== all.size || new Set(ids).size !== ids.length || !ids.every((id) => all.has(id))) {
    throw new ValidationError(`That list doesn't match your ${plural}. Reload the page and try again.`)
  }
  return ids
}

/** The wallets in their new order: every wallet that exists, exactly once. */
export function parseWalletOrder(body: unknown, wallets: Pick<Wallet, "id">[]): string[] {
  return parseOrder(body, wallets.map((wallet) => wallet.id), "wallet")
}

/** The goals in their new order: every goal that exists, exactly once. */
export function parseGoalOrder(body: unknown, goals: Pick<Goal, "id">[]): string[] {
  return parseOrder(body, goals.map((goal) => goal.id), "goal")
}

// ---- goals -----------------------------------------------------------------------------------

const MAX_GOAL_NAME_LENGTH = 40

/** "2027-03-31" must be a real day in a sensible year. Nothing at all (or "") means the goal has no date. */
function parseGoalDate(value: unknown): string {
  if (value === undefined || value === "") return ""
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const date = new Date(Date.UTC(year, month - 1, day))
    const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    if (real && year >= 2000 && year <= 2100) return match[0]
  }
  throw new ValidationError("The target date must be a real date, like 2027-03-31.")
}

/** Turns the request body into a goal, or throws a ValidationError saying what is wrong. Used to add a goal and to change one. */
export function parseGoal(body: unknown, refs: References): GoalInput {
  if (!isObject(body)) throw new ValidationError("Send the goal as a JSON object.")

  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name === "") throw new ValidationError("Give the goal a name.")
  if (name.length > MAX_GOAL_NAME_LENGTH) {
    throw new ValidationError(`The name can be at most ${MAX_GOAL_NAME_LENGTH} characters.`)
  }

  const { targetAmount, icon } = body
  if (typeof targetAmount !== "number" || !Number.isInteger(targetAmount) || targetAmount <= 0) {
    throw new ValidationError("The target must be a whole number of rupiah above zero.")
  }
  if (targetAmount > MAX_AMOUNT) throw new ValidationError("That amount is too large.")

  const savedAmount = parseRupiah(body.savedAmount ?? 0, "The amount saved")
  const walletId = requireWallet(body.walletId, "The wallet the goal is saved in", refs)
  const targetDate = parseGoalDate(body.targetDate)
  if (typeof icon !== "string" || !GOAL_ICONS.includes(icon as GoalIconName)) {
    throw new ValidationError("Choose one of the icons on offer.")
  }
  return { name, targetAmount, savedAmount, targetDate, walletId, icon: icon as GoalIconName }
}

/** How much money is being added to a goal, or taken out of it: whole rupiah above zero. */
export function parseGoalAmount(body: unknown): number {
  if (!isObject(body)) throw new ValidationError("Send the amount as a JSON object.")
  const { amount } = body
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError("The amount must be a whole number of rupiah above zero.")
  }
  if (amount > MAX_AMOUNT) throw new ValidationError("That amount is too large.")
  return amount
}

/**
 * The amount being added to a goal, and the wallet it comes from when it is being
 * moved from one (the store checks that wallet exists). Leaving the wallet out, or
 * empty, means the money is already in the goal's wallet.
 */
export function parseGoalAddition(body: unknown): { amount: number; fromWalletId?: string } {
  const amount = parseGoalAmount(body)
  const from = (body as Record<string, unknown>).fromWalletId
  if (from === undefined || from === null || from === "") return { amount }
  if (typeof from !== "string") throw new ValidationError("The wallet the money comes from isn't a wallet that exists.")
  return { amount, fromWalletId: from }
}

// ---- categories ------------------------------------------------------------------------------

export const MAX_CATEGORY_NAME_LENGTH = 30

type NamedCategory = Pick<Category, "id" | "name" | "type">

/** A name that is there, short enough, and not already used by another category of the same kind (capitals don't matter). */
function parseCategoryName(value: unknown, type: CategoryType, categories: NamedCategory[], ownId?: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new ValidationError("Give the category a name.")
  const name = value.trim()
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    throw new ValidationError(`The name can be at most ${MAX_CATEGORY_NAME_LENGTH} characters.`)
  }
  const clash = categories.find(
    (category) => category.id !== ownId && category.type === type && category.name.toLowerCase() === name.toLowerCase()
  )
  if (clash) throw new ValidationError(`You already have an ${type} category called ${clash.name}.`)
  return name
}

function parseCategoryIcon(value: unknown): IconName {
  if (typeof value !== "string" || !CATEGORY_ICONS.includes(value as IconName)) {
    throw new ValidationError("Choose one of the icons on offer.")
  }
  return value as IconName
}

/** Turns the request body into a NewCategory, or throws a ValidationError saying what is wrong. */
export function parseNewCategory(body: unknown, categories: NamedCategory[]): NewCategory {
  if (!isObject(body)) throw new ValidationError("Send the category as a JSON object.")
  const type = body.type
  if (type !== "expense" && type !== "income") {
    throw new ValidationError("Choose whether this category is for spending or for income.")
  }
  return {
    name: parseCategoryName(body.name, type, categories),
    type,
    icon: parseCategoryIcon(body.icon),
    color: parseColor(body.color),
  }
}

/** What to change on an existing category. Its own current name is allowed, so saving without renaming works. */
export function parseCategoryChanges(body: unknown, categories: NamedCategory[], existing: NamedCategory): CategoryChanges {
  if (!isObject(body)) throw new ValidationError("Send the category as a JSON object.")
  return {
    name: parseCategoryName(body.name, existing.type, categories, existing.id),
    icon: parseCategoryIcon(body.icon),
    color: parseColor(body.color),
  }
}

/** The most transactions one category can bring back with it. Far more than anyone will have, but a limit all the same. */
const MAX_RESTORED_TRANSACTIONS = 100_000

/**
 * The request to undo deleting a category, checked. It must be a category of the owner's own (never a
 * preset) that isn't there now, with a name that no category of its kind has taken in the meantime.
 */
export function parseRestoreCategory(body: unknown, categories: NamedCategory[]): RestoreCategory {
  if (!isObject(body)) throw new ValidationError("Send what to restore as a JSON object.")
  const given = body.category
  if (!isObject(given)) throw new ValidationError("Send the category to restore.")

  const { id } = given
  if (typeof id !== "string" || !/^cat-[A-Za-z0-9-]{1,80}$/.test(id)) throw new ValidationError("That isn't a category that can be restored.")
  if (presetCategories.some((preset) => preset.id === id)) throw new ValidationError("A preset can't be restored: it is never deleted.")
  if (categories.some((category) => category.id === id)) throw new ValidationError("That category is already there.")

  const type = given.type
  if (type !== "expense" && type !== "income") {
    throw new ValidationError("Choose whether this category is for spending or for income.")
  }
  const category: RestoreCategory["category"] = {
    id,
    name: parseCategoryName(given.name, type, categories),
    type,
    icon: parseCategoryIcon(given.icon),
    color: parseColor(given.color),
  }
  if (given.budget !== undefined) {
    if (type !== "expense") throw new ValidationError("Budgets are for spending categories.")
    category.budget = parseBudget({ budget: given.budget }) ?? undefined
  }

  const { position, transactionIds } = body
  if (typeof position !== "number" || !Number.isInteger(position) || position < 0 || position > MAX_AMOUNT) throw new ValidationError("Say where the category sat in the list.")
  if (!Array.isArray(transactionIds) || transactionIds.length > MAX_RESTORED_TRANSACTIONS || transactionIds.some((entry) => typeof entry !== "string")) {
    throw new ValidationError("Send the list of transactions to move back.")
  }
  if (new Set(transactionIds).size !== transactionIds.length) throw new ValidationError("Each transaction can be listed only once.")

  return { category, position, transactionIds: transactionIds as string[] }
}

/** The categories in their new order: every category that exists, exactly once (spending and income together). */
export function parseCategoryOrder(body: unknown, categories: Pick<Category, "id">[]): string[] {
  return parseOrder(body, categories.map((category) => category.id), "category", "categories")
}

/** A monthly budget: whole rupiah above zero, or null to take the budget away. */
export function parseBudget(body: unknown): number | null {
  if (!isObject(body)) throw new ValidationError("Send the budget as a JSON object.")
  const { budget } = body
  if (budget === null) return null
  if (typeof budget !== "number" || !Number.isInteger(budget) || budget <= 0) {
    throw new ValidationError("The budget must be a whole number of rupiah above zero.")
  }
  if (budget > MAX_AMOUNT) throw new ValidationError("That amount is too large.")
  return budget
}

// ---- the owner -------------------------------------------------------------------------------

export const MAX_USER_NAME_LENGTH = 30

/** The owner's name: some text, without the spaces around it, at most 30 characters. */
export function parseUserName(body: unknown): string {
  if (!isObject(body)) throw new ValidationError("Send the name as a JSON object.")
  const name = typeof body.name === "string" ? body.name.trim() : ""
  if (name === "") throw new ValidationError("Enter your name.")
  if (name.length > MAX_USER_NAME_LENGTH) {
    throw new ValidationError(`Your name can be at most ${MAX_USER_NAME_LENGTH} characters.`)
  }
  return name
}

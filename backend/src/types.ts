/**
 * Domain types for Kaya, and the shapes the backend's API sends.
 *
 * The backend owns these. The frontend imports them as types only (see
 * frontend/lib/types.ts), so the two folders share one description of the data
 * but no code. Everything here is plain, serializable data: ids are strings,
 * money is a number, dates are ISO strings.
 */

/** A whole-rupiah amount. Always an integer; Rupiah has no minor unit in use. */
export type Rupiah = number

/**
 * Palette keys shared by categories and wallets. Each maps to a theme-aware
 * CSS variable (`--cat-<key>`), so the UI renders them as `bg-cat-moss` etc.
 */
export type PaletteColor =
  | "moss"
  | "sage"
  | "marigold"
  | "sand"
  | "clay"
  | "sky"
  | "plum"
  | "rose"
  | "teal"
  | "ochre"

/**
 * The curated icon set for categories (lucide-react names in kebab-case).
 * Keeping it closed keeps every icon in the same visual family.
 */
export type IconName =
  | "tag"
  | "utensils"
  | "coffee"
  | "shopping-basket"
  | "shopping-bag"
  | "shirt"
  | "bus"
  | "car"
  | "house"
  | "receipt"
  | "zap"
  | "smartphone"
  | "clapperboard"
  | "gamepad-2"
  | "heart-pulse"
  | "dumbbell"
  | "graduation-cap"
  | "plane"
  | "paw-print"
  | "heart-handshake"
  | "gift"
  | "briefcase"
  | "hand-coins"
  | "circle-ellipsis"

/** The person using the app. Only a display name for now. */
export interface User {
  name: string
}

export type WalletKind = "bank" | "digital-bank" | "e-wallet" | "investment" | "cash" | "deposito"

/** Where a deposito stands: earning, finished and waiting for the money to be moved, or already moved. */
export type DepositoStatus = "running" | "matured" | "settled"

/** What the owner fills in about a deposito (time deposit). The amount put in is the wallet's starting balance. */
export interface DepositoInput {
  /** Yearly rate in percent, at most two decimals: 5 or 5.25. */
  ratePercent: number
  /** The day the first term began, "YYYY-MM-DD". */
  startDate: string
  /** How many months one term lasts. */
  tenorMonths: number
  /** True when the bank renews it by itself at the end of each term. */
  rollover: boolean
}

/**
 * A deposito wallet's details. Its wallet balance is `principal + interest`, worked out on the day it is read
 * and never saved, and the interest is never income: no transaction is made for it. It is before tax.
 */
export interface Deposito extends DepositoInput {
  /** The money put in. 0 once the deposito has been settled. */
  principal: Rupiah
  /** The interest earned so far (before tax). 0 once settled. */
  interest: Rupiah
  /** When the term that is running ends ("YYYY-MM-DD"); for a matured one, the day it matured. */
  endDate: string
  status: DepositoStatus
  /** When the money was moved out, an ISO 8601 date-time with offset. Only a settled deposito has it. */
  settledAt?: string
  /**
   * The wallet the money came from, and goes back to when it matures. Missing for a deposito made before this was
   * recorded, and once that wallet has been deleted.
   */
  sourceWalletId?: string
}

/**
 * The icons a wallet can wear (lucide-react names in kebab-case). The first
 * five are what each kind of wallet wears until the owner picks another.
 */
export type WalletIconName =
  | "landmark"
  | "smartphone"
  | "wallet"
  | "trending-up"
  | "banknote"
  | "credit-card"
  | "coins"
  | "piggy-bank"
  | "gem"
  | "house"
  | "graduation-cap"
  | "plane"

export interface Wallet {
  id: string
  name: string
  kind: WalletKind
  /** Current balance. */
  balance: Rupiah
  /** What this account is used for, in the owner's words. */
  description: string
  /** The colour in use: on the wallet's card and badge, and in the total's share bar. */
  color: PaletteColor
  /** The colour the app picked when the wallet was made. Choosing "Default" in the colour picker brings it back. */
  defaultColor: PaletteColor
  /** The icon the owner chose. Missing means the default icon for the wallet's kind. */
  icon?: WalletIconName
  /** A short word the owner can use for this wallet in Quick add, like "jago" for "Bank Jago". Missing when there isn't one. */
  nickname?: string
  /**
   * Investment wallets only: how the value moved the last time the owner
   * updated it by hand, and when. Missing until the first update.
   */
  lastValueChange?: { change: Rupiah; at: string }
  /** Deposito wallets only (kind "deposito"): the rate, the dates and the interest earned so far. */
  deposito?: Deposito
}

/**
 * What is needed to add a wallet. The starting balance is not income; it is
 * just where the wallet begins. Leave the colour and icon out to get the defaults.
 */
export interface NewWallet {
  name: string
  kind: WalletKind
  description: string
  startingBalance: Rupiah
  color?: PaletteColor
  icon?: WalletIconName
  nickname?: string
  /**
   * Required for a deposito (and only for one). The starting balance is then the amount put in, and must be above zero;
   * it is taken out of `fromWalletId` (a wallet that isn't a deposito) as a transfer. A deposito has no nickname.
   */
  deposito?: DepositoInput & { fromWalletId: string }
}

/**
 * What can be changed on a wallet afterwards. Its kind and balance are not
 * edited here. Leave the colour, icon or nickname out to keep it; send `icon: null` to
 * go back to the default icon, and `nickname: null` to take the nickname away.
 */
export interface WalletChanges {
  name: string
  description: string
  color?: PaletteColor
  icon?: WalletIconName | null
  nickname?: string | null
  /**
   * A deposito's details and the amount put in. Leave out to keep them; refused for any other wallet, or once it is
   * settled. Correcting the principal adjusts the source wallet by the difference. `fromWalletId` is only for an older deposito that
   * has no source yet: it takes the amount out of that wallet now, as a transfer.
   */
  deposito?: DepositoInput & { principal: Rupiah; fromWalletId?: string }
}

/**
 * One time the owner set a balance by hand: an investment's market value
 * ("value"), or a fix for a balance that had drifted from the real account
 * ("correction"). Neither is income or spending, so neither is a transaction.
 */
export interface BalanceChange {
  id: number
  /** ISO 8601 date-time with offset. */
  at: string
  kind: "value" | "correction"
  oldBalance: Rupiah
  newBalance: Rupiah
}

/**
 * One time the owner set a balance by hand, as the change it made to that wallet: the new balance minus
 * the old one. The balance line on Insights needs these to work out what the total was on an earlier day,
 * because they moved a balance without being a transaction.
 */
export interface BalanceAdjustment {
  walletId: string
  /** ISO 8601 date-time with offset. */
  at: string
  change: Rupiah
}

export type CategoryType = "income" | "expense"

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: IconName
  color: PaletteColor
  /** True for the categories that come with the app. They can't be renamed, recoloured or deleted. */
  preset: boolean
  /**
   * Spending categories only: the most the owner wants to spend on it in a month. A guide, not a
   * limit: nothing stops a transaction going over it. Missing when the category has no budget.
   */
  budget?: Rupiah
}

/**
 * What is needed to add a category. Whether it is for income or spending is chosen
 * now and can't be changed later, because the transactions in it would no longer fit.
 */
export interface NewCategory {
  name: string
  type: CategoryType
  icon: IconName
  color: PaletteColor
}

/** What can be changed on a category the owner made. Its type stays as it is. */
export interface CategoryChanges {
  name: string
  icon: IconName
  color: PaletteColor
}

interface TransactionBase {
  id: string
  /** Always positive; `type` decides whether money came in, went out, or moved. */
  amount: Rupiah
  /** ISO 8601 date-time with offset, e.g. "2026-09-28T19:40:00+07:00". */
  date: string
  description: string
}

export interface IncomeTransaction extends TransactionBase {
  type: "income"
  walletId: string
  categoryId: string
}

export interface ExpenseTransaction extends TransactionBase {
  type: "expense"
  walletId: string
  categoryId: string
}

/** Money moved between two of the owner's wallets. Not income, not spending. */
export interface TransferTransaction extends TransactionBase {
  type: "transfer"
  fromWalletId: string
  toWalletId: string
}

export type Transaction = IncomeTransaction | ExpenseTransaction | TransferTransaction

export type TransactionType = Transaction["type"]

/** A transaction before it has been saved, so it has no id yet. */
export type NewTransaction =
  | Omit<IncomeTransaction, "id">
  | Omit<ExpenseTransaction, "id">
  | Omit<TransferTransaction, "id">

/** The icons a goal can wear (lucide-react names in kebab-case). */
export type GoalIconName =
  | "piggy-bank"
  | "umbrella"
  | "plane"
  | "key-round"
  | "car"
  | "laptop"
  | "graduation-cap"
  | "heart"
  | "gift"
  | "heart-pulse"
  | "gem"
  | "camera"

/**
 * What the owner fills in to add a goal or change one. A goal is a note about
 * money that is already in a wallet, so saving toward it moves nothing between
 * wallets and is never a transaction.
 */
export interface GoalInput {
  name: string
  targetAmount: Rupiah
  /** What has been set aside for it so far. It can go past the target. */
  savedAmount: Rupiah
  /** Calendar date the owner is aiming for, "YYYY-MM-DD", or "" when there isn't one. */
  targetDate: string
  /** Wallet where the money for this goal is kept. */
  walletId: string
  icon: GoalIconName
}

export interface Goal extends GoalInput {
  id: string
  /**
   * Where the "on pace" note measures from: the day the goal began ("YYYY-MM-DD"),
   * or the last day some of what was saved was taken out again, and what had been
   * saved by then. Empty only if the database predates this and was never opened
   * by a newer version, which does not happen in practice.
   */
  paceFrom: string
  paceAmount: Rupiah
  /**
   * When the goal last reached its target, an ISO 8601 date-time with offset.
   * Missing while it hasn't, and for a goal that was already reached before dates
   * were recorded.
   */
  reachedAt?: string
}

/** The ways what is saved for a goal can change. Editing only a name, date, wallet or icon is not one of them. */
export type GoalMovementKind =
  | "start" // the goal was made with something already saved
  | "add" // money was added, maybe from another wallet
  | "take-out" // money was taken out again
  | "correction" // the saved amount was edited by hand

/** One time what is saved for a goal changed. Together they are the goal's history. */
export interface GoalMovement {
  id: number
  /** ISO 8601 date-time with offset. */
  at: string
  kind: GoalMovementKind
  oldSaved: Rupiah
  newSaved: Rupiah
  /** For money added from another wallet: which one. Missing if it was already in the goal's wallet, or if that wallet has since been deleted (`transferred` says which). */
  fromWalletId?: string
  /** True when adding the money also recorded a transfer between two wallets. */
  transferred: boolean
}

// ---- What the API sends back ---------------------------------------------------

/** Everything the app needs to draw itself, from GET /api/data. */
export interface AppData {
  user: User
  /** The most the owner wants to spend in a month, across everything. A guide, not a limit. Missing when there isn't one. */
  monthlyBudget?: Rupiah
  wallets: Wallet[]
  categories: Category[]
  goals: Goal[]
  transactions: Transaction[]
  /** Every balance the owner set by hand, oldest first. */
  balanceAdjustments: BalanceAdjustment[]
  /** The newest copy made with "Back up now". Missing when there is none yet. */
  lastBackup?: BackupInfo
  /** True when Kaya asks for a PIN before it opens. (When it does and this device hasn't typed it, none of this data is sent.) */
  pinSet: boolean
}

/** Whether Kaya has a PIN, and whether the device asking has typed it (or there is no PIN, so nothing to type). */
export interface AuthStatus {
  pinSet: boolean
  unlocked: boolean
}

/** The reply to turning the PIN on, changing it, or typing it. */
export interface AuthResult {
  pinSet: boolean
}

/** A copy of the data file, made when the owner pressed "Back up now". */
export interface BackupInfo {
  /** The file's name, "nabungbego-2026-10-04-153012.db". */
  name: string
  /** When it was made, "2026-10-04T15:30:12+07:00". */
  at: string
}

/** The reply to "Back up now": the copy that was made, and the folder it is in. */
export interface BackupResult {
  backup: BackupInfo
  /** "backend/data/backups", for the message. */
  folder: string
}

/** The reply to changing the owner's name: the name as saved. */
export interface SaveUserResult {
  user: User
}

/** The reply to setting the monthly budget: the budget as saved, or nothing when it was taken away. */
export interface SaveMonthlyBudgetResult {
  monthlyBudget?: Rupiah
}

/** The reply to saving a transaction: the saved row, and every wallet with its new balance. */
export interface SaveTransactionResult {
  transaction: Transaction
  wallets: Wallet[]
}

/**
 * The reply to adding, editing or updating the value of a wallet: that wallet, and every wallet. Setting a
 * balance by hand (a value update or a correction) also says how much it moved the wallet.
 */
export interface SaveWalletResult {
  wallet: Wallet
  wallets: Wallet[]
  adjustment?: BalanceAdjustment
}

/** The reply to moving a matured deposito's money into another wallet: the deposito, every wallet, and the transfer that was recorded. */
export interface SettleDepositoResult {
  undoId: string
  wallet: Wallet
  wallets: Wallet[]
  transaction: Transaction
}

/**
 * The reply to deleting a transaction: every wallet with its new balance, and an id that undoes the delete
 * (see UndoResult). The same goes for deleting a wallet or a goal.
 */
/** The reply to importing transactions from a bank's file: what was saved, every wallet as it is now, and the id that undoes it. */
/** A reviewed CSV line; a transfer can replace its already recorded other side. */
export type ImportedTransaction = NewTransaction & { replaceTransactionId?: string }

export interface ImportTransactionsResult {
  replacedTransactionIds: string[]
  transactions: Transaction[]
  wallets: Wallet[]
  undoId: string
}
export interface DeleteTransactionResult {
  wallets: Wallet[]
  undoId: string
}

/** The reply to deleting a wallet: the wallets left, which transactions went with it, and the id that undoes it. */
export interface DeleteWalletResult {
  wallets: Wallet[]
  /** All current balance changes, including a deposito's principal returned to its source. */
  balanceAdjustments: BalanceAdjustment[]
  deletedTransactionIds: string[]
  undoId: string
}

/** The reply to putting the wallets in a new order. */
export interface ReorderWalletsResult {
  wallets: Wallet[]
}

/** The reply to adding, changing or taking money out of a goal: that goal, and every goal. */
export interface SaveGoalResult {
  goal: Goal
  goals: Goal[]
}

/**
 * The reply to adding money to a goal. When the money came from another wallet it
 * also holds the transfer that was recorded, and the wallets always come with their
 * balances as they now are.
 */
export interface AddToGoalResult extends SaveGoalResult {
  wallets: Wallet[]
  transaction?: Transaction
}

/** The reply to deleting a goal: the goals left, and the id that undoes it. */
export interface DeleteGoalResult {
  goals: Goal[]
  undoId: string
}

/**
 * What undoing a delete put back. The kind says which of the other fields are there. A wallet comes back
 * with all its transactions and the balances that were set by hand for it; a goal with its history.
 */
export type UndoResult =
  | { kind: "settlement"; wallets: Wallet[]; removedTransactionIds: string[] }
  | { kind: "transaction"; transaction: Transaction; wallets: Wallet[] }
  /** Undoing an import takes its transactions out again (any that were deleted since are simply not there). */
  | { kind: "import"; wallets: Wallet[]; removedTransactionIds: string[]; restoredTransactions: Transaction[] }
  | { kind: "goal"; goal: Goal; goals: Goal[] }
  | {
      kind: "wallet"
      wallet: Wallet
      wallets: Wallet[]
      transactions: Transaction[]
      /** All current balance changes, after reversing any returned deposito principal. */
      balanceAdjustments: BalanceAdjustment[]
    }

/** The reply to putting the goals in a new order. */
export interface ReorderGoalsResult {
  goals: Goal[]
}

/** The reply to putting the categories in a new order: every category, in that order. */
export interface ReorderCategoriesResult {
  categories: Category[]
}

/** The reply to adding or changing a category: that category, and every category. */
export interface SaveCategoryResult {
  category: Category
  categories: Category[]
}

/**
 * The reply to deleting a category: the categories left, and where its transactions
 * went. They move to "Other" (for the same kind of money), so none are lost.
 */
export interface DeleteCategoryResult {
  categories: Category[]
  movedToId: string
  movedTransactionIds: string[]
  /** The place it had in the list (its own number, which is kept so it can be put back exactly where it was). */
  position: number
}

/**
 * What it takes to undo deleting a category: the category as it was (its id, so nothing that
 * remembers it is confused), where it sat in the list, and the transactions that were moved
 * to "Other" when it was deleted. Only the owner's own categories can be deleted, so only
 * they can be restored.
 */
export interface RestoreCategory {
  category: {
    id: string
    name: string
    type: CategoryType
    icon: IconName
    color: PaletteColor
    /** The monthly budget it had, if any. */
    budget?: Rupiah
  }
  /** The place it had in the list, as the delete reported it. Putting it back there works whichever order several deletes are undone in. */
  position: number
  transactionIds: string[]
}

/** The reply to restoring a category: that category, every category, and the transactions that went back to it. */
export interface RestoreCategoryResult {
  category: Category
  categories: Category[]
  restoredTransactionIds: string[]
}

/** An AI Quick add preview is not a saved transaction. Dates here are calendar dates. */
export interface TransactionPreviewDraft {
  type?: TransactionType
  amount?: Rupiah
  walletId?: string
  toWalletId?: string
  categoryId?: string
  date?: string
  description?: string
}

export interface TransactionPreview {
  status: "ready" | "clarify" | "unsupported"
  draft: TransactionPreviewDraft
  defaults: ("date" | "wallet" | "category")[]
  message: string
  conversation?: PreviewConversation
}

export type PreviewField = keyof TransactionPreviewDraft
export type PreviewSource = "sentence" | "reply" | "manual" | "default" | "suggestion"
export interface PreviewQuestion {
  field: PreviewField | "transferEnd" | "sentence"
  reason: "missing" | "invalid" | "ambiguous" | "unsupported"
  message: string
  choices?: { id: string; label: string }[]
  walletId?: string
}
/** Ephemeral, untrusted client context. Never persisted or sent to the model. */
export interface PreviewConversation {
  revision: number
  draft: TransactionPreviewDraft
  sources: Partial<Record<PreviewField, PreviewSource>>
  pending?: PreviewQuestion
}

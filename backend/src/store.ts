/**
 * Reads and writes the data. Every change happens inside one database
 * transaction, so a transaction row and the wallet balances it moves are saved
 * together or not at all.
 */
import { isDeepStrictEqual } from "node:util"
import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

import { createAuth } from "./auth.ts"
import { createAssistantStore } from "./assistant-store.ts"
import { lastBackup, makeBackup } from "./backup.ts"
import { OTHER_CATEGORY_ID } from "./category-look.ts"
import { depositoState } from "./deposito.ts"
import { balanceChanges } from "./ledger.ts"
import {
  sampleCategories,
  sampleGoalMovements,
  sampleGoals,
  sampleTransactions,
  sampleUser,
  sampleWallets,
} from "./sample-data.ts"
import type {
  AddToGoalResult,
  AppData,
  BackupResult,
  BalanceAdjustment,
  BalanceChange,
  Category,
  DeleteCategoryResult,
  DeleteGoalResult,
  DeleteTransactionResult,
  DeleteWalletResult,
  Goal,
  GoalMovement,
  GoalMovementKind,
  ImportTransactionsResult,
  PaletteColor,
  ReorderCategoriesResult,
  ReorderGoalsResult,
  ReorderWalletsResult,
  RestoreCategoryResult,
  SaveCategoryResult,
  SaveGoalResult,
  SaveMonthlyBudgetResult,
  SaveTransactionResult,
  SaveUserResult,
  SaveWalletResult,
  SettleDepositoResult,
  Transaction,
  UndoResult,
  User,
  Wallet,
  WalletIconName,
} from "./types.ts"
import { calendarDate, isoWithOffset } from "./time.ts"
import {
  MAX_AMOUNT,
  ValidationError,
  parseBudget,
  parseCategoryChanges,
  parseCategoryOrder,
  parseGoal,
  parseGoalAddition,
  parseGoalAmount,
  parseGoalOrder,
  parseNewCategory,
  parseNewTransaction,
  parseNewWallet,
  parseRestoreCategory,
  parseSettleDeposito,
  parseTransactionImport,
  parseUserName,
  parseWalletChanges,
  parseWalletOrder,
  parseWalletValue,
  type References,
} from "./validate.ts"
import { WALLET_COLORS } from "./wallet-look.ts"

// SQLite hands rows back as loose objects; these say what we expect in them.
interface WalletRow {
  id: string
  name: string
  kind: Wallet["kind"]
  balance: number
  description: string
  color: PaletteColor
  default_color: PaletteColor
  icon: WalletIconName | null
  nickname: string | null
  deposit_rate_bp: number | null
  deposit_start: string | null
  deposit_tenor: number | null
  deposit_rollover: number | null
  deposit_settled_at: string | null
  deposit_source_wallet_id: string | null
  last_change: number | null
  last_at: string | null
}
interface BalanceChangeRow {
  id: number
  at: string
  kind: BalanceChange["kind"]
  old_balance: number
  new_balance: number
}
interface CategoryRow {
  id: string
  name: string
  type: Category["type"]
  icon: Category["icon"]
  color: Category["color"]
  preset: number
  budget: number | null
}
interface GoalRow {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  target_date: string
  wallet_id: string
  icon: Goal["icon"]
  pace_from: string | null
  pace_amount: number | null
  reached_at: string | null
}
interface GoalMovementRow {
  id: number
  at: string
  kind: GoalMovementKind
  old_saved: number
  new_saved: number
  wallet_id: string | null
  transaction_id: string | null
}
/** A row of a goal's history as the database holds it, with the goal it belongs to, so a deleted goal can be put back exactly. */
interface GoalMovementDbRow extends GoalMovementRow {
  goal_id: string
}
/** A wallet exactly as the database holds it, so a deleted wallet can be put back exactly. */
interface WalletDbRow {
  id: string
  name: string
  kind: Wallet["kind"]
  balance: number
  description: string
  color: PaletteColor
  default_color: PaletteColor | null
  icon: WalletIconName | null
  nickname: string | null
  deposit_rate_bp: number | null
  deposit_start: string | null
  deposit_tenor: number | null
  deposit_rollover: number | null
  deposit_settled_at: string | null
  deposit_source_wallet_id: string | null
  position: number
}
/** A balance set by hand, as the database holds it. */
interface BalanceUpdateRow extends BalanceChangeRow {
  wallet_id: string
}
/** A goal exactly as the database holds it, place in the list included, so a deleted goal can be put back exactly. */
interface GoalDbRow extends GoalRow {
  position: number
}
/** Everything a wallet took with it when it was deleted, so that it can be put back. */
interface DeletedWallet {
  row: WalletDbRow
  transactions: Transaction[]
  /** The place each of those transactions had in the list (the same order as `transactions`), so they come back in it. */
  places: number[]
  updates: BalanceUpdateRow[]
  /** The bits of goal history that said money came from this wallet: deleting it made the database forget that. */
  movementIds: number[]
  /** Principal returned to a deposito's source when it was deleted; undo takes it back. */
  returnedPrincipal?: { walletId: string; amount: number; updateId: number }
}

const GOAL_COLUMNS = "id, name, target_amount, saved_amount, target_date, wallet_id, icon, pace_from, pace_amount, reached_at"

function toGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    savedAmount: row.saved_amount,
    targetDate: row.target_date,
    walletId: row.wallet_id,
    icon: row.icon,
    paceFrom: row.pace_from ?? "",
    paceAmount: row.pace_amount ?? row.saved_amount,
    // Only a goal that is reached has a date it was reached on.
    ...(row.reached_at !== null && row.saved_amount >= row.target_amount ? { reachedAt: row.reached_at } : {}),
  }
}

/** "Rp 18.500.000", for the few messages that name an amount. */
const rupiah = (amount: number) => `Rp ${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
interface TransactionRow {
  id: string
  type: Transaction["type"]
  amount: number
  date: string
  description: string
  wallet_id: string | null
  category_id: string | null
  from_wallet_id: string | null
  to_wallet_id: string | null
}

function toTransaction(row: TransactionRow): Transaction {
  const base = { id: row.id, amount: row.amount, date: row.date, description: row.description }
  if (row.type === "transfer") {
    return { ...base, type: "transfer", fromWalletId: row.from_wallet_id!, toWalletId: row.to_wallet_id! }
  }
  return { ...base, type: row.type, walletId: row.wallet_id!, categoryId: row.category_id! }
}

/** The columns that make a wallet a deposito, as the database holds them. */
const DEPOSIT_COLUMNS = "deposit_rate_bp, deposit_start, deposit_tenor, deposit_rollover, deposit_settled_at, deposit_source_wallet_id"

/**
 * `today` is "YYYY-MM-DD" on the day it is read. A deposito's interest is worked out from it every time wallets are
 * read, so the tests can hand in a fixed day.
 */
export function createStore(db: DatabaseSync, today: () => string = () => calendarDate(new Date())) {
  /** The PIN that can lock the app, and the devices that have typed it (see auth.ts). */
  const auth = createAuth(db)

  /** Runs `work` so that it is saved completely, or not at all if anything inside throws. */
  function transact<T>(work: () => T): T {
    db.exec("BEGIN IMMEDIATE")
    try {
      const result = work()
      db.exec("COMMIT")
      return result
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }

  // ---- undoing a delete ---------------------------------------------------------------------

  /** How many of the most recent deletes can still be undone. */
  const MOST_UNDOABLE = 50

  /**
   * What it takes to put back each thing that was deleted, by undo id. It is kept in memory only: an undo is for the few
   * seconds after a delete, so it is fine that it is forgotten when the app stops. Each entry holds everything that was
   * deleted, so putting it back is exact and nothing the screen sends has to be trusted.
   */
  const undoable = new Map<string, () => UndoResult>()

  function rememberUndo(restore: () => UndoResult): string {
    const id = `undo-${randomUUID()}`
    undoable.set(id, restore)
    for (const oldest of undoable.keys()) {
      if (undoable.size <= MOST_UNDOABLE) break
      undoable.delete(oldest)
    }
    return id
  }

  /**
   * Puts back what an undo id stands for, all or nothing. If something has changed so that it no longer fits (a wallet
   * it needs has been deleted since, say), nothing is touched and a ValidationError says why.
   */
  function undo(undoId: string): UndoResult {
    const restore = undoable.get(undoId)
    if (!restore) throw new ValidationError("That can't be undone any more.")
    const result = transact(restore)
    undoable.delete(undoId)
    return result
  }

  function rowExists(table: "wallets" | "categories", id: string): boolean {
    return db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(id) !== undefined
  }

  // ---- reading ------------------------------------------------------------------

  function getUser(): User {
    const row = db.prepare("SELECT name FROM app_user WHERE id = 1").get() as { name: string } | undefined
    return { name: row?.name ?? "" }
  }

  /** The most the owner wants to spend in a month, or undefined when there is no budget for the whole month. */
  function getMonthlyBudget(): number | undefined {
    const row = db.prepare("SELECT monthly_budget FROM app_user WHERE id = 1").get() as
      | { monthly_budget: number | null }
      | undefined
    return row?.monthly_budget ?? undefined
  }

  /** Every balance set by hand, for every wallet, oldest first. */
  function getBalanceAdjustments(): BalanceAdjustment[] {
    const rows = db
      .prepare("SELECT wallet_id, at, old_balance, new_balance FROM wallet_value_updates ORDER BY id")
      .all() as unknown as { wallet_id: string; at: string; old_balance: number; new_balance: number }[]
    return rows.map((row) => ({ walletId: row.wallet_id, at: row.at, change: row.new_balance - row.old_balance }))
  }

  function getWallets(): Wallet[] {
    const rows = db
      .prepare(
        `SELECT w.id, w.name, w.kind, w.balance, w.description, w.color, w.icon, w.nickname,
                w.deposit_rate_bp, w.deposit_start, w.deposit_tenor, w.deposit_rollover, w.deposit_settled_at, w.deposit_source_wallet_id,
                COALESCE(w.default_color, w.color) AS default_color,
                (SELECT new_balance - old_balance FROM wallet_value_updates u WHERE u.wallet_id = w.id AND u.kind = 'value' ORDER BY u.id DESC LIMIT 1) AS last_change,
                (SELECT at FROM wallet_value_updates u WHERE u.wallet_id = w.id AND u.kind = 'value' ORDER BY u.id DESC LIMIT 1) AS last_at
           FROM wallets w
          ORDER BY w.position, w.rowid`
      )
      .all() as unknown as WalletRow[]
    const onDay = today()
    return rows.map((row) => {
      const deposito = toDeposito(row, onDay)
      return {
        id: row.id,
        name: row.name,
        // A deposito is stored as a bank wallet with a rate (see db.ts); the app calls it what it is.
        kind: deposito ? "deposito" : row.kind,
        // Its balance is what it holds today: the money put in plus the interest earned so far. Never saved.
        balance: deposito ? row.balance + deposito.interest : row.balance,
        description: row.description,
        color: row.color,
        defaultColor: row.default_color,
        ...(row.icon !== null ? { icon: row.icon } : {}),
        // A deposito has no nickname, whatever the database holds.
        ...(row.nickname !== null && !deposito ? { nickname: row.nickname } : {}),
        ...(row.last_at !== null && row.last_change !== null
          ? { lastValueChange: { change: row.last_change, at: row.last_at } }
          : {}),
        ...(deposito ? { deposito } : {}),
      }
    })
  }

  /** A deposito wallet's details with the interest worked out for `onDay`, or undefined for any other wallet. */
  function toDeposito(
    row: Pick<
      WalletRow,
      "balance" | "deposit_rate_bp" | "deposit_start" | "deposit_tenor" | "deposit_rollover" | "deposit_settled_at" | "deposit_source_wallet_id"
    >,
    onDay: string
  ): Wallet["deposito"] {
    if (row.deposit_rate_bp === null || row.deposit_start === null || row.deposit_tenor === null) return undefined
    const rollover = row.deposit_rollover === 1
    const state = depositoState(
      {
        principal: row.balance,
        rateBp: row.deposit_rate_bp,
        startDate: row.deposit_start,
        tenorMonths: row.deposit_tenor,
        rollover,
        ...(row.deposit_settled_at !== null ? { settledAt: row.deposit_settled_at } : {}),
      },
      onDay
    )
    return {
      ratePercent: row.deposit_rate_bp / 100,
      startDate: row.deposit_start,
      tenorMonths: row.deposit_tenor,
      rollover,
      principal: row.balance,
      interest: state.interest,
      endDate: state.endDate,
      status: state.status,
      ...(row.deposit_settled_at !== null ? { settledAt: row.deposit_settled_at } : {}),
      ...(row.deposit_source_wallet_id !== null ? { sourceWalletId: row.deposit_source_wallet_id } : {}),
    }
  }

  function getCategories(): Category[] {
    const rows = db
      .prepare("SELECT id, name, type, icon, color, preset, budget FROM categories ORDER BY position, rowid")
      .all() as unknown as CategoryRow[]
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      icon: row.icon,
      color: row.color,
      preset: row.preset === 1,
      ...(row.budget !== null ? { budget: row.budget } : {}),
    }))
  }

  function getGoals(): Goal[] {
    const rows = db.prepare(`SELECT ${GOAL_COLUMNS} FROM goals ORDER BY position, rowid`).all() as unknown as GoalRow[]
    return rows.map(toGoal)
  }

  const TRANSACTION_COLUMNS =
    "id, type, amount, date, description, wallet_id, category_id, from_wallet_id, to_wallet_id"

  function getTransactions(): Transaction[] {
    const rows = db
      .prepare(`SELECT ${TRANSACTION_COLUMNS} FROM transactions ORDER BY date, rowid`)
      .all() as unknown as TransactionRow[]
    return rows.map(toTransaction)
  }

  function findTransaction(id: string): Transaction | undefined {
    const row = db.prepare(`SELECT ${TRANSACTION_COLUMNS} FROM transactions WHERE id = ?`).get(id) as
      | TransactionRow
      | undefined
    return row ? toTransaction(row) : undefined
  }

  function getData(): AppData {
    const monthlyBudget = getMonthlyBudget()
    const backup = lastBackup(db)
    return {
      user: getUser(),
      ...(monthlyBudget !== undefined ? { monthlyBudget } : {}),
      wallets: getWallets(),
      categories: getCategories(),
      goals: getGoals(),
      transactions: getTransactions(),
      balanceAdjustments: getBalanceAdjustments(),
      ...(backup ? { lastBackup: backup } : {}),
      pinSet: auth.isPinSet(),
    }
  }

  /** "Back up now": copies the data file into the backups folder beside it. Changes nothing in the data. */
  function backUp(): BackupResult {
    return makeBackup(db)
  }

  function references(): References {
    const walletIds = new Set((db.prepare("SELECT id FROM wallets").all() as { id: string }[]).map((row) => row.id))
    const categoryTypes = new Map(
      (db.prepare("SELECT id, type FROM categories").all() as unknown as { id: string; type: Category["type"] }[]).map(
        (row) => [row.id, row.type]
      )
    )
    return { walletIds, categoryTypes }
  }

  // ---- writing transactions ---------------------------------------------------------

  /** Moves wallet balances as if `tx` happened (direction 1) or as if it never had (direction -1). */
  function applyToBalances(tx: Transaction, direction: 1 | -1) {
    const update = db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?")
    // A deposito's balance follows its rate and dates, so no transaction may add to it, change it or take it back.
    const isDeposito = db.prepare("SELECT 1 FROM wallets WHERE id = ? AND deposit_rate_bp IS NOT NULL")
    for (const { walletId } of balanceChanges(tx)) {
      if (isDeposito.get(walletId) !== undefined) {
        throw new ValidationError(
          "A deposito's balance follows its rate and dates, so transactions can't be added to it, changed or deleted. Edit the deposito instead."
        )
      }
    }
    for (const { walletId, change } of balanceChanges(tx)) {
      if (Number(update.run(direction * change, walletId).changes) !== 1) {
        throw new Error(`Wallet ${walletId} was not found while updating balances.`)
      }
    }
  }

  function columnsFor(tx: Transaction) {
    return tx.type === "transfer"
      ? { walletId: null, categoryId: null, fromWalletId: tx.fromWalletId, toWalletId: tx.toWalletId }
      : { walletId: tx.walletId, categoryId: tx.categoryId, fromWalletId: null, toWalletId: null }
  }

  /**
   * Writes a transaction's row without touching any wallet balance. Call it inside `transact`. Transactions are listed by
   * date and then by the order they were saved in, so `place` (the number it had before it was deleted) lets an undo put one
   * back among others with exactly the same date and time. If another row has taken that number since, it goes last.
   */
  function insertTransactionRow(transaction: Transaction, place?: number) {
    const c = columnsFor(transaction)
    const values = [
      transaction.id,
      transaction.type,
      transaction.amount,
      transaction.date,
      transaction.description,
      c.walletId,
      c.categoryId,
      c.fromWalletId,
      c.toWalletId,
    ]
    const keepPlace = place !== undefined && db.prepare("SELECT 1 FROM transactions WHERE rowid = ?").get(place) === undefined
    if (keepPlace) {
      db.prepare(`INSERT INTO transactions (rowid, ${TRANSACTION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(place, ...values)
    } else {
      db.prepare(`INSERT INTO transactions (${TRANSACTION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(...values)
    }
  }

  /** Saves a transaction and moves the wallet balances to match. Call it inside `transact`. */
  function insertTransaction(transaction: Transaction, place?: number) {
    insertTransactionRow(transaction, place)
    applyToBalances(transaction, 1)
  }

  function createTransaction(body: unknown): SaveTransactionResult {
    const input = parseNewTransaction(body, references())
    return transact(() => {
      const transaction: Transaction = { ...input, id: `tx-${randomUUID()}` }
      insertTransaction(transaction)
      assistant.rememberCategory(input, body && typeof body === "object" && "rememberCategory" in body ? body.rememberCategory : undefined)
      return { transaction, wallets: getWallets() }
    })
  }

  /**
   * Saves many transactions at once, read from a bank's file, into the wallets they name. Each moves its wallet's balance
   * exactly as one added by hand would, and the whole lot is saved or none of it is. They are written in the order given,
   * which is the order they are listed in when they share a day. The returned id undoes the import.
   */
  function importTransactions(body: unknown): ImportTransactionsResult {
    const inputs = parseTransactionImport(body, references())
    const replaced: { transaction: Transaction; place: number }[] = []
    const saved = transact(() => {
      const transactions: Transaction[] = []
      for (const { replaceTransactionId, ...input } of inputs) {
        if (replaceTransactionId !== undefined) {
          const before = findTransaction(replaceTransactionId)
          if (!before || before.type === "transfer" || input.type !== "transfer" ||
              before.amount !== input.amount || before.date.slice(0, 10) !== input.date.slice(0, 10) ||
              before.walletId !== (before.type === "income" ? input.toWalletId : input.fromWalletId)) {
            throw new ValidationError("A matching transaction changed since you reviewed it. Reopen the file and check the lines again.")
          }
          const { place } = db.prepare("SELECT rowid AS place FROM transactions WHERE id = ?").get(before.id) as { place: number }
          replaced.push({ transaction: before, place })
          db.prepare("DELETE FROM transactions WHERE id = ?").run(before.id)
          applyToBalances(before, -1)
        }
        const transaction: Transaction = { ...input, id: `tx-${randomUUID()}` }
        insertTransaction(transaction)
        transactions.push(transaction)
      }
      return { transactions, wallets: getWallets(), replacedTransactionIds: replaced.map((entry) => entry.transaction.id) }
    })
    const ids = saved.transactions.map((transaction) => transaction.id)
    return { ...saved, undoId: rememberUndo(() => {
      // If an import replaced an existing line, don't undo across subsequent edits or deletions.
      if (replaced.length && saved.transactions.some((tx) => !isDeepStrictEqual(findTransaction(tx.id), tx))) {
        throw new ValidationError("An imported transaction has changed since, so that import can't be undone.")
      }
      const result = removeImported(ids)
      for (const { transaction, place } of replaced) restoreTransaction(transaction, place)
      return { ...result, wallets: getWallets(), restoredTransactions: replaced.map((entry) => entry.transaction) }
    }) }
  }

  /** Undoes an import and reverses its balance changes. Call inside the Undo transaction. */
  function removeImported(ids: string[]): Extract<UndoResult, { kind: "import" }> {
    const removed: string[] = []
    for (const id of ids) {
      const before = findTransaction(id)
      if (!before) continue
      db.prepare("DELETE FROM transactions WHERE id = ?").run(id)
      applyToBalances(before, -1)
      removed.push(id)
    }
    return { kind: "import", wallets: getWallets(), removedTransactionIds: removed, restoredTransactions: [] }
  }

  function updateTransaction(id: string, body: unknown): SaveTransactionResult | undefined {
    const input = parseNewTransaction(body, references())
    return transact(() => {
      const before = findTransaction(id)
      if (!before) return undefined
      const transaction: Transaction = { ...input, id }
      const c = columnsFor(transaction)
      db.prepare(
        `UPDATE transactions
            SET type = ?, amount = ?, date = ?, description = ?,
                wallet_id = ?, category_id = ?, from_wallet_id = ?, to_wallet_id = ?
          WHERE id = ?`
      ).run(
        transaction.type,
        transaction.amount,
        transaction.date,
        transaction.description,
        c.walletId,
        c.categoryId,
        c.fromWalletId,
        c.toWalletId,
        id
      )
      // Editing is undo-then-redo: take the old effect back, then apply the new one.
      applyToBalances(before, -1)
      applyToBalances(transaction, 1)
      return { transaction, wallets: getWallets() }
    })
  }

  function deleteTransaction(id: string): DeleteTransactionResult | undefined {
    const deleted = transact(() => {
      const before = findTransaction(id)
      if (!before) return undefined
      const { place } = db.prepare("SELECT rowid AS place FROM transactions WHERE id = ?").get(id) as { place: number }
      db.prepare("DELETE FROM transactions WHERE id = ?").run(id)
      applyToBalances(before, -1)
      return { before, place, wallets: getWallets() }
    })
    if (!deleted) return undefined
    return { wallets: deleted.wallets, undoId: rememberUndo(() => restoreTransaction(deleted.before, deleted.place)) }
  }

  /**
   * Undoes deleting a transaction: puts it back with its own id, and moves the wallet balances as it did. It is
   * refused if a wallet or the category it names has been deleted since.
   */
  function restoreTransaction(transaction: Transaction, place: number): UndoResult {
    if (transaction.type === "transfer") {
      if (!rowExists("wallets", transaction.fromWalletId) || !rowExists("wallets", transaction.toWalletId)) {
        throw new ValidationError("One of the wallets it moved money between has been deleted since, so that can't be undone.")
      }
    } else {
      if (!rowExists("wallets", transaction.walletId)) {
        throw new ValidationError("The wallet it was in has been deleted since, so that can't be undone.")
      }
      if (!rowExists("categories", transaction.categoryId)) {
        throw new ValidationError("Its category has been deleted since, so that can't be undone.")
      }
    }
    insertTransaction(transaction, place)
    return { kind: "transaction", transaction, wallets: getWallets() }
  }

  // ---- writing the owner's name and monthly budget --------------------------------------------

  /** Changes the name the greeting on Home uses. */
  function updateUser(body: unknown): SaveUserResult {
    const name = parseUserName(body)
    db.prepare("INSERT INTO app_user (id, name) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name").run(name)
    return { user: getUser() }
  }

  /**
   * Sets the budget for all spending together in a month, or takes it away (`{ "budget": null }`). Like a
   * category's budget it is a guide: nothing stops spending from going past it.
   */
  function setMonthlyBudget(body: unknown): SaveMonthlyBudgetResult {
    const budget = parseBudget(body)
    db.prepare(
      "INSERT INTO app_user (id, name, monthly_budget) VALUES (1, '', ?) ON CONFLICT (id) DO UPDATE SET monthly_budget = excluded.monthly_budget"
    ).run(budget)
    return budget === null ? {} : { monthlyBudget: budget }
  }

  // ---- writing wallets ----------------------------------------------------------------

  function findWallet(id: string): Wallet | undefined {
    return getWallets().find((wallet) => wallet.id === id)
  }

  function walletResult(id: string): SaveWalletResult {
    const wallets = getWallets()
    const wallet = wallets.find((entry) => entry.id === id)
    if (!wallet) throw new Error(`Wallet ${id} disappeared while saving.`)
    return { wallet, wallets }
  }

  /** The palette colour used by the fewest wallets so far; ties go to the earlier colour in the list. */
  function nextWalletColor(): PaletteColor {
    const used = new Map<string, number>()
    for (const wallet of getWallets()) used.set(wallet.color, (used.get(wallet.color) ?? 0) + 1)
    return WALLET_COLORS.reduce((best, color) => ((used.get(color) ?? 0) < (used.get(best) ?? 0) ? color : best))
  }

  /**
   * Puts money into a deposito from another wallet: one transfer from that wallet, written by hand because the ledger
   * refuses to touch a deposito, taking `amount` out of the wallet and remembering it as where the money goes back to.
   * The transfer is dated the day the deposito started, or now if that day hasn't come. Call it inside `transact`, after
   * the deposito already holds the amount.
   */
  function fundDeposito(depositoId: string, sourceId: string, amount: number, startDate: string, now: Date) {
    const wallets = getWallets()
    const deposito = wallets.find((entry) => entry.id === depositoId)
    const source = wallets.find((entry) => entry.id === sourceId)
    if (!deposito) throw new Error(`Wallet ${depositoId} disappeared while saving.`)
    if (!source) throw new ValidationError("The wallet the money comes from doesn't exist any more.")
    if (source.kind === "deposito") throw new ValidationError("The money can't come from another deposito. Choose a different wallet.")
    if (source.balance < amount) {
      throw new ValidationError(`${source.name} only holds ${rupiah(source.balance)}, so it can't put in ${rupiah(amount)}.`)
    }
    const stamp = isoWithOffset(now)
    const transaction: Transaction = {
      id: `tx-${randomUUID()}`,
      type: "transfer",
      amount,
      date: startDate <= today() ? `${startDate}T00:00:00${stamp.slice(-6)}` : stamp,
      description: `Opened deposito ${deposito.name}`.slice(0, 100),
      fromWalletId: sourceId,
      toWalletId: depositoId,
    }
    insertTransactionRow(transaction)
    db.prepare("UPDATE wallets SET balance = balance - ? WHERE id = ?").run(amount, sourceId)
    db.prepare("UPDATE wallets SET deposit_source_wallet_id = ? WHERE id = ?").run(sourceId, depositoId)
  }

  function createWallet(body: unknown, now: Date = new Date()): SaveWalletResult {
    const input = parseNewWallet(body, getWallets())
    return transact(() => {
      const id = `wallet-${randomUUID()}`
      const position = (db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM wallets").get() as { next: number }).next
      // The app's own pick is remembered as the default, even when the owner chose another colour.
      const defaultColor = nextWalletColor()
      db.prepare(
        `INSERT INTO wallets (id, name, kind, balance, description, color, default_color, icon, nickname, deposit_rate_bp, deposit_start, deposit_tenor, deposit_rollover, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        input.name,
        // A deposito is stored as a bank wallet with a rate (see db.ts).
        input.kind === "deposito" ? "bank" : input.kind,
        input.startingBalance,
        input.description,
        input.color ?? defaultColor,
        defaultColor,
        input.icon ?? null,
        input.nickname ?? null,
        input.deposito ? Math.round(input.deposito.ratePercent * 100) : null,
        input.deposito?.startDate ?? null,
        input.deposito?.tenorMonths ?? null,
        input.deposito ? (input.deposito.rollover ? 1 : 0) : null,
        position
      )
      // A deposito's money comes out of another wallet. Nothing is saved if that can't be done.
      if (input.deposito) fundDeposito(id, input.deposito.fromWalletId, input.startingBalance, input.deposito.startDate, now)
      return walletResult(id)
    })
  }

  function updateWallet(id: string, body: unknown, now: Date = new Date()): SaveWalletResult | undefined {
    const changes = parseWalletChanges(body, getWallets(), id)
    return transact(() => {
      const wallet = findWallet(id)
      if (!wallet) return undefined
      const color = changes.color ?? wallet.color
      const icon = changes.icon === undefined ? (wallet.icon ?? null) : changes.icon
      // A deposito has no nickname.
      const nickname = wallet.deposito ? null : changes.nickname === undefined ? (wallet.nickname ?? null) : changes.nickname
      db.prepare("UPDATE wallets SET name = ?, description = ?, color = ?, icon = ?, nickname = ? WHERE id = ?").run(
        changes.name,
        changes.description,
        color,
        icon,
        nickname,
        id
      )
      let adjustment: BalanceAdjustment | undefined
      if (changes.deposito) {
        if (!wallet.deposito) throw new ValidationError("That wallet isn't a deposito.")
        if (wallet.deposito.status === "settled") {
          throw new ValidationError("This deposito's money has been moved out, so its details can't be changed. You can still rename it.")
        }
        const sourceId = wallet.deposito.sourceWalletId
        if (sourceId === undefined && changes.deposito.principal !== wallet.deposito.principal && changes.deposito.fromWalletId === undefined) {
          throw new ValidationError("Choose the wallet the money came from before correcting the principal.")
        }
        if (sourceId !== undefined) {
          const sourceName = findWallet(sourceId)?.name ?? "another wallet"
          const difference = changes.deposito.principal - wallet.deposito.principal
          if (difference !== 0) {
            const source = findWallet(sourceId)
            if (!source || source.kind === "deposito") {
              throw new ValidationError("The source wallet is gone, so the principal can't be corrected here. Move the money into a wallet first.")
            }
            if (difference > 0 && source.balance < difference) {
              throw new ValidationError(`${source.name} only holds ${rupiah(source.balance)}, so it can't put in another ${rupiah(difference)}.`)
            }
            const next = source.balance - difference
            if (!Number.isSafeInteger(next)) throw new ValidationError("That would make the source wallet's balance too large.")
            const at = isoWithOffset(now)
            db.prepare("INSERT INTO wallet_value_updates (wallet_id, at, old_balance, new_balance, kind) VALUES (?, ?, ?, ?, 'correction')")
              .run(sourceId, at, source.balance, next)
            db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(next, sourceId)
            adjustment = { walletId: sourceId, at, change: -difference }
          }
          if (changes.deposito.fromWalletId !== undefined) {
            throw new ValidationError(`This deposito already came from ${sourceName}.`)
          }
        }
        db.prepare(
          "UPDATE wallets SET balance = ?, deposit_rate_bp = ?, deposit_start = ?, deposit_tenor = ?, deposit_rollover = ? WHERE id = ?"
        ).run(
          changes.deposito.principal,
          Math.round(changes.deposito.ratePercent * 100),
          changes.deposito.startDate,
          changes.deposito.tenorMonths,
          changes.deposito.rollover ? 1 : 0,
          id
        )
        // An older deposito that never recorded where its money came from can be given that now.
        if (changes.deposito.fromWalletId !== undefined) {
          fundDeposito(id, changes.deposito.fromWalletId, changes.deposito.principal, changes.deposito.startDate, new Date())
        }
      }
      return { ...walletResult(id), ...(adjustment ? { adjustment } : {}) }
    })
  }

  /**
   * Sets a balance by hand and remembers the old and new one. This is not income or
   * spending, so no transaction is created and the month's totals don't move.
   */
  function setBalanceByHand(id: string, value: number, kind: BalanceChange["kind"], now: Date): SaveWalletResult | undefined {
    return transact(() => {
      const wallet = findWallet(id)
      if (!wallet) return undefined
      if (wallet.kind === "deposito") {
        throw new ValidationError("A deposito's balance follows its rate and dates. Edit its details instead.")
      }
      if (kind === "value" && wallet.kind !== "investment") {
        throw new ValidationError("Only investment wallets have a market value to update.")
      }
      if (kind === "correction" && wallet.kind === "investment") {
        throw new ValidationError("An investment's balance is its market value. Use Update value for it.")
      }
      const at = isoWithOffset(now)
      db.prepare(
        "INSERT INTO wallet_value_updates (wallet_id, at, old_balance, new_balance, kind) VALUES (?, ?, ?, ?, ?)"
      ).run(id, at, wallet.balance, value, kind)
      db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(value, id)
      return { ...walletResult(id), adjustment: { walletId: id, at, change: value - wallet.balance } }
    })
  }

  /** Sets an investment's balance to its current market value. */
  function updateWalletValue(id: string, body: unknown, now: Date = new Date()): SaveWalletResult | undefined {
    return setBalanceByHand(id, parseWalletValue(body), "value", now)
  }

  /** Sets any other wallet's balance to what the real account shows, when the two have drifted apart. */
  function correctWalletBalance(id: string, body: unknown, now: Date = new Date()): SaveWalletResult | undefined {
    return setBalanceByHand(id, parseWalletValue(body, "The balance"), "correction", now)
  }

  /** Every balance the owner set by hand for this wallet, newest first. Undefined if the wallet doesn't exist. */
  function getWalletHistory(id: string): BalanceChange[] | undefined {
    if (!db.prepare("SELECT 1 FROM wallets WHERE id = ?").get(id)) return undefined
    const rows = db
      .prepare("SELECT id, at, kind, old_balance, new_balance FROM wallet_value_updates WHERE wallet_id = ? ORDER BY id DESC")
      .all(id) as unknown as BalanceChangeRow[]
    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      kind: row.kind,
      oldBalance: row.old_balance,
      newBalance: row.new_balance,
    }))
  }

  /**
   * Moves the money of a deposito that has matured into another wallet, as one transfer for everything it holds (the
   * money put in and the interest earned). The deposito then shows 0 and "settled", and nothing it earned is income.
   * Refused while it is still running (or renews by itself), when it has already been moved, and for a target that is
   * itself a deposito. Undo reverses only this move and reopens the deposito.
   */
  function settleDeposito(id: string, body: unknown, now: Date = new Date()): SettleDepositoResult | undefined {
    const named = parseSettleDeposito(body)
    const saved = transact(() => {
      const wallets = getWallets()
      const wallet = wallets.find((entry) => entry.id === id)
      if (!wallet) return undefined
      const deposito = wallet.deposito
      if (!deposito) throw new ValidationError("That wallet isn't a deposito.")
      if (deposito.status === "settled") throw new ValidationError("This deposito's money has already been moved.")
      if (deposito.status === "running") {
        throw new ValidationError(
          deposito.rollover
            ? "This deposito renews by itself, so there is nothing to move."
            : `This deposito hasn't matured yet. It ends on ${deposito.endDate}.`
        )
      }
      // The money goes back to the wallet it came from. Only an older deposito, or one whose wallet was deleted, needs one chosen.
      const sourceId = deposito.sourceWalletId
      const source = sourceId === undefined ? undefined : wallets.find((entry) => entry.id === sourceId)
      if (source && named !== undefined && named !== source.id) {
        throw new ValidationError(`The money goes back to ${source.name}, the wallet it came from.`)
      }
      const toId = source?.id ?? named
      if (toId === undefined) throw new ValidationError("Choose the wallet the money should go to.")
      const target = wallets.find((entry) => entry.id === toId)
      if (!target) throw new ValidationError("That wallet doesn't exist any more.")
      if (target.id === id) throw new ValidationError("Choose a different wallet from the deposito itself.")
      if (target.kind === "deposito") throw new ValidationError("Choose a wallet that is not a deposito.")
      const amount = wallet.balance
      if (!Number.isSafeInteger(target.balance + amount)) throw new ValidationError("That would make the receiving wallet’s balance too large.")
      const transaction: Transaction = {
        id: `tx-${randomUUID()}`,
        type: "transfer",
        amount,
        date: isoWithOffset(now),
        description: `Deposito ${wallet.name} matured`.slice(0, 100),
        fromWalletId: id,
        toWalletId: toId,
      }
      // Written by hand, not through the ledger, which refuses to touch a deposito: the target gains what the
      // deposito held, and the deposito is emptied and closed.
      insertTransactionRow(transaction)
      db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(amount, toId)
      db.prepare("UPDATE wallets SET balance = 0, deposit_settled_at = ? WHERE id = ?").run(isoWithOffset(now), id)
      const after = getWallets()
      const settled = after.find((entry) => entry.id === id)
      if (!settled) throw new Error(`Wallet ${id} disappeared while settling.`)
      return { wallet: settled, wallets: after, transaction, principal: deposito.principal }
    })
    if (!saved) return undefined
    const { principal, ...result } = saved
    const transaction = result.transaction
    return { ...result, undoId: rememberUndo(() => {
      const current = findWallet(id)
      const target = findWallet(transaction.toWalletId)
      const recorded = findTransaction(transaction.id)
      if (!current?.deposito || current.deposito.settledAt !== result.wallet.deposito?.settledAt ||
          !target || target.kind === "deposito" || !isDeepStrictEqual(recorded, transaction)) {
        throw new ValidationError("The deposito or its transfer has changed since, so that move can't be undone.")
      }
      const next = target.balance - transaction.amount
      if (!Number.isSafeInteger(next)) throw new ValidationError("That would make the receiving wallet's balance too large.")
      db.prepare("DELETE FROM transactions WHERE id = ?").run(transaction.id)
      db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(next, target.id)
      db.prepare("UPDATE wallets SET balance = ?, deposit_settled_at = NULL WHERE id = ?").run(principal, id)
      return { kind: "settlement", wallets: getWallets(), removedTransactionIds: [transaction.id] }
    }) }
  }

  /**
   * Deletes a wallet and every transaction that touches it, including transfers
   * to and from other wallets. Those other wallets keep the balance they have,
   * because their real accounts still hold what they hold. A funded deposito is
   * the exception: its principal goes back to its source, without interest.
   * It refuses to delete the last wallet, or a wallet that a goal is saved in.
   */
  function deleteWallet(id: string, now: Date = new Date()): DeleteWalletResult | undefined {
    const deleted = transact(() => {
      const wallet = findWallet(id)
      if (!wallet) return undefined
      if (getWallets().length === 1) {
        throw new ValidationError("Keep at least one wallet. Add another before deleting this one.")
      }
      const goals = db.prepare("SELECT name FROM goals WHERE wallet_id = ? ORDER BY position").all(id) as { name: string }[]
      if (goals.length > 0) {
        const names = goals.map((goal) => `"${goal.name}"`).join(", ")
        throw new ValidationError(
          `${wallet.name} can't be deleted while ${goals.length === 1 ? "a goal is" : "goals are"} saved in it: ${names}. Move ${goals.length === 1 ? "it" : "them"} to another wallet first.`
        )
      }
      // Everything about it is kept for the undo, so that it can be put back exactly.
      const touching = "wallet_id = ? OR from_wallet_id = ? OR to_wallet_id = ?"
      const touched = db
        .prepare(`SELECT rowid AS place, ${TRANSACTION_COLUMNS} FROM transactions WHERE ${touching} ORDER BY date, rowid`)
        .all(id, id, id) as unknown as (TransactionRow & { place: number })[]
      const saved: DeletedWallet = {
        row: db
          .prepare(`SELECT id, name, kind, balance, description, color, default_color, icon, nickname, ${DEPOSIT_COLUMNS}, position FROM wallets WHERE id = ?`)
          .get(id) as unknown as WalletDbRow,
        transactions: touched.map(toTransaction),
        places: touched.map((row) => row.place),
        updates: db
          .prepare("SELECT id, wallet_id, at, old_balance, new_balance, kind FROM wallet_value_updates WHERE wallet_id = ? ORDER BY id")
          .all(id) as unknown as BalanceUpdateRow[],
        movementIds: (db.prepare("SELECT id FROM goal_movements WHERE wallet_id = ?").all(id) as { id: number }[]).map((row) => row.id),
      }
      if (wallet.deposito && wallet.deposito.status !== "settled") {
        const source = wallet.deposito.sourceWalletId ? findWallet(wallet.deposito.sourceWalletId) : undefined
        if (!source || source.kind === "deposito") {
          throw new ValidationError("This deposito has no source wallet to return its principal to. Move its money into a wallet before deleting it.")
        }
        const amount = wallet.deposito.principal
        const balance = source.balance + amount
        if (!Number.isSafeInteger(balance)) throw new ValidationError("Returning the principal would make that wallet's balance too large.")
        // The deposito's transfers disappear with it, so keep the returned principal in balance history,
        // without creating income or a transaction that points at a wallet about to be deleted.
        const update = db.prepare(
          "INSERT INTO wallet_value_updates (wallet_id, at, old_balance, new_balance, kind) VALUES (?, ?, ?, ?, ?)"
        ).run(source.id, isoWithOffset(now), source.balance, balance, "correction")
        db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(balance, source.id)
        saved.returnedPrincipal = { walletId: source.id, amount, updateId: Number(update.lastInsertRowid) }
      }
      db.prepare(`DELETE FROM transactions WHERE ${touching}`).run(id, id, id)
      db.prepare("DELETE FROM wallet_value_updates WHERE wallet_id = ?").run(id)
      db.prepare("DELETE FROM wallets WHERE id = ?").run(id)
      return { saved, wallets: getWallets(), balanceAdjustments: getBalanceAdjustments() }
    })
    if (!deleted) return undefined
    return {
      wallets: deleted.wallets,
      balanceAdjustments: deleted.balanceAdjustments,
      deletedTransactionIds: deleted.saved.transactions.map((tx) => tx.id),
      undoId: rememberUndo(() => restoreWallet(deleted.saved)),
    }
  }

  /**
   * Undoes deleting a wallet: puts back the wallet with its balance and its place in the list, all its transactions,
   * the balances that were set by hand for it, and the bits of goal history that said money came from it. The other
   * wallets are not touched, except to take back a deposito's returned principal. It is refused if another wallet has its name now,
   * or if a wallet it had transfers with, or a category its transactions used, has been deleted since.
   */
  function restoreWallet(saved: DeletedWallet): UndoResult {
    const { row, transactions, places, updates, movementIds, returnedPrincipal } = saved
    const existing = getWallets()
    if (existing.some((wallet) => wallet.name.toLowerCase() === row.name.toLowerCase())) {
      throw new ValidationError(`You have another wallet called ${row.name} now, so that can't be undone.`)
    }
    const walletIds = new Set(existing.map((wallet) => wallet.id))
    const categoryIds = new Set(getCategories().map((category) => category.id))
    for (const tx of transactions) {
      if (tx.type === "transfer") {
        const other = tx.fromWalletId === row.id ? tx.toWalletId : tx.fromWalletId
        if (!walletIds.has(other)) {
          throw new ValidationError("A wallet it had transfers with has been deleted since, so that can't be undone.")
        }
      } else if (!categoryIds.has(tx.categoryId)) {
        throw new ValidationError("A category its transactions used has been deleted since, so that can't be undone.")
      }
    }

    if (returnedPrincipal) {
      const source = existing.find((wallet) => wallet.id === returnedPrincipal.walletId)
      const update = db.prepare("SELECT 1 FROM wallet_value_updates WHERE id = ? AND wallet_id = ?").get(returnedPrincipal.updateId, returnedPrincipal.walletId)
      if (!source || !update) {
        throw new ValidationError("The wallet its principal returned to is missing, so that can't be undone.")
      }
      // Reverse only the returned amount, preserving any later spending or other balance changes.
      const balance = source.balance - returnedPrincipal.amount
      if (!Number.isSafeInteger(balance)) throw new ValidationError("Taking back the principal would make that wallet's balance too large.")
      db.prepare("UPDATE wallets SET balance = ? WHERE id = ?").run(balance, source.id)
      db.prepare("DELETE FROM wallet_value_updates WHERE id = ?").run(returnedPrincipal.updateId)
    }

    // Its nickname comes back too, unless another wallet has taken that word since: then the wallet is still restored, without it.
    const wanted = row.nickname?.toLowerCase()
    const taken = wanted !== undefined && existing.some((wallet) => wallet.name.toLowerCase() === wanted || wallet.nickname?.toLowerCase() === wanted)
    const nickname = taken ? null : row.nickname
    db.prepare(
      `INSERT INTO wallets (id, name, kind, balance, description, color, default_color, icon, nickname, ${DEPOSIT_COLUMNS}, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.name,
      row.kind,
      row.balance,
      row.description,
      row.color,
      row.default_color,
      row.icon,
      nickname,
      row.deposit_rate_bp,
      row.deposit_start,
      row.deposit_tenor,
      row.deposit_rollover,
      row.deposit_settled_at,
      // Back to the wallet it came from, unless that wallet has been deleted since.
      row.deposit_source_wallet_id !== null && walletIds.has(row.deposit_source_wallet_id) ? row.deposit_source_wallet_id : null,
      row.position
    )
    // Its own balance is already right, and so are the others', so the transactions go back without moving any balance.
    transactions.forEach((tx, index) => insertTransactionRow(tx, places[index]))
    const insertUpdate = db.prepare(
      "INSERT INTO wallet_value_updates (id, wallet_id, at, old_balance, new_balance, kind) VALUES (?, ?, ?, ?, ?, ?)"
    )
    for (const update of updates) {
      insertUpdate.run(update.id, update.wallet_id, update.at, update.old_balance, update.new_balance, update.kind)
    }
    const remember = db.prepare("UPDATE goal_movements SET wallet_id = ? WHERE id = ? AND wallet_id IS NULL")
    for (const movementId of movementIds) remember.run(row.id, movementId)

    const wallets = getWallets()
    const wallet = wallets.find((entry) => entry.id === row.id)
    if (!wallet) throw new Error(`Wallet ${row.id} disappeared while restoring.`)
    return {
      kind: "wallet",
      wallet,
      wallets,
      transactions,
      balanceAdjustments: getBalanceAdjustments(),
    }
  }

  /** Puts the wallets in the order given: every wallet that exists, once each. */
  function reorderWallets(body: unknown): ReorderWalletsResult {
    return transact(() => {
      const ids = parseWalletOrder(body, getWallets())
      const update = db.prepare("UPDATE wallets SET position = ? WHERE id = ?")
      ids.forEach((id, position) => update.run(position, id))
      return { wallets: getWallets() }
    })
  }

  // ---- writing categories -------------------------------------------------------------

  function categoryResult(id: string): SaveCategoryResult {
    const categories = getCategories()
    const category = categories.find((entry) => entry.id === id)
    if (!category) throw new Error(`Category ${id} disappeared while saving.`)
    return { category, categories }
  }

  function createCategory(body: unknown): SaveCategoryResult {
    return transact(() => {
      const input = parseNewCategory(body, getCategories())
      const id = `cat-${randomUUID()}`
      const position = (db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM categories").get() as { next: number }).next
      db.prepare("INSERT INTO categories (id, name, type, icon, color, position, preset) VALUES (?, ?, ?, ?, ?, ?, 0)").run(
        id,
        input.name,
        input.type,
        input.icon,
        input.color,
        position
      )
      return categoryResult(id)
    })
  }

  /** Changes a category the owner made: its name, icon and colour. Its type stays, and presets can't be changed. */
  function updateCategory(id: string, body: unknown): SaveCategoryResult | undefined {
    return transact(() => {
      const categories = getCategories()
      const category = categories.find((entry) => entry.id === id)
      if (!category) return undefined
      if (category.preset) throw new ValidationError(`${category.name} is a preset, so it can't be changed.`)
      const changes = parseCategoryChanges(body, categories, category)
      db.prepare("UPDATE categories SET name = ?, icon = ?, color = ? WHERE id = ?").run(
        changes.name,
        changes.icon,
        changes.color,
        id
      )
      return categoryResult(id)
    })
  }

  /**
   * Deletes a category the owner made. Its transactions move to "Other" (for the same kind
   * of money), so none are lost and no wallet balance changes. Presets can't be deleted.
   */
  function deleteCategory(id: string): DeleteCategoryResult | undefined {
    return transact(() => {
      const category = getCategories().find((entry) => entry.id === id)
      if (!category) return undefined
      if (category.preset) throw new ValidationError(`${category.name} is a preset, so it can't be deleted.`)
      const movedToId = OTHER_CATEGORY_ID[category.type]
      if (!db.prepare("SELECT 1 FROM categories WHERE id = ?").get(movedToId)) {
        throw new Error(`The "Other" category ${movedToId} is missing, so ${category.name} can't be deleted safely.`)
      }
      const moved = db.prepare("SELECT id FROM transactions WHERE category_id = ?").all(id) as { id: string }[]
      const { position } = db.prepare("SELECT position FROM categories WHERE id = ?").get(id) as { position: number }
      db.prepare("UPDATE transactions SET category_id = ? WHERE category_id = ?").run(movedToId, id)
      db.prepare("DELETE FROM categories WHERE id = ?").run(id)
      return { categories: getCategories(), movedToId, movedTransactionIds: moved.map((row) => row.id), position }
    })
  }

  /**
   * Undoes deleting a category: puts it back, with its id, its budget and its place in the list, and moves
   * the transactions that were taken to "Other" back into it. All or nothing, and only if those transactions
   * are still in "Other": if any has been changed since, nothing is touched and the owner is told.
   */
  function restoreCategory(body: unknown): RestoreCategoryResult {
    return transact(() => {
      const input = parseRestoreCategory(body, getCategories())
      const { category } = input
      const otherId = OTHER_CATEGORY_ID[category.type]
      const where = db.prepare("SELECT category_id FROM transactions WHERE id = ?")
      for (const id of input.transactionIds) {
        const row = where.get(id) as { category_id: string | null } | undefined
        if (!row || row.category_id !== otherId) {
          throw new ValidationError("Some of its transactions have changed since it was deleted, so that can't be undone.")
        }
      }

      // It takes the place it had. Categories are listed by that number, and one that ties with another goes after it.
      db.prepare("INSERT INTO categories (id, name, type, icon, color, position, preset, budget) VALUES (?, ?, ?, ?, ?, ?, 0, ?)").run(
        category.id,
        category.name,
        category.type,
        category.icon,
        category.color,
        input.position,
        category.budget ?? null
      )

      const move = db.prepare("UPDATE transactions SET category_id = ? WHERE id = ?")
      for (const id of input.transactionIds) move.run(category.id, id)

      const categories = getCategories()
      const restored = categories.find((entry) => entry.id === category.id)
      if (!restored) throw new Error(`Category ${category.id} disappeared while restoring.`)
      return { category: restored, categories, restoredTransactionIds: input.transactionIds }
    })
  }

  /** Puts the categories in the order given: every category that exists, once each. Spending and income share one list, and only the order within each kind is ever seen. */
  function reorderCategories(body: unknown): ReorderCategoriesResult {
    return transact(() => {
      const ids = parseCategoryOrder(body, getCategories())
      const update = db.prepare("UPDATE categories SET position = ? WHERE id = ?")
      ids.forEach((id, position) => update.run(position, id))
      return { categories: getCategories() }
    })
  }

  /**
   * Sets a spending category's monthly budget, or takes it away (`{ "budget": null }`). Presets can have
   * one too: a budget isn't part of what makes a preset a preset. Income has none.
   */
  function setCategoryBudget(id: string, body: unknown): SaveCategoryResult | undefined {
    const budget = parseBudget(body)
    return transact(() => {
      const category = getCategories().find((entry) => entry.id === id)
      if (!category) return undefined
      if (category.type !== "expense") throw new ValidationError("Budgets are for spending categories.")
      db.prepare("UPDATE categories SET budget = ? WHERE id = ?").run(budget, id)
      return categoryResult(id)
    })
  }

  // ---- writing goals ------------------------------------------------------------------

  function findGoalRow(id: string): GoalRow | undefined {
    return db.prepare(`SELECT ${GOAL_COLUMNS} FROM goals WHERE id = ?`).get(id) as GoalRow | undefined
  }

  function goalResult(id: string): SaveGoalResult {
    const goals = getGoals()
    const goal = goals.find((entry) => entry.id === id)
    if (!goal) throw new Error(`Goal ${id} disappeared while saving.`)
    return { goal, goals }
  }

  /** Adds a line to a goal's history. */
  function recordMovement(
    goalId: string,
    now: Date,
    kind: GoalMovementKind,
    oldSaved: number,
    newSaved: number,
    fromWalletId: string | null = null,
    transactionId: string | null = null
  ) {
    db.prepare(
      "INSERT INTO goal_movements (goal_id, at, kind, old_saved, new_saved, wallet_id, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(goalId, isoWithOffset(now), kind, oldSaved, newSaved, fromWalletId, transactionId)
  }

  /**
   * The date a goal was reached on, once what is saved (or the target) has changed. A goal
   * that has only just reached its target gets `now`, one that stays reached keeps the date
   * it had, and one that is no longer reached has none.
   */
  function reachedAtAfter(before: GoalRow | undefined, saved: number, target: number, now: Date): string | null {
    if (saved < target) return null
    if (before && before.saved_amount >= before.target_amount) return before.reached_at
    return isoWithOffset(now)
  }

  function createGoal(body: unknown, now: Date = new Date()): SaveGoalResult {
    const input = parseGoal(body, references())
    return transact(() => {
      const id = `goal-${randomUUID()}`
      const position = (db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS next FROM goals").get() as { next: number }).next
      db.prepare(
        `INSERT INTO goals (id, name, target_amount, saved_amount, target_date, wallet_id, icon, position, pace_from, pace_amount, reached_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        input.name,
        input.targetAmount,
        input.savedAmount,
        input.targetDate,
        input.walletId,
        input.icon,
        position,
        calendarDate(now),
        input.savedAmount,
        reachedAtAfter(undefined, input.savedAmount, input.targetAmount, now)
      )
      if (input.savedAmount > 0) recordMovement(id, now, "start", 0, input.savedAmount)
      return goalResult(id)
    })
  }

  /** Replaces everything about a goal the owner can edit, including which wallet it is saved in. */
  function updateGoal(id: string, body: unknown, now: Date = new Date()): SaveGoalResult | undefined {
    const input = parseGoal(body, references())
    return transact(() => {
      const before = findGoalRow(id)
      if (!before) return undefined
      // Lowering what is saved starts the pace note afresh from today; raising it leaves the note alone.
      const lowered = input.savedAmount < before.saved_amount
      db.prepare(
        `UPDATE goals SET name = ?, target_amount = ?, saved_amount = ?, target_date = ?, wallet_id = ?, icon = ?,
                reached_at = ?, pace_from = ?, pace_amount = ? WHERE id = ?`
      ).run(
        input.name,
        input.targetAmount,
        input.savedAmount,
        input.targetDate,
        input.walletId,
        input.icon,
        reachedAtAfter(before, input.savedAmount, input.targetAmount, now),
        lowered ? calendarDate(now) : before.pace_from,
        lowered ? input.savedAmount : before.pace_amount,
        id
      )
      if (input.savedAmount !== before.saved_amount) {
        recordMovement(id, now, "correction", before.saved_amount, input.savedAmount)
      }
      return goalResult(id)
    })
  }

  /**
   * Adds to what has been saved for a goal. When the money is coming from another
   * wallet it really moves: a transfer from that wallet into the goal's wallet is
   * recorded in the same step, so wallet balances stay true. Otherwise the money is
   * already in the goal's wallet, only the goal changes, and no transaction is made.
   */
  function addToGoal(id: string, body: unknown, now: Date = new Date()): AddToGoalResult | undefined {
    const { amount, fromWalletId } = parseGoalAddition(body)
    return transact(() => {
      const before = findGoalRow(id)
      if (!before) return undefined
      if (before.saved_amount + amount > MAX_AMOUNT) throw new ValidationError("That would make the amount saved too large.")

      let transaction: Transaction | undefined
      if (fromWalletId !== undefined) {
        if (fromWalletId === before.wallet_id) {
          throw new ValidationError("The goal is already saved in that wallet. Say the money is already there, or choose another wallet.")
        }
        if (!db.prepare("SELECT 1 FROM wallets WHERE id = ?").get(fromWalletId)) {
          throw new ValidationError("The wallet the money comes from isn't a wallet that exists.")
        }
        transaction = {
          id: `tx-${randomUUID()}`,
          type: "transfer",
          amount,
          date: isoWithOffset(now),
          description: `Saved for ${before.name}`,
          fromWalletId,
          toWalletId: before.wallet_id,
        }
        insertTransaction(transaction)
      }

      const saved = before.saved_amount + amount
      db.prepare("UPDATE goals SET saved_amount = ?, reached_at = ? WHERE id = ?").run(
        saved,
        reachedAtAfter(before, saved, before.target_amount, now),
        id
      )
      recordMovement(id, now, "add", before.saved_amount, saved, fromWalletId ?? null, transaction?.id ?? null)
      return { ...goalResult(id), wallets: getWallets(), ...(transaction ? { transaction } : {}) }
    })
  }

  /**
   * Takes money back out of a goal, for when it has been spent or is needed
   * elsewhere. Only the goal changes: no money moves and no transaction is made.
   * The pace note starts afresh from today.
   */
  function takeFromGoal(id: string, body: unknown, now: Date = new Date()): SaveGoalResult | undefined {
    const amount = parseGoalAmount(body)
    return transact(() => {
      const before = findGoalRow(id)
      if (!before) return undefined
      if (amount > before.saved_amount) {
        throw new ValidationError(
          `Only ${rupiah(before.saved_amount)} is saved for this goal, so ${rupiah(amount)} can't be taken out.`
        )
      }
      const saved = before.saved_amount - amount
      db.prepare("UPDATE goals SET saved_amount = ?, reached_at = ?, pace_from = ?, pace_amount = ? WHERE id = ?").run(
        saved,
        reachedAtAfter(before, saved, before.target_amount, now),
        calendarDate(now),
        saved,
        id
      )
      recordMovement(id, now, "take-out", before.saved_amount, saved)
      return goalResult(id)
    })
  }

  /** Every change to what is saved for a goal, newest first. Undefined if the goal doesn't exist. */
  function getGoalHistory(id: string): GoalMovement[] | undefined {
    if (!db.prepare("SELECT 1 FROM goals WHERE id = ?").get(id)) return undefined
    const rows = db
      .prepare(
        "SELECT id, at, kind, old_saved, new_saved, wallet_id, transaction_id FROM goal_movements WHERE goal_id = ? ORDER BY id DESC"
      )
      .all(id) as unknown as GoalMovementRow[]
    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      kind: row.kind,
      oldSaved: row.old_saved,
      newSaved: row.new_saved,
      ...(row.wallet_id !== null ? { fromWalletId: row.wallet_id } : {}),
      transferred: row.transaction_id !== null,
    }))
  }

  /** Puts the goals in the order given: every goal that exists, once each. */
  function reorderGoals(body: unknown): ReorderGoalsResult {
    return transact(() => {
      const ids = parseGoalOrder(body, getGoals())
      const update = db.prepare("UPDATE goals SET position = ? WHERE id = ?")
      ids.forEach((id, position) => update.run(position, id))
      return { goals: getGoals() }
    })
  }

  /** Deletes a goal and its history. The money it was saved from stays in its wallet, and so do any transfers made for it. */
  function deleteGoal(id: string): DeleteGoalResult | undefined {
    const deleted = transact(() => {
      const row = db.prepare(`SELECT ${GOAL_COLUMNS}, position FROM goals WHERE id = ?`).get(id) as unknown as GoalDbRow | undefined
      if (!row) return undefined
      const movements = db
        .prepare("SELECT id, goal_id, at, kind, old_saved, new_saved, wallet_id, transaction_id FROM goal_movements WHERE goal_id = ? ORDER BY id")
        .all(id) as unknown as GoalMovementDbRow[]
      db.prepare("DELETE FROM goal_movements WHERE goal_id = ?").run(id)
      db.prepare("DELETE FROM goals WHERE id = ?").run(id)
      return { row, movements, goals: getGoals() }
    })
    if (!deleted) return undefined
    return { goals: deleted.goals, undoId: rememberUndo(() => restoreGoal(deleted.row, deleted.movements)) }
  }

  /**
   * Undoes deleting a goal: puts back the goal as it was (its place in the list, its pace and the date it was reached
   * included) and every line of its history. It is refused if the wallet it was saved in has been deleted since. Money
   * that came from a wallet that has been deleted since forgets where it came from, as deleting that wallet always does.
   */
  function restoreGoal(row: GoalDbRow, movements: GoalMovementDbRow[]): UndoResult {
    if (!rowExists("wallets", row.wallet_id)) {
      throw new ValidationError("The wallet it was saved in has been deleted since, so that can't be undone.")
    }
    db.prepare(
      `INSERT INTO goals (id, name, target_amount, saved_amount, target_date, wallet_id, icon, position, pace_from, pace_amount, reached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      row.id,
      row.name,
      row.target_amount,
      row.saved_amount,
      row.target_date,
      row.wallet_id,
      row.icon,
      row.position,
      row.pace_from,
      row.pace_amount,
      row.reached_at
    )
    const insert = db.prepare(
      "INSERT INTO goal_movements (id, goal_id, at, kind, old_saved, new_saved, wallet_id, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    for (const movement of movements) {
      const from = movement.wallet_id !== null && rowExists("wallets", movement.wallet_id) ? movement.wallet_id : null
      insert.run(movement.id, movement.goal_id, movement.at, movement.kind, movement.old_saved, movement.new_saved, from, movement.transaction_id)
    }
    const goals = getGoals()
    const goal = goals.find((entry) => entry.id === row.id)
    if (!goal) throw new Error(`Goal ${row.id} disappeared while restoring.`)
    return { kind: "goal", goal, goals }
  }

  function seedSample() {
    db.prepare("INSERT INTO app_user (id, name) VALUES (1, ?)").run(sampleUser.name)

    const insertWallet = db.prepare(
      "INSERT INTO wallets (id, name, kind, balance, description, color, default_color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    sampleWallets.forEach((w, position) =>
      insertWallet.run(w.id, w.name, w.kind, w.balance, w.description, w.color, w.color, position)
    )

    const insertCategory = db.prepare(
      "INSERT INTO categories (id, name, type, icon, color, position, preset) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    sampleCategories.forEach((c, position) =>
      insertCategory.run(c.id, c.name, c.type, c.icon, c.color, position, c.preset ? 1 : 0)
    )

    const insertGoal = db.prepare(
      "INSERT INTO goals (id, name, target_amount, saved_amount, target_date, wallet_id, icon, position, pace_from, pace_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    sampleGoals.forEach((g, position) =>
      insertGoal.run(g.id, g.name, g.targetAmount, g.savedAmount, g.targetDate, g.walletId, g.icon, position, g.paceFrom, g.paceAmount)
    )

    const insertMovement = db.prepare(
      "INSERT INTO goal_movements (goal_id, at, kind, old_saved, new_saved, wallet_id, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    for (const m of sampleGoalMovements) {
      insertMovement.run(m.goalId, m.at, m.kind, m.oldSaved, m.newSaved, m.fromWalletId ?? null, m.transactionId ?? null)
    }

    const insertTransaction = db.prepare(
      `INSERT INTO transactions (${TRANSACTION_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const tx of sampleTransactions) {
      const c = columnsFor(tx)
      insertTransaction.run(tx.id, tx.type, tx.amount, tx.date, tx.description, c.walletId, c.categoryId, c.fromWalletId, c.toWalletId)
    }
  }

  /** Erases everything and puts the sample data back. */
  function reset() {
    undoable.clear()
    transact(() => {
      for (const table of ["assistant_batch_requests", "assistant_templates", "assistant_subscriptions", "assistant_category_rules", "transactions", "goal_movements", "goals", "wallet_value_updates", "categories", "wallets", "app_user"]) {
        db.exec(`DELETE FROM ${table}`)
      }
      seedSample()
      db.exec("PRAGMA user_version = 1")
    })
  }

  // A brand-new database (version 0) is filled with the sample data exactly once.
  // After that it is yours: restarting never brings the sample data back.
  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version
  if (version === 0) {
    transact(() => {
      seedSample()
      db.exec("PRAGMA user_version = 1")
    })
  }

  const assistant = createAssistantStore(db, { transact, getData, references, insertTransaction, getWallets })

  return {
    assistant,
    auth,
    getData,
    updateUser,
    setMonthlyBudget,
    createTransaction,
    importTransactions,
    updateTransaction,
    deleteTransaction,
    createWallet,
    updateWallet,
    updateWalletValue,
    correctWalletBalance,
    getWalletHistory,
    settleDeposito,
    deleteWallet,
    reorderWallets,
    createCategory,
    reorderCategories,
    setCategoryBudget,
    updateCategory,
    deleteCategory,
    restoreCategory,
    createGoal,
    updateGoal,
    addToGoal,
    takeFromGoal,
    getGoalHistory,
    reorderGoals,
    deleteGoal,
    undo,
    backUp,
    reset,
  }
}

export type Store = ReturnType<typeof createStore>

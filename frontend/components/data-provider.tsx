"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

import { createRefreshGuard } from "@/lib/live-refresh"

import * as api from "@/lib/api"
import type {
  AddToGoalResult,
  AppData,
  BackupResult,
  Category,
  CategoryChanges,
  DeleteCategoryResult,
  DeleteTransactionResult,
  Goal,
  GoalInput,
  ImportTransactionsResult,
  NewCategory,
  NewTransaction,
  NewWallet,
  RestoreCategory,
  SaveTransactionResult,
  SettleDepositoResult,
  UndoResult,
  User,
  Wallet,
  WalletChanges,
} from "@/lib/types"

/**
 * The app's data, shared by every page. It starts from what the server loaded
 * from the database, and every change goes to the backend first: the screen
 * only updates once the backend has saved it. The backend also works out the
 * new wallet balances and sends them back, so the two never disagree.
 */
interface DataStore extends AppData {
  /** Re-read after an assistant batch without overwriting a newer local action. */
  refreshData: () => Promise<void>
  /** Changes the name the greeting on Home uses. */
  updateUserName: (name: string) => Promise<User>
  /** Sets the budget for all spending together in a month, or takes it away with null. */
  setMonthlyBudget: (budget: number | null) => Promise<void>
  /** Puts back a transaction, wallet or goal that was just deleted, using the undo id its delete returned. */
  undoDelete: (undoId: string) => Promise<UndoResult>
  /** Copies the data file into the backups folder. Changes nothing in the data. */
  backUp: () => Promise<BackupResult>
  /** Turns the PIN on, or (with the current one) changes it. This device stays unlocked; every other one has to type it. */
  setPin: (pin: string, currentPin?: string) => Promise<void>
  /** Turns the PIN off. Needs the current one. */
  removePin: (currentPin: string) => Promise<void>
  /** Forgets this device, so the PIN is asked for again. The page opens again, on the lock screen. */
  lockNow: () => Promise<void>
  /** Saves reviewed transactions read from a bank's file, all or nothing. Returns them, and the id that undoes it. */
  importTransactions: (transactions: NewTransaction[]) => Promise<ImportTransactionsResult>
  /** Adds a transaction. Returns it, with every wallet as it is now. */
  addTransaction: (input: NewTransaction) => Promise<SaveTransactionResult>
  updateTransaction: (id: string, input: NewTransaction) => Promise<SaveTransactionResult>
  /** Deletes a transaction. Returns every wallet as it is now, and the id that undoes it. */
  deleteTransaction: (id: string) => Promise<DeleteTransactionResult>
  addWallet: (input: NewWallet) => Promise<Wallet>
  updateWallet: (id: string, input: WalletChanges) => Promise<Wallet>
  /** Sets an investment wallet to its current market value. Not income or spending: no transaction is made. */
  updateWalletValue: (id: string, value: number) => Promise<Wallet>
  /** Sets a wallet that isn't an investment to what its real account shows. Not income or spending. */
  correctWalletBalance: (id: string, value: number) => Promise<Wallet>
  /**
   * Moves a matured deposito's money back to the wallet it came from, as one transfer (name a wallet only for a deposito that
   * doesn't know where its money came from). Returns the deposito and the transfer.
   */
  settleDeposito: (id: string, toWalletId?: string) => Promise<SettleDepositoResult>
  /** Deletes a wallet and its transactions. Returns the id that undoes it. */
  deleteWallet: (id: string) => Promise<string>
  /** Saves the wallets in a new order. */
  reorderWallets: (ids: string[]) => Promise<void>
  addCategory: (input: NewCategory) => Promise<Category>
  /** Changes a category the owner made: its name, icon and colour. */
  updateCategory: (id: string, input: CategoryChanges) => Promise<Category>
  /** Deletes a category the owner made. Its transactions move to "Other", so none are lost. */
  deleteCategory: (id: string) => Promise<DeleteCategoryResult>
  /** Undoes a delete: puts the category back where it was, with its budget, and moves its transactions back into it. */
  restoreCategory: (input: RestoreCategory) => Promise<Category>
  /** Saves the categories in a new order (every category id, once each). */
  reorderCategories: (ids: string[]) => Promise<void>
  /** Sets a spending category's monthly budget, or takes it away with null. Presets can have one too. */
  setCategoryBudget: (id: string, budget: number | null) => Promise<Category>
  addGoal: (input: GoalInput) => Promise<Goal>
  /** Replaces everything the owner can edit about a goal, including the wallet it is saved in. */
  updateGoal: (id: string, input: GoalInput) => Promise<Goal>
  /**
   * Adds to what has been saved for a goal. Naming a wallet moves the money from it
   * for real and records a transfer; leaving it out means the money is already in the
   * goal's wallet, so only the goal changes.
   */
  addToGoal: (id: string, amount: number, fromWalletId?: string) => Promise<AddToGoalResult>
  /** Takes money back out of a goal. Only the goal changes. */
  takeFromGoal: (id: string, amount: number) => Promise<Goal>
  /** Saves the goals in a new order. */
  reorderGoals: (ids: string[]) => Promise<void>
  /** Deletes a goal. Returns the id that undoes it. */
  deleteGoal: (id: string) => Promise<string>
}

const DataContext = createContext<DataStore | null>(null)

export function useData(): DataStore {
  const context = useContext(DataContext)
  if (!context) throw new Error("useData must be used within a DataProvider.")
  return context
}

/** Never re-check more often than this when the owner switches back to the tab. */
const REFRESH_EVERY_MS = 5000

export function DataProvider({ initial, children }: { initial: AppData; children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initial)

  const guard = useRef(createRefreshGuard())

  // Poll only the visible app. One read at a time, with a deadline, and no stale read may overwrite a local save.
  useEffect(() => {
    let stopped = false
    let inFlight = false
    let controller: AbortController | undefined
    async function refresh() {
      if (stopped || inFlight || document.visibilityState !== "visible" || !navigator.onLine) return
      const ticket = guard.current.ticket()
      if (ticket === undefined) return
      inFlight = true
      controller = new AbortController()
      const timeout = window.setTimeout(() => controller?.abort(), 10_000)
      try {
        const incoming = await api.loadData(undefined, controller.signal)
        if (!stopped && guard.current.accepts(ticket)) {
          setData((current) => guard.current.accepts(ticket) && JSON.stringify(current) !== JSON.stringify(incoming) ? incoming : current)
        }
      } catch {
        // A temporary network failure keeps the last saved data. The next foreground check retries.
      } finally {
        clearTimeout(timeout)
        inFlight = false
      }
    }
    const first = window.setTimeout(refresh, 0)
    const timer = window.setInterval(refresh, REFRESH_EVERY_MS)
    document.addEventListener("visibilitychange", refresh)
    window.addEventListener("focus", refresh)
    window.addEventListener("online", refresh)
    return () => {
      stopped = true
      controller?.abort()
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener("visibilitychange", refresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("online", refresh)
    }
  }, [])

  async function refreshData() {
    // An assistant write happened outside this provider: retire earlier polling reads.
    guard.current.begin()
    guard.current.end()
    const ticket = guard.current.ticket()
    if (ticket === undefined) return
    const incoming = await api.loadData()
    if (guard.current.accepts(ticket)) setData(incoming)
  }

  const value: Omit<DataStore, "refreshData"> = {
    ...data,
    updateUserName: async (name) => {
      const { user } = await api.updateUser(name)
      setData((current) => ({ ...current, user }))
      return user
    },
    setMonthlyBudget: async (budget) => {
      const { monthlyBudget } = await api.setMonthlyBudget(budget)
      // Taking it away leaves it undefined, which is how a missing budget reads everywhere.
      setData((current) => ({ ...current, monthlyBudget }))
    },
    undoDelete: async (undoId) => {
      const result = await api.undoDelete(undoId)
      setData((current) => {
        if (result.kind === "goal") return { ...current, goals: result.goals }
        if (result.kind === "import" || result.kind === "settlement") {
          // An import that is undone takes its transactions out again.
          const gone = new Set(result.removedTransactionIds)
          return { ...current, wallets: result.wallets, transactions: [...current.transactions.filter((tx) => !gone.has(tx.id)), ...(result.kind === "import" ? result.restoredTransactions : [])] }
        }
        if (result.kind === "transaction") {
          const others = current.transactions.filter((tx) => tx.id !== result.transaction.id)
          return { ...current, wallets: result.wallets, transactions: [...others, result.transaction] }
        }
        // A wallet comes back with its transactions and the balances that were set by hand for it.
        const back = new Set(result.transactions.map((tx) => tx.id))
        return {
          ...current,
          wallets: result.wallets,
          transactions: [...current.transactions.filter((tx) => !back.has(tx.id)), ...result.transactions],
          balanceAdjustments: result.balanceAdjustments,
        }
      })
      return result
    },
    setPin: async (pin, currentPin) => {
      await api.setPin(pin, currentPin)
      setData((current) => ({ ...current, pinSet: true }))
    },
    removePin: async (currentPin) => {
      await api.removePin(currentPin)
      setData((current) => ({ ...current, pinSet: false }))
    },
    lockNow: async () => {
      await api.lockNow()
      // The page opens again, and with no cookie it opens on the lock screen.
      window.location.reload()
    },
    importTransactions: async (transactions) => {
      const result = await api.importTransactions(transactions)
      setData((current) => ({ ...current, wallets: result.wallets, transactions: [...current.transactions.filter((tx) => !result.replacedTransactionIds.includes(tx.id)), ...result.transactions] }))
      return result
    },
    backUp: async () => {
      const result = await api.backUp()
      setData((current) => ({ ...current, lastBackup: result.backup }))
      return result
    },
    addTransaction: async (input) => {
      const result = await api.createTransaction(input)
      setData((current) => ({ ...current, wallets: result.wallets, transactions: [...current.transactions, result.transaction] }))
      return result
    },
    updateTransaction: async (id, input) => {
      const result = await api.updateTransaction(id, input)
      setData((current) => ({
        ...current,
        wallets: result.wallets,
        transactions: current.transactions.map((tx) => (tx.id === id ? result.transaction : tx)),
      }))
      return result
    },
    deleteTransaction: async (id) => {
      const result = await api.deleteTransaction(id)
      setData((current) => ({
        ...current,
        wallets: result.wallets,
        transactions: current.transactions.filter((tx) => tx.id !== id),
      }))
      return result
    },
    addWallet: async (input) => {
      const { wallet, wallets } = await api.createWallet(input)
      setData((current) => ({ ...current, wallets }))
      return wallet
    },
    updateWallet: async (id, input) => {
      const { wallet, wallets, adjustment } = await api.updateWallet(id, input)
      setData((current) => ({ ...current, wallets, balanceAdjustments: adjustment ? [...current.balanceAdjustments, adjustment] : current.balanceAdjustments }))
      return wallet
    },
    updateWalletValue: async (id, value) => {
      const { wallet, wallets, adjustment } = await api.updateWalletValue(id, value)
      // Setting a balance by hand is remembered, because the balance line needs it to work out earlier days.
      setData((current) => ({
        ...current,
        wallets,
        balanceAdjustments: adjustment ? [...current.balanceAdjustments, adjustment] : current.balanceAdjustments,
      }))
      return wallet
    },
    correctWalletBalance: async (id, value) => {
      const { wallet, wallets, adjustment } = await api.correctWalletBalance(id, value)
      setData((current) => ({
        ...current,
        wallets,
        balanceAdjustments: adjustment ? [...current.balanceAdjustments, adjustment] : current.balanceAdjustments,
      }))
      return wallet
    },
    settleDeposito: async (id, toWalletId) => {
      const result = await api.settleDeposito(id, toWalletId)
      // The transfer it made is a real transaction, so it shows in Transactions at once.
      setData((current) => ({
        ...current,
        wallets: result.wallets,
        transactions: [...current.transactions, result.transaction],
      }))
      return result
    },
    deleteWallet: async (id) => {
      const { wallets, deletedTransactionIds, undoId, balanceAdjustments } = await api.deleteWallet(id)
      const gone = new Set(deletedTransactionIds)
      setData((current) => ({
        ...current,
        wallets,
        transactions: current.transactions.filter((tx) => !gone.has(tx.id)),
        // Includes the principal returned to a deposito's source, and removes the deleted wallet's history.
        balanceAdjustments,
      }))
      return undoId
    },
    reorderWallets: async (ids) => {
      const { wallets } = await api.reorderWallets(ids)
      setData((current) => ({ ...current, wallets }))
    },
    addCategory: async (input) => {
      const { category, categories } = await api.createCategory(input)
      setData((current) => ({ ...current, categories }))
      return category
    },
    updateCategory: async (id, input) => {
      const { category, categories } = await api.updateCategory(id, input)
      setData((current) => ({ ...current, categories }))
      return category
    },
    deleteCategory: async (id) => {
      const result = await api.deleteCategory(id)
      const moved = new Set(result.movedTransactionIds)
      setData((current) => ({
        ...current,
        categories: result.categories,
        // The transactions that were in it now belong to "Other".
        transactions: current.transactions.map((tx) =>
          moved.has(tx.id) && tx.type !== "transfer" ? { ...tx, categoryId: result.movedToId } : tx
        ),
      }))
      return result
    },
    restoreCategory: async (input) => {
      const { category, categories, restoredTransactionIds } = await api.restoreCategory(input)
      const back = new Set(restoredTransactionIds)
      setData((current) => ({
        ...current,
        categories,
        // The transactions that went to "Other" are in the category again.
        transactions: current.transactions.map((tx) => (back.has(tx.id) && tx.type !== "transfer" ? { ...tx, categoryId: category.id } : tx)),
      }))
      return category
    },
    reorderCategories: async (ids) => {
      const { categories } = await api.reorderCategories(ids)
      setData((current) => ({ ...current, categories }))
    },
    setCategoryBudget: async (id, budget) => {
      const { category, categories } = await api.setCategoryBudget(id, budget)
      setData((current) => ({ ...current, categories }))
      return category
    },
    addGoal: async (input) => {
      const { goal, goals } = await api.createGoal(input)
      setData((current) => ({ ...current, goals }))
      return goal
    },
    updateGoal: async (id, input) => {
      const { goal, goals } = await api.updateGoal(id, input)
      setData((current) => ({ ...current, goals }))
      return goal
    },
    addToGoal: async (id, amount, fromWalletId) => {
      const result = await api.addToGoal(id, amount, fromWalletId)
      setData((current) => ({
        ...current,
        goals: result.goals,
        wallets: result.wallets,
        // Money moved from another wallet is recorded as a transfer, which belongs in the list too.
        transactions: result.transaction ? [...current.transactions, result.transaction] : current.transactions,
      }))
      return result
    },
    takeFromGoal: async (id, amount) => {
      const { goal, goals } = await api.takeFromGoal(id, amount)
      setData((current) => ({ ...current, goals }))
      return goal
    },
    reorderGoals: async (ids) => {
      const { goals } = await api.reorderGoals(ids)
      setData((current) => ({ ...current, goals }))
    },
    deleteGoal: async (id) => {
      const { goals, undoId } = await api.deleteGoal(id)
      setData((current) => ({ ...current, goals }))
      return undoId
    },
  }

  // Every local action marks a read boundary, including failed saves and Undo.
  const guarded = Object.fromEntries(Object.entries(value).map(([key, action]) => [key,
    typeof action !== "function" ? action : async (...args: unknown[]) => {
      guard.current.begin()
      try { return await (action as (...input: unknown[]) => unknown)(...args) }
      finally { guard.current.end() }
    },
  ])) as Omit<DataStore, "refreshData">

  return <DataContext value={{ ...guarded, refreshData }}>{children}</DataContext>
}

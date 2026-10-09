/**
 * The frontend's way of talking to the backend. Used in two places:
 *  - on the server, to load everything when a page is first opened, and
 *  - in the browser, to save changes as the owner makes them.
 *
 * The browser never calls the backend directly. It calls /api/... on the same
 * address as the page, and Next passes those calls on (see next.config.ts).
 * That is what lets a phone on the same Wi-Fi use the app.
 */
import type {
  AddToGoalResult,
  AppData,
  AuthResult,
  BackupResult,
  BalanceChange,
  CategoryChanges,
  DeleteCategoryResult,
  DeleteGoalResult,
  DeleteTransactionResult,
  DeleteWalletResult,
  GoalInput,
  GoalMovement,
  ImportTransactionsResult,
  NewCategory,
  NewTransaction,
  NewWallet,
  ReorderCategoriesResult,
  ReorderGoalsResult,
  ReorderWalletsResult,
  RestoreCategory,
  RestoreCategoryResult,
  SaveCategoryResult,
  SaveGoalResult,
  SaveMonthlyBudgetResult,
  SaveTransactionResult,
  SaveUserResult,
  SaveWalletResult,
  SettleDepositoResult,
  UndoResult,
  WalletChanges,
} from "@/lib/types"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4000"

/**
 * Something went wrong talking to the backend. The message is written for the owner to read. When the backend said to
 * wait (too many wrong PINs), `retryAfterSeconds` says how long.
 */
export class ApiError extends Error {
  retryAfterSeconds?: number
}

/** Kaya has a PIN and this device hasn't typed it (or its session has run out). */
export class LockedError extends ApiError {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // On the server we need the backend's full address; in the browser a relative path is enough.
  const base = typeof window === "undefined" ? BACKEND_URL : ""

  let response: Response
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json", ...init?.headers },
    })
  } catch {
    throw new ApiError("Couldn't reach the backend. Is Kaya running?")
  }

  const payload: unknown = await response.json().catch(() => undefined)
  if (!response.ok) {
    const fields = typeof payload === "object" && payload !== null ? (payload as { error?: unknown; locked?: unknown; retryAfterSeconds?: unknown }) : {}
    const message = typeof fields.error === "string" ? fields.error : `The backend answered with an error (${response.status}).`

    if (response.status === 401 && fields.locked === true) {
      // The PIN lock closed while the page was open (or this is a first visit). Opening the page again shows the lock screen.
      if (typeof window !== "undefined") {
        window.location.reload()
        return new Promise<never>(() => {})
      }
      throw new LockedError(message)
    }
    const error = new ApiError(message)
    if (typeof fields.retryAfterSeconds === "number") error.retryAfterSeconds = fields.retryAfterSeconds
    throw error
  }
  return payload as T
}

/**
 * Everything the app draws itself from. On the server, hand in the visitor's session cookie ("kaya_session=...") so a
 * PIN-locked backend knows this page was asked for by a device that has typed the PIN; without it, the backend refuses and
 * a LockedError is thrown.
 */
export const loadData = (sessionCookie?: string) =>
  request<AppData>("/api/data", sessionCookie ? { headers: { cookie: sessionCookie } } : undefined)

/** Types the PIN on this device. A wrong one throws an ApiError that says how many tries are left, or how long to wait. */
export const unlock = (pin: string) => request<AuthResult>("/api/auth/unlock", { method: "POST", body: JSON.stringify({ pin }) })

/** Forgets this device, so it has to type the PIN again. */
export const lockNow = () => request<AuthResult>("/api/auth/lock", { method: "POST" })

/** Turns the PIN on, or (with the current one) changes it. */
export const setPin = (pin: string, currentPin?: string) =>
  request<AuthResult>("/api/auth/pin", { method: "PUT", body: JSON.stringify({ pin, ...(currentPin ? { currentPin } : {}) }) })

/** Turns the PIN off. Needs the current one. */
export const removePin = (currentPin: string) =>
  request<AuthResult>("/api/auth/pin", { method: "DELETE", body: JSON.stringify({ currentPin }) })

/** Changes the name the greeting on Home uses. */
export const updateUser = (name: string) =>
  request<SaveUserResult>("/api/user", { method: "PUT", body: JSON.stringify({ name }) })

/** Sets the budget for all spending together in a month, or takes it away with null. */
export const setMonthlyBudget = (budget: number | null) =>
  request<SaveMonthlyBudgetResult>("/api/monthly-budget", { method: "PUT", body: JSON.stringify({ budget }) })

/** Copies the data file into the backups folder ("Back up now"). */
export const backUp = () => request<BackupResult>("/api/backup", { method: "POST" })

/** Puts back a transaction, wallet or goal that was just deleted, using the undo id the delete sent back. */
export const undoDelete = (undoId: string) =>
  request<UndoResult>(`/api/undo/${encodeURIComponent(undoId)}`, { method: "POST" })

export const createTransaction = (input: NewTransaction) =>
  request<SaveTransactionResult>("/api/transactions", { method: "POST", body: JSON.stringify(input) })

/** Saves many income and spending transactions read from a bank's file, all or nothing. The result's id undoes it. */
export const importTransactions = (transactions: NewTransaction[]) =>
  request<ImportTransactionsResult>("/api/transactions/import", { method: "POST", body: JSON.stringify({ transactions }) })

export const updateTransaction = (id: string, input: NewTransaction) =>
  request<SaveTransactionResult>(`/api/transactions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })

export const deleteTransaction = (id: string) =>
  request<DeleteTransactionResult>(`/api/transactions/${encodeURIComponent(id)}`, { method: "DELETE" })

export const createWallet = (input: NewWallet) =>
  request<SaveWalletResult>("/api/wallets", { method: "POST", body: JSON.stringify(input) })

export const updateWallet = (id: string, input: WalletChanges) =>
  request<SaveWalletResult>(`/api/wallets/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) })

/** Sets an investment wallet's balance to its current market value. This is not income or spending. */
export const updateWalletValue = (id: string, value: number) =>
  request<SaveWalletResult>(`/api/wallets/${encodeURIComponent(id)}/value`, {
    method: "POST",
    body: JSON.stringify({ value }),
  })

/** Sets a wallet that isn't an investment to the balance its real account shows. Not income or spending. */
export const correctWalletBalance = (id: string, value: number) =>
  request<SaveWalletResult>(`/api/wallets/${encodeURIComponent(id)}/correction`, {
    method: "POST",
    body: JSON.stringify({ value }),
  })

/** Every balance set by hand for a wallet, newest first. */
/** The money goes back to the wallet it came from. A wallet only needs naming for a deposito that doesn't know where its money came from. */
export const settleDeposito = (id: string, toWalletId?: string) =>
  request<SettleDepositoResult>(`/api/wallets/${encodeURIComponent(id)}/settle`, {
    method: "POST",
    body: JSON.stringify(toWalletId ? { toWalletId } : {}),
  })

export const loadWalletHistory = (id: string) =>
  request<BalanceChange[]>(`/api/wallets/${encodeURIComponent(id)}/history`)

/** Deletes a wallet and every transaction that touches it. */
export const deleteWallet = (id: string) =>
  request<DeleteWalletResult>(`/api/wallets/${encodeURIComponent(id)}`, { method: "DELETE" })

export const reorderWallets = (ids: string[]) =>
  request<ReorderWalletsResult>("/api/wallets/order", { method: "PUT", body: JSON.stringify({ ids }) })

export const createCategory = (input: NewCategory) =>
  request<SaveCategoryResult>("/api/categories", { method: "POST", body: JSON.stringify(input) })

export const updateCategory = (id: string, input: CategoryChanges) =>
  request<SaveCategoryResult>(`/api/categories/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) })

/** Puts the categories in a new order: every category id, once each. */
export const reorderCategories = (ids: string[]) =>
  request<ReorderCategoriesResult>("/api/categories/order", { method: "PUT", body: JSON.stringify({ ids }) })

/** Sets a spending category's monthly budget, or takes it away with null. Presets can have one too. */
export const setCategoryBudget = (id: string, budget: number | null) =>
  request<SaveCategoryResult>(`/api/categories/${encodeURIComponent(id)}/budget`, {
    method: "PUT",
    body: JSON.stringify({ budget }),
  })

/** Deletes a category the owner made. Its transactions move to "Other", so none are lost. */
export const deleteCategory = (id: string) =>
  request<DeleteCategoryResult>(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" })

/** Undoes deleting a category: puts it back, and moves its transactions back into it. */
export const restoreCategory = (input: RestoreCategory) =>
  request<RestoreCategoryResult>("/api/categories/restore", { method: "POST", body: JSON.stringify(input) })

export const createGoal = (input: GoalInput) =>
  request<SaveGoalResult>("/api/goals", { method: "POST", body: JSON.stringify(input) })

/** Replaces everything the owner can edit about a goal, including which wallet it is saved in. */
export const updateGoal = (id: string, input: GoalInput) =>
  request<SaveGoalResult>(`/api/goals/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) })

/**
 * Adds to what has been saved for a goal. Naming a wallet moves the money from it
 * for real, recording a transfer; leaving it out means the money is already in the
 * goal's wallet, so nothing moves.
 */
export const addToGoal = (id: string, amount: number, fromWalletId?: string) =>
  request<AddToGoalResult>(`/api/goals/${encodeURIComponent(id)}/add-money`, {
    method: "POST",
    body: JSON.stringify({ amount, ...(fromWalletId ? { fromWalletId } : {}) }),
  })

/** Takes money back out of a goal. Only the goal changes: no money moves between wallets. */
export const takeFromGoal = (id: string, amount: number) =>
  request<SaveGoalResult>(`/api/goals/${encodeURIComponent(id)}/take-out`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  })

/** Every change to what is saved for a goal, newest first. */
export const loadGoalHistory = (id: string) =>
  request<GoalMovement[]>(`/api/goals/${encodeURIComponent(id)}/history`)

export const reorderGoals = (ids: string[]) =>
  request<ReorderGoalsResult>("/api/goals/order", { method: "PUT", body: JSON.stringify({ ids }) })

export const deleteGoal = (id: string) =>
  request<DeleteGoalResult>(`/api/goals/${encodeURIComponent(id)}`, { method: "DELETE" })

/** The message to show the owner for any error thrown while saving. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Nothing was changed."
}

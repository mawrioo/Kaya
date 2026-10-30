import { ApiError, request } from "@/lib/api"
import type { AssistantBatchResult, AssistantData, CategoryRule, NewTransaction, PreviewConversation, TransactionPreview, TransactionTemplate } from "@/lib/types"

export type RememberedCategory = CategoryRule
export type FavouriteTemplate = TransactionTemplate
export type EntryAssistantData = Pick<AssistantData, "rules" | "templates">
export interface BatchPreviewItem { id: string; text: string; preview: TransactionPreview }
export interface BatchPreview { items: BatchPreviewItem[]; message: string }
export type SavedAssistantBatch = AssistantBatchResult

export const loadEntryAssistant = (signal?: AbortSignal) => request<EntryAssistantData>("/api/assistant", { signal })
export const saveRememberedCategory = (rule: RememberedCategory) => request<RememberedCategory>("/api/assistant/rules", { method: "PUT", body: JSON.stringify(rule) })
export const deleteRememberedCategory = (id: string) => request<unknown>(`/api/assistant/rules/${encodeURIComponent(id)}`, { method: "DELETE" })
export const saveFavouriteTemplate = (template: { id?: string; name: string; draft: TransactionTemplate["draft"] }) => request<FavouriteTemplate>("/api/assistant/templates", { method: "PUT", body: JSON.stringify(template) })
export const deleteFavouriteTemplate = (id: string) => request<unknown>(`/api/assistant/templates/${encodeURIComponent(id)}`, { method: "DELETE" })
export const previewAssistantBatch = (text: string, defaultWalletId: string, signal: AbortSignal) => request<BatchPreview>("/api/assistant/preview-batch", { method: "POST", signal, body: JSON.stringify({ text, ...(defaultWalletId ? { defaultWalletId } : {}) }) })
export async function saveAssistantBatch(requestId: string, transactions: NewTransaction[]): Promise<SavedAssistantBatch> {
  const result = await request<SavedAssistantBatch>("/api/assistant/batch", { method: "POST", body: JSON.stringify({ requestId, transactions }) })
  if (!result || result.requestId !== requestId || !Array.isArray(result.transactions) || result.transactions.length !== transactions.length || !Array.isArray(result.wallets) || result.wallets.some(wallet => !wallet || typeof wallet.id !== "string" || !Number.isSafeInteger(wallet.balance)) || new Set(result.transactions.map(transaction => transaction?.id)).size !== transactions.length || result.transactions.some((transaction, index) => {
    const input = transactions[index]
    if (!transaction || typeof transaction.id !== "string" || !transaction.id || transaction.type !== input.type || transaction.amount !== input.amount || transaction.date !== input.date || transaction.description !== input.description) return true
    if (transaction.type === "transfer" && input.type === "transfer") return transaction.fromWalletId !== input.fromWalletId || transaction.toWalletId !== input.toWalletId
    return transaction.type === "transfer" || input.type === "transfer" || transaction.walletId !== input.walletId || transaction.categoryId !== input.categoryId
  })) {
    const error = new ApiError("Could not confirm the batch save acknowledgement.")
    error.mayHaveSaved = true
    throw error
  }
  return result
}
export const replyToBatchItem = (text: string, conversation: PreviewConversation, signal: AbortSignal) => request<TransactionPreview>("/api/transactions/preview", { method: "POST", signal, body: JSON.stringify({ text, conversation }) })

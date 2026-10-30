import type { PreviewContext } from "./transaction-preview.ts"
import type { SuggestionModel } from "./preview-model.ts"
import { previewConversation } from "./preview-conversation.ts"
import { extractTransactionDate } from "./transaction-dates.ts"
import { ValidationError } from "./validate.ts"

function hasAmount(text: string, now?: Date) {
  const remaining = extractTransactionDate(text, now).remaining
  return /\b(?:rp\.?\s*)?\d[\d.,]*(?:\s*(?:rb|ribu|jt|juta|k))?\b/iu.test(remaining)
}
/** Explicit separators; conjunctions split only when every clause names an amount. */
export function splitTransactionMessage(text: string, now?: Date): string[] {
  const strong = text.trim().split(/;|\r?\n|,\s*(?=\p{L})/u).map(s => s.trim()).filter(Boolean)
  const parts = strong.flatMap(part => {
    const clauses = part.split(/\s+(?:and|dan)\s+/iu).map(s => s.trim())
    return clauses.length > 1 && clauses.every(s => hasAmount(s, now)) ? clauses : [part]
  })
  if (!parts.length || parts.length > 5) throw new ValidationError("Prepare between one and five entries. Separate them with semicolons or new lines.")
  if (parts.some(s => s.length > 500)) throw new ValidationError("Keep each entry to 500 characters or fewer.")
  return parts
}
export async function previewBatch(body: unknown, context: PreviewContext, model: SuggestionModel, options: { now?: Date; signal?: AbortSignal } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ValidationError("Send the entries as JSON.")
  const { text, defaultWalletId } = body as Record<string, unknown>
  if (typeof text !== "string" || !text.trim() || text.length > 2500) throw new ValidationError("Write up to five entries in 2500 characters or fewer.")
  const parts = splitTransactionMessage(text, options.now)
  const items = []
  for (const [index, sentence] of parts.entries()) {
    const preview = await previewConversation({ text: sentence, ...(defaultWalletId ? { defaultWalletId } : {}) }, context, model, options)
    items.push({ id: `entry-${index + 1}`, text: sentence, preview })
  }
  return { items, message: "Review each selected entry. Nothing is saved until you confirm the batch." }
}

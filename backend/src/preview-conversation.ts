import { amountValue, jakartaDate, previewTransaction as extract, type PreviewContext } from "./transaction-preview.ts"
import { PreviewModelError, type SuggestionModel } from "./preview-model.ts"
import type { PreviewConversation, PreviewField, PreviewQuestion, PreviewSource, TransactionPreview, TransactionPreviewDraft } from "./types.ts"
import { MAX_AMOUNT, parseNewTransaction, ValidationError } from "./validate.ts"

const fields: PreviewField[] = ["type", "amount", "walletId", "toWalletId", "date", "categoryId", "description"]
const sources: PreviewSource[] = ["sentence", "reply", "manual", "default", "suggestion"]
const normal = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g, " ")
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const validDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v

function validateContext(value: unknown, context: PreviewContext): PreviewConversation {
  const fail = () => { throw new ValidationError("The draft context is invalid. Start a new transaction.") }
  if (!record(value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || Number(value.revision) > 1_000_000 || !record(value.draft) || !record(value.sources)) return fail()
  if (Object.keys(value).some(k => !["revision", "draft", "sources", "pending"].includes(k))) return fail()
  const d = value.draft
  if (Object.keys(d).some(k => !fields.includes(k as PreviewField))) return fail()
  if (d.type !== undefined && !["expense", "income", "transfer"].includes(String(d.type))) return fail()
  if (d.amount !== undefined && (!Number.isSafeInteger(d.amount) || Number(d.amount) <= 0 || Number(d.amount) > MAX_AMOUNT)) return fail()
  for (const key of ["walletId", "toWalletId"]) if (d[key] !== undefined && !context.wallets.some(w => w.id === d[key] && w.kind !== "deposito")) return fail()
  if (d.categoryId !== undefined && !context.categories.some(c => c.id === d.categoryId && c.type === d.type)) return fail()
  if (d.type !== "transfer" && d.toWalletId !== undefined) return fail()
  if (d.type === "transfer" && d.walletId && d.walletId === d.toWalletId) return fail()
  if (d.date !== undefined && !validDate(d.date)) return fail()
  if (d.description !== undefined && (typeof d.description !== "string" || d.description.length > 100)) return fail()
  for (const [key, source] of Object.entries(value.sources)) if (!fields.includes(key as PreviewField) || !sources.includes(source as PreviewSource)) return fail()
  if (value.pending !== undefined) {
    const p = value.pending
    if (!record(p) || ![...fields, "transferEnd", "sentence"].includes(String(p.field)) || !["missing", "invalid", "ambiguous", "unsupported"].includes(String(p.reason)) || typeof p.message !== "string" || p.message.length > 500) return fail()
    if (Object.keys(p).some(k => !["field", "reason", "message", "choices", "walletId"].includes(k))) return fail()
    if (p.walletId !== undefined && !context.wallets.some(w => w.id === p.walletId && w.kind !== "deposito")) return fail()
    if (p.field === "transferEnd" && (d.type !== "transfer" || !p.walletId)) return fail()
    if (p.choices !== undefined && (!Array.isArray(p.choices) || p.choices.length > 100 || p.choices.some(c => !record(c) || typeof c.id !== "string" || typeof c.label !== "string" || c.id.length > 100 || c.label.length > 100))) return fail()
  }
  return structuredClone(value) as unknown as PreviewConversation
}

function question(d: TransactionPreviewDraft, context: PreviewContext): PreviewQuestion | undefined {
  const missing = (field: PreviewField, message: string, choices?: PreviewQuestion["choices"]): PreviewQuestion => ({ field, reason: "missing", message, ...(choices ? { choices } : {}) })
  if (!d.type) return missing("type", "Is this an expense, income or transfer?", ["expense", "income", "transfer"].map(id => ({ id, label: id })))
  if (!d.amount) return missing("amount", "How much was it?")
  const wallets = context.wallets.filter(w => w.kind !== "deposito").map(w => ({ id: w.id, label: w.name }))
  if (!d.walletId) return missing("walletId", d.type === "transfer" ? "Which wallet does the money leave?" : "Which wallet should this use?", wallets)
  if (d.type === "transfer" && !d.toWalletId) return missing("toWalletId", "Which wallet receives the money?", wallets.filter(w => w.id !== d.walletId))
  if (!d.date) return missing("date", "Which date? Use today, yesterday or YYYY-MM-DD.")
  if (d.type !== "transfer" && !d.categoryId) return missing("categoryId", "Which category should this use?", context.categories.filter(c => c.type === d.type).map(c => ({ id: c.id, label: c.name })))
}

function finish(state: PreviewConversation, context: PreviewContext, message?: string): TransactionPreview {
  state.pending = state.pending ?? question(state.draft, context)
  const d = state.draft
  if (!state.pending) parseNewTransaction({ type: d.type, amount: d.amount, description: d.description ?? "", date: `${d.date}T12:00:00+07:00`, ...(d.type === "transfer" ? { fromWalletId: d.walletId, toWalletId: d.toWalletId } : { walletId: d.walletId, categoryId: d.categoryId }) }, { walletIds: new Set(context.wallets.filter(w => w.kind !== "deposito").map(w => w.id)), categoryTypes: new Map(context.categories.map(c => [c.id, c.type])) })
  return { status: state.pending ? "clarify" : "ready", draft: d, conversation: state,
    defaults: [...(state.sources.date === "default" ? ["date" as const] : []), ...(state.sources.walletId === "default" ? ["wallet" as const] : []), ...(state.sources.categoryId === "default" ? ["category" as const] : [])],
    message: message ? `${message}${state.pending ? ` ${state.pending.message}` : " Review the details, then confirm to save."}` : state.pending?.message ?? "Review the details, then confirm to save." }
}

/** One bounded, memory-only draft. The model never receives this context or interprets replies. */
export async function previewConversation(body: unknown, context: PreviewContext, model: SuggestionModel, options: { now?: Date; signal?: AbortSignal } = {}): Promise<TransactionPreview> {
  if (options.signal?.aborted) throw new PreviewModelError("cancelled", "Preparing the transaction was cancelled.")
  if (!record(body)) throw new ValidationError("Send a sentence as JSON.")
  if (body.conversation === undefined) {
    const result = await extract(body, context, model, { ...options, suggestIncomplete: true })
    const state: PreviewConversation = { revision: 1, draft: result.draft, sources: {} }
    for (const field of fields) if (result.draft[field] !== undefined) state.sources[field] = "sentence"
    for (const field of result.defaults) state.sources[field === "wallet" ? "walletId" : field === "category" ? "categoryId" : "date"] = "default"
    if (state.draft.categoryId && state.sources.categoryId !== "default") {
      const category = context.categories.find(c => c.id === state.draft.categoryId)!
      const escaped = category.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      state.sources.categoryId = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(state.draft.description ?? "") ? "sentence" : "suggestion"
    }
    state.pending = question(state.draft, context)
    if (result.status !== "ready" && (!state.pending || !Object.keys(state.draft).length)) state.pending = { field: "sentence", reason: result.status === "unsupported" ? "unsupported" : "ambiguous", message: result.message }
    if (state.pending && result.status !== "ready") {
      if (/one |different|matches more|kind of/.test(result.message)) state.pending.reason = "ambiguous"
      else if (/valid|whole-rupiah|exact date|named|Check/.test(result.message)) state.pending.reason = "invalid"
    }
    return { ...finish(state, context), ...(result.status === "unsupported" ? { status: "unsupported" as const, message: result.message } : {}) }
  }
  const state = validateContext(body.conversation, context)
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 500) throw new ValidationError("Write a reply in 500 characters or fewer.")
  state.revision++
  const text = body.text.trim().replace(/^actually\s+/i, "")
  const pending = state.pending
  const reject = (message: string) => finish(state, context, message)
  let field: PreviewField | undefined
  let value = text
  let match: RegExpMatchArray | null
  if ((match = text.match(/^(?:make that|ganti jadi)\s+(.+)$/i))) { field = "amount"; value = match[1] }
  else if ((match = text.match(/^(?:use|pakai)\s+(.+)$/i))) {
    value = match[1]
    if (state.draft.type === "transfer") {
      const found = context.wallets.filter(w => w.kind !== "deposito" && [w.id, w.name, w.nickname].some(s => s && normal(s) === normal(value)))
      if (found.length !== 1) return reject("Choose an existing wallet by its exact name.")
      state.pending = { field: "transferEnd", reason: "ambiguous", walletId: found[0].id, message: `Should ${found[0].name} be the source or destination?`, choices: [{ id: "source", label: "Source" }, { id: "destination", label: "Destination" }] }
      return finish(state, context)
    }
    field = "walletId"
  }
  else if ((match = text.match(/^(?:from|dari)\s+(.+)$/i))) { field = "walletId"; value = match[1] }
  else if ((match = text.match(/^(?:to|ke)\s+(.+)$/i))) { field = "toWalletId"; value = match[1] }
  else if ((match = text.match(/^(?:category|kategori)\s+(.+)$/i))) { field = "categoryId"; value = match[1] }
  else if ((match = text.match(/^(?:note|catatan):\s*(.*)$/i))) { field = "description"; value = match[1] }
  else if ((match = text.match(/^(?:this was|ini|type)\s+(.+)$/i))) { field = "type"; value = match[1] }
  else if ((match = text.match(/^(?:tanggalnya|date)\s+(.+)$/i))) { field = "date"; value = match[1] }
  else if (/^(today|yesterday|hari ini|kemarin|\d{4}-\d{2}-\d{2})$/i.test(text)) field = "date"
  else if (pending?.field === "transferEnd" && /^(source|destination|from|to|asal|tujuan)$/i.test(text)) { field = /^(source|from|asal)$/i.test(text) ? "walletId" : "toWalletId"; value = pending.walletId! }
  else if (pending && fields.includes(pending.field as PreviewField)) field = pending.field as PreviewField
  if (!field) return reject("Reply with one correction, or choose Start new for another transaction. Saving needs the confirmation button.")
  const draft = { ...state.draft }
  if (field === "amount") {
    const money = value.match(/^(?:rp\.?\s*)?(\d[\d.,]*)(?:\s*(ribu|juta|rb|jt|k))?$/i)
    const amount = money && amountValue(money[1], money[2] ?? "")
    if (!amount) return reject("Use one whole-rupiah amount, such as 35rb.")
    draft.amount = amount
  } else if (field === "walletId" || field === "toWalletId") {
    if (field === "toWalletId" && draft.type !== "transfer") return reject("Only transfers have a destination wallet.")
    const found = context.wallets.filter(w => w.kind !== "deposito" && [w.id, w.name, w.nickname].some(s => s && normal(s) === normal(value)))
    if (found.length !== 1) return reject("Choose one existing wallet by its exact name or nickname.")
    draft[field] = found[0].id
    if (draft.type === "transfer" && draft.walletId === draft.toWalletId) return reject("Choose two different wallets for the transfer.")
  } else if (field === "date") {
    const today = jakartaDate(options.now ?? new Date())
    const date = /^(today|hari ini)$/i.test(value) ? today : /^(yesterday|kemarin)$/i.test(value) ? new Date(Date.parse(today) - 86_400_000).toISOString().slice(0, 10) : value
    if (!validDate(date)) return reject("Use today, yesterday or a valid YYYY-MM-DD date.")
    draft.date = date
  } else if (field === "type") {
    const types: Record<string, "expense" | "income" | "transfer"> = { expense: "expense", income: "income", transfer: "transfer", pengeluaran: "expense", pendapatan: "income", pemasukan: "income" }
    const type = Object.hasOwn(types, normal(value)) ? types[normal(value)] : undefined
    if (!type) return reject("Choose expense, income or transfer.")
    draft.type = type
    if (!context.categories.some(c => c.id === draft.categoryId && c.type === type)) delete draft.categoryId
    if (type !== "transfer") delete draft.toWalletId
  } else if (field === "categoryId") {
    const found = context.categories.filter(c => c.type === draft.type && [c.id, c.name].some(s => normal(s) === normal(value)))
    if (found.length !== 1) return reject("Choose a category that belongs to this transaction type.")
    draft.categoryId = found[0].id
  } else {
    if (value.length > 100) return reject("Keep the note to 100 characters or fewer.")
    draft.description = value
  }
  state.draft = draft
  state.sources[field] = "reply"
  for (const key of fields) if (draft[key] === undefined) delete state.sources[key]
  // An unrelated correction cannot dismiss a still-unresolved explicit ambiguity.
  state.pending = pending?.field === "sentence" || (pending?.field === "transferEnd" && !["walletId", "toWalletId"].includes(field)) ? pending : undefined
  const label = field === "walletId" ? "Wallet" : field === "toWalletId" ? "Destination" : field === "categoryId" ? "Category" : field === "description" ? "Note" : field[0].toUpperCase() + field.slice(1)
  return finish(state, context, `${label} updated.`)
}

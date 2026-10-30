import type { Category, Transaction, TransactionPreview, TransactionPreviewDraft, Wallet } from "./types.ts"
import { MAX_AMOUNT, parseNewTransaction, ValidationError } from "./validate.ts"
import { PreviewModelError, type SuggestionModel } from "./preview-model.ts"
import { extractTransactionDate } from "./transaction-dates.ts"

/** Only these read-only fields enter the service. Balances and credentials are not accepted. */
export interface PreviewContext {
  wallets: Pick<Wallet, "id" | "name" | "nickname" | "kind">[]
  categories: Pick<Category, "id" | "name" | "type">[]
  categoryRules?: { type: "expense" | "income"; phrase: string; categoryId: string }[]
  transactions: Pick<Extract<Transaction, { type: "expense" | "income" }>, "type" | "categoryId" | "description" | "date">[]
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const normal = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const issue = (message: string, draft: TransactionPreviewDraft = {}): TransactionPreview => ({ status: "clarify", draft, message, defaults: [] })
function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw new PreviewModelError("cancelled", "Preparing the transaction was cancelled.")
}

export function amountValue(number: string, unit: string): number | undefined {
  let digits = number
  let places = 0
  if (/^\d{1,3}(?:\.\d{3})+$/.test(number)) digits = number.replaceAll(".", "")
  else if (unit && /^\d+[.,]\d+$/.test(number)) {
    const [whole, fraction] = number.split(/[.,]/)
    digits = whole + fraction
    places = fraction.length
  } else if (!/^\d+$/.test(number)) return
  const numerator = BigInt(digits) * (/^(jt|juta)$/i.test(unit) ? 1_000_000n : unit ? 1_000n : 1n)
  const divisor = 10n ** BigInt(places)
  if (numerator % divisor) return
  const amount = numerator / divisor
  if (amount <= 0n || amount > BigInt(MAX_AMOUNT)) return
  return Number(amount)
}

/** Bounded grammar: uncertainty is returned as a question, never a guessed ready draft. */
export async function previewTransaction(
  body: unknown,
  context: PreviewContext,
  model: SuggestionModel,
  options: { now?: Date; signal?: AbortSignal; suggestIncomplete?: boolean } = {},
): Promise<TransactionPreview> {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new ValidationError("Send a sentence as JSON.")
  const { text, defaultWalletId } = body as Record<string, unknown>
  if (typeof text !== "string" || !text.trim() || text.length > 500) throw new ValidationError("Write a transaction in 500 characters or fewer.")
  if (defaultWalletId !== undefined && (typeof defaultWalletId !== "string" || !context.wallets.some(w => w.id === defaultWalletId && w.kind !== "deposito"))) {
    throw new ValidationError("Choose an existing wallet for the default.")
  }
  checkCancellation(options.signal)
  if (/\b(deposito|market value|nilai pasar|delete|hapus|recurring|every month|setiap bulan)\b/i.test(text) || /\?|^\s*(what|how|why|berapa|kenapa)\b/i.test(text)) {
    return { status: "unsupported", draft: {}, defaults: [], message: "Describe one expense, income or transfer. Use the existing pages for other changes." }
  }
  if (/\b(ignore|instructions?|rules?|prompt|without confirmation|tanpa konfirmasi|save it|simpan sekarang)\b/i.test(text)) return issue("Describe only the transaction, then review it before saving.")
  if (/\b(discount|diskon|minus|refund|reimburse|split|fee|biaya admin)\b/i.test(text)) return issue("Enter the final amount for one transaction, or use the ordinary form.")
  if (/\b(and|then|dan|kemudian)\b/i.test(text)) return issue("Describe one transaction at a time, or use the ordinary form for a combined note.")

  let remaining = text.trim()
  const draft: TransactionPreviewDraft = {}
  const defaults: ("date" | "wallet" | "category")[] = []
  const problems: string[] = []
  const date = extractTransactionDate(remaining, options.now)
  remaining = date.remaining
  if (date.date) draft.date = date.date
  if (date.defaulted) defaults.push("date")
  if (date.message) problems.push(date.message)

  const mentions: { id: string; start: number; end: number }[] = []
  const labels = context.wallets.flatMap(w => [w.name, w.nickname].filter((s): s is string => !!s).map(label => ({ id: w.id, label })))
  for (const { id, label } of labels.sort((a, b) => b.label.length - a.label.length)) {
    for (const match of remaining.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${escape(label)}(?![\\p{L}\\p{N}_])`, "giu"))) {
      const start = match.index
      const end = start + match[0].length
      const overlap = mentions.find(m => start < m.end && end > m.start)
      if (overlap) {
        if (overlap.start === start && overlap.end === end && overlap.id !== id) problems.push("That wallet name matches more than one wallet. Choose one in the form.")
        continue
      }
      mentions.push({ id, start, end })
    }
  }
  mentions.sort((a, b) => a.start - b.start)
  for (const m of [...mentions].reverse()) remaining = remaining.slice(0, m.start) + ` @${mentions.indexOf(m)}@ ` + remaining.slice(m.end)
  if (mentions.some(m => context.wallets.find(w => w.id === m.id)?.kind === "deposito")) {
    return { status: "unsupported", draft, defaults: [], message: "Use the deposito's own controls to move its money." }
  }
  // An explicitly introduced wallet must be a known name, not a silently substituted default.
  const unknownWallet = /\b(?:from|dari|to|ke|pakai|using|via|into|in|masuk|with|dengan|wallet)\s+(?!@)([\p{L}])/iu.test(remaining) || /\b(bank|mandiri|bni|bri|ovo|gopay|dana|superbank|pluang)\b/i.test(remaining)
  if (unknownWallet) problems.push("Choose the wallet named in your sentence, or use its exact name or nickname.")

  const moneyText = remaining.replace(/@\d+@/g, match => " ".repeat(match.length))
  const amounts = [...moneyText.matchAll(/(?<![\p{L}\p{N}_.,/+-])(?:rp\.?\s*)?([+-]?\d[\d.,]*)(?:\s*(ribu|juta|rb|jt|k))?(?![\p{L}\p{N}_.,/+-])/giu)]
  if (amounts.length !== 1) problems.push(amounts.length ? "Enter one amount for one transaction." : "How much was it?")
  else {
    const amount = amountValue(amounts[0][1], amounts[0][2] ?? "")
    if (amount === undefined) problems.push("Use a whole-rupiah amount between Rp 1 and Rp 999.999.999.999.")
    else draft.amount = amount
  }
  for (const match of [...amounts].reverse()) remaining = remaining.slice(0, match.index) + " " + remaining.slice(match.index + match[0].length)
  // Leftover numeric fragments must not disappear when malformed money fails the token pattern.
  if (/\d/.test(remaining.replace(/@\d+@/g, ""))) { delete draft.amount; problems.push("Check the amount and date in the form.") }

  const transfer = /\b(transfer|move|pindah|pindahin|pindahkan|tarik tunai|withdraw|withdrawal|deposit|setor|ambil uang)\b/i.test(remaining)
  const income = /\b(gaji|salary|bonus|received|receive|got|income|earned|masuk|terima|pendapatan)\b/i.test(remaining)
  const expense = /\b(paid|pay|spent|spend|beli|bayar|bought|expense)\b/i.test(remaining)
  const conflictingType = (transfer && (income || expense)) || (income && expense)
  if (conflictingType) problems.push("Describe one kind of transaction at a time.")
  else draft.type = transfer ? "transfer" : income ? "income" : "expense"
  if (transfer) {
    const from = /\b(?:from|dari)\s+@(\d+)@/i.exec(remaining)
    const to = /\b(?:to|ke)\s+@(\d+)@/i.exec(remaining)
    if (from) draft.walletId = mentions[Number(from[1])].id
    if (to) draft.toWalletId = mentions[Number(to[1])].id
    if (problems.some(p => p.includes("wallet name")) || mentions.length > 2) { delete draft.walletId; delete draft.toWalletId }
    if (mentions.length > 2 || !from || !to) problems.push("Which wallet does the money leave, and which receives it? Use from ... to ... or dari ... ke ....")
    if (draft.walletId && draft.walletId === draft.toWalletId) { delete draft.toWalletId; problems.push("Choose two different wallets for the transfer.") }
  } else {
    if (mentions.length > 1) problems.push("Choose one wallet for this transaction.")
    if (!unknownWallet && !problems.some(p => p.includes("wallet name")) && mentions.length <= 1) draft.walletId = mentions[0]?.id ?? (typeof defaultWalletId === "string" ? defaultWalletId : undefined)
    if (!mentions.length && draft.walletId) defaults.push("wallet")
  }
  const note = remaining.replace(/@\d+@/g, " ")
    .replace(/\b(paid|pay|spent|spend|beli|bayar|bought|received|receive|got|earned|masuk|terima|transfer|move|pindah|pindahin|pindahkan|tarik tunai|from|dari|to|ke|pakai|using|via|into|in|with|dengan|wallet|for|on|a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ").trim()
  if (note.length > 100) problems.push("Keep the note to 100 characters or fewer.")
  else draft.description = note
  if (!draft.walletId && !problems.length) problems.push("Which wallet should this use?")

  if (draft.type && draft.type !== "transfer" && note.length <= 100) {
    const categories = context.categories.filter(c => c.type === draft.type)
    const explicit = categories.filter(c => new RegExp(`(?<![\\p{L}\\p{N}])${escape(c.name)}(?![\\p{L}\\p{N}])`, "iu").test(note))
    const remembered = context.categoryRules?.find(rule => rule.type === draft.type && normal(rule.phrase) === normal(note) && categories.some(c => c.id === rule.categoryId))
    const commanded = categories.filter(c => new RegExp(`\\b(?:category|kategori)\\s+${escape(c.name)}(?![\\p{L}\\p{N}])`, "iu").test(note))
    if (commanded.length > 1 || (!remembered && explicit.length > 1)) return issue("Choose one category for this transaction.", draft)
    const prior = context.transactions.filter(t => t.type === draft.type && normal(t.description) === normal(note) && normal(note).length >= 3 && categories.some(c => c.id === t.categoryId)).sort((a, b) => b.date.localeCompare(a.date))[0]
    draft.categoryId = commanded[0]?.id ?? remembered?.categoryId ?? explicit[0]?.id ?? prior?.categoryId
    if (!draft.categoryId) {
      if (problems.length && !options.suggestIncomplete) return { ...issue(problems[0], draft), defaults }
      if (categories.length > 60 || JSON.stringify(categories).length > 6000) return issue("Choose a category in the form.", draft)
      const result = await model({ text: note, categories: categories.map(({ id, name }) => ({ id, name })) }, options.signal)
      checkCancellation(options.signal)
      if (!result || typeof result !== "object" || Array.isArray(result) || Object.keys(result).some(k => k !== "categoryId") || !("categoryId" in result)) {
        throw new PreviewModelError("invalid-response", "The assistant could not suggest a category. Choose one in the form.")
      }
      const id = result.categoryId
      if (id !== null && (typeof id !== "string" || !categories.some(c => c.id === id))) throw new PreviewModelError("invalid-response", "The assistant suggested a category that is not available. Choose one in the form.")
      draft.categoryId = typeof id === "string" ? id : categories.find(c => c.name === "Other")?.id
      if (id === null && draft.categoryId) defaults.push("category")
    }
    if (!draft.categoryId) return issue("Choose a category for this transaction.", draft)
  }
  if (problems.length) return { ...issue(problems[0], draft), defaults }
  parseNewTransaction({
    type: draft.type, amount: draft.amount, date: `${draft.date}T12:00:00+07:00`, description: draft.description,
    ...(draft.type === "transfer" ? { fromWalletId: draft.walletId, toWalletId: draft.toWalletId } : { walletId: draft.walletId, categoryId: draft.categoryId }),
  }, { walletIds: new Set(context.wallets.map(w => w.id)), categoryTypes: new Map(context.categories.map(c => [c.id, c.type])) })
  // Timestamp is only for validator compatibility. The UI assigns save-time hours as usual.
  return { status: "ready", draft, defaults, message: "Review the details, then confirm to save." }
}

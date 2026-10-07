/** One-line expenses. Pure, local parsing: no requests and no saving. */
import { suggestCategory, type CategorySuggestion } from "./category-suggestion.ts"
import type { TransactionForm } from "./transaction-form"
import type { Category, Transaction, Wallet } from "./types"

type NamedWallet = Pick<Wallet, "id" | "name" | "nickname">
type ParsedExpense = { amount: string; note: string; walletId?: string }
export type QuickAddResult = { ok: true; expense: ParsedExpense } | { ok: false; error: string }

const MAX_AMOUNT = 999_999_999_999n

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Whole rupiah only. Integer arithmetic avoids rounding decimal shorthand. */
function rupiah(number: string, unit: string): string | undefined {
  let digits = number
  let places = 0
  if (/^\d{1,3}(?:\.\d{3})+$/.test(number)) {
    digits = number.replaceAll(".", "")
  } else if (unit && /^\d+[.,]\d+$/.test(number)) {
    const [whole, fraction] = number.split(/[.,]/)
    digits = whole + fraction
    places = fraction.length
  } else if (!/^\d+$/.test(number)) return undefined

  const multiplier = /^(jt|juta)$/i.test(unit) ? 1_000_000n : unit ? 1_000n : 1n
  const numerator = BigInt(digits) * multiplier
  const divisor = 10n ** BigInt(places)
  if (numerator % divisor !== 0n) return undefined
  const amount = numerator / divisor
  return amount > 0n && amount <= MAX_AMOUNT ? String(amount) : undefined
}

export function parseQuickExpense(text: string, wallets: readonly NamedWallet[]): QuickAddResult {
  const fail = (error: string): QuickAddResult => ({ ok: false, error })
  if (!text.trim()) return fail("Write an expense, like nasi goreng 25rb BCA.")
  if (text.length > 240) return fail("Keep the quick-add line to 240 characters or fewer.")

  // Find full wallet names and nicknames, longest first. A shorter one inside a longer one (a nickname inside its
  // own wallet's name, say) isn't a second wallet.
  const labels = wallets.flatMap((wallet) => [wallet.name, wallet.nickname ?? ""].map((label) => ({ label: label.trim(), id: wallet.id })))
  const mentions: { start: number; end: number; id: string }[] = []
  for (const { label, id } of labels.filter((entry) => entry.label).sort((a, b) => b.label.length - a.label.length)) {
    const words = label.split(/\s+/).map(escapeRegex).join("\\s+")
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${words}(?![\\p{L}\\p{N}_])`, "giu")
    for (const match of text.matchAll(pattern)) {
      const start = match.index
      const end = start + match[0].length
      if (mentions.some((other) => start < other.end && end > other.start)) continue
      mentions.push({ start, end, id })
    }
  }
  const walletIds = new Set(mentions.map((entry) => entry.id))
  if (walletIds.size > 1) return fail("I found more than one wallet. Use one wallet for this expense.")

  // Mask names before looking for money: a wallet called Cash 2 must not become an amount.
  let remaining = text
  for (const mention of mentions.sort((a, b) => b.start - a.start)) {
    remaining = remaining.slice(0, mention.start) + " ".repeat(mention.end - mention.start) + remaining.slice(mention.end)
  }

  const pattern = /(?<![\p{L}\p{N}_.,/+-])(?:(rp)\.?\s*)?((?:[+-]\s*)?\d[\d.,]*)(?:\s*(ribu|juta|rb|jt|k))?(?![\p{L}\p{N}_.,/+-])/giu
  const candidates = [...remaining.matchAll(pattern)]
  const explicit = candidates.filter((match) => match[1] || match[3])
  const amounts = explicit.length ? explicit : candidates
  if (amounts.length === 0) return fail("Add an amount, like 25rb, 1,5jt or 25.000.")
  if (amounts.length > 1) return fail("I found more than one amount. Keep one amount in the line.")
  const match = amounts[0]
  const amount = rupiah(match[2], match[3] ?? "")
  if (!amount) return fail("Use a whole-rupiah amount from Rp 1 to Rp 999.999.999.999, like 25rb or 1,5jt.")

  const note = (remaining.slice(0, match.index) + " " + remaining.slice(match.index + match[0].length))
    .replace(/\s+/g, " ").trim()
  if (note.length > 100) return fail("Keep the note to 100 characters or fewer.")
  return { ok: true, expense: { amount, note, ...(mentions.length ? { walletId: mentions[0].id } : {}) } }
}

/** Apply only after a successful parse. Keep the date and any category chosen by hand. */
export function prepareQuickExpense(
  text: string,
  form: TransactionForm,
  wallets: readonly NamedWallet[],
  categories: Category[],
  transactions: Transaction[],
  chosenByHand: boolean,
): { ok: true; form: TransactionForm; suggestion?: CategorySuggestion; walletMatched: boolean } | { ok: false; error: string } {
  if (form.type !== "expense") return { ok: false, error: "Quick add is for expenses. Use the form for income or transfers." }
  const parsed = parseQuickExpense(text, wallets)
  if (!parsed.ok) return parsed
  const suggestion = chosenByHand ? undefined : suggestCategory(parsed.expense.note, "expense", transactions, categories)
  return {
    ok: true,
    form: {
      ...form,
      ...parsed.expense,
      categoryId: chosenByHand ? form.categoryId : suggestion?.category.id ?? "",
    },
    suggestion,
    walletMatched: !!parsed.expense.walletId,
  }
}

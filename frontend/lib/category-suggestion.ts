/**
 * Suggests a category for a note by looking at what the owner did with the same or a
 * similar note before. It only ever repeats their own choices, so it is easy to trust:
 * typing "Kopi Kenangan" offers Food only because they filed it there before.
 * Pure functions, no React.
 */
import type { Category, Transaction, TransactionType } from "@/lib/types"

export interface CategorySuggestion {
  category: Category
  /** The earlier note the suggestion comes from, as it was written. */
  basedOn: string
}

/** Notes shorter than this, and words shorter than this, are too little to go on. */
const MIN_LENGTH = 3

/** Lower case, with punctuation gone and single spaces between words: "Kopi Kenangan!" becomes "kopi kenangan". */
export function normalizeNote(note: string): string {
  return note.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

/**
 * The category the owner most often used for a note like this one, or undefined when nothing
 * similar has been written before. Three kinds of "like this one", tried in turn, and the first
 * that finds anything wins:
 *   1. the very same note,
 *   2. the start of an earlier note (as you type), or a longer version of one,
 *   3. a word in common ("Kenangan Sudirman" shares "kenangan" with "Kopi Kenangan").
 * Among the matches it takes the category used most often, and on a tie the most recent one.
 */
export function suggestCategory(
  note: string,
  type: TransactionType,
  transactions: Transaction[],
  categories: Category[]
): CategorySuggestion | undefined {
  if (type === "transfer") return undefined
  const typed = normalizeNote(note)
  if (typed.length < MIN_LENGTH) return undefined

  const known = new Map(categories.map((category) => [category.id, category]))
  const earlier = transactions
    .filter((tx) => tx.type === type && tx.description.trim() !== "")
    .map((tx) => ({ tx, words: normalizeNote(tx.description) }))
    .filter((entry) => entry.tx.type !== "transfer" && known.has(entry.tx.categoryId))

  const typedWords = typed.split(" ").filter((word) => word.length >= MIN_LENGTH)
  const ways: ((earlierNote: string) => boolean)[] = [
    (earlierNote) => earlierNote === typed,
    (earlierNote) => earlierNote.startsWith(typed) || (earlierNote.length >= MIN_LENGTH && typed.startsWith(earlierNote)),
    (earlierNote) => earlierNote.split(" ").some((word) => word.length >= MIN_LENGTH && typedWords.includes(word)),
  ]

  for (const matches of ways) {
    const hits = earlier.filter((entry) => matches(entry.words))
    if (hits.length === 0) continue

    // Count each category's hits, remembering its most recent one.
    const tally = new Map<string, { count: number; latest: Transaction }>()
    for (const { tx } of hits) {
      if (tx.type === "transfer") continue
      const seen = tally.get(tx.categoryId)
      tally.set(tx.categoryId, {
        count: (seen?.count ?? 0) + 1,
        latest: seen && Date.parse(seen.latest.date) >= Date.parse(tx.date) ? seen.latest : tx,
      })
    }
    const [bestId, best] = [...tally.entries()].sort(
      (a, b) => b[1].count - a[1].count || Date.parse(b[1].latest.date) - Date.parse(a[1].latest.date)
    )[0]
    return { category: known.get(bestId)!, basedOn: best.latest.description.trim() }
  }
  return undefined
}

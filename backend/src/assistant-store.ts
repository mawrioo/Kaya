/** Persistent assistant preferences; validated drafts still use the ordinary ledger. */
import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import type { AppData, AssistantBatchResult, AssistantData, CategoryRule, NewTransaction, SubscriptionPreference, Transaction, TransactionPreviewDraft, TransactionTemplate, Wallet } from "./types.ts"
import { MAX_AMOUNT, parseNewTransaction, ValidationError, type References } from "./validate.ts"

interface Callbacks {
  transact: <T>(work: () => T) => T
  getData: () => AppData
  references: () => References
  insertTransaction: (transaction: Transaction) => void
  getWallets: () => Wallet[]
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value)
export const normalizeCategoryPhrase = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new ValidationError(`${label} must be between 1 and ${max} characters.`)
  return value.trim()
}
function keys(body: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new ValidationError("That assistant request has unsupported fields.")
}

export function createAssistantStore(db: DatabaseSync, callbacks: Callbacks) {
  function rules(): CategoryRule[] {
    return (db.prepare("SELECT id, type, phrase, category_id AS categoryId FROM assistant_category_rules ORDER BY phrase, id").all() as unknown as CategoryRule[]).map(row => ({ ...row }))
  }
  function sanitizeTemplateDraft(draft: TransactionTemplate["draft"], data: AppData): TransactionTemplate["draft"] {
    const result = { ...draft }
    const available = (id?: string) => data.wallets.some(wallet => wallet.id === id && wallet.kind !== "deposito")
    if (!available(result.walletId)) delete result.walletId
    if (result.type !== "transfer" || !available(result.toWalletId) || result.toWalletId === result.walletId) delete result.toWalletId
    if (result.type === "transfer" || !data.categories.some(category => category.id === result.categoryId && category.type === result.type)) delete result.categoryId
    delete result.date
    return result
  }
  function getData(): AssistantData {
    const data = callbacks.getData()
    const templates = (db.prepare("SELECT id, name, draft_json FROM assistant_templates ORDER BY name COLLATE NOCASE, id").all() as { id: string; name: string; draft_json: string }[])
      .map(row => ({ id: row.id, name: row.name, draft: sanitizeTemplateDraft(JSON.parse(row.draft_json) as TransactionTemplate["draft"], data) }))
    return { rules: rules(), templates, subscriptions: (db.prepare("SELECT key, status, name FROM assistant_subscriptions ORDER BY name COLLATE NOCASE, key").all() as unknown as SubscriptionPreference[]).map(row => ({ ...row })) }
  }
  function validateRule(body: unknown): Omit<CategoryRule, "id"> & { id?: string } {
    if (!record(body)) throw new ValidationError("Send a category rule as JSON.")
    keys(body, ["id", "type", "phrase", "categoryId"])
    if (body.type !== "expense" && body.type !== "income") throw new ValidationError("Choose expense or income for this rule.")
    const phrase = normalizeCategoryPhrase(text(body.phrase, "The phrase", 100))
    if (!phrase) throw new ValidationError("Use a note or merchant name with letters or numbers.")
    const categoryId = text(body.categoryId, "The category", 100)
    if (!callbacks.getData().categories.some(category => category.id === categoryId && category.type === body.type)) throw new ValidationError("Choose an existing category for this transaction type.")
    const id = body.id === undefined ? undefined : text(body.id, "The rule id", 100)
    return { ...(id ? { id } : {}), type: body.type, phrase, categoryId }
  }
  /** Call inside the caller's transaction when learning accompanies a confirmed save. */
  function upsertRule(input: Omit<CategoryRule, "id"> & { id?: string }): CategoryRule {
    const existing = db.prepare("SELECT id FROM assistant_category_rules WHERE type = ? AND phrase = ?").get(input.type, input.phrase) as { id: string } | undefined
    if (input.id && !db.prepare("SELECT 1 FROM assistant_category_rules WHERE id = ?").get(input.id)) throw new ValidationError("That category rule no longer exists.")
    if (input.id && existing && existing.id !== input.id) throw new ValidationError("A rule already uses that phrase for this transaction type.")
    if (!input.id && !existing && Number((db.prepare("SELECT count(*) AS count FROM assistant_category_rules").get() as { count: number }).count) >= 200) throw new ValidationError("Keep at most 200 remembered category rules. Remove an old rule first.")
    const rule = { ...input, id: input.id ?? existing?.id ?? `rule-${randomUUID()}` }
    db.prepare("INSERT INTO assistant_category_rules (id, type, phrase, category_id) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET type = excluded.type, phrase = excluded.phrase, category_id = excluded.category_id").run(rule.id, rule.type, rule.phrase, rule.categoryId)
    return rule
  }
  function saveRule(body: unknown): CategoryRule {
    const input = validateRule(body)
    return callbacks.transact(() => upsertRule(input))
  }
  function deleteRule(id: string): boolean {
    return callbacks.transact(() => Number(db.prepare("DELETE FROM assistant_category_rules WHERE id = ?").run(id).changes) > 0)
  }
  function rememberCategory(input: NewTransaction, optedIn: unknown) {
    if (optedIn !== undefined && typeof optedIn !== "boolean") throw new ValidationError("Remember category must be true or false.")
    if (!optedIn) return
    if (input.type === "transfer") throw new ValidationError("Transfers do not have category rules.")
    const rule = validateRule({ type: input.type, phrase: input.description, categoryId: input.categoryId })
    upsertRule(rule)
  }
  function validateTemplate(body: unknown): Omit<TransactionTemplate, "id"> & { id?: string } {
    if (!record(body) || !record(body.draft)) throw new ValidationError("Send a named template and its draft as JSON.")
    keys(body, ["id", "name", "draft"])
    keys(body.draft, ["type", "amount", "walletId", "toWalletId", "categoryId", "date", "description"])
    const name = text(body.name, "The template name", 40)
    const source = body.draft
    if (source.type !== "expense" && source.type !== "income" && source.type !== "transfer") throw new ValidationError("Choose the template's transaction type.")
    const draft: TransactionTemplate["draft"] = { type: source.type, description: "" }
    if (source.description !== undefined) {
      if (typeof source.description !== "string" || source.description.length > 100) throw new ValidationError("Keep the template note to 100 characters or fewer.")
      draft.description = source.description.trim()
    }
    if (source.amount !== undefined) {
      if (typeof source.amount !== "number" || !Number.isSafeInteger(source.amount) || source.amount < 1 || source.amount > MAX_AMOUNT) throw new ValidationError("Use a whole-rupiah template amount, or leave it empty.")
      draft.amount = source.amount
    }
    const data = callbacks.getData()
    for (const field of ["walletId", "toWalletId"] as const) if (source[field] !== undefined && source[field] !== "") {
      if (typeof source[field] !== "string" || !data.wallets.some(wallet => wallet.id === source[field] && wallet.kind !== "deposito")) throw new ValidationError("Choose an existing wallet for the template.")
      draft[field] = source[field]
    }
    if (draft.type !== "transfer" && draft.toWalletId) throw new ValidationError("Only a transfer template has a destination wallet.")
    if (draft.walletId && draft.walletId === draft.toWalletId) throw new ValidationError("Choose two different wallets for the template transfer.")
    if (source.categoryId !== undefined && source.categoryId !== "") {
      if (draft.type === "transfer" || typeof source.categoryId !== "string" || !data.categories.some(category => category.id === source.categoryId && category.type === draft.type)) throw new ValidationError("Choose a compatible category for the template.")
      draft.categoryId = source.categoryId
    }
    // A reusable template always gets a fresh date when opened; source.date is intentionally omitted.
    return { ...(body.id === undefined ? {} : { id: text(body.id, "The template id", 100) }), name, draft }
  }
  function saveTemplate(body: unknown): TransactionTemplate {
    const input = validateTemplate(body)
    return callbacks.transact(() => {
      if (input.id && !db.prepare("SELECT 1 FROM assistant_templates WHERE id = ?").get(input.id)) throw new ValidationError("That template no longer exists.")
      const sameName = db.prepare("SELECT id FROM assistant_templates WHERE name = ? COLLATE NOCASE").get(input.name) as { id: string } | undefined
      if (sameName && sameName.id !== input.id) throw new ValidationError("A template already uses that name.")
      if (!input.id && Number((db.prepare("SELECT count(*) AS count FROM assistant_templates").get() as { count: number }).count) >= 50) throw new ValidationError("Keep at most 50 favourite templates. Remove an old template first.")
      const saved: TransactionTemplate = { ...input, id: input.id ?? `template-${randomUUID()}` }
      db.prepare("INSERT INTO assistant_templates (id, name, draft_json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, draft_json = excluded.draft_json").run(saved.id, saved.name, JSON.stringify(saved.draft))
      return saved
    })
  }
  function deleteTemplate(id: string): boolean {
    return callbacks.transact(() => Number(db.prepare("DELETE FROM assistant_templates WHERE id = ?").run(id).changes) > 0)
  }
  function setSubscription(body: unknown): SubscriptionPreference | undefined {
    if (!record(body)) throw new ValidationError("Send the subscription preference as JSON.")
    keys(body, ["key", "status", "name"])
    const key = text(body.key, "The subscription key", 300)
    if (body.status === "remove") { callbacks.transact(() => db.prepare("DELETE FROM assistant_subscriptions WHERE key = ?").run(key)); return }
    if (body.status !== "tracked" && body.status !== "dismissed") throw new ValidationError("Choose tracked, dismissed or remove.")
    const preference: SubscriptionPreference = { key, status: body.status, name: text(body.name, "The subscription name", 100) }
    callbacks.transact(() => db.prepare("INSERT INTO assistant_subscriptions (key, status, name) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET status = excluded.status, name = excluded.name").run(preference.key, preference.status, preference.name))
    return preference
  }
  function saveBatch(body: unknown): AssistantBatchResult {
    if (!record(body) || !Array.isArray(body.transactions) || body.transactions.length < 1 || body.transactions.length > 5) throw new ValidationError("Review between 1 and 5 transactions before saving a batch.")
    keys(body, ["requestId", "transactions"])
    const requestId = text(body.requestId, "The batch request id", 100)
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) throw new ValidationError("Use a fresh batch request id.")
    const bodies = body.transactions
    const parseRows = (refs: References) => bodies.map((body: unknown, index: number) => {
      try {
        if (!record(body)) throw new ValidationError("Send each reviewed transaction as JSON.")
        keys(body, ["type", "amount", "date", "description", "walletId", "categoryId", "fromWalletId", "toWalletId", "rememberCategory"])
        if (body.rememberCategory !== undefined && typeof body.rememberCategory !== "boolean") throw new ValidationError("Remember category must be true or false.")
        const row = parseNewTransaction(body, refs)
        return { ...row, ...(body.rememberCategory ? { rememberCategory: true } : {}) }
      } catch (error) { throw new ValidationError(`Row ${index + 1}: ${error instanceof Error ? error.message : "Check this transaction."}`) }
    })
    return callbacks.transact(() => {
      const previous = db.prepare("SELECT payload_json, transactions_json FROM assistant_batch_requests WHERE request_id = ?").get(requestId) as { payload_json: string; transactions_json: string } | undefined
      if (previous) {
        // A replay must still acknowledge its original IDs after referenced data is edited/deleted.
        // Validate against the original payload, never insert or relearn anything on this path.
        const original = JSON.parse(previous.payload_json) as NewTransaction[]
        const walletIds = new Set<string>()
        const categoryTypes = new Map<string, "expense" | "income">()
        for (const row of original) {
          if (row.type === "transfer") { walletIds.add(row.fromWalletId); walletIds.add(row.toWalletId) }
          else { walletIds.add(row.walletId); categoryTypes.set(row.categoryId, row.type) }
        }
        if (previous.payload_json !== JSON.stringify(parseRows({ walletIds, categoryTypes }))) throw new ValidationError("This batch request id was already used for different transactions. Review the new batch and use a fresh request id.")
        return { requestId, transactions: JSON.parse(previous.transactions_json) as Transaction[], wallets: callbacks.getWallets() }
      }
      const rows = parseRows(callbacks.references())
      const payload = JSON.stringify(rows)
      const transactions: Transaction[] = []
      for (const row of rows) {
        const { rememberCategory: remember, ...input } = row
        const transaction: Transaction = { ...input, id: `tx-${randomUUID()}` }
        callbacks.insertTransaction(transaction)
        rememberCategory(row, remember)
        transactions.push(transaction)
      }
      db.prepare("INSERT INTO assistant_batch_requests (request_id, payload_json, transactions_json) VALUES (?, ?, ?)").run(requestId, payload, JSON.stringify(transactions))
      return { requestId, transactions, wallets: callbacks.getWallets() }
    })
  }
  return { getData, saveRule, deleteRule, saveTemplate, deleteTemplate, setSubscription, saveBatch, rememberCategory }
}

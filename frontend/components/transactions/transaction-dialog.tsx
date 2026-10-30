"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CircleAlert, Plus, Undo2, ChevronDown, Check } from "lucide-react"
import { toast } from "sonner"

import { useIsBalanceHidden } from "@/components/balance-visibility"
import { CategoryDialog } from "@/components/categories/category-dialog"
import { useData } from "@/components/data-provider"
import { DatePicker } from "@/components/date-picker"
import { AmountInput } from "@/components/amount-input"
import { Field } from "@/components/form-field"
import { CategoryOption, WalletOption, selectTriggerClasses } from "@/components/transactions/options"
import { AssistantBatchEntry } from "@/components/transactions/assistant-batch-entry"
import { AssistantEntryTools } from "@/components/transactions/assistant-entry-tools"
import { QuickEntryReview } from "@/components/transactions/quick-entry-review"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiError, errorMessage, loadData, previewTransaction } from "@/lib/api"
import type { FavouriteTemplate } from "@/lib/assistant-api"
import { formToNewCategory, type CategoryForm } from "@/lib/category-form"
import { suggestCategory, type CategorySuggestion } from "@/lib/category-suggestion"
import { toDateInput } from "@/lib/dates"
import { formatDate, formatRupiah } from "@/lib/format"
import { duplicateSignature, findTransactionDuplicates, type DuplicateMatch } from "@/lib/transaction-duplicates"
import { prepareQuickExpense } from "@/lib/quick-add"
import { describeTransaction } from "@/lib/stats"
import {
  emptyForm,
  formToTransaction,
  transactionToForm,
  validateForm,
  walletGoingBelowZero,
  type FormErrors,
  type FormField,
  type TransactionForm,
} from "@/lib/transaction-form"
import type { NewTransaction, PreviewConversation, PreviewField, Transaction, TransactionPreviewDraft, TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The transaction being edited. Leave out to add a new one. */
  editing?: Transaction
  /** A transaction to start a new one from: everything is copied, and the date is today. It is saved as a new transaction. */
  duplicateOf?: Transaction
  /** The wallet to pre-select when adding, so repeat entries are quicker. */
  defaultWalletId: string
  /** Open with a sentence before showing the editable review form. */
  quickAdd?: boolean
  /** Saves the transaction. Throws if it couldn't be saved, which keeps the dialog open. */
  onSave: (input: NewTransaction, editing?: Transaction) => Promise<void>
  /** Called as the dialog closes, to put keyboard focus back where it came from. */
  onCloseAutoFocus?: (event: Event) => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  editing,
  duplicateOf,
  defaultWalletId,
  quickAdd = false,
  onSave,
  onCloseAutoFocus,
}: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-lg [&>[data-slot=dialog-close]]:size-11 [&>[data-slot=dialog-close]]:top-2 [&>[data-slot=dialog-close]]:right-2"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* The form is mounted only while the dialog is open, so it starts fresh every time. */}
        <TransactionFormBody
          editing={editing}
          duplicateOf={duplicateOf}
          defaultWalletId={defaultWalletId}
          quickAdd={quickAdd}
          onCancel={() => onOpenChange(false)}
          onSave={async (input, another) => {
            await onSave(input, editing)
            // "Save and add another" keeps the box open for the next one.
            if (!another) onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

/** The last choice in the category list. It is never saved: it opens a small dialog to add a category instead. */
const NEW_CATEGORY = "__new__"

const TYPE_OPTIONS: { value: TransactionType; label: string; icon: typeof ArrowUpRight; selectedTone: string }[] = [
  { value: "income", label: "Income", icon: ArrowDownLeft, selectedTone: "peer-checked:text-positive" },
  { value: "expense", label: "Expense", icon: ArrowUpRight, selectedTone: "peer-checked:text-negative" },
  { value: "transfer", label: "Transfer", icon: ArrowLeftRight, selectedTone: "peer-checked:text-foreground" },
]

interface BodyProps {
  editing?: Transaction
  duplicateOf?: Transaction
  defaultWalletId: string
  quickAdd: boolean
  onCancel: () => void
  /** Saves it. `another` is true for "Save and add another": the box then stays open. */
  onSave: (input: NewTransaction, another: boolean) => Promise<void>
}

interface DraftSnapshot {
  form: TransactionForm
  conversation?: PreviewConversation
  chosenByHand: boolean
  suggestion?: CategorySuggestion
  reviewing: boolean
}

function TransactionFormBody({ editing, duplicateOf, defaultWalletId, quickAdd, onCancel, onSave }: BodyProps) {
  const { wallets: allWallets, categories, transactions, addCategory } = useData()
  // A deposito's balance follows its rate and dates, so no transaction can be recorded in it.
  const wallets = useMemo(() => allWallets.filter((wallet) => wallet.kind !== "deposito"), [allWallets])
  const isHidden = useIsBalanceHidden()
  const [form, setForm] = useState<TransactionForm>(() =>
    editing
      ? transactionToForm(editing)
      : duplicateOf
        ? { ...transactionToForm(duplicateOf), date: toDateInput(new Date()) }
        : emptyForm(defaultWalletId, new Date())
  )
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const focusNext = useRef(false)
  const [quickLine, setQuickLine] = useState("")
  const [quickError, setQuickError] = useState("")
  const [quickStatus, setQuickStatus] = useState("")
  const compactQuick = quickAdd && !editing
  const [editingDetails, setEditingDetails] = useState(false)
  const [toolMode, setToolMode] = useState<"pick" | "save">()
  const [savedReceipt, setSavedReceipt] = useState<{ amount: number; note: string }>()
  const [smartEntry, setSmartEntry] = useState(true)
  const [batchEntry, setBatchEntry] = useState(false)
  const [rememberCategory, setRememberCategory] = useState(false)
  const [assistantRefresh, setAssistantRefresh] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [uncertainSave, setUncertainSave] = useState(false)
  const [conversation, setConversation] = useState<PreviewConversation>()
  const [reply, setReply] = useState("")
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([])
  const manualGroup = useRef<string | undefined>(undefined)
  const [duplicateReview, setDuplicateReview] = useState<{ formKey: string; baseline: Transaction[]; matches: DuplicateMatch[] }>()
  const [saveCheckError, setSaveCheckError] = useState("")
  const saveCheckRequest = useRef<AbortController | null>(null)
  const revision = useRef(0)
  const previewRequest = useRef<AbortController | null>(null)
  const saveInFlight = useRef(false)
  const entryMenuFocus = useRef<string | undefined>(undefined)
  const [reviewing, setReviewing] = useState(!quickAdd || !!editing)
  const formRef = useRef<HTMLFormElement>(null)
  // A category suggested from what the note says, and whether the owner has picked one by hand. From then on
  // nothing is suggested, so their choice is never overwritten. Suggestions are only for a new transaction.
  const [suggestion, setSuggestion] = useState<CategorySuggestion>()
  // A copy keeps the category it was copied with, so a note that is changed never swaps it for a suggestion.
  const [chosenByHand, setChosenByHand] = useState(!!duplicateOf)
  // What to tell a screen reader after "Save and add another", which keeps the box open.
  const [savedStatus, setSavedStatus] = useState("")
  // The small dialog for adding a category without leaving this form.
  const [addingCategory, setAddingCategory] = useState(false)
  // True from choosing "Add new category" until the list has closed, so the list doesn't hand focus back to its own
  // button behind the little dialog (the dialog owns the keyboard then).
  const openingCategoryDialog = useRef(false)

  const isTransfer = form.type === "transfer"
  // A quiet heads-up, never a block. Left out while that wallet's balance is hidden, because it would give the balance away.
  const goingBelow = walletGoingBelowZero(form, wallets, editing)
  const belowZero = goingBelow && !isHidden(goingBelow.id) ? goingBelow : undefined
  const categoryChoices = categories.filter((category) => category.type === form.type)

  useEffect(() => () => { previewRequest.current?.abort(); saveCheckRequest.current?.abort() }, [])

  function stopPreparing() {
    revision.current++
    previewRequest.current?.abort()
    previewRequest.current = null
    setPreparing(false)
    saveCheckRequest.current?.abort()
  }

  function useManualForm() {
    stopPreparing()
    setReply("")
    setReviewing(true)
    setEditingDetails(true)
    setToolMode(undefined)
    setQuickStatus("")
    requestAnimationFrame(() => document.getElementById("tx-amount")?.focus())
  }

  // Manual edits join the same draft. Only changed fields gain manual provenance.
  function currentConversation(): PreviewConversation | undefined {
    if (!conversation) return
    const draft: TransactionPreviewDraft = {
      ...(conversation.draft.type || form.type !== "expense" ? { type: form.type } : {}),
      ...(form.amount && !validateForm(form).amount ? { amount: Number(form.amount) } : {}),
      ...(form.walletId ? { walletId: form.walletId } : {}),
      ...(form.type === "transfer" && form.toWalletId && form.toWalletId !== form.walletId ? { toWalletId: form.toWalletId } : {}),
      ...(form.type !== "transfer" && form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(form.date && !validateForm(form).date ? { date: form.date } : {}),
      description: form.note,
    }
    const sources = { ...conversation.sources }
    for (const field of Object.keys(draft) as PreviewField[]) if (draft[field] !== conversation.draft[field]) sources[field] = "manual"
    let pending = conversation.pending
    if (pending?.field === "transferEnd" && (draft.walletId !== conversation.draft.walletId || draft.toWalletId !== conversation.draft.toWalletId)) pending = undefined
    if (pending && pending.field !== "sentence" && pending.field !== "transferEnd" && draft[pending.field] !== undefined) pending = undefined
    if (!pending) {
      const missing: [PreviewField, string][] = [["type", "Is this an expense, income or transfer?"], ["amount", "How much was it?"], ["walletId", "Which wallet should this use?"], ...(form.type === "transfer" ? [["toWalletId", "Which wallet receives the money?"] as [PreviewField, string]] : []), ["date", "Which date?"], ...(form.type !== "transfer" ? [["categoryId", "Which category should this use?"] as [PreviewField, string]] : [])]
      const next = missing.find(([field]) => draft[field] === undefined)
      if (next) pending = { field: next[0], reason: "missing", message: next[1] }
    }
    return { revision: conversation.revision, draft, sources, ...(pending ? { pending } : {}) }
  }
  const activeConversation = currentConversation()
  const pendingQuestion = activeConversation?.pending
  const smartInvalid = quickAdd && (!!pendingQuestion || Object.keys(validateForm(form)).length > 0)
  const formKey = JSON.stringify(form)
  const duplicateMatches = duplicateReview?.formKey === formKey && duplicateReview.baseline === transactions
    ? duplicateReview.matches : findTransactionDuplicates(form, transactions, editing?.id)

  function snapshotDraft(): DraftSnapshot {
    return structuredClone({ form, conversation: currentConversation(), chosenByHand, suggestion, reviewing })
  }

  function rememberDraft(field?: string) {
    if (!quickAdd || !smartEntry || !reviewing || editing) return
    if (field && manualGroup.current === field) return
    manualGroup.current = field
    const snapshot = snapshotDraft()
    setDraftHistory(history => [...history.slice(-19), snapshot])
  }

  function undoDraftChange() {
    if (saving || uncertainSave || !draftHistory.length) return
    stopPreparing()
    manualGroup.current = undefined
    const snapshot = structuredClone(draftHistory[draftHistory.length - 1])
    const next = snapshot.form
    if (!wallets.some(w => w.id === next.walletId)) next.walletId = ""
    if (!wallets.some(w => w.id === next.toWalletId)) next.toWalletId = ""
    if (!categories.some(c => c.id === next.categoryId && c.type === next.type)) next.categoryId = ""
    if (snapshot.conversation) {
      snapshot.conversation.revision = revision.current
      // Deleted references cannot be resurrected by undo.
      for (const field of ["walletId", "toWalletId", "categoryId"] as const) if (!next[field]) delete snapshot.conversation.draft[field]
      if (snapshot.conversation.pending?.walletId && !wallets.some(w => w.id === snapshot.conversation!.pending?.walletId)) delete snapshot.conversation.pending
    }
    setForm(next)
    setConversation(snapshot.conversation)
    setChosenByHand(snapshot.chosenByHand)
    setSuggestion(snapshot.suggestion && categories.some(c => c.id === snapshot.suggestion!.category.id) ? snapshot.suggestion : undefined)
    setReviewing(snapshot.reviewing)
    setDraftHistory(history => history.slice(0, -1))
    setReply("")
    setErrors({})
    setQuickError("")
    setSaveCheckError("")
    setRememberCategory(false)
    setQuickStatus("Last draft change undone. Review the restored details.")
    requestAnimationFrame(() => document.getElementById(snapshot.conversation?.pending ? "tx-reply" : editingDetails ? "tx-amount" : "tx-review-heading")?.focus())
  }

  function startNewDraft() {
    entryMenuFocus.current = "tx-quick-add"
    setRememberCategory(false)
    stopPreparing()
    setConversation(undefined)
    setReply("")
    setQuickLine("")
    setQuickError("")
    setQuickStatus("")
    setReviewing(false)
    setEditingDetails(false)
    setToolMode(undefined)
    setSavedReceipt(undefined)
    setForm(emptyForm(form.walletId, new Date()))
    setChosenByHand(false)
    setDraftHistory([])
    manualGroup.current = undefined
    setDuplicateReview(undefined)
    setSaveCheckError("")
  }

  async function prepareSmartEntry(answer?: string) {
    const text = answer ?? quickLine
    if (saveInFlight.current || previewRequest.current || uncertainSave || !text.trim()) return
    const base = answer === undefined ? undefined : currentConversation()
    const before = base ? snapshotDraft() : undefined
    manualGroup.current = undefined
    if (base) base.revision = revision.current
    const requestRevision = revision.current
    const controller = new AbortController()
    previewRequest.current = controller
    setPreparing(true)
    setToolMode(undefined)
    if (!base) setReviewing(false)
    setQuickError("")
    setQuickStatus("Preparing on this computer…")
    try {
      const result = await previewTransaction(text, form.walletId, controller.signal, base)
      if (controller.signal.aborted || previewRequest.current !== controller || revision.current !== requestRevision || (base && result.conversation?.revision !== base.revision + 1)) return
      const draft = result.draft
      const next = {
        ...emptyForm("", new Date()),
        type: draft.type ?? "expense",
        amount: draft.amount === undefined ? "" : String(draft.amount),
        walletId: draft.walletId ?? "",
        toWalletId: draft.toWalletId ?? "",
        categoryId: draft.categoryId ?? "",
        date: draft.date ?? "",
        note: draft.description ?? "",
      }
      if (!base || next.note !== form.note || next.type !== form.type || next.categoryId !== form.categoryId) setRememberCategory(false)
      const questionKey = (state?: PreviewConversation) => state?.pending ? [state.pending.field, state.pending.reason, state.pending.walletId] : null
      if (before && (JSON.stringify(before.form) !== JSON.stringify(next) || JSON.stringify(questionKey(before.conversation)) !== JSON.stringify(questionKey(result.conversation)))) {
        setDraftHistory(history => [...history.slice(-19), before])
      }
      if (!base) setDraftHistory([])
      setConversation(result.conversation)
      revision.current = result.conversation?.revision ?? revision.current + 1
      setReply("")
      setForm(next)
      setErrors({})
      setSuggestion(undefined)
      // Keep the reviewed suggestion when its note is edited, just like a category chosen in the form.
      setChosenByHand(!!next.categoryId)
      if (result.status !== "ready") {
        setQuickError(result.message)
        setQuickStatus("")
        setReviewing(!!Object.keys(result.draft).length)
        requestAnimationFrame(() => document.getElementById("tx-reply")?.focus())
        return
      }
      setReviewing(true)
      if (!base) setEditingDetails(false)
      const defaults = result.defaults.map(field => field === "wallet"
        ? `Default wallet: ${wallets.find(w => w.id === next.walletId)?.name ?? "choose below"}.`
        : field === "date" ? `Default date: ${formatDate(next.date)}.` : "Category defaults to Other.")
      setQuickStatus([...defaults, result.message].join(" "))
      requestAnimationFrame(() => document.getElementById(base && editingDetails ? "tx-reply" : "tx-review-heading")?.focus())
    } catch (error) {
      if (controller.signal.aborted || previewRequest.current !== controller) return
      setQuickError(errorMessage(error))
      setQuickStatus("")
    } finally {
      if (previewRequest.current === controller) {
        previewRequest.current = null
        setPreparing(false)
      }
    }
  }

  /** Fixing a field clears its message straight away. */
  function clearError(field: FormField) {
    if (field in errors) {
      setErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }
  }

  function update<K extends keyof TransactionForm>(field: K, value: TransactionForm[K]) {
    if (form[field] === value) return
    rememberDraft(field)
    stopPreparing()
    setForm((current) => ({ ...current, [field]: value }))
    clearError(field as FormField)
  }

  function changeType(type: TransactionType) {
    setRememberCategory(false)
    if (form.type === type && conversation?.draft.type) return
    rememberDraft()
    stopPreparing()
    setQuickError("")
    setQuickStatus("")
    if (conversation) setConversation({ ...conversation, draft: { ...conversation.draft, type }, sources: { ...conversation.sources, type: "manual" } })
    // A new transaction may already have a note to suggest a category from.
    const found = !editing && type !== "transfer" ? suggestCategory(form.note, type, transactions, categories) : undefined
    setChosenByHand(false)
    setSuggestion(found)
    setForm((current) => ({
      ...current,
      type,
      // An income category can't be used for spending (or the other way round), and transfers have none.
      categoryId:
        found?.category.id ?? (categories.some((c) => c.id === current.categoryId && c.type === type) ? current.categoryId : ""),
      toWalletId: type === "transfer" && current.toWalletId !== current.walletId ? current.toWalletId : "",
    }))
    setErrors({})
  }

  /** Typing a note suggests the category it was filed under before, until the owner picks one themselves. */
  function changeNote(note: string) {
    setRememberCategory(false)
    if (note === form.note) return
    rememberDraft("note")
    stopPreparing()
    const suggesting = !editing && !chosenByHand && form.type !== "transfer"
    const found = suggesting ? suggestCategory(note, form.type, transactions, categories) : undefined
    setForm((current) => ({ ...current, note, ...(suggesting ? { categoryId: found?.category.id ?? "" } : {}) }))
    if (suggesting) {
      setSuggestion(found)
      if (found) clearError("categoryId")
    }
  }

  function chooseCategory(value: string) {
    // The list never reports "nothing chosen" when a person picks something. It does report it by itself when a
    // category has only just been added (its hidden native list doesn't know the new option yet), and that must
    // not wipe the category we have just chosen.
    if (value === "") return
    if (value === NEW_CATEGORY) {
      openingCategoryDialog.current = true
      setAddingCategory(true)
      return
    }
    // Capture the category's previous provenance before marking the selection manual.
    rememberDraft("categoryId")
    setRememberCategory(false)
    setChosenByHand(true)
    setSuggestion(undefined)
    update("categoryId", value)
  }

  function fillFromQuickLine() {
    if (smartEntry) { void prepareSmartEntry(); return }
    if (saving || uncertainSave) return
    const result = prepareQuickExpense(quickLine, form, wallets, categories, transactions, chosenByHand)
    setQuickStatus("")
    if (!result.ok) {
      setQuickError(result.error)
      return
    }
    setForm(result.form)
    setSuggestion(result.suggestion)
    setErrors({})
    setQuickError("")
    setReviewing(true)
    setEditingDetails(false)
    const wallet = wallets.find((entry) => entry.id === result.form.walletId)
    setQuickStatus(`Form filled. ${result.walletMatched ? "Wallet" : "Kept wallet"}: ${wallet?.name ?? "choose below"}. ${result.form.categoryId ? "Review the details, then add the transaction." : "Choose a category below, then add the transaction."}`)
    // Leave the text available to correct; put the keyboard on the filled amount for review.
    requestAnimationFrame(() => document.getElementById("tx-review-heading")?.focus())
  }

  /** Saves a category made from inside this form, and picks it for the transaction. */
  async function handleNewCategory(categoryForm: CategoryForm) {
    try {
      const saved = await addCategory(formToNewCategory(categoryForm))
      setChosenByHand(true)
      setSuggestion(undefined)
      update("categoryId", saved.id)
      toast.success("Category added", { description: saved.name })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the little form to stay open
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving || preparing || uncertainSave) return
    if (!reviewing) {
      fillFromQuickLine()
      return
    }
    // Smart entry saves only through a deliberate footer button, never an implicit Enter submission.
    if (!compactQuick) await save(false)
  }

  useEffect(() => {
    if (!saving && focusNext.current) {
      focusNext.current = false
      document.getElementById(quickAdd ? "tx-quick-add" : "tx-amount")?.focus()
    }
  }, [saving, quickAdd])

  /** Checks the form and saves it. With `another`, the box stays open and starts over for the next one. */
  async function save(another: boolean) {
    if (saveInFlight.current || preparing || uncertainSave || smartInvalid || (compactQuick && (editingDetails || !!toolMode || !reviewing || !!savedReceipt))) return
    const found = validateForm(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      // Send the keyboard to the first field that needs attention.
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus())
      return
    }
    saveInFlight.current = true
    setSaving(true)
    setSaveCheckError("")
    const check = new AbortController()
    saveCheckRequest.current = check
    const input = { ...formToTransaction(form, new Date(), editing), ...(rememberCategory && form.type !== "transfer" && form.note.trim() ? { rememberCategory: true } : {}) }
    let checking = true
    try {
      // Read current data at confirmation too: another device may have just added a match.
      const latest = await loadData(undefined, check.signal)
      if (check.signal.aborted) return
      const matches = findTransactionDuplicates(form, latest.transactions, editing?.id)
      if (matches.length && duplicateSignature(matches) !== duplicateSignature(duplicateMatches)) {
        setDuplicateReview({ formKey, baseline: transactions, matches })
        setSaveCheckError("A similar entry appeared since your last review. Check it below, then confirm again if this is another payment.")
        requestAnimationFrame(() => document.getElementById("tx-duplicates")?.scrollIntoView({ block: "nearest" }))
        return
      }
      checking = false
      saveCheckRequest.current = null
      await onSave(input, compactQuick || another)
      if (rememberCategory) setAssistantRefresh(value => value + 1)
      if (compactQuick) {
        stopPreparing()
        setDraftHistory([])
        setRememberCategory(false)
        setSavedReceipt({ amount: input.amount, note: form.note })
        requestAnimationFrame(() => document.getElementById("tx-add-another")?.focus())
      } else if (another) startNext()
    } catch (error) {
      if (checking && !check.signal.aborted) setSaveCheckError(`Could not check for similar entries. ${errorMessage(error)} Try saving again when connected.`)
      if (error instanceof ApiError && error.mayHaveSaved) setUncertainSave(true)
      // The page has already explained what went wrong. Stay open so nothing typed is lost.
    } finally {
      if (saveCheckRequest.current === check) saveCheckRequest.current = null
      saveInFlight.current = false
      setSaving(false)
    }
  }

  /**
   * After "Save and add another": the kind, the wallets and the date stay (entries tend to come in batches from one day and
   * one wallet), and the amount, the note and the category start over. The keyboard goes to the amount, or, in Quick add,
   * back to the one-line box.
   */
  function startNext() {
    setSavedReceipt(undefined)
    setEditingDetails(false)
    setToolMode(undefined)
    setRememberCategory(false)
    setDraftHistory([])
    manualGroup.current = undefined
    setDuplicateReview(undefined)
    setSaveCheckError("")
    setConversation(undefined)
    setReply("")
    revision.current++
    focusNext.current = true
    // Simple expense entry starts over as an expense; smart entry keeps the chosen type.
    setForm((current) => ({
      ...current,
      ...(quickAdd && !smartEntry ? { type: "expense" as const, toWalletId: "" } : {}),
      amount: "",
      note: "",
      categoryId: "",
    }))
    setSuggestion(undefined)
    setChosenByHand(false)
    setErrors({})
    setSavedStatus("Saved. The form is ready for the next one.")
    if (quickAdd) {
      setQuickLine("")
      setQuickError("")
      setQuickStatus("Saved. Type the next one.")
      setReviewing(false)

    }
  }

  function useTemplate(template: FavouriteTemplate) {
    if (saving || uncertainSave) return
    stopPreparing()
    setSmartEntry(true)
    const draft = template.draft
    const type = draft.type ?? "expense"
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
    const next: TransactionForm = { ...emptyForm("", new Date()), type, amount: draft.amount === undefined ? "" : String(draft.amount), walletId: wallets.some(wallet => wallet.id === draft.walletId) ? draft.walletId! : "", toWalletId: type === "transfer" && wallets.some(wallet => wallet.id === draft.toWalletId) && draft.toWalletId !== draft.walletId ? draft.toWalletId! : "", categoryId: type !== "transfer" && categories.some(category => category.id === draft.categoryId && category.type === type) ? draft.categoryId! : "", date: today, note: draft.description ?? "" }
    const context: PreviewConversation = { revision: revision.current, draft: { type, ...(next.amount ? { amount: Number(next.amount) } : {}), ...(next.walletId ? { walletId: next.walletId } : {}), ...(next.toWalletId ? { toWalletId: next.toWalletId } : {}), ...(next.categoryId ? { categoryId: next.categoryId } : {}), date: today, description: next.note }, sources: { type: "manual", amount: "manual", walletId: "manual", toWalletId: "manual", categoryId: "manual", date: "default", description: "manual" } }
    setForm(next)
    setToolMode(undefined)
    setEditingDetails(false)
    setConversation(context)
    setReviewing(true)
    setQuickLine(`Template: ${template.name}`)
    setReply("")
    setErrors({})
    setDraftHistory([])
    manualGroup.current = undefined
    setQuickError("")
    setQuickStatus(`Template ${template.name} opened for ${formatDate(today)}. Review its fields before saving.`)
    setSaveCheckError("")
    setDuplicateReview(undefined)
    setChosenByHand(!!next.categoryId)
    setSuggestion(undefined)
    setRememberCategory(false)
    requestAnimationFrame(() => document.getElementById(validateForm(next).amount ? "tx-reply" : "tx-review-heading")?.focus())
  }

  function reviewDetails() {
    const found = validateForm(form)
    setErrors(found)
    if (Object.keys(found).length || pendingQuestion) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus())
      return
    }
    setEditingDetails(false)
    setQuickError("")
    setQuickStatus("")
    requestAnimationFrame(() => document.getElementById("tx-review-heading")?.focus())
  }

  function openTools(mode: "pick" | "save") {
    entryMenuFocus.current = "tx-review-heading"
    stopPreparing()
    setToolMode(mode)
  }

  function switchEntryMode(smart: boolean) {
    entryMenuFocus.current = "tx-quick-add"
    stopPreparing()
    setSmartEntry(smart)
    setRememberCategory(false)
    setDraftHistory([])
    manualGroup.current = undefined
    setDuplicateReview(undefined)
    setSaveCheckError("")
    setConversation(undefined)
    setReply("")
    setReviewing(false)
    setEditingDetails(false)
    setToolMode(undefined)
    setQuickError("")
    setQuickStatus("")
    setForm(emptyForm(form.walletId, new Date()))
    setChosenByHand(false)
  }

  if (batchEntry) return <AssistantBatchEntry defaultWalletId={form.walletId || defaultWalletId} onBack={() => setBatchEntry(false)} onDone={onCancel} />

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} onBlurCapture={() => { manualGroup.current = undefined }} noValidate className="grid grid-cols-1 gap-5">
        <DialogHeader>
          <DialogTitle className="type-title pr-8"><span id="tx-review-heading" tabIndex={-1} className="outline-none">
            {savedReceipt ? "Transaction added" : toolMode === "pick" ? "Favourites" : toolMode === "save" ? "Save as favourite" : compactQuick && editingDetails ? "Edit details" : compactQuick && pendingQuestion ? "Quick add" : editing ? "Edit transaction" : duplicateOf ? "Duplicate transaction" : compactQuick && reviewing && !pendingQuestion ? `Review ${form.type}` : reviewing ? "Add transaction" : "Quick add"}
          </span></DialogTitle>
          {duplicateOf && !editing ? (
            <DialogDescription>
              A copy of &ldquo;{describeTransaction(duplicateOf, allWallets, categories).title}&rdquo;, dated today. Change what you
              like, then save it.
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Record money coming in, money going out, or a move between your wallets.
            </DialogDescription>
          )}
        </DialogHeader>

        {savedReceipt ? <div className="grid gap-5">
          <div className="flex items-center gap-3"><Check className="size-6 text-positive" aria-hidden /><p role="status" className="text-lg font-medium tabular-nums">{formatRupiah(savedReceipt.amount)} saved</p></div>
          {savedReceipt.note ? <p className="text-sm text-muted-foreground wrap-anywhere">{savedReceipt.note}</p> : null}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="lg" onClick={onCancel}>Done</Button><Button id="tx-add-another" type="button" size="lg" onClick={() => { startNext(); requestAnimationFrame(() => document.getElementById("tx-quick-add")?.focus()) }}>Add another</Button></div>
        </div> : null}

        {compactQuick && !savedReceipt ? <>
          {toolMode ? <div className="grid gap-4">
            <AssistantEntryTools mode={toolMode} form={form} disabled={saving || preparing || uncertainSave} canSaveTemplate={reviewing && !smartInvalid} refreshKey={assistantRefresh} onUse={useTemplate} />
            <Button type="button" variant="ghost" size="lg" className="justify-self-start" onClick={() => { setToolMode(undefined); requestAnimationFrame(() => document.getElementById(reviewing ? "tx-review-heading" : "tx-quick-add")?.focus()) }}>Back</Button>
          </div> : <>
            {!reviewing && !conversation ? <div className="grid gap-3">
              <Field label={smartEntry ? "What happened?" : "Your expense"} htmlFor="tx-quick-add" error={quickError}>
                <Input id="tx-quick-add" value={quickLine} maxLength={smartEntry ? 500 : 240} autoComplete="off" autoFocus placeholder={smartEntry ? "e.g. kopi hitam 10rb dari BCA" : "nasi goreng 25rb BCA"} aria-invalid={quickError ? true : undefined} aria-describedby="tx-quick-help" disabled={saving || uncertainSave} onChange={event => { stopPreparing(); setQuickLine(event.target.value); setQuickError(""); setQuickStatus("") }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!event.nativeEvent.isComposing && !event.repeat) fillFromQuickLine() } }} className="min-h-11 bg-card" />
              </Field>
              <p id="tx-quick-help" className="text-xs text-muted-foreground">{smartEntry ? "English or Indonesian. Review before saving." : "An expense in one line, without the assistant."}</p>
              <Button type="button" size="lg" disabled={saving || preparing || uncertainSave || !quickLine.trim()} onClick={fillFromQuickLine}>{preparing ? "Preparing..." : "Review"}</Button>
            </div> : null}

            {conversation && (pendingQuestion || editingDetails) ? <div className="grid gap-3">
              <p id="tx-question" role="status" aria-live="polite" className="text-sm font-medium wrap-anywhere">{pendingQuestion?.message ?? "Describe a change, or edit the fields below."}</p>
              <Field label={pendingQuestion ? "Your answer" : "Describe a change"} htmlFor="tx-reply" error={quickError && !pendingQuestion ? quickError : undefined}>
                <div className="flex gap-2"><Input id="tx-reply" aria-label="Reply or correction" value={reply} maxLength={500} autoComplete="off" disabled={saving || uncertainSave} aria-describedby="tx-question" placeholder={pendingQuestion?.field === "amount" ? "e.g. 35rb" : "e.g. use Bank Jago"} className="min-h-11 min-w-0 flex-1 bg-card" onChange={event => { stopPreparing(); setReply(event.target.value); setQuickError("") }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); if (!event.nativeEvent.isComposing && !event.repeat) void prepareSmartEntry(reply) } }} /><Button type="button" variant="secondary" size="lg" disabled={saving || preparing || uncertainSave || !reply.trim()} onClick={() => void prepareSmartEntry(reply)}>Apply</Button></div>
              </Field>
              {pendingQuestion && quickError && quickError !== pendingQuestion.message ? <p role="alert" className="text-sm text-muted-foreground">{quickError}</p> : null}
              {pendingQuestion?.field === "transferEnd" ? <div className="flex gap-2">{["Source", "Destination"].map(label => <Button key={label} type="button" variant="secondary" size="lg" disabled={preparing || saving || uncertainSave} onClick={() => void prepareSmartEntry(label)}>{label}</Button>)}</div> : null}
            </div> : null}

            {reviewing && !editingDetails && !pendingQuestion ? <QuickEntryReview form={form} wallets={wallets} categories={categories} conversation={activeConversation} /> : null}
            {reviewing && !editingDetails && belowZero ? <p role="status" className="flex items-start gap-1.5 text-sm text-muted-foreground"><CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />This takes {belowZero.name} below zero. You can still save it.</p> : null}
            {preparing ? <Button type="button" variant="ghost" size="lg" className="justify-self-start" onClick={() => { stopPreparing(); setQuickStatus("Preparation stopped. Your sentence is still here.") }}>Stop</Button> : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {reviewing && !editingDetails && !pendingQuestion ? <Button type="button" variant="ghost" size="lg" onClick={() => { setEditingDetails(true); requestAnimationFrame(() => document.getElementById("tx-amount")?.focus()) }}>Edit details</Button> : !editingDetails ? <Button type="button" variant="ghost" size="lg" disabled={saving || uncertainSave} onClick={useManualForm}>Enter manually</Button> : null}
              {draftHistory.length > 0 ? <Button type="button" variant="ghost" size="lg" disabled={saving || uncertainSave} onClick={undoDraftChange} aria-label="Undo last change"><Undo2 className="size-4" aria-hidden />Undo</Button> : null}
              <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="lg" disabled={saving || preparing || uncertainSave} aria-label="More entry options">More<ChevronDown className="size-4" aria-hidden /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="[&_[role=menuitem]]:min-h-11" onCloseAutoFocus={event => {
                if (!entryMenuFocus.current) return
                event.preventDefault()
                const id = entryMenuFocus.current
                entryMenuFocus.current = undefined
                requestAnimationFrame(() => document.getElementById(id)?.focus())
              }}>
                {!reviewing ? <><DropdownMenuItem onSelect={() => { entryMenuFocus.current = "assistant-batch-text"; stopPreparing(); setBatchEntry(true) }}>Several transactions</DropdownMenuItem><DropdownMenuItem onSelect={() => openTools("pick")}>Use a favourite</DropdownMenuItem><DropdownMenuItem onSelect={() => switchEntryMode(!smartEntry)}>{smartEntry ? "Simple expense" : "Smart entry"}</DropdownMenuItem></> : <><DropdownMenuItem disabled={smartInvalid} onSelect={() => openTools("save")}>Save as favourite</DropdownMenuItem><DropdownMenuItem onSelect={startNewDraft}>Start new</DropdownMenuItem><DropdownMenuItem onSelect={() => switchEntryMode(!smartEntry)}>{smartEntry ? "Simple expense" : "Smart entry"}</DropdownMenuItem></>}
              </DropdownMenuContent></DropdownMenu>
            </div>
            <p role="status" aria-live="polite" aria-atomic="true" className={cn("text-sm text-muted-foreground wrap-anywhere", (!quickStatus || (!preparing && reviewing && !editingDetails && !pendingQuestion)) && "sr-only")}>{quickStatus}</p>
          </>}
        </> : null}

        {reviewing && !savedReceipt && !toolMode ? <>
        <div className={cn("grid gap-5", compactQuick && !editingDetails && "hidden")}>
        <fieldset>
          <legend className="sr-only">Type of transaction</legend>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon, selectedTone }) => (
              <label key={value} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="transaction-type"
                  value={value}
                  checked={(!conversation || !!conversation.draft.type) && form.type === value}
                  onChange={() => changeType(value)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground peer-checked:bg-card peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                    selectedTone
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field
          label="Amount"
          htmlFor="tx-amount"
          error={errors.amount}
          hint={
            belowZero ? (
              <span role="status" data-slot="below-zero" className="flex items-start gap-1.5">
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden />
                <span>This takes {belowZero.name} below zero. You can still save it.</span>
              </span>
            ) : undefined
          }
        >
          <AmountInput
            id="tx-amount"
            autoFocus
            value={form.amount}
            onChange={(digits) => update("amount", digits)}
            invalid={!!errors.amount}
            describedBy={errors.amount ? "tx-amount-error" : undefined}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {isTransfer ? null : (
            <Field
              label="Category"
              htmlFor="tx-category"
              error={errors.categoryId}
              hint={suggestion ? <>Suggested from your earlier &ldquo;{suggestion.basedOn}&rdquo;.</> : undefined}
            >
              <Select value={form.categoryId} onValueChange={chooseCategory}>
                <SelectTrigger
                  id="tx-category"
                  className={selectTriggerClasses}
                  aria-invalid={errors.categoryId ? true : undefined}
                  aria-describedby={errors.categoryId ? "tx-category-error" : undefined}
                >
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  onCloseAutoFocus={(event) => {
                    if (!openingCategoryDialog.current) return
                    openingCategoryDialog.current = false
                    event.preventDefault()
                  }}
                >
                  {categoryChoices.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <CategoryOption category={category} />
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  {/* The text value starts with "+", so typing letters to pick a category can never land here by accident. */}
                  <SelectItem value={NEW_CATEGORY} textValue="+ Add new category">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <Plus className="size-3.5" aria-hidden />
                      </span>
                      Add new category
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label={isTransfer ? "From wallet" : "Wallet"} htmlFor="tx-wallet" error={errors.walletId}>
            <Select value={form.walletId} onValueChange={(value) => update("walletId", value)}>
              <SelectTrigger
                id="tx-wallet"
                className={selectTriggerClasses}
                aria-invalid={errors.walletId ? true : undefined}
                aria-describedby={errors.walletId ? "tx-wallet-error" : undefined}
              >
                <SelectValue placeholder="Choose a wallet" />
              </SelectTrigger>
              <SelectContent position="popper">
                {wallets.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.id}>
                    <WalletOption wallet={wallet} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isTransfer ? (
            <Field label="To wallet" htmlFor="tx-to-wallet" error={errors.toWalletId}>
              <Select value={form.toWalletId} onValueChange={(value) => update("toWalletId", value)}>
                <SelectTrigger
                  id="tx-to-wallet"
                  className={selectTriggerClasses}
                  aria-invalid={errors.toWalletId ? true : undefined}
                  aria-describedby={errors.toWalletId ? "tx-to-wallet-error" : undefined}
                >
                  <SelectValue placeholder="Choose a wallet" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id} disabled={wallet.id === form.walletId}>
                      <WalletOption wallet={wallet} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          <Field label="Date" htmlFor="tx-date" error={errors.date}>
            <DatePicker
              id="tx-date"
              value={form.date}
              onChange={(value) => update("date", value)}
              invalid={!!errors.date}
              describedBy={errors.date ? "tx-date-error" : undefined}
            />
          </Field>

          <Field label="Note (optional)" htmlFor="tx-note">
            <Input
              id="tx-note"
              value={form.note}
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Lunch with the team"
              onChange={(event) => changeNote(event.target.value)}
              className="h-10 bg-card dark:bg-card"
            />
          </Field>
        </div>

        <p role="status" className="sr-only">
          {savedStatus}
        </p>

        {quickAdd && smartEntry && !editing && form.type !== "transfer" && form.note.trim().length >= 3 && form.categoryId ? <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={rememberCategory} disabled={saving || uncertainSave} onChange={event => setRememberCategory(event.target.checked)} /><span className="wrap-anywhere">Remember this category for &ldquo;{form.note.trim()}&rdquo;<span className="mt-1 block text-xs text-muted-foreground">For this exact note and type, after saving.</span></span></label> : null}

        </div>

        {duplicateMatches.length ? <div id="tx-duplicates" role="status" aria-live="polite" aria-atomic="true" className="grid gap-2 rounded-xl bg-muted/60 p-3 text-sm wrap-anywhere">
          <p className="font-medium">{duplicateMatches.length === 1 ? "A similar entry is already in Kaya." : `${duplicateMatches.length} similar entries are already in Kaya.`}</p>
          <p className="text-muted-foreground">Same amount, {isTransfer ? "transfer direction" : "wallet"} and date. You can still confirm if this is another payment.</p>
          <ul className="grid gap-2">
            {duplicateMatches.slice(0, 3).map(({ transaction: tx, sameNote }) => <li key={tx.id} className="grid gap-0.5">
              <span>{tx.description || (tx.type === "transfer" ? "Transfer" : "Transaction")} · {formatRupiah(tx.amount)} · {formatDate(form.date)}</span>
              {sameNote ? <span className="text-muted-foreground">The note matches too.</span> : null}
            </li>)}
          </ul>
          {duplicateMatches.length > 3 ? <p className="text-muted-foreground">And {duplicateMatches.length - 3} more matching entries.</p> : null}
          <a className="justify-self-start underline underline-offset-4" target="_blank" rel="noopener noreferrer" href={`/transactions?month=${encodeURIComponent(form.date.slice(0, 7))}&wallet=${encodeURIComponent(form.walletId)}&type=${form.type}`}>View this wallet in Transactions (new tab)</a>
        </div> : null}
        {saveCheckError ? <p role="alert" className="text-sm text-muted-foreground">{saveCheckError}</p> : null}

        <DialogFooter className="mt-1 flex-row justify-end gap-2">
          {compactQuick ? <>
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Cancel</Button>
            {editingDetails ? <Button type="button" size="lg" disabled={saving || preparing || uncertainSave || smartInvalid} onClick={reviewDetails}>Review</Button> : <Button type="button" size="lg" disabled={saving || preparing || uncertainSave || smartInvalid} onKeyDown={event => { if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault() }} onClick={event => { if (event.detail < 2) void save(false) }}>{saving ? "Saving..." : "Save"}</Button>}
          </> : <>
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>Cancel</Button>
            {editing ? null : <Button type="button" variant="secondary" size="lg" disabled={saving || preparing || uncertainSave} onClick={() => void save(true)}>Save and add another</Button>}
            <Button type="submit" size="lg" disabled={saving || preparing || uncertainSave}>{saving ? "Saving..." : editing ? "Save changes" : "Add transaction"}</Button>
          </>}
        </DialogFooter>
        {uncertainSave ? <p role="alert" className="text-sm text-muted-foreground">The save could not be confirmed. <a href="/transactions" className="underline underline-offset-4">Check Transactions</a> before adding it again.</p> : null}
        </> : null}
      </form>

      {/* Outside the form on purpose: a form inside this dialog's form would also submit this one. */}
      {isTransfer ? null : (
        <CategoryDialog
          open={addingCategory}
          onOpenChange={setAddingCategory}
          fixedType={form.type === "income" ? "income" : "expense"}
          onSave={handleNewCategory}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            document.getElementById("tx-category")?.focus({ preventScroll: true })
          }}
        />
      )}
    </>
  )
}

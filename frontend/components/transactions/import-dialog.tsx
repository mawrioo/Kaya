"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { ChevronDown, CircleAlert, FileSpreadsheet, ShieldCheck, Upload } from "lucide-react"

import { useIsBalanceHidden } from "@/components/balance-visibility"
import { useData } from "@/components/data-provider"
import { Field } from "@/components/form-field"
import { SegmentedSwitch } from "@/components/segmented-switch"
import { NativeSelect } from "@/components/native-select"
import { ImportRow } from "@/components/transactions/import-row"
import { WalletOption, selectTriggerClasses } from "@/components/transactions/options"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MAX_IMPORT_ROWS,
  bankBalance,
  buildReview,
  guessColumns,
  importedChange,
  parseCsv,
  readRows,
  toTransactions,
  type AmountMode,
  type ColumnMapping,
  type ParsedFile,
} from "@/lib/bank-csv"
import { formatRupiah } from "@/lib/format"
import type { NewTransaction } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The wallet to start with: the one used last. */
  defaultWalletId: string
  /** Today, "2026-10-09", from the server, for dates a file writes with no year. */
  today: string
  /** Saves the transactions. Throws if it couldn't, which keeps the box open. */
  onImport: (transactions: NewTransaction[], walletName: string) => Promise<void>
  onCloseAutoFocus?: (event: Event) => void
}

/**
 * Import from a bank's CSV file. Three small steps in one box: choose the wallet and the file, check that the columns were
 * read right, then look through every line before anything is saved. The file is read here, on this computer. Lines the app
 * already has start unticked, so importing the same statement twice adds nothing the second time.
 */
export function ImportDialog({ open, onOpenChange, defaultWalletId, today, onImport, onCloseAutoFocus }: ImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] grid-cols-1 gap-5 overflow-y-auto sm:max-w-2xl" onCloseAutoFocus={onCloseAutoFocus}>
        {/* Mounted only while open, so it starts from the first step every time. */}
        <ImportBody defaultWalletId={defaultWalletId} today={today} onCancel={() => onOpenChange(false)} onImport={onImport} />
      </DialogContent>
    </Dialog>
  )
}

interface Edit {
  include?: boolean
  categoryId?: string
}

const AMOUNT_MODES: { value: AmountMode; label: string }[] = [
  { value: "signed", label: "+ and −" },
  { value: "debit-credit", label: "Out and in apart" },
  { value: "typed", label: "With DB / CR" },
]

function ImportBody({
  defaultWalletId,
  today,
  onCancel,
  onImport,
}: {
  defaultWalletId: string
  today: string
  onCancel: () => void
  onImport: ImportDialogProps["onImport"]
}) {
  const { wallets, categories, transactions } = useData()
  const isHidden = useIsBalanceHidden()
  // Nothing can be recorded in a deposito, so a file can't be imported into one.
  const spendable = useMemo(() => wallets.filter((wallet) => wallet.kind !== "deposito"), [wallets])
  const [walletId, setWalletId] = useState(spendable.some((wallet) => wallet.id === defaultWalletId) ? defaultWalletId : (spendable[0]?.id ?? ""))
  const [file, setFile] = useState<{ name: string; parsed: ParsedFile }>()
  const [mapping, setMapping] = useState<ColumnMapping>()
  const [edits, setEdits] = useState<Record<number, Edit>>({})
  const [fileError, setFileError] = useState("")
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importError, setImportError] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const wallet = spendable.find((entry) => entry.id === walletId)

  // What the file says, what the app makes of it, and the owner's own ticks and categories on top.
  const read = useMemo(
    () => (file && mapping ? readRows(file.parsed.rows, mapping, today, file.parsed.lineOf) : undefined),
    [file, mapping, today]
  )
  const base = useMemo(
    () => (read ? buildReview(read.rows, { walletId, transactions, categories }) : []),
    [read, walletId, transactions, categories]
  )
  const rows = useMemo(() => base.map((row) => (edits[row.id] ? { ...row, ...edits[row.id] } : row)), [base, edits])

  const importable = rows.filter((row) => !row.problem)
  const ticked = rows.filter((row) => row.include)
  const duplicates = rows.filter((row) => row.duplicate).length
  const problems = rows.length - importable.length
  const change = importedChange(rows)
  const after = wallet ? wallet.balance + change : 0
  const bank = read ? bankBalance(read.rows) : null
  const balanceHidden = !!wallet && isHidden(wallet.id)

  const toggle = useCallback((id: number, include: boolean) => setEdits((current) => ({ ...current, [id]: { ...current[id], include } })), [])
  const chooseCategory = useCallback((id: number, categoryId: string) => setEdits((current) => ({ ...current, [id]: { ...current[id], categoryId } })), [])

  function setAll(include: boolean) {
    setEdits(Object.fromEntries(importable.map((row) => [row.id, { ...edits[row.id], include }])))
  }

  function changeMapping(change: Partial<ColumnMapping>) {
    setMapping((current) => (current ? { ...current, ...change } : current))
    setEdits({})
  }

  async function chooseFile(chosen: File | undefined) {
    if (!chosen) return
    setFileError("")
    setImportError("")
    setReading(true)
    try {
      if (chosen.size > 5_000_000) {
        setFileError("That file is too big to be a bank statement (over 5 MB). Download a shorter period.")
        return
      }
      const buffer = await chosen.arrayBuffer()
      let text: string
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer)
      } catch {
        // Some banks still write the old Windows alphabet.
        text = new TextDecoder("windows-1252").decode(buffer)
      }
      if (text.includes(String.fromCharCode(0))) {
        setFileError("That isn't a CSV file. On your bank's website, choose the CSV download, not Excel or PDF.")
        return
      }
      const parsed = parseCsv(text)
      if (parsed.rows.length === 0) {
        setFileError("That file is empty.")
        return
      }
      const guess = guessColumns(parsed.rows, today)
      const found = readRows(parsed.rows, guess, today, parsed.lineOf)
      if (found.rows.length > MAX_IMPORT_ROWS) {
        setFileError(`That file has ${found.rows.length} lines, and Kaya imports up to ${MAX_IMPORT_ROWS} at a time. Download it in shorter periods.`)
        return
      }
      setFile({ name: chosen.name, parsed })
      setMapping(guess)
      setEdits({})
    } catch {
      setFileError("Couldn't read that file. Try downloading it again.")
    } finally {
      setReading(false)
      // The same file can be chosen again after it has been fixed.
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  async function handleImport() {
    if (saving || ticked.length === 0 || !wallet) return
    setSaving(true)
    setImportError("")
    try {
      await onImport(toTransactions(rows, walletId), wallet.name)
      onCancel()
    } catch (error) {
      // The page has already said what went wrong. Stay open so nothing is lost.
      setImportError(error instanceof Error ? error.message : "Couldn't import that. Nothing was changed.")
    } finally {
      setSaving(false)
    }
  }

  // ---- step 1: the wallet and the file --------------------------------------------------------

  if (!file || !mapping || !read) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="type-title">Import from a bank&apos;s file</DialogTitle>
          <DialogDescription>
            Choose the CSV file your bank lets you download for an account. Kaya reads it here, on this computer, and you look through every line before anything is saved.
          </DialogDescription>
        </DialogHeader>

        <Field label="Which wallet is it for?" htmlFor="import-wallet">
          <Select value={walletId} onValueChange={setWalletId}>
            <SelectTrigger id="import-wallet" className={selectTriggerClasses}>
              <SelectValue placeholder="Choose a wallet" />
            </SelectTrigger>
            <SelectContent position="popper">
              {spendable.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  <WalletOption wallet={entry} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-1 gap-2">
          <label
            htmlFor="import-file"
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              void chooseFile(event.dataTransfer.files[0])
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input bg-muted/40 px-6 py-9 text-center transition-colors duration-150 hover:bg-muted focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
              dragging && "border-ring bg-muted"
            )}
          >
            <span aria-hidden className="grid size-11 place-items-center rounded-full bg-sage text-sage-foreground">
              {reading ? <FileSpreadsheet className="size-5" /> : <Upload className="size-5" />}
            </span>
            <span className="font-medium">{reading ? "Reading the file…" : "Choose a CSV file"}</span>
            <span className="text-sm text-muted-foreground">or drop it here</span>
            <input
              ref={fileInput}
              id="import-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="sr-only"
              onChange={(event) => void chooseFile(event.target.files?.[0])}
            />
          </label>
          {fileError ? (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-negative wrap-anywhere">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {fileError}
            </p>
          ) : null}
        </div>

        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            The file never leaves this computer. Lines you already have are left unticked, so importing the same statement twice adds nothing new.
          </span>
        </p>

        <DialogFooter>
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </>
    )
  }

  // ---- step 2: the columns, then the lines ----------------------------------------------------

  const width = Math.max(0, ...file.parsed.rows.map((cells) => cells.length))
  const headerCells = mapping.headerRow === null ? [] : file.parsed.rows[mapping.headerRow]
  const body = file.parsed.rows.slice(mapping.headerRow === null ? 0 : mapping.headerRow + 1)
  const columnLabel = (column: number) => {
    const name = headerCells[column]
    const sample = body.map((cells) => cells[column]).find((cell) => cell)
    return `${name ? name : `Column ${column + 1}`}${sample ? `: ${sample.length > 22 ? `${sample.slice(0, 21)}…` : sample}` : ""}`
  }
  const columnPicker = (id: string, label: string, value: number | null, onChange: (column: number | null) => void, optional = false) => (
    <Field label={label} htmlFor={id}>
      <NativeSelect id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}>
        {optional || value === null ? <option value="">{optional ? "None" : "Choose a column"}</option> : null}
        {Array.from({ length: width }, (_, column) => (
          <option key={column} value={column}>
            {columnLabel(column)}
          </option>
        ))}
      </NativeSelect>
    </Field>
  )
  const needsColumns =
    mapping.dateColumn === null ||
    (mapping.amountMode === "debit-credit" ? mapping.debitColumn === null && mapping.creditColumn === null : mapping.amountColumn === null)
  const allTicked = importable.length > 0 && importable.every((row) => row.include)
  const noneTicked = importable.every((row) => !row.include)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="type-title">Check the lines</DialogTitle>
        <DialogDescription className="wrap-anywhere">
          From <span className="font-medium text-foreground">{file.name}</span>. Nothing is saved until you press Import.
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label="Import into" htmlFor="import-wallet">
          <Select
            value={walletId}
            onValueChange={(next) => {
              setWalletId(next)
              setEdits({})
            }}
          >
            <SelectTrigger id="import-wallet" className={selectTriggerClasses}>
              <SelectValue placeholder="Choose a wallet" />
            </SelectTrigger>
            <SelectContent position="popper">
              {spendable.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  <WalletOption wallet={entry} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => {
            setFile(undefined)
            setMapping(undefined)
            setEdits({})
          }}
        >
          Choose another file
        </Button>
      </div>

      <details open={needsColumns || rows.length === 0} className="group/columns rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span>
            <span className="font-medium">How the columns were read</span>
            <span className="ml-2 text-muted-foreground">
              {mapping.dateColumn === null ? "No date column yet" : `Date: ${headerCells[mapping.dateColumn] || `column ${mapping.dateColumn + 1}`}`}
            </span>
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/columns:rotate-180" />
        </summary>
        <div className="grid grid-cols-1 gap-4 border-t px-4 pt-4 pb-4 sm:grid-cols-2">
          {columnPicker("import-date-column", "Date", mapping.dateColumn, (column) => changeMapping({ dateColumn: column }))}
          {columnPicker("import-note-column", "Description", mapping.noteColumn, (column) => changeMapping({ noteColumn: column }), true)}

          <div className="grid grid-cols-1 content-start gap-2 sm:col-span-2">
            <span className="text-sm leading-none font-medium">How the amounts are written</span>
            <SegmentedSwitch
              name="import-amount-mode"
              legend="How the amounts are written"
              options={AMOUNT_MODES}
              value={mapping.amountMode}
              onChange={(amountMode) => changeMapping({ amountMode })}
            />
          </div>

          {mapping.amountMode === "debit-credit" ? (
            <>
              {columnPicker("import-debit-column", "Money out", mapping.debitColumn, (column) => changeMapping({ debitColumn: column }), true)}
              {columnPicker("import-credit-column", "Money in", mapping.creditColumn, (column) => changeMapping({ creditColumn: column }), true)}
            </>
          ) : (
            <>
              {columnPicker("import-amount-column", "Amount", mapping.amountColumn, (column) => changeMapping({ amountColumn: column }))}
              {mapping.amountMode === "typed" ? (
                columnPicker("import-type-column", "The column that says DB or CR", mapping.typeColumn, (column) => changeMapping({ typeColumn: column }))
              ) : (
                <Field label="An amount with no minus sign is" htmlFor="import-positive">
                  <NativeSelect
                    id="import-positive"
                    value={mapping.positiveMeans}
                    onChange={(event) => changeMapping({ positiveMeans: event.target.value === "out" ? "out" : "in" })}
                  >
                    <option value="in">Money in</option>
                    <option value="out">Money out</option>
                  </NativeSelect>
                </Field>
              )}
            </>
          )}
          {columnPicker("import-balance-column", "The bank's balance (optional)", mapping.balanceColumn, (column) => changeMapping({ balanceColumn: column }), true)}
        </div>
      </details>

      {rows.length === 0 ? (
        <p role="status" className="flex items-start gap-2 text-sm text-negative">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Kaya couldn&apos;t find any transactions with these columns. Pick the date and amount columns above, or choose another file.
          </span>
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-muted/60 px-4 py-2.5 text-sm">
            <label className="flex cursor-pointer items-center gap-3 font-medium">
              <input
                type="checkbox"
                checked={allTicked}
                ref={(box) => {
                  if (box) box.indeterminate = !allTicked && !noneTicked
                }}
                onChange={(event) => setAll(event.target.checked)}
                disabled={importable.length === 0}
                className="size-[1.125rem] cursor-pointer accent-primary"
              />
              Select all
            </label>
            <p role="status" className="text-muted-foreground">
              {ticked.length} of {rows.length} ticked
              {duplicates > 0 ? ` · ${duplicates} already in Kaya` : ""}
              {problems > 0 ? ` · ${problems} can't be read` : ""}
              {read.skipped > 0 ? ` · ${read.skipped} other ${read.skipped === 1 ? "line" : "lines"} left out` : ""}
            </p>
          </div>
          <ul className="max-h-[min(46svh,26rem)] overflow-y-auto">
            {rows.map((row) => (
              <ImportRow key={row.id} row={row} categories={categories} onToggle={toggle} onCategory={chooseCategory} />
            ))}
          </ul>
        </div>
      )}

      {rows.length > 0 ? (
        <div className="grid gap-1 text-sm text-muted-foreground" aria-live="polite">
          {balanceHidden || !wallet ? (
            <p>Each ticked line changes {wallet?.name ?? "the wallet"}&apos;s balance, as if you had added it by hand.</p>
          ) : (
            <>
              <p>
                {wallet.name} goes from <span className="font-medium text-foreground">{formatRupiah(wallet.balance)}</span> to{" "}
                <span className="font-medium text-foreground">{formatRupiah(after)}</span>, as if you had added each ticked line by hand.
              </p>
              {bank !== null ? (
                <p>
                  The bank&apos;s own balance in the file is <span className="font-medium text-foreground">{formatRupiah(bank)}</span>
                  {bank === after ? ". That matches." : ". If that differs from the line above, you can use Correct balance on the wallet afterwards."}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {importError ? (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-negative wrap-anywhere">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {importError}
        </p>
      ) : null}

      <DialogFooter className="mt-1">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="lg" disabled={saving || ticked.length === 0 || needsColumns} onClick={() => void handleImport()}>
          {saving ? "Importing…" : ticked.length === 0 ? "Import" : `Import ${ticked.length} ${ticked.length === 1 ? "transaction" : "transactions"}`}
        </Button>
      </DialogFooter>
    </>
  )
}

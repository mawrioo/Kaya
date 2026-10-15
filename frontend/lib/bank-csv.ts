/**
 * Reading a bank's CSV file. Pure functions, no React and no requests: the file is read on this computer, and nothing is
 * saved until the owner has looked at every line and pressed Import.
 *
 * Banks write these files differently, so nothing here is made for one bank. It finds the table among the lines above it
 * (account name, period...), tells commas from semicolons, finds the date, the note and the amount (one column with + and -,
 * a column each for money out and money in, or an amount with a DB/CR column beside it), and reads dates and amounts the way
 * Indonesian and English files write them ("05/10/2026", "5 Okt 2026", "1.250.000,00", "1,250,000.00", "Rp 25.000", "(25,000)").
 * Whatever it can't read is marked, never guessed.
 */
import { suggestCategory } from "./category-suggestion.ts"
import { toIsoDateTime } from "./dates.ts"
import type { Wallet, ImportedTransaction, Category, Transaction } from "./types"

/** The most lines one import may hold (the backend refuses more). */
export const MAX_IMPORT_ROWS = 2000
/** The longest note a transaction can have. */
export const MAX_NOTE_LENGTH = 100

const BOM = String.fromCharCode(0xfeff)
const NBSP = String.fromCharCode(0xa0)

// ---- the file as rows of cells ------------------------------------------------------------

export interface ParsedFile {
  /** The character between the cells: a comma, a semicolon, a tab or a bar. */
  delimiter: string
  /** Every line that holds anything, as cells with the spaces around them taken off. */
  rows: string[][]
  /** Which line of the file each row began on, counting from 1 (blank lines are not in `rows`, so the two differ). */
  lineOf: number[]
}

const DELIMITERS = [",", ";", "\t", "|"]

/** How many of `delimiter` there are on a line, not counting any inside quotes. */
function delimitersOnLine(line: string, delimiter: string): number {
  let inQuotes = false
  let count = 0
  for (const ch of line) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && ch === delimiter) count += 1
  }
  return count
}

/**
 * Which character separates the cells: the one that turns up on most lines, most often. A line or two above the table (an
 * account name) don't spoil it, and a decimal comma in a semicolon file loses to the semicolons.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "").slice(0, 30)
  let best = ","
  let bestScore = 0
  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => delimitersOnLine(line, delimiter)).filter((count) => count > 0)
    if (counts.length === 0) continue
    const sorted = [...counts].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const score = counts.length * median
    if (score > bestScore) {
      best = delimiter
      bestScore = score
    }
  }
  return best
}

/** Splits a CSV text into lines of cells. Handles quotes (a cell may hold the delimiter, a line break or "" for a quote). */
export function parseCsv(input: string): ParsedFile {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  const startLines: number[] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let line = 1
  let rowStart = 1

  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    rows.push(row)
    startLines.push(rowStart)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else inQuotes = false
      } else {
        if (ch === "\n") line += 1
        field += ch
      }
    } else if (ch === '"' && field.trim() === "") {
      inQuotes = true
      field = ""
    } else if (ch === delimiter) endField()
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1
      endRow()
      line += 1
      rowStart = line
    } else field += ch
  }
  if (field !== "" || row.length > 0) endRow()

  const tidy = rows.map((cells) => cells.map(tidyCell))
  const kept = tidy.map((cells, index) => ({ cells, line: startLines[index] })).filter(({ cells }) => cells.some((cell) => cell !== ""))
  return { delimiter, rows: kept.map(({ cells }) => cells), lineOf: kept.map(({ line }) => line) }
}

/** A cell without its spaces, and without the apostrophe some banks put in front of a date or number to keep a spreadsheet from changing it. */
function tidyCell(cell: string): string {
  const trimmed = cell.split(NBSP).join(" ").trim()
  return /^'\s*[\d(+-]/.test(trimmed) ? trimmed.slice(1).trim() : trimmed
}

// ---- amounts -------------------------------------------------------------------------------

/**
 * A whole-rupiah amount from the way a file writes it, or null when it isn't one. Negative for "-25.000", "(25,000)" and
 * "25.000-". The last "." or "," is the decimal point when both appear ("1.250.000,50", "1,250,000.50"); a single one with
 * exactly three digits after it is a thousands separator ("1.250", "1,250"); anything else after a single one is decimals.
 * Cents round to the nearest rupiah.
 */
export function parseAmount(raw: string): number | null {
  let s = raw.split(NBSP).join(" ").trim()
  if (s === "") return null
  let negative = false

  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1).trim()
  }
  // "Rp", a sign and "Rp" again may come in either order: "-Rp 25.000", "Rp -25.000", "+25.000". One sign only.
  let signs = 0
  for (let pass = 0; pass < 3; pass++) {
    const before = s
    s = s.replace(/^(rp\.?|idr)\s*/i, "")
    if (/^[-−]/.test(s)) {
      negative = true
      signs += 1
      s = s.slice(1).trim()
    } else if (s.startsWith("+")) {
      signs += 1
      s = s.slice(1).trim()
    }
    if (s === before) break
  }
  s = s.replace(/\s*idr$/i, "")
  // "Rp 25.000,-" is how Indonesian writes "25.000 exactly": the dash is no minus sign.
  s = s.replace(/[.,]\s*[-−]$/, "")
  if (/[-−]$/.test(s)) {
    negative = true
    signs += 1
    s = s.slice(0, -1).trim()
  }
  if (signs > 1) return null

  if (!/^[\d.,\s]+$/.test(s) || !/\d/.test(s)) return null
  s = s.replace(/\s/g, "")

  const lastDot = s.lastIndexOf(".")
  const lastComma = s.lastIndexOf(",")
  let integer = s
  let decimals = ""
  if (lastDot !== -1 && lastComma !== -1) {
    const point = Math.max(lastDot, lastComma)
    integer = s.slice(0, point)
    decimals = s.slice(point + 1)
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ","
    const point = s.lastIndexOf(separator)
    const tail = s.slice(point + 1)
    const onlyOne = s.indexOf(separator) === point
    if (onlyOne && tail.length !== 3) {
      integer = s.slice(0, point)
      decimals = tail
    }
  }
  integer = integer.replace(/[.,]/g, "")
  if (!/^\d*$/.test(integer) || !/^\d*$/.test(decimals)) return null

  const value = Math.round(Number(integer || "0") + (decimals ? Number(`0.${decimals}`) : 0))
  if (!Number.isSafeInteger(value)) return null
  return negative ? -value : value
}

/** Which way money moved, from the small word some files put beside an amount, or in a column of their own. */
export function directionOf(marker: string): "in" | "out" | undefined {
  const m = marker.trim().toLowerCase().replace(/[.\s]/g, "")
  // "D" and "K" are Debet and Kredit, the way Indonesian banks shorten them.
  if (/^(db|d|dr|debit|debet|out|keluar)$/.test(m)) return "out"
  if (/^(cr|c|kr|k|credit|kredit|in|masuk)$/.test(m)) return "in"
  return undefined
}

/** "100.000,00 DB" is an amount of 100.000,00 that went out. Splits the word off the end of an amount cell. */
function splitMarker(cell: string): { amount: string; direction?: "in" | "out" } {
  const match = /^(.*?)\s*(DB|CR|DR|DEBIT|DEBET|KREDIT|CREDIT)\.?$/i.exec(cell.trim())
  if (!match || !/\d/.test(match[1])) return { amount: cell }
  const direction = directionOf(match[2])
  return direction ? { amount: match[1], direction } : { amount: cell }
}

// ---- dates ---------------------------------------------------------------------------------

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, peb: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  may: 5, mei: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, agu: 8, agt: 8, agustus: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, okt: 10, oktober: 10, october: 10,
  nov: 11, nop: 11, november: 11,
  dec: 12, des: 12, desember: 12, december: 12,
}

const pad = (n: number) => String(n).padStart(2, "0")

/** "2026-10-05" when year, month and day are a real day (between 2000 and 2100), otherwise null. */
function calendarDay(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100) return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

/** A two-digit year ("26") is this century. */
const fullYear = (year: number) => (year < 100 ? 2000 + year : year)

/** "2026-10-05" plus whole days. */
function plusDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number)
  const date = new Date(y, m - 1, d + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * A calendar day, "2026-10-05", from the way a file writes it: "2026-10-05", "05/10/2026", "5-10-26", "05.10.2026",
 * "5 Okt 2026", "Oct 5, 2026", with or without a time after it. The day comes first ("05/10" is the 5th of October),
 * unless that can't be a month. A day and month without a year ("05/10", which some banks write) take the latest year that
 * doesn't put it more than a month after `today`. Anything else, and any day that doesn't exist, is null.
 */
export function parseDate(raw: string, today: string): string | null {
  let s = raw.trim()
  if (s === "") return null
  // A time after the date is not needed: only the day matters.
  s = s.replace(/[T\s]+\d{1,2}[:.]\d{2}([:.]\d{2})?(\.\d+)?\s*(am|pm)?\s*(Z|[+-]\d{2}:?\d{2})?\s*(WIB|WITA|WIT)?$/i, "").trim()

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s)
  if (m) return calendarDay(Number(m[1]), Number(m[2]), Number(m[3]))

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(s)
  if (m) {
    let day = Number(m[1])
    let month = Number(m[2])
    if (month > 12 && day <= 12) [day, month] = [month, day]
    return calendarDay(fullYear(Number(m[3])), month, day)
  }

  // (Not with a dot: "1.5" is more likely an amount than the 1st of May.)
  m = /^(\d{1,2})[-/](\d{1,2})$/.exec(s)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const thisYear = Number(today.slice(0, 4))
    const candidate = calendarDay(thisYear, month, day)
    if (!candidate) return null
    return candidate > plusDays(today, 31) ? calendarDay(thisYear - 1, month, day) : candidate
  }

  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{2}|\d{4})$/.exec(s)
  if (m) {
    const month = MONTH_NUMBERS[m[2].toLowerCase()]
    return month ? calendarDay(fullYear(Number(m[3])), month, Number(m[1])) : null
  }

  m = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s)
  if (m) {
    const month = MONTH_NUMBERS[m[1].toLowerCase()]
    return month ? calendarDay(Number(m[3]), month, Number(m[2])) : null
  }
  return null
}

// ---- which column is which -----------------------------------------------------------------

/** How the amounts are written: one signed column, a column each for money out and in, or an amount with a DB/CR column. */
export type AmountMode = "signed" | "debit-credit" | "typed"

export interface ColumnMapping {
  /** The line with the column names, counted from 0 in the rows, or null when the file has no names. */
  headerRow: number | null
  dateColumn: number | null
  noteColumn: number | null
  amountMode: AmountMode
  /** "signed": the amount. "typed": the amount (its sign is ignored). */
  amountColumn: number | null
  /** "debit-credit": money out. */
  debitColumn: number | null
  /** "debit-credit": money in. */
  creditColumn: number | null
  /** "typed": the column that says DB or CR. */
  typeColumn: number | null
  /** The bank's running balance, when there is one. It is never imported: it only lets the app check its sums. */
  balanceColumn: number | null
  /** For an amount with no minus sign and no DB/CR: does a positive one mean money in (a bank account) or out (a card)? */
  positiveMeans: "in" | "out"
}

const WORDS = {
  date: ["tanggal", "tgl", "date", "waktu", "time", "posting"],
  note: ["keterangan", "deskripsi", "description", "uraian", "berita", "remark", "catatan", "note", "memo", "detail", "merchant", "penerima", "narasi", "transaksi"],
  amount: ["jumlah", "amount", "nominal", "nilai", "value", "mutasi"],
  debit: ["debit", "debet", "keluar", "withdrawal", "pengeluaran", "moneyout", "uangkeluar", "db", "dr"],
  credit: ["kredit", "credit", "masuk", "deposit", "pemasukan", "moneyin", "uangmasuk", "cr", "kr"],
  type: ["tipe", "type", "jenis", "dc", "dbcr", "crdb", "d/c", "db/cr", "cr/db"],
  balance: ["saldo", "balance"],
}

type Role = keyof typeof WORDS

/** What a column name is for, or undefined. "Tanggal Transaksi" is a date, not a note, so the roles are tried in this order. */
function roleOf(name: string): Role | undefined {
  const n = name.toLowerCase().replace(/[^a-z/]/g, "")
  if (n === "") return undefined
  const order: Role[] = ["balance", "date", "type", "debit", "credit", "amount", "note"]
  for (const role of order) {
    for (const word of WORDS[role]) {
      // A short code (db, cr, dc) must be the whole name; a longer word may be part of it ("Tanggal Transaksi").
      if (word.length <= 3 || word.includes("/")) {
        if (n === word) return role
      } else if (n.includes(word)) return role
    }
  }
  return undefined
}

const looksLikeHeader = (cells: string[]): boolean => {
  const roles = new Set(cells.map(roleOf).filter(Boolean))
  return roles.has("date") && (roles.has("amount") || roles.has("debit") || roles.has("credit") || roles.has("note"))
}

/** Works out which column holds what, from the names in the header line, or from what the cells look like when there are none. */
export function guessColumns(rows: string[][], today: string): ColumnMapping {
  const headerRow = rows.slice(0, 40).findIndex(looksLikeHeader)
  const width = Math.max(0, ...rows.map((cells) => cells.length))
  const mapping: ColumnMapping = {
    headerRow: headerRow === -1 ? null : headerRow,
    dateColumn: null,
    noteColumn: null,
    amountMode: "signed",
    amountColumn: null,
    debitColumn: null,
    creditColumn: null,
    typeColumn: null,
    balanceColumn: null,
    positiveMeans: "in",
  }

  if (headerRow !== -1) {
    rows[headerRow].forEach((name, column) => {
      const role = roleOf(name)
      if (role === "date" && mapping.dateColumn === null) mapping.dateColumn = column
      else if (role === "note" && mapping.noteColumn === null) mapping.noteColumn = column
      else if (role === "amount" && mapping.amountColumn === null) mapping.amountColumn = column
      else if (role === "debit" && mapping.debitColumn === null) mapping.debitColumn = column
      else if (role === "credit" && mapping.creditColumn === null) mapping.creditColumn = column
      else if (role === "type" && mapping.typeColumn === null) mapping.typeColumn = column
      else if (role === "balance" && mapping.balanceColumn === null) mapping.balanceColumn = column
    })
  }

  // The cells under the header (or the whole file when there is none): what do the columns look like?
  const body = rows.slice(headerRow === -1 ? 0 : headerRow + 1, 200)
  const share = (column: number, test: (cell: string) => boolean) => {
    const cells = body.map((cells) => cells[column] ?? "").filter((cell) => cell !== "")
    return cells.length === 0 ? 0 : cells.filter(test).length / cells.length
  }
  const isDate = (cell: string) => parseDate(cell, today) !== null
  const isAmount = (cell: string) => parseAmount(splitMarker(cell).amount) !== null
  const isMarker = (cell: string) => directionOf(cell) !== undefined

  if (mapping.dateColumn === null) {
    const best = Array.from({ length: width }, (_, column) => column).find((column) => share(column, isDate) >= 0.7)
    mapping.dateColumn = best ?? null
  }
  if (mapping.debitColumn !== null && mapping.creditColumn !== null) mapping.amountMode = "debit-credit"
  else if (mapping.amountColumn !== null) {
    // An amount with a column of DB/CR words beside it.
    if (mapping.typeColumn === null) {
      const marker = Array.from({ length: width }, (_, column) => column).find(
        (column) => column !== mapping.amountColumn && share(column, isMarker) >= 0.7
      )
      if (marker !== undefined) mapping.typeColumn = marker
    }
    mapping.amountMode = mapping.typeColumn !== null && share(mapping.typeColumn, isMarker) >= 0.7 ? "typed" : "signed"
  } else {
    // No names to go by: the numeric columns, left to right. The first is the amount, and a second is probably the balance.
    const numeric = Array.from({ length: width }, (_, column) => column).filter(
      (column) => column !== mapping.dateColumn && share(column, isAmount) >= 0.8
    )
    if (numeric.length > 0) mapping.amountColumn = numeric[0]
    if (numeric.length > 1 && mapping.balanceColumn === null) mapping.balanceColumn = numeric[numeric.length - 1]
    const marker = Array.from({ length: width }, (_, column) => column).find((column) => share(column, isMarker) >= 0.7)
    if (marker !== undefined && mapping.amountColumn !== null) {
      mapping.typeColumn = marker
      mapping.amountMode = "typed"
    }
  }

  if (mapping.noteColumn === null) {
    // The text column with the longest cells that isn't one of the others.
    const taken = new Set([mapping.dateColumn, mapping.amountColumn, mapping.debitColumn, mapping.creditColumn, mapping.typeColumn, mapping.balanceColumn])
    let longest = 0
    for (let column = 0; column < width; column++) {
      if (taken.has(column)) continue
      const cells = body.map((cells) => cells[column] ?? "").filter((cell) => cell !== "" && parseAmount(cell) === null)
      const average = cells.length === 0 ? 0 : cells.reduce((sum, cell) => sum + cell.length, 0) / cells.length
      if (average > longest) {
        longest = average
        mapping.noteColumn = column
      }
    }
  }
  return mapping
}

// ---- the lines of the file -----------------------------------------------------------------

export interface ImportRow {
  /** Which line of the file it came from, counting from 1, for "Line 14: ...". */
  line: number
  /** "2026-10-05", or null when the date couldn't be read. */
  date: string | null
  note: string
  /** Positive for money in, negative for money out. Null when it couldn't be read. */
  amount: number | null
  /** The bank's balance after this line, when the file has one. */
  balance: number | null
  /** Why it can't be imported, in plain words. */
  problem?: string
}

/** A bank's description, tidied: one line, single spaces, and no longer than a note can be. */
export function cleanNote(text: string): string {
  const tidy = text.replace(/\s+/g, " ").trim()
  if (tidy.length <= MAX_NOTE_LENGTH) return tidy
  const cut = tidy.slice(0, MAX_NOTE_LENGTH - 1)
  const space = cut.lastIndexOf(" ")
  return `${(space > MAX_NOTE_LENGTH * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export interface ReadResult {
  rows: ImportRow[]
  /** How many lines were left out because they aren't transactions (a total, a footer, a blank date and amount). */
  skipped: number
}

/**
 * The transactions in a file, by the columns chosen. A line with no date and no amount is not a transaction (a footer, a
 * "Saldo awal" line) and is left out. A line with one but not the other is kept and marked, so nothing disappears quietly.
 */
export function readRows(rows: string[][], mapping: ColumnMapping, today: string, lineOf?: readonly number[]): ReadResult {
  const start = mapping.headerRow === null ? 0 : mapping.headerRow + 1
  const result: ImportRow[] = []
  let skipped = 0
  const cell = (cells: string[], column: number | null) => (column === null ? "" : (cells[column] ?? ""))

  for (let index = start; index < rows.length; index++) {
    const cells = rows[index]
    const dateText = cell(cells, mapping.dateColumn)
    const date = parseDate(dateText, today)
    const note = cleanNote(cell(cells, mapping.noteColumn))
    const balance = mapping.balanceColumn === null ? null : parseAmount(cell(cells, mapping.balanceColumn))

    let amount: number | null = null
    if (mapping.amountMode === "debit-credit") {
      const out = parseAmount(cell(cells, mapping.debitColumn))
      const into = parseAmount(cell(cells, mapping.creditColumn))
      if (out !== null && out !== 0) amount = -Math.abs(out)
      else if (into !== null && into !== 0) amount = Math.abs(into)
      else if (out === 0 || into === 0) amount = 0
    } else {
      const { amount: text, direction: written } = splitMarker(cell(cells, mapping.amountColumn))
      const value = parseAmount(text)
      if (value !== null) {
        const typed = mapping.amountMode === "typed" ? directionOf(cell(cells, mapping.typeColumn)) : undefined
        const direction = typed ?? written
        if (direction) amount = direction === "in" ? Math.abs(value) : -Math.abs(value)
        else amount = value < 0 ? value : mapping.positiveMeans === "in" ? value : -value
      }
    }

    if (date === null && amount === null) {
      skipped += 1
      continue
    }
    let problem: string | undefined
    if (date === null) problem = dateText === "" ? "There is no date." : "Can't read the date."
    else if (amount === null) problem = "Can't read the amount."
    else if (amount === 0) problem = "The amount is zero."
    result.push({ line: lineOf?.[index] ?? index + 1, date, note, amount, balance, ...(problem ? { problem } : {}) })
  }
  return { rows: result, skipped }
}

// ---- checking against what the app already has ----------------------------------------------

export interface TransferSuggestion {
  walletId: string
  walletName: string
  /** The other side is already saved as income or spending; replace it, without counting its balance twice. */
  transactionId?: string
  description?: string
}

export interface ReviewRow extends ImportRow {
  transferSuggestions?: TransferSuggestion[]
  /** Set only by the owner's choice in the review. */
  transfer?: TransferSuggestion

  /** Where it is in the list, so a row can be found again after others are ticked or unticked. */
  id: number
  /** "income" or "expense", from the sign of the amount. Meaningless for a row with a problem. */
  type: "income" | "expense"
  categoryId: string
  /** The earlier note the category was suggested from, when it was. */
  basedOn?: string
  /** Looks like one the owner already added: same wallet, same day, same direction, same amount. */
  duplicate: boolean
  include: boolean
}

const keyOf = (walletId: string, day: string, type: string, amount: number) => `${walletId}|${day}|${type}|${amount}`

/**
 * Which lines of the file the app already has. A line matches a transaction of the same wallet, the same day, the same
 * direction and the same amount, and each existing transaction is used up by one line only: two identical coffees in the
 * file with one in the app leave one of them new.
 */
export function findDuplicates(rows: ImportRow[], existing: readonly Transaction[], walletId: string): Set<number> {
  const available = new Map<string, number>()
  for (const tx of existing) {
    const type = tx.type === "transfer"
      ? tx.fromWalletId === walletId ? "expense" : tx.toWalletId === walletId ? "income" : undefined
      : tx.walletId === walletId ? tx.type : undefined
    if (!type) continue
    const key = keyOf(walletId, tx.date.slice(0, 10), type, tx.amount)
    available.set(key, (available.get(key) ?? 0) + 1)
  }
  const found = new Set<number>()
  rows.forEach((row, index) => {
    if (row.problem || row.date === null || row.amount === null) return
    const key = keyOf(walletId, row.date, row.amount > 0 ? "income" : "expense", Math.abs(row.amount))
    const left = available.get(key) ?? 0
    if (left > 0) {
      available.set(key, left - 1)
      found.add(index)
    }
  })
  return found
}

/** The "Other" category of a kind, where a line goes when nothing the owner did before says otherwise. */
export function otherCategory(categories: readonly Category[], type: "income" | "expense"): Category | undefined {
  return categories.find((category) => category.preset && category.name === "Other" && category.type === type)
}

/**
 * The lines ready to review: each with the category the owner used before for a note like it (or "Other"), and whether the
 * app already has it. A line with a problem, and a line the app already has, start unticked.
 */
export function buildReview(
  rows: ImportRow[],
  context: { walletId: string; transactions: readonly Transaction[]; categories: readonly Category[]; wallets?: readonly Wallet[] }
): ReviewRow[] {
  const duplicates = findDuplicates(rows, context.transactions, context.walletId)
  const everything = [...context.transactions]
  return rows.map((row, index) => {
    const type = (row.amount ?? 0) < 0 ? "expense" : "income"
    const suggestion = row.problem || !row.note ? undefined : suggestCategory(row.note, type, everything, [...context.categories])
    const categoryId = suggestion?.category.id ?? otherCategory(context.categories, type)?.id ?? ""
    const duplicate = duplicates.has(index)
    return {
      ...row,
      id: index,
      type,
      categoryId,
      transferSuggestions: duplicate ? [] : suggestTransfers(row, context.walletId, context.wallets ?? [], context.transactions),
      ...(suggestion ? { basedOn: suggestion.basedOn } : {}),
      duplicate,
      include: !row.problem && !duplicate,
    }
  })
}

/** Exact same-day amounts on another wallet, or a wallet name/nickname written as whole words in the note. */
export function suggestTransfers(row: ImportRow, walletId: string, wallets: readonly Wallet[], transactions: readonly Transaction[]): TransferSuggestion[] {
  if (row.problem || !row.date || !row.amount) return []
  const words = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
  const note = ` ${words(row.note)} `
  const others = wallets.filter((wallet) => wallet.id !== walletId && wallet.kind !== "deposito")
  const named = others.filter((wallet) => [wallet.name, wallet.nickname].some((name) => name && words(name).length >= 3 && note.includes(` ${words(name)} `)))
  return (named.length ? named : others).flatMap((wallet) => {
    const matches = transactions.filter((tx) => tx.type !== "transfer" && tx.walletId === wallet.id &&
      tx.type === (row.amount! < 0 ? "income" : "expense") && tx.amount === Math.abs(row.amount!) && tx.date.slice(0, 10) === row.date)
    if (matches.length) return matches.map((tx) => ({ walletId: wallet.id, walletName: wallet.name, transactionId: tx.id, description: tx.description }))
    return named.includes(wallet) ? [{ walletId: wallet.id, walletName: wallet.name }] : []
  })
}

// ---- what gets saved -----------------------------------------------------------------------

/**
 * The ticked lines as transactions, oldest first, so lines that share a day are listed in the order the bank had them. (A
 * file written newest-first is turned round for that.) Each is dated that day at noon, since a file gives no time of day.
 */
export function toTransactions(rows: readonly ReviewRow[], walletId: string): ImportedTransaction[] {
  const chosen = rows.filter((row) => row.include && !row.problem && row.date !== null && row.amount !== null)
  const dated = chosen.map((row) => row.date as string)
  const newestFirst = dated.length > 1 && dated[0] > dated[dated.length - 1]
  const ordered = (newestFirst ? [...chosen].reverse() : chosen)
    .map((row, position) => ({ row, position }))
    .sort((a, b) => (a.row.date as string).localeCompare(b.row.date as string) || a.position - b.position)

  return ordered.map(({ row }) => {
    const day = row.date as string
    const amount = row.amount as number
    if (row.transfer) return {
      type: "transfer",
      amount: Math.abs(amount),
      date: toIsoDateTime(day, new Date(`${day}T12:00:00`)),
      description: row.note,
      fromWalletId: amount < 0 ? walletId : row.transfer.walletId,
      toWalletId: amount < 0 ? row.transfer.walletId : walletId,
      ...(row.transfer.transactionId ? { replaceTransactionId: row.transfer.transactionId } : {}),
    }
    return {
      type: amount > 0 ? "income" : "expense",
      amount: Math.abs(amount),
      date: toIsoDateTime(day, new Date(`${day}T12:00:00`)),
      description: row.note,
      walletId,
      categoryId: row.categoryId,
    }
  })
}

/** What the ticked lines add to the wallet: money in minus money out. */
export function importedChange(rows: readonly ReviewRow[]): number {
  return rows.filter((row) => row.include && !row.problem && row.amount !== null).reduce((sum, row) => sum + (row.amount as number), 0)
}

/** The bank's own balance after the newest line of the file, when the file has a balance column. */
export function bankBalance(rows: readonly ImportRow[]): number | null {
  const dated = rows.filter((row) => row.date !== null && row.balance !== null && !row.problem)
  if (dated.length === 0) return null
  const first = dated[0].date as string
  const last = dated[dated.length - 1].date as string
  // The file lists oldest first, or newest first: take the line that is the newest in time.
  return (first > last ? dated[0] : dated[dated.length - 1]).balance
}

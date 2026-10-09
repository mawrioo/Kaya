import assert from "node:assert/strict"
import { test } from "node:test"
import {
  bankBalance,
  buildReview,
  cleanNote,
  detectDelimiter,
  findDuplicates,
  guessColumns,
  importedChange,
  parseAmount,
  parseCsv,
  parseDate,
  readRows,
  toTransactions,
} from "../lib/bank-csv.ts"

const TODAY = "2026-10-09"

/** The whole way in: text to the lines it holds. */
function read(text, change = {}) {
  const { rows, lineOf } = parseCsv(text)
  const mapping = { ...guessColumns(rows, TODAY), ...change }
  return { mapping, ...readRows(rows, mapping, TODAY, lineOf) }
}

// ---- amounts -----------------------------------------------------------------------------------

for (const [text, value] of [
  ["25000", 25_000], ["25.000", 25_000], ["1.250.000", 1_250_000], ["1,250,000", 1_250_000],
  ["1.250.000,00", 1_250_000], ["1,250,000.00", 1_250_000], ["1.250.000,50", 1_250_001], ["2,500.00", 2_500],
  ["Rp 25.000", 25_000], ["Rp25.000", 25_000], ["Rp. 25.000,-", 25_000], ["25.000,-", 25_000], ["IDR 25,000.00", 25_000], ["25.000 IDR", 25_000],
  ["-25.000", -25_000], ["−25.000", -25_000], ["+25.000", 25_000], ["25.000-", -25_000], ["(25,000)", -25_000], ["(25.000,00)", -25_000],
  ["-Rp 25.000", -25_000], ["Rp -25.000", -25_000], ["1.250", 1_250], ["1,250", 1_250], ["1.25", 1], ["0", 0], ["0,00", 0],
  ["1 250 000", 1_250_000], ["999.999.999.999", 999_999_999_999],
]) {
  test(`reads the amount ${JSON.stringify(text)} as ${value}`, () => assert.equal(parseAmount(text), value))
}

for (const text of ["", "abc", "12abc", "--5", "1.2.3a", "Rp", "-", ".", "5%", "KOPI KENANGAN"]) {
  test(`does not take ${JSON.stringify(text)} for an amount`, () => assert.equal(parseAmount(text), null))
}

// ---- dates -------------------------------------------------------------------------------------

for (const [text, day] of [
  ["2026-10-05", "2026-10-05"], ["2026/10/05", "2026-10-05"], ["05/10/2026", "2026-10-05"], ["5-10-2026", "2026-10-05"],
  ["05.10.2026", "2026-10-05"], ["05/10/26", "2026-10-05"], ["5 Oct 2026", "2026-10-05"], ["05-Okt-2026", "2026-10-05"],
  ["5 Oktober 2026", "2026-10-05"], ["5 Mei 2026", "2026-05-05"], ["17 Agu 2026", "2026-08-17"], ["Oct 5, 2026", "2026-10-05"],
  ["2026-10-05 14:30:12", "2026-10-05"], ["2026-10-05T14:30:12+07:00", "2026-10-05"], ["05/10/2026 14:30", "2026-10-05"], ["05/10/2026 14.30 WIB", "2026-10-05"],
  ["12/25/2026", "2026-12-25"], ["31/12/2026", "2026-12-31"], ["29/02/2028", "2028-02-29"],
  // a day and month with no year: the latest one that isn't in the future
  ["05/10", "2026-10-05"], ["01/10", "2026-10-01"], ["28/09", "2026-09-28"], ["15/12", "2025-12-15"], ["5-3", "2026-03-05"],
]) {
  test(`reads the date ${JSON.stringify(text)} as ${day}`, () => assert.equal(parseDate(text, TODAY), day))
}

for (const text of ["", "hello", "31/02/2026", "32/01/2026", "29/02/2026", "2026-13-01", "13/13/2026", "1999-01-01", "5 Foo 2026", "25.000", "1.5", "12345"]) {
  test(`does not take ${JSON.stringify(text)} for a date`, () => assert.equal(parseDate(text, TODAY), null))
}

// ---- the shape of a file ------------------------------------------------------------------------

test("tells the delimiter by what most lines hold", () => {
  assert.equal(detectDelimiter("a,b,c\n1,2,3\n4,5,6"), ",")
  assert.equal(detectDelimiter("a;b;c\n1;2,5;3\n4;5,5;6"), ";", "a decimal comma doesn't beat the semicolons")
  assert.equal(detectDelimiter("a\tb\tc\n1\t2\t3"), "\t")
  assert.equal(detectDelimiter('Account: BCA, main\na,b,c\n"1,5",2,3\n4,5,6'), ",", "a title line with a comma doesn't mislead it")
  assert.equal(detectDelimiter("just one column\nanother line"), ",")
})

test("splits quoted cells, quotes inside them, line breaks inside them, and any line ending", () => {
  const { rows } = parseCsv('a,b,c\r\n"1,000",x ,"say ""hi"""\r\n"two\nlines",,end\n')
  assert.deepEqual(rows, [["a", "b", "c"], ["1,000", "x", 'say "hi"'], ["two\nlines", "", "end"]])
})

test("ignores a byte order mark, blank lines and the apostrophe a bank puts before a date", () => {
  const { rows } = parseCsv("\uFEFFDate,Amount\n\n'05/10,'25.000\n   \n")
  assert.deepEqual(rows, [["Date", "Amount"], ["05/10", "25.000"]])
})

// ---- a few shapes of file ------------------------------------------------------------------------

const BCA_LIKE = `Informasi Rekening - Mutasi Rekening
No. rekening : 1234567890
Nama : MARIO
Periode : 01/10/2026 - 31/10/2026

Tanggal Transaksi,Keterangan,Cabang,Jumlah,,Saldo
'01/10,SALDO AWAL,0000,"8,742,300.00",,"8,742,300.00"
'02/10,KARTU DEBIT 0210 KOPI KENANGAN,0998,"25,000.00",DB,"8,717,300.00"
'05/10,TRSF E-BANKING CR 0510/FTSCY/WS95051 GAJI OKTOBER,0000,"12,500,000.00",CR,"21,217,300.00"
Saldo Awal : 8,742,300.00
Mutasi Debet : 25,000.00
`

test("a BCA-like file: lines above the table, dates with no year, English numbers, and DB/CR in a column of their own", () => {
  const { rows, skipped, mapping } = read(BCA_LIKE)
  assert.equal(mapping.amountMode, "typed")
  assert.equal(mapping.headerRow, 4, "counted without the blank line")
  assert.deepEqual(rows.map((r) => r.line), [7, 8, 9], "but the lines are numbered as they are in the file, blank ones included")
  assert.deepEqual(
    rows.map((r) => [r.date, r.amount, r.balance]),
    [
      ["2026-10-01", 8_742_300, 8_742_300], // the opening line is read as money in: the owner unticks it (see the next test)
      ["2026-10-02", -25_000, 8_717_300],
      ["2026-10-05", 12_500_000, 21_217_300],
    ]
  )
  assert.equal(rows[1].note, "KARTU DEBIT 0210 KOPI KENANGAN")
  assert.equal(skipped, 2, "the two footer lines aren't transactions")
  assert.equal(bankBalance(rows), 21_217_300)
})

test("a Jago-like file: names in Indonesian, a signed amount and a running balance", () => {
  const { rows, mapping } = read(
    `Tanggal,Deskripsi,Jumlah,Saldo
05 Okt 2026,Kopi susu,"-25.000","2.317.500"
06 Okt 2026,Gaji,"+12.500.000","14.817.500"
`
  )
  assert.equal(mapping.amountMode, "signed")
  assert.deepEqual(rows.map((r) => [r.date, r.note, r.amount]), [["2026-10-05", "Kopi susu", -25_000], ["2026-10-06", "Gaji", 12_500_000]])
})

test("a semicolon file with a column each for money out and money in, and Indonesian decimals", () => {
  const { rows, mapping } = read(
    `Tgl;Uraian;Debet;Kredit;Saldo
05/10/2026;Listrik PLN;250.000,00;;1.000.000,00
06/10/2026;Bunga tabungan;;1.250,50;1.001.251,00
`
  )
  assert.equal(mapping.amountMode, "debit-credit")
  assert.deepEqual(rows.map((r) => r.amount), [-250_000, 1_251])
})

test("an English file with quoted amounts, ISO dates and a time", () => {
  const { rows } = read(`Date,Description,Amount\n2026-10-05 14:30:00,Grab,"-25,000.00"\n2026-10-06 09:00:00,Refund,"1,500.00"\n`)
  assert.deepEqual(rows.map((r) => [r.date, r.amount]), [["2026-10-05", -25_000], ["2026-10-06", 1_500]])
})

test("a file with no column names at all: the date, the note and the amount are found by what they look like", () => {
  const { rows, mapping } = read(`05/10/2026,Kopi susu,-25000\n06/10/2026,Gaji bulanan,12500000\n`)
  assert.equal(mapping.headerRow, null)
  assert.deepEqual(rows.map((r) => [r.date, r.note, r.amount]), [["2026-10-05", "Kopi susu", -25_000], ["2026-10-06", "Gaji bulanan", 12_500_000]])
})

test("an amount with DB or CR written on the end of it", () => {
  const { rows } = read(`Date,Description,Amount\n05/10/2026,Kopi,25.000 DB\n06/10/2026,Gaji,12.500.000 CR\n07/10/2026,Parkir,5000DB\n`)
  assert.deepEqual(rows.map((r) => r.amount), [-25_000, 12_500_000, -5_000])
})

test("a card statement where a positive amount is money spent, once it is told so", () => {
  const text = `Date,Merchant,Amount\n05/10/2026,Tokopedia,125000\n06/10/2026,Refund,-25000\n`
  assert.deepEqual(read(text).rows.map((r) => r.amount), [125_000, -25_000])
  assert.deepEqual(read(text, { positiveMeans: "out" }).rows.map((r) => r.amount), [-125_000, -25_000], "a minus is still the other way round")
})

test("a column picked by hand wins over the guess", () => {
  const text = `Date,Description,Amount,Other\n05/10/2026,Kopi,25.000,-9.999\n`
  assert.deepEqual(read(text, { amountColumn: 3 }).rows.map((r) => r.amount), [-9_999])
})

// ---- lines that can't be read are marked, not guessed --------------------------------------------

test("a line with a date but no amount, or an amount but no date, or a zero, is kept with the reason", () => {
  const { rows } = read(`Date,Description,Amount\n05/10/2026,Kopi,\n,Parkir,5.000\n32/13/2026,Bad,5.000\n06/10/2026,Zero,0\n07/10/2026,Fine,-5.000\n`)
  assert.deepEqual(rows.map((r) => r.problem), ["Can't read the amount.", "There is no date.", "Can't read the date.", "The amount is zero.", undefined])
  assert.deepEqual(rows.map((r) => r.line), [2, 3, 4, 5, 6])
})

test("a line that is neither (a total, a note) is left out and counted", () => {
  const { rows, skipped } = read(`Date,Description,Amount\n05/10/2026,Kopi,-5.000\nTotal,,\n\nEnd of statement,,\n`)
  assert.equal(rows.length, 1)
  assert.equal(skipped, 2)
})

test("a long bank description becomes a note that fits, cut at a word", () => {
  const long = "TRSF E-BANKING DB 0510/FTSCY/WS95051 25000.00 KOPI KENANGAN CABANG SUDIRMAN JAKARTA SELATAN REF 1234567890123 END"
  const note = cleanNote(long)
  assert.ok(note.length <= 100, `${note.length} characters`)
  assert.ok(note.endsWith("…"))
  assert.equal(cleanNote("  a \n  b\t c "), "a b c")
})

// ---- checking against what the app already has ----------------------------------------------------

const category = (id, name, type, preset = false) => ({ id, name, type, preset, icon: "tag", color: "sage" })
const categories = [
  category("cat-food", "Food", "expense", true),
  category("cat-other-expense", "Other", "expense", true),
  category("cat-salary", "Salary", "income", true),
  category("cat-other-income", "Other", "income", true),
]
const spent = (id, walletId, day, amount, description = "") => ({ id, type: "expense", amount, date: `${day}T09:00:00+07:00`, description, walletId, categoryId: "cat-food" })

test("a line the app already has (same wallet, day, direction and amount) is found, and each existing one is used only once", () => {
  const { rows } = read(`Date,Description,Amount\n05/10/2026,Kopi,-25.000\n05/10/2026,Kopi lagi,-25.000\n05/10/2026,Salary,25.000\n06/10/2026,Kopi,-25.000\n`)
  const existing = [spent("a", "bca", "2026-10-05", 25_000, "Coffee"), spent("b", "jago", "2026-10-06", 25_000)]
  assert.deepEqual([...findDuplicates(rows, existing, "bca")], [0], "one coffee in the app, two in the file: only the first is a duplicate; the income isn't")
  assert.deepEqual([...findDuplicates(rows, existing, "jago")], [3])
  assert.deepEqual([...findDuplicates(rows, [], "bca")], [])
})

test("a transfer in the app never counts as a duplicate of a payment", () => {
  const { rows } = read(`Date,Description,Amount\n05/10/2026,Kopi,-25.000\n`)
  const transfer = { id: "t", type: "transfer", amount: 25_000, date: "2026-10-05T09:00:00+07:00", description: "", fromWalletId: "bca", toWalletId: "jago" }
  assert.equal(findDuplicates(rows, [transfer], "bca").size, 0)
})

test("each line gets the category the owner used for a note like it, or Other; duplicates and problems start unticked", () => {
  const earlier = [spent("e1", "bca", "2026-09-01", 18_000, "Kopi Kenangan")]
  const text = `Date,Description,Amount\n05/10/2026,KARTU DEBIT KOPI KENANGAN,-25.000\n05/10/2026,Something new,-9.000\n06/10/2026,GAJI,12.000.000\n07/10/2026,Dup,-3.000\n,No date,-1.000\n`
  const { rows } = read(text)
  const review = buildReview(rows, { walletId: "bca", transactions: [...earlier, spent("d", "bca", "2026-10-07", 3_000)], categories })
  assert.deepEqual(review.map((r) => r.categoryId), ["cat-food", "cat-other-expense", "cat-other-income", "cat-other-expense", "cat-other-expense"])
  assert.equal(review[0].basedOn, "Kopi Kenangan")
  assert.deepEqual(review.map((r) => r.duplicate), [false, false, false, true, false])
  assert.deepEqual(review.map((r) => r.include), [true, true, true, false, false])
  assert.equal(importedChange(review), -25_000 - 9_000 + 12_000_000, "only the ticked lines count towards the balance")
})

// ---- what is saved ---------------------------------------------------------------------------------

test("the ticked lines become transactions: right direction and amount, dated at noon, oldest first", () => {
  const { rows } = read(`Date,Description,Amount\n07/10/2026,C,-3.000\n05/10/2026,A,-1.000\n06/10/2026,B,2.000\n`)
  const review = buildReview(rows, { walletId: "bca", transactions: [], categories })
  review[1].include = false
  const saved = toTransactions(review, "bca")
  assert.deepEqual(saved.map((t) => [t.description, t.type, t.amount]), [["B", "income", 2_000], ["C", "expense", 3_000]])
  assert.ok(saved.every((t) => t.walletId === "bca" && /^2026-10-0[67]T12:00:00[+-]\d\d:\d\d$/.test(t.date)))
  assert.equal(saved[0].categoryId, "cat-other-income")
})

test("lines that share a day keep the bank's order, whichever way the file runs", () => {
  const oldestFirst = `Date,Description,Amount\n05/10/2026,first,-1\n05/10/2026,second,-2\n05/10/2026,third,-3\n06/10/2026,next day,-4\n`
  const newestFirst = `Date,Description,Amount\n06/10/2026,next day,-4\n05/10/2026,third,-3\n05/10/2026,second,-2\n05/10/2026,first,-1\n`
  for (const text of [oldestFirst, newestFirst]) {
    const review = buildReview(read(text).rows, { walletId: "bca", transactions: [], categories })
    assert.deepEqual(toTransactions(review, "bca").map((t) => t.description), ["first", "second", "third", "next day"])
  }
})

test("the bank's last balance is the one on the newest line, whichever way the file runs", () => {
  const up = read(`Date,Description,Amount,Saldo\n05/10/2026,a,-1.000,9.000\n06/10/2026,b,-2.000,7.000\n`).rows
  const down = read(`Date,Description,Amount,Saldo\n06/10/2026,b,-2.000,7.000\n05/10/2026,a,-1.000,9.000\n`).rows
  assert.equal(bankBalance(up), 7_000)
  assert.equal(bankBalance(down), 7_000)
  assert.equal(bankBalance(read(`Date,Description,Amount\n05/10/2026,a,-1.000\n`).rows), null)
})

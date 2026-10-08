import assert from "node:assert/strict"
import { test } from "node:test"
import { depositoLine, formatRate, formatTenor, parseRate, parseTenor, rateToInput } from "../lib/deposito.ts"
import { emptyWalletForm, formToChanges, formToNewWallet, validateWalletForm, walletToForm } from "../lib/wallet-form.ts"

const NBSP = String.fromCharCode(160)
const flat = (text) => text.split(NBSP).join(" ")

test("the rate can be typed with a comma or a dot, with or without a percent sign", () => {
  assert.equal(parseRate("5"), 5)
  assert.equal(parseRate("5,25"), 5.25)
  assert.equal(parseRate("5.25"), 5.25)
  assert.equal(parseRate(" 6,5 % "), 6.5)
  assert.equal(parseRate("0,01"), 0.01)
  assert.equal(parseRate("50"), 50)
})

test("a rate must be above 0, at most 50, and have at most two decimals", () => {
  for (const bad of ["", "0", "0,00", "-1", "50,01", "51", "5,123", "abc", "5,", ",5", "5%%", "1e2"]) {
    assert.equal(parseRate(bad), undefined, bad)
  }
})

test("a rate is written and edited with a comma", () => {
  assert.equal(formatRate(5), "5%")
  assert.equal(formatRate(5.25), "5,25%")
  assert.equal(rateToInput(5.25), "5,25")
  assert.equal(parseRate(rateToInput(6.5)), 6.5)
})

test("the tenor is whole months from 1 to 120", () => {
  assert.equal(parseTenor("12"), 12)
  assert.equal(parseTenor(" 1 "), 1)
  assert.equal(parseTenor("120"), 120)
  for (const bad of ["", "0", "121", "1,5", "x", "-3"]) assert.equal(parseTenor(bad), undefined, bad)
  assert.equal(formatTenor(1), "1 month")
  assert.equal(formatTenor(12), "12 months")
})

const base = { ratePercent: 5, startDate: "2026-10-01", tenorMonths: 12, rollover: false, principal: 1_000_000, interest: 4_109, endDate: "2027-10-01", status: "running" }

test("a running deposito says its rate, its end and how long is left", () => {
  assert.equal(flat(depositoLine(base, "2026-10-08")), "5% a year · ends 1 Oct 2027 · 11 months left")
  assert.equal(flat(depositoLine({ ...base, ratePercent: 5.25 }, "2027-09-20")), "5,25% a year · ends 1 Oct 2027 · less than a month left")
})

test("a renewing deposito says when it renews, a matured one when it matured, a settled one when the money left", () => {
  assert.equal(depositoLine({ ...base, rollover: true }, "2026-10-08"), "5% a year · renews on 1 Oct 2027")
  assert.equal(depositoLine({ ...base, status: "matured" }, "2027-10-02"), "5% a year · matured on 1 Oct 2027")
  assert.equal(depositoLine({ ...base, status: "settled", settledAt: "2027-10-02T09:30:00+07:00" }, "2027-10-03"), "Money moved out on 2 Oct 2027")
})

const bca = { id: "bca", name: "BCA", kind: "bank", balance: 5_000_000, description: "", color: "sky", defaultColor: "sky" }
const filled = (over) => ({ ...emptyWalletForm("2026-10-08"), name: "Deposito BCA", kind: "deposito", startingBalance: "1000000", depositoRate: "5", fromWalletId: "bca", ...over })
const deposito = { id: "d", name: "Deposito BCA", kind: "deposito", balance: 1_004_109, description: "", color: "sky", defaultColor: "sky", deposito: { ...base, sourceWalletId: "bca" } }
const legacy = { ...deposito, deposito: base }

test("a new form starts today, for 12 months, not renewing", () => {
  const form = emptyWalletForm("2026-10-08")
  assert.equal(form.depositoStart, "2026-10-08")
  assert.equal(form.depositoTenor, "12")
  assert.equal(form.depositoRollover, false)
  assert.equal(form.depositoRate, "")
})

test("a deposito form needs an amount, a source wallet, a rate, a start day and a tenor", () => {
  assert.deepEqual(validateWalletForm(filled(), [bca]), {})
  assert.match(validateWalletForm(filled({ startingBalance: "" }), [bca]).startingBalance, /amount you put in/)
  assert.match(validateWalletForm(filled({ startingBalance: "0" }), [bca]).startingBalance, /amount you put in/)
  assert.match(validateWalletForm(filled({ depositoRate: "" }), [bca]).depositoRate, /yearly rate/)
  assert.match(validateWalletForm(filled({ depositoRate: "55" }), [bca]).depositoRate, /up to 50%/)
  assert.match(validateWalletForm(filled({ depositoStart: "" }), [bca]).depositoStart, /day it started/)
  assert.match(validateWalletForm(filled({ depositoTenor: "0" }), [bca]).depositoTenor, /whole months/)
  assert.match(validateWalletForm(filled({ depositoTenor: "13,5" }), [bca]).depositoTenor, /whole months/)
})

test("the money has to come from a wallet that exists, isn't a deposito, and holds enough", () => {
  assert.match(validateWalletForm(filled({ fromWalletId: "" }), [bca]).fromWalletId, /wallet the money comes from/)
  assert.match(validateWalletForm(filled({ fromWalletId: "nope" }), [bca]).fromWalletId, /wallet the money comes from/)
  assert.match(validateWalletForm(filled({ fromWalletId: "d" }), [bca, deposito]).fromWalletId, /wallet the money comes from/)
  assert.match(validateWalletForm(filled({ startingBalance: "5000001" }), [bca]).startingBalance, /BCA only holds Rp.5[.]000[.]000/)
  assert.deepEqual(validateWalletForm(filled({ startingBalance: "5000000" }), [bca]), {}) // exactly what it holds is fine
})

test("a deposito is never asked for a nickname, and never sends one", () => {
  assert.deepEqual(validateWalletForm(filled({ nickname: "x".repeat(40) }), [bca]), {})
  assert.equal("nickname" in formToNewWallet(filled({ nickname: "depo" })), false)
  assert.equal(formToChanges(walletToForm(deposito), deposito).nickname, null)
  assert.equal(formToChanges({ ...walletToForm(deposito), nickname: "depo" }, deposito).nickname, null)
})

test("another kind of wallet is not asked for any of it", () => {
  assert.deepEqual(validateWalletForm({ ...filled({ depositoRate: "", depositoTenor: "", fromWalletId: "" }), kind: "cash", startingBalance: "" }, []), {})
})

test("a new deposito carries its details and where the money comes from; any other wallet carries none", () => {
  assert.deepEqual(formToNewWallet(filled({ depositoRate: "5,25", depositoTenor: "6", depositoRollover: true })).deposito, {
    ratePercent: 5.25,
    startDate: "2026-10-08",
    tenorMonths: 6,
    rollover: true,
    fromWalletId: "bca",
  })
  assert.equal(formToNewWallet(filled({ depositoRate: "5,25" })).startingBalance, 1_000_000)
  assert.equal("deposito" in formToNewWallet({ ...filled(), kind: "cash" }), false)
})

test("editing a deposito shows its details, and sends them with the amount", () => {
  const form = walletToForm({ ...deposito, deposito: { ...deposito.deposito, ratePercent: 5.25, rollover: true } })
  assert.equal(form.depositoRate, "5,25")
  assert.equal(form.depositoTenor, "12")
  assert.equal(form.depositoStart, "2026-10-01")
  assert.equal(form.depositoRollover, true)
  assert.equal(form.startingBalance, "1000000") // the money put in, not the balance with interest
  assert.equal(form.fromWalletId, "")
  assert.deepEqual(formToChanges(form, deposito).deposito, {
    ratePercent: 5.25,
    startDate: "2026-10-01",
    tenorMonths: 12,
    rollover: true,
    principal: 1_000_000,
  }) // it already has a source, so none is sent
})

test("an older deposito with no source can be given one when editing, and only then", () => {
  const form = walletToForm(legacy)
  assert.equal("fromWalletId" in formToChanges(form, legacy).deposito, false) // nothing chosen: nothing sent
  assert.equal(formToChanges({ ...form, fromWalletId: "bca" }, legacy).deposito.fromWalletId, "bca")
  assert.deepEqual(validateWalletForm(form, [bca, legacy], legacy), {}) // leaving it unset is fine
  assert.deepEqual(validateWalletForm({ ...form, fromWalletId: "bca" }, [bca, legacy], legacy), {})
  assert.match(validateWalletForm({ ...form, fromWalletId: "bca", startingBalance: "6000000" }, [bca, legacy], legacy).startingBalance, /BCA only holds/)
})

test("the card says where a matured deposito's money goes back to", () => {
  assert.equal(depositoLine({ ...base, status: "matured" }, "2027-10-02", "BCA"), "5% a year · matured on 1 Oct 2027 · goes back to BCA")
})

test("a settled deposito sends and checks only the name, note and look", () => {
  const settled = { ...deposito, balance: 0, deposito: { ...base, status: "settled", principal: 0, interest: 0, settledAt: "2027-10-02T09:30:00+07:00" } }
  const form = walletToForm(settled)
  assert.equal("deposito" in formToChanges(form, settled), false)
  assert.deepEqual(validateWalletForm(form, [settled], settled), {})
})

test("editing another kind of wallet sends no deposito", () => {
  const cash = { id: "c", name: "Cash", kind: "cash", balance: 5, description: "", color: "sky", defaultColor: "sky" }
  assert.equal("deposito" in formToChanges(walletToForm(cash), cash), false)
  assert.equal(walletToForm(cash).startingBalance, "")
})

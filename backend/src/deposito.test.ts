import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, describe, it } from "node:test"
import { DatabaseSync } from "node:sqlite"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { addMonths, daysBetween, depositoState, interestFor } from "./deposito.ts"
import { createStore } from "./store.ts"
import type { SaveWalletResult, SettleDepositoResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

describe("the dates and the interest of a deposito", () => {
  it("counts whole days", () => {
    assert.equal(daysBetween("2026-10-01", "2026-10-31"), 30)
    assert.equal(daysBetween("2026-01-01", "2027-01-01"), 365)
    assert.equal(daysBetween("2028-01-01", "2029-01-01"), 366) // a leap year
    assert.equal(daysBetween("2026-10-05", "2026-10-01"), -4)
  })

  it("adds months, and never lands on a day that doesn't exist", () => {
    assert.equal(addMonths("2026-10-08", 12), "2027-10-08")
    assert.equal(addMonths("2026-11-15", 3), "2027-02-15")
    assert.equal(addMonths("2027-01-31", 1), "2027-02-28")
    assert.equal(addMonths("2028-01-31", 1), "2028-02-29")
    assert.equal(addMonths("2026-08-31", 6), "2027-02-28")
    assert.equal(addMonths("2026-12-01", 1), "2027-01-01")
  })

  it("works out simple interest by the day, rounded down", () => {
    assert.equal(interestFor(1_000_000, 500, 365), 50_000) // 5% for a whole year
    assert.equal(interestFor(1_000_000, 500, 30), 4_109) // 4109.58...
    assert.equal(interestFor(1_000_000, 500, 0), 0)
    assert.equal(interestFor(1_000_000, 500, -3), 0)
    assert.equal(interestFor(999_999_999_999, 5_000, 365), 499_999_999_999) // exact even for the biggest amount
  })

  const base = { principal: 1_000_000, rateBp: 500, startDate: "2026-01-01", tenorMonths: 12, rollover: false }

  it("earns every day until the end of its term, then stops and has matured", () => {
    assert.deepEqual(depositoState(base, "2026-07-01"), { interest: 24_794, endDate: "2027-01-01", status: "running" })
    assert.deepEqual(depositoState(base, "2026-12-31"), { interest: 49_863, endDate: "2027-01-01", status: "running" })
    assert.deepEqual(depositoState(base, "2027-01-01"), { interest: 50_000, endDate: "2027-01-01", status: "matured" })
    // Years later it has earned no more than its one term.
    assert.deepEqual(depositoState(base, "2030-05-05"), { interest: 50_000, endDate: "2027-01-01", status: "matured" })
  })

  it("earns nothing before its start day", () => {
    assert.deepEqual(depositoState(base, "2025-12-01"), { interest: 0, endDate: "2027-01-01", status: "running" })
    assert.equal(depositoState(base, "2026-01-01").interest, 0)
  })

  it("renews by itself: the next term starts on the end day, interest keeps adding up and it never matures", () => {
    const renewing = { ...base, tenorMonths: 6, rollover: true }
    assert.deepEqual(depositoState(renewing, "2026-06-30"), { interest: 24_657, endDate: "2026-07-01", status: "running" })
    assert.deepEqual(depositoState(renewing, "2026-07-01"), { interest: 24_794, endDate: "2027-01-01", status: "running" })
    assert.deepEqual(depositoState(renewing, "2027-01-01"), { interest: 50_000, endDate: "2027-07-01", status: "running" })
    assert.equal(depositoState(renewing, "2030-05-05").status, "running")
  })

  it("a settled deposito earns nothing more", () => {
    const settled = { ...base, principal: 0, settledAt: "2027-01-02T10:00:00+07:00" }
    assert.deepEqual(depositoState(settled, "2030-01-01"), { interest: 0, endDate: "2027-01-01", status: "settled" })
  })
})

const BCA = 8_742_300

/** A store whose "today" can be moved. */
function storeOn(day: string) {
  const clock = { day }
  const db = openDatabase(":memory:")
  const store = createStore(db, () => clock.day)
  return { db, store, clock }
}

/** The body for a new deposito: 1.000.000 taken out of BCA unless said otherwise. */
const deposito = (over: Record<string, unknown> = {}, from: unknown = "wallet-bca") => ({
  name: "Deposito BCA",
  kind: "deposito",
  startingBalance: 1_000_000,
  deposito: { ratePercent: 5, startDate: "2026-10-01", tenorMonths: 12, rollover: false, fromWalletId: from, ...over },
})

type Store = ReturnType<typeof storeOn>["store"]
const total = (store: Store) => store.getData().wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
const balanceOf = (store: Store, id: string) => store.getData().wallets.find((wallet) => wallet.id === id)?.balance

describe("adding a deposito", () => {
  it("takes the money out of the wallet it comes from, as one transfer, so the total does not change", () => {
    const { store } = storeOn("2026-10-01")
    const before = total(store)
    const { wallet, wallets } = store.createWallet(deposito())
    assert.equal(wallet.kind, "deposito")
    assert.equal(wallet.balance, 1_000_000)
    assert.deepEqual(wallet.deposito, {
      ratePercent: 5,
      startDate: "2026-10-01",
      tenorMonths: 12,
      rollover: false,
      principal: 1_000_000,
      interest: 0,
      endDate: "2027-10-01",
      status: "running",
      sourceWalletId: "wallet-bca",
    })
    assert.equal(wallets.length, 5)
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000_000)
    assert.equal(total(store), before)
    const transactions = store.getData().transactions
    assert.equal(transactions.length, 42)
    const opening = transactions.at(-1)
    assert.deepEqual(
      opening && opening.type === "transfer" ? [opening.fromWalletId, opening.toWalletId, opening.amount, opening.description] : [],
      ["wallet-bca", wallet.id, 1_000_000, "Opened deposito Deposito BCA"]
    )
  })

  it("dates the transfer the day the deposito started, or today when that day hasn't come", () => {
    const { store } = storeOn("2026-10-08")
    const past = store.createWallet(deposito({ startDate: "2026-09-01" })).wallet
    const future = store.createWallet({ ...deposito({ startDate: "2026-12-25" }), name: "Later" }).wallet
    const dateOf = (id: string) => {
      const tx = store.getData().transactions.find((entry) => entry.type === "transfer" && entry.toWalletId === id)
      return tx?.date ?? ""
    }
    assert.match(dateOf(past.id), /^2026-09-01T00:00:00[+-]\d{2}:\d{2}$/)
    assert.doesNotMatch(dateOf(future.id), /^2026-12-25/)
  })

  it("can come from any wallet that isn't a deposito, and the other wallets are untouched", () => {
    const { store } = storeOn("2026-10-01")
    store.createWallet(deposito({}, "wallet-superbank"))
    assert.equal(balanceOf(store, "wallet-superbank"), 24_850_000 - 1_000_000)
    assert.equal(balanceOf(store, "wallet-bca"), BCA)
  })

  it("is stored as a bank wallet with a rate, so the database's list of kinds never has to change", () => {
    const { db, store } = storeOn("2026-10-01")
    const { wallet } = store.createWallet(deposito({ ratePercent: 5.25 }))
    const row = db.prepare("SELECT kind, deposit_rate_bp AS rate, deposit_start AS start, deposit_tenor AS tenor, deposit_rollover AS roll, deposit_source_wallet_id AS source FROM wallets WHERE id = ?").get(wallet.id)
    assert.deepEqual({ ...row }, { kind: "bank", rate: 525, start: "2026-10-01", tenor: 12, roll: 0, source: "wallet-bca" })
    assert.equal(wallet.deposito?.ratePercent, 5.25)
  })

  it("its balance grows as days pass, and the interest is never saved or counted as income", () => {
    const { db, store, clock } = storeOn("2026-10-01")
    const incomeBefore = store.getData().transactions.filter((entry) => entry.type === "income").length
    const { wallet } = store.createWallet(deposito())
    clock.day = "2026-10-31" // 30 days
    const later = store.getData().wallets.find((entry) => entry.id === wallet.id)
    assert.equal(later?.balance, 1_004_109)
    assert.equal(later?.deposito?.interest, 4_109)
    assert.equal(later?.deposito?.principal, 1_000_000)
    // The database still holds only the money put in.
    assert.equal((db.prepare("SELECT balance FROM wallets WHERE id = ?").get(wallet.id) as { balance: number }).balance, 1_000_000)
    assert.equal(store.getData().transactions.length, 42) // the one transfer that put the money in
    assert.equal(store.getData().transactions.filter((entry) => entry.type === "income").length, incomeBefore)
    assert.equal(store.getData().balanceAdjustments.length, 0)
  })

  const rejects = (body: unknown, message: RegExp) => {
    const { store } = storeOn("2026-10-01")
    assert.throws(() => store.createWallet(body), (error: unknown) => error instanceof ValidationError && message.test(error.message))
    // Nothing was made, and no wallet was touched.
    assert.equal(store.getData().wallets.length, 4)
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(balanceOf(store, "wallet-bca"), BCA)
  }

  it("needs its details, an amount above zero, and a wallet the money comes from", () => {
    rejects({ name: "D", kind: "deposito", startingBalance: 1_000_000 }, /rate, start day and tenor/)
    rejects({ ...deposito(), startingBalance: 0 }, /amount put in must be above zero/)
    rejects({ name: "D", kind: "deposito", deposito: deposito().deposito }, /amount put in must be above zero/)
    rejects(deposito({ fromWalletId: undefined }), /Choose the wallet the money comes from/)
    rejects(deposito({}, ""), /Choose the wallet the money comes from/)
    rejects(deposito({}, 5), /Choose the wallet the money comes from/)
  })

  it("refuses a wallet that doesn't exist, and another deposito, as the source", () => {
    rejects(deposito({}, "nope"), /doesn't exist any more/)
    const { store } = storeOn("2026-10-01")
    const first = store.createWallet(deposito()).wallet
    assert.throws(() => store.createWallet({ ...deposito({}, first.id), name: "Second" }), /can't come from another deposito/)
    assert.equal(store.getData().wallets.length, 5)
  })

  it("refuses an amount the source wallet doesn't hold, and says how much it does", () => {
    rejects({ ...deposito(), startingBalance: BCA + 1 }, /BCA only holds Rp 8\.742\.300, so it can't put in Rp 8\.742\.301/)
    const { store } = storeOn("2026-10-01")
    store.createWallet({ ...deposito(), startingBalance: BCA }) // exactly what it holds is fine
    assert.equal(balanceOf(store, "wallet-bca"), 0)
  })

  it("refuses deposito details on any other kind of wallet", () => {
    rejects({ name: "Cash", kind: "cash", deposito: deposito().deposito }, /Only a deposito has a rate and dates/)
  })

  it("checks the rate, the tenor, the rollover choice and the start day", () => {
    for (const ratePercent of [0, -1, 50.01, 5.123, "5", null]) rejects(deposito({ ratePercent }), /yearly rate/)
    for (const tenorMonths of [0, 121, 1.5, "12"]) rejects(deposito({ tenorMonths }), /tenor/)
    for (const rollover of ["yes", 1, undefined]) rejects(deposito({ rollover }), /renews by itself/)
    for (const startDate of ["2026-02-30", "01/10/2026", "1999-12-31", "", undefined]) rejects(deposito({ startDate }), /day the deposito started/)
  })

  it("accepts the edges: 0.01%, 50%, 1 month, 120 months", () => {
    const { store } = storeOn("2026-10-01")
    assert.equal(store.createWallet(deposito({ ratePercent: 0.01, tenorMonths: 1 })).wallet.deposito?.ratePercent, 0.01)
    const other = { ...deposito({ ratePercent: 50, tenorMonths: 120 }), name: "Other" }
    assert.equal(store.createWallet(other).wallet.deposito?.endDate, "2036-10-01")
  })

  it("has no nickname: one that is sent is ignored, and the word stays free for another wallet", () => {
    const { store } = storeOn("2026-10-01")
    const { wallet } = store.createWallet({ ...deposito(), nickname: "depo" })
    assert.equal("nickname" in wallet, false)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.nickname, undefined)
    assert.equal(store.createWallet({ name: "Cash", kind: "cash", nickname: "depo" }).wallet.nickname, "depo")
  })
})

describe("a deposito can't take part in transactions or be corrected by hand", () => {
  const setup = () => {
    const made = storeOn("2026-10-01")
    const { wallet } = made.store.createWallet(deposito())
    return { ...made, wallet }
  }
  const tx = (over: Record<string, unknown>) => ({ type: "income", amount: 50_000, date: "2026-10-02T10:00:00+07:00", description: "x", walletId: "x", categoryId: "cat-salary", ...over })

  it("refuses income, spending and transfers in either direction, and nothing changes", () => {
    const { store, wallet } = setup()
    const before = total(store)
    const count = store.getData().transactions.length
    const refuse = (body: unknown) =>
      assert.throws(() => store.createTransaction(body), (error: unknown) => error instanceof ValidationError && /follows its rate and dates/.test(error.message))
    refuse(tx({ walletId: wallet.id }))
    refuse(tx({ type: "expense", walletId: wallet.id, categoryId: "cat-food" }))
    refuse({ type: "transfer", amount: 10_000, date: "2026-10-02T10:00:00+07:00", description: "", fromWalletId: "wallet-bca", toWalletId: wallet.id })
    refuse({ type: "transfer", amount: 10_000, date: "2026-10-02T10:00:00+07:00", description: "", fromWalletId: wallet.id, toWalletId: "wallet-bca" })
    assert.equal(store.getData().transactions.length, count)
    assert.equal(total(store), before)
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000_000)
  })

  it("refuses moving a transaction onto a deposito", () => {
    const { store, wallet } = setup()
    const first = store.getData().transactions.find((entry) => entry.type === "expense" && entry.walletId === "wallet-bca")
    assert.ok(first && first.type === "expense")
    const bca = balanceOf(store, "wallet-bca")
    assert.throws(
      () => store.updateTransaction(first.id, { type: "expense", amount: first.amount, date: first.date, description: first.description, walletId: wallet.id, categoryId: first.categoryId }),
      ValidationError
    )
    assert.equal(balanceOf(store, "wallet-bca"), bca)
  })

  it("refuses to change or delete the transfer that put the money in", () => {
    const { store, wallet } = setup()
    const opening = store.getData().transactions.at(-1)
    assert.ok(opening)
    assert.throws(() => store.deleteTransaction(opening.id), /follows its rate and dates/)
    assert.throws(
      () => store.updateTransaction(opening.id, { type: "transfer", amount: 5, date: opening.date, description: "", fromWalletId: "wallet-bca", toWalletId: wallet.id }),
      ValidationError
    )
    assert.ok(store.getData().transactions.some((entry) => entry.id === opening.id))
  })

  it("refuses Update value and Correct balance", () => {
    const { store, wallet } = setup()
    assert.throws(() => store.updateWalletValue(wallet.id, { value: 5 }), /Edit its details instead/)
    assert.throws(() => store.correctWalletBalance(wallet.id, { value: 5 }), /Edit its details instead/)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.principal, 1_000_000)
  })
})

describe("editing a deposito", () => {
  const setup = () => {
    const made = storeOn("2026-10-01")
    const { wallet } = made.store.createWallet(deposito())
    return { ...made, wallet }
  }
  const edit = (wallet: { name: string }, over: Record<string, unknown> = {}, principal = 1_000_000) => ({
    name: wallet.name,
    description: "",
    deposito: { principal, ratePercent: 6, startDate: "2026-09-01", tenorMonths: 6, rollover: true, ...over },
  })

  it("changes the rate, the start day, the tenor and the rollover choice", () => {
    const { store, wallet } = setup()
    const saved = store.updateWallet(wallet.id, edit(wallet))?.wallet
    assert.equal(saved?.deposito?.ratePercent, 6)
    assert.equal(saved?.deposito?.startDate, "2026-09-01")
    assert.equal(saved?.deposito?.tenorMonths, 6)
    assert.equal(saved?.deposito?.rollover, true)
    assert.equal(saved?.deposito?.status, "running")
    assert.equal(saved?.deposito?.interest, interestFor(1_000_000, 600, 30)) // 1 Sep to 1 Oct
    assert.equal(saved?.balance, 1_000_000 + interestFor(1_000_000, 600, 30))
    assert.equal(saved?.deposito?.sourceWalletId, "wallet-bca") // where it came from stays
  })

  it("keeps the details when only the name is changed", () => {
    const { store, wallet } = setup()
    const saved = store.updateWallet(wallet.id, { name: "Renamed", description: "x" })?.wallet
    assert.equal(saved?.name, "Renamed")
    assert.equal(saved?.deposito?.ratePercent, 5)
    assert.equal(saved?.deposito?.principal, 1_000_000)
  })

  it("won't change the amount once it came out of a wallet, and nothing moves", () => {
    const { store, wallet } = setup()
    assert.throws(() => store.updateWallet(wallet.id, edit(wallet, {}, 2_000_000)), /came out of BCA, so it can't be changed here/)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.principal, 1_000_000)
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000_000)
  })

  it("won't be given a second source", () => {
    const { store, wallet } = setup()
    assert.throws(() => store.updateWallet(wallet.id, edit(wallet, { fromWalletId: "wallet-jago" })), /already came from BCA/)
    assert.equal(balanceOf(store, "wallet-jago"), 2_315_500)
  })

  it("checks the new details like the first ones, and the amount must be above zero", () => {
    const { store, wallet } = setup()
    assert.throws(() => store.updateWallet(wallet.id, edit(wallet, { ratePercent: 0 })), /yearly rate/)
    assert.throws(() => store.updateWallet(wallet.id, edit(wallet, {}, 0)), /amount put in must be above zero/)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.ratePercent, 5)
  })

  it("refuses deposito details on a wallet that isn't one", () => {
    const { store } = setup()
    assert.throws(() => store.updateWallet("wallet-bca", edit({ name: "BCA" })), /isn't a deposito/)
  })

  it("never keeps a nickname", () => {
    const { store, wallet } = setup()
    const saved = store.updateWallet(wallet.id, { name: wallet.name, description: "", nickname: "depo" })?.wallet
    assert.equal(saved?.nickname, undefined)
    assert.equal(store.updateWallet("wallet-jago", { name: "Bank Jago", description: "", nickname: "depo" })?.wallet.nickname, "depo")
  })
})

/** A deposito made before the money's source was recorded: no source wallet, and nothing taken out of any wallet. */
function legacyDeposito(day = "2026-10-01") {
  const made = storeOn(day)
  const { wallet } = made.store.createWallet(deposito({ startDate: "2025-10-01" }))
  made.db.exec(`UPDATE wallets SET deposit_source_wallet_id = NULL WHERE id = '${wallet.id}'`)
  made.db.exec("DELETE FROM transactions WHERE description LIKE 'Opened deposito%'")
  made.db.exec(`UPDATE wallets SET balance = ${BCA} WHERE id = 'wallet-bca'`)
  return { ...made, wallet }
}

describe("moving a matured deposito's money back", () => {
  const setup = (rollover = false) => {
    const made = storeOn("2026-10-01")
    // Started 12 months and 1 day ago, so it has matured; one term at 5% earned exactly 50.000.
    const { wallet } = made.store.createWallet(deposito({ startDate: "2025-10-01", rollover }))
    made.clock.day = "2026-10-02"
    return { ...made, wallet }
  }

  it("is matured with its full interest, waiting for the owner to confirm", () => {
    const { store, wallet } = setup()
    const found = store.getData().wallets.find((entry) => entry.id === wallet.id)
    assert.equal(found?.deposito?.status, "matured")
    assert.equal(found?.deposito?.interest, 50_000)
    assert.equal(found?.balance, 1_050_000)
  })

  it("goes back to the wallet it came from, without choosing one, as one transfer; the total does not change", () => {
    const { store, wallet } = setup()
    const before = total(store)
    const incomeBefore = store.getData().transactions.filter((entry) => entry.type === "income").length
    const count = store.getData().transactions.length
    const result = store.settleDeposito(wallet.id, {}, new Date(2026, 9, 2, 9, 30)) as SettleDepositoResult
    assert.equal(result.transaction.type, "transfer")
    assert.equal(result.transaction.amount, 1_050_000)
    assert.equal(result.transaction.type === "transfer" && result.transaction.fromWalletId, wallet.id)
    assert.equal(result.transaction.type === "transfer" && result.transaction.toWalletId, "wallet-bca")
    assert.match(result.transaction.description, /Deposito Deposito BCA matured/)
    // BCA gave 1.000.000 and gets 1.050.000 back: the interest is the difference.
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA + 50_000)
    assert.equal(result.wallet.balance, 0)
    assert.equal(result.wallet.deposito?.status, "settled")
    assert.equal(result.wallet.deposito?.principal, 0)
    assert.equal(result.wallet.deposito?.interest, 0)
    assert.match(result.wallet.deposito?.settledAt ?? "", /^2026-10-02T09:30:00[+-]\d{2}:\d{2}$/)
    assert.equal(total(store), before)
    assert.equal(store.getData().transactions.length, count + 1)
    // The transfer is the only record: it is not income, so no category's total moves.
    assert.equal(store.getData().transactions.filter((entry) => entry.type === "income").length, incomeBefore)
  })

  it("accepts the wallet it came from if that is named, and refuses any other one", () => {
    const { store, wallet } = setup()
    assert.throws(() => store.settleDeposito(wallet.id, { toWalletId: "wallet-jago" }), /goes back to BCA, the wallet it came from/)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.status, "matured")
    assert.ok(store.settleDeposito(wallet.id, { toWalletId: "wallet-bca" }))
  })

  it("stays settled and earns nothing as days go by", () => {
    const { store, wallet, clock } = setup()
    store.settleDeposito(wallet.id, {})
    clock.day = "2030-01-01"
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.balance, 0)
  })

  it("can only be done once", () => {
    const { store, wallet } = setup()
    store.settleDeposito(wallet.id, {})
    const count = store.getData().transactions.length
    assert.throws(() => store.settleDeposito(wallet.id, {}), /already been moved/)
    assert.equal(store.getData().transactions.length, count)
  })

  it("is refused while it is still running, and for one that renews by itself", () => {
    const running = storeOn("2026-10-01")
    const made = running.store.createWallet(deposito()).wallet
    assert.throws(() => running.store.settleDeposito(made.id, {}), /hasn't matured yet. It ends on 2027-10-01/)
    const { store, wallet } = setup(true)
    assert.throws(() => store.settleDeposito(wallet.id, {}), /renews by itself/)
    assert.equal(store.getData().transactions.length, 42)
  })

  it("is refused for a wallet that isn't a deposito, and answers undefined for one that doesn't exist", () => {
    const { store } = setup()
    assert.throws(() => store.settleDeposito("wallet-bca", { toWalletId: "wallet-jago" }), /isn't a deposito/)
    assert.equal(store.settleDeposito("nope", {}), undefined)
  })

  it("leaves the transfer it made unchangeable, and the deposito's details too", () => {
    const { store, wallet } = setup()
    const { transaction } = store.settleDeposito(wallet.id, {}) as SettleDepositoResult
    assert.throws(() => store.deleteTransaction(transaction.id), /follows its rate and dates/)
    assert.throws(
      () => store.updateTransaction(transaction.id, { type: "transfer", amount: 5, date: transaction.date, description: "", fromWalletId: wallet.id, toWalletId: "wallet-jago" }),
      ValidationError
    )
    assert.ok(store.getData().transactions.some((entry) => entry.id === transaction.id))
    assert.throws(
      () => store.updateWallet(wallet.id, { name: wallet.name, description: "", deposito: { principal: 5, ratePercent: 5, startDate: "2026-01-01", tenorMonths: 6, rollover: false } }),
      /can't be changed/
    )
    // It can still be renamed.
    assert.equal(store.updateWallet(wallet.id, { name: "Old deposito", description: "" })?.wallet.name, "Old deposito")
  })

  it("is all or nothing", () => {
    const { db, store, wallet } = setup()
    // Make the final step fail: the database refuses the settled wallet's update.
    db.exec("CREATE TRIGGER no_settle BEFORE UPDATE OF deposit_settled_at ON wallets BEGIN SELECT RAISE(ABORT, 'no'); END")
    assert.throws(() => store.settleDeposito(wallet.id, {}))
    assert.equal(store.getData().transactions.length, 42)
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000_000)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.status, "matured")
  })

  it("goes back to the same wallet even when it isn't the first one", () => {
    const made = storeOn("2026-10-01")
    const { wallet } = made.store.createWallet(deposito({ startDate: "2025-10-01" }, "wallet-superbank"))
    made.clock.day = "2026-10-02"
    const result = made.store.settleDeposito(wallet.id, {}) as SettleDepositoResult
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-superbank")?.balance, 24_850_000 + 50_000)
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA)
  })
})

describe("a deposito whose source is unknown", () => {
  it("(made before the source was recorded) asks for a wallet, which must exist, not be itself and not be a deposito", () => {
    const { store, wallet, clock } = legacyDeposito()
    clock.day = "2026-10-02"
    const other = store.createWallet({ ...deposito({ startDate: "2026-10-02" }), name: "Second" }).wallet
    assert.throws(() => store.settleDeposito(wallet.id, {}), /Choose the wallet the money should go to/)
    assert.throws(() => store.settleDeposito(wallet.id, { toWalletId: "nope" }), /doesn't exist any more/)
    assert.throws(() => store.settleDeposito(wallet.id, { toWalletId: wallet.id }), /different wallet/)
    assert.throws(() => store.settleDeposito(wallet.id, { toWalletId: other.id }), /not a deposito/)
    const result = store.settleDeposito(wallet.id, { toWalletId: "wallet-jago" }) as SettleDepositoResult
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-jago")?.balance, 2_315_500 + 1_050_000)
  })

  it("can be given its source later from the edit form: the amount comes out of that wallet now", () => {
    const { store, wallet } = legacyDeposito()
    const before = total(store)
    const count = store.getData().transactions.length
    const saved = store.updateWallet(wallet.id, {
      name: wallet.name,
      description: "",
      deposito: { principal: 1_000_000, ratePercent: 5, startDate: "2025-10-01", tenorMonths: 12, rollover: false, fromWalletId: "wallet-bca" },
    })?.wallet
    assert.equal(saved?.deposito?.sourceWalletId, "wallet-bca")
    assert.equal(balanceOf(store, "wallet-bca"), BCA - 1_000_000)
    assert.equal(store.getData().transactions.length, count + 1)
    // The deposito was already counted in the total; the amount now also leaves the wallet it came from.
    assert.equal(total(store), before - 1_000_000)
  })

  it("can't be given a source that holds too little, and nothing changes", () => {
    const { store, wallet } = legacyDeposito()
    assert.throws(
      () => store.updateWallet(wallet.id, { name: wallet.name, description: "", deposito: { principal: 3_000_000, ratePercent: 5, startDate: "2025-10-01", tenorMonths: 12, rollover: false, fromWalletId: "wallet-jago" } }),
      /Bank Jago only holds Rp 2\.315\.500/
    )
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.sourceWalletId, undefined)
    assert.equal(balanceOf(store, "wallet-jago"), 2_315_500)
  })

  it("is what a deposito becomes when the wallet it came from is deleted", () => {
    const { store, clock } = storeOn("2026-10-01")
    const spare = store.createWallet({ name: "Spare", kind: "cash", startingBalance: 5_000_000 }).wallet
    const { wallet } = store.createWallet(deposito({ startDate: "2025-10-01" }, spare.id))
    clock.day = "2026-10-02"
    store.deleteWallet(spare.id)
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.deposito?.sourceWalletId, undefined)
    assert.throws(() => store.settleDeposito(wallet.id, {}), /Choose the wallet the money should go to/)
    assert.ok(store.settleDeposito(wallet.id, { toWalletId: "wallet-bca" }))
  })
})

describe("deleting a deposito", () => {
  it("can be undone, and comes back with its rate, its dates and where it came from", () => {
    const { store } = storeOn("2026-10-01")
    const { wallet } = store.createWallet(deposito({ ratePercent: 6.5, rollover: true }))
    const removed = store.deleteWallet(wallet.id)
    assert.ok(removed)
    assert.equal(store.getData().wallets.length, 4)
    const back = store.undo(removed.undoId)
    assert.equal(back.kind, "wallet")
    const found = store.getData().wallets.find((entry) => entry.id === wallet.id)
    assert.equal(found?.kind, "deposito")
    assert.equal(found?.deposito?.ratePercent, 6.5)
    assert.equal(found?.deposito?.rollover, true)
    assert.equal(found?.deposito?.sourceWalletId, "wallet-bca")
    assert.equal(found?.balance, 1_000_000)
  })

  it("a settled deposito can be deleted: the wallet that got the money keeps it", () => {
    const { store, clock } = storeOn("2026-10-01")
    const { wallet } = store.createWallet(deposito({ startDate: "2025-10-01" }))
    clock.day = "2026-10-02"
    store.settleDeposito(wallet.id, {})
    store.deleteWallet(wallet.id)
    assert.equal(balanceOf(store, "wallet-bca"), BCA + 50_000)
    assert.equal(store.getData().transactions.length, 41) // both of its transfers went with it
  })
})

describe("the deposito routes", () => {
  it("opens and settles over HTTP, and explains problems with a 400 and a 404", async () => {
    const clock = { day: "2026-10-01" }
    const store = createStore(openDatabase(":memory:"), () => clock.day)
    const app = createApp(store)
    const post = (path: string, body: unknown) =>
      app.request(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

    // Ends on 2026-10-02: running on the 1st, matured on the 2nd.
    const created = await post("/api/wallets", deposito({ startDate: "2025-10-02" }))
    assert.equal(created.status, 201)
    const { wallet, wallets } = (await created.json()) as SaveWalletResult
    assert.equal(wallet.kind, "deposito")
    assert.equal(wallet.deposito?.sourceWalletId, "wallet-bca")
    assert.equal(wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA - 1_000_000)

    const noSource = await post("/api/wallets", { ...deposito(), name: "No source", deposito: { ratePercent: 5, startDate: "2026-10-01", tenorMonths: 12, rollover: false } })
    assert.equal(noSource.status, 400)
    assert.match(((await noSource.json()) as { error: string }).error, /Choose the wallet the money comes from/)

    const tooSoon = await post(`/api/wallets/${wallet.id}/settle`, {})
    assert.equal(tooSoon.status, 400)
    assert.match(((await tooSoon.json()) as { error: string }).error, /hasn't matured yet. It ends on 2026-10-02/)

    clock.day = "2026-10-02"
    const done = await post(`/api/wallets/${wallet.id}/settle`, {}) // no wallet needed: it goes back to BCA
    assert.equal(done.status, 200)
    const result = (await done.json()) as SettleDepositoResult
    assert.equal(result.wallet.deposito?.status, "settled")
    assert.equal(result.transaction.amount, 1_050_000)
    assert.equal(result.wallets.find((entry) => entry.id === "wallet-bca")?.balance, BCA + 50_000)

    const missing = await post("/api/wallets/nope/settle", {})
    assert.equal(missing.status, 404)
  })
})

describe("upgrading a database made before deposito", () => {
  const dir = mkdtempSync(join(tmpdir(), "kaya-deposito-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds empty deposito columns and keeps everything else exactly as it was", () => {
    const path = join(dir, "before.db")
    const first = openDatabase(path)
    createStore(first) // the sample data, made by the current code...
    first.close()
    // ...then taken back to how the last version left it: none of the deposito columns.
    const old = new DatabaseSync(path)
    for (const column of ["deposit_source_wallet_id", "deposit_rate_bp", "deposit_start", "deposit_tenor", "deposit_rollover", "deposit_settled_at"]) {
      old.exec(`ALTER TABLE wallets DROP COLUMN ${column}`)
    }
    const names = (old.prepare("PRAGMA table_info(wallets)").all() as { name: string }[]).map((column) => column.name)
    assert.equal(names.some((name) => name.startsWith("deposit_")), false)
    const wallets = old.prepare("SELECT id, name, kind, balance FROM wallets ORDER BY position").all().map((row) => ({ ...row }))
    const transactionCount = (old.prepare("SELECT COUNT(*) AS n FROM transactions").get() as { n: number }).n
    old.close()

    const db = openDatabase(path)
    const store = createStore(db, () => "2026-10-08")
    const after = store.getData()
    assert.deepEqual(
      after.wallets.map((wallet) => ({ id: wallet.id, name: wallet.name, kind: wallet.kind, balance: wallet.balance })),
      wallets
    )
    assert.ok(after.wallets.every((wallet) => wallet.deposito === undefined))
    assert.equal(after.transactions.length, transactionCount)
    // A deposito can be added to the upgraded database, and it keeps working after another open.
    const { wallet } = store.createWallet(deposito({ startDate: "2026-10-08" }))
    assert.equal(wallet.deposito?.endDate, "2027-10-08")
    db.close()

    const again = openDatabase(path)
    const found = createStore(again, () => "2026-10-08").getData().wallets.find((entry) => entry.id === wallet.id)
    assert.equal(found?.kind, "deposito")
    assert.equal(found?.balance, 1_000_000)
    assert.equal(found?.deposito?.sourceWalletId, "wallet-bca")
    again.close()
  })

  it("adds only the source column to a database that already had a deposito, and clears that deposito's nickname", () => {
    const path = join(dir, "step22.db")
    const first = openDatabase(path)
    const store = createStore(first, () => "2026-10-08")
    const { wallet } = store.createWallet(deposito({ startDate: "2026-10-08" }))
    first.exec(`UPDATE wallets SET deposit_source_wallet_id = NULL, nickname = 'Depo' WHERE id = '${wallet.id}'`)
    first.exec("UPDATE wallets SET nickname = 'jago' WHERE id = 'wallet-jago'")
    first.exec("ALTER TABLE wallets DROP COLUMN deposit_source_wallet_id")
    first.close()

    const db = openDatabase(path)
    const found = createStore(db, () => "2026-10-08").getData().wallets
    const deposito0 = found.find((entry) => entry.id === wallet.id)
    assert.equal(deposito0?.kind, "deposito")
    assert.equal(deposito0?.deposito?.sourceWalletId, undefined)
    assert.equal(deposito0?.nickname, undefined)
    assert.equal((db.prepare("SELECT nickname FROM wallets WHERE id = ?").get(wallet.id) as { nickname: string | null }).nickname, null)
    assert.equal(found.find((entry) => entry.id === "wallet-jago")?.nickname, "jago") // other wallets keep theirs
    db.close()
  })

  it("the database itself refuses a rate, a tenor or a rollover choice that makes no sense", () => {
    const db = openDatabase(":memory:")
    createStore(db)
    assert.throws(() => db.exec("UPDATE wallets SET deposit_rate_bp = 0 WHERE id = 'wallet-bca'"), /CHECK constraint/)
    assert.throws(() => db.exec("UPDATE wallets SET deposit_tenor = 0 WHERE id = 'wallet-bca'"), /CHECK constraint/)
    assert.throws(() => db.exec("UPDATE wallets SET deposit_rollover = 2 WHERE id = 'wallet-bca'"), /CHECK constraint/)
  })
})

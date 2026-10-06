import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, BalanceChange, DeleteWalletResult, SaveWalletResult, Transaction } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))
const NOW = new Date(2026, 8, 30, 14, 5, 0)

const newWallet = (over: Record<string, unknown> = {}) => ({
  name: "GoPay",
  kind: "e-wallet",
  description: "",
  startingBalance: 100_000,
  ...over,
})

const walletOf = (store: ReturnType<typeof freshStore>, id: string) => store.getData().wallets.find((w) => w.id === id)
const total = (store: ReturnType<typeof freshStore>) => store.getData().wallets.reduce((sum, w) => sum + w.balance, 0)
const touches = (tx: Transaction, id: string) =>
  tx.type === "transfer" ? tx.fromWalletId === id || tx.toWalletId === id : tx.walletId === id

describe("a wallet's colour and icon", () => {
  it("starts on the defaults: the app's colour, and no chosen icon", () => {
    const { wallet } = freshStore().createWallet(newWallet())
    assert.equal(wallet.color, wallet.defaultColor)
    assert.equal(wallet.icon, undefined)
  })

  it("can be given a colour and icon when added, and still remembers the app's own pick as the default", () => {
    const { wallet } = freshStore().createWallet(newWallet({ color: "rose", icon: "piggy-bank" }))
    assert.equal(wallet.color, "rose")
    assert.equal(wallet.icon, "piggy-bank")
    assert.notEqual(wallet.defaultColor, "rose") // the least-used colour was something else
  })

  it("keeps the sample wallets' colours as their defaults", () => {
    const wallets = freshStore().getData().wallets
    for (const wallet of wallets) assert.equal(wallet.defaultColor, wallet.color)
  })

  it("can be changed, and going back to the default colour is just sending it again", () => {
    const store = freshStore()
    const before = walletOf(store, "wallet-bca")!
    const changed = store.updateWallet("wallet-bca", { name: "BCA", description: "x", color: "plum", icon: "gem" })!.wallet
    assert.equal(changed.color, "plum")
    assert.equal(changed.icon, "gem")
    assert.equal(changed.defaultColor, before.color) // the default is remembered
    const back = store.updateWallet("wallet-bca", { name: "BCA", description: "x", color: changed.defaultColor, icon: null })!.wallet
    assert.equal(back.color, before.color)
    assert.equal(back.icon, undefined)
  })

  it("is left alone by an edit that doesn't mention it", () => {
    const store = freshStore()
    store.updateWallet("wallet-bca", { name: "BCA", description: "", color: "rose", icon: "coins" })
    const { wallet } = store.updateWallet("wallet-bca", { name: "BCA main", description: "" })!
    assert.equal(wallet.color, "rose")
    assert.equal(wallet.icon, "coins")
  })

  it("refuses a colour or icon that isn't on offer", () => {
    const store = freshStore()
    for (const color of ["purple", "", 5, null]) {
      assert.throws(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", color }), /colours on offer/)
    }
    for (const icon of ["rocket", "", 5]) {
      assert.throws(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", icon }), /icons on offer/)
    }
    assert.throws(() => store.createWallet(newWallet({ color: "purple" })), ValidationError)
    assert.throws(() => store.createWallet(newWallet({ icon: "rocket" })), ValidationError)
    assert.equal(walletOf(store, "wallet-bca")?.color, "sky") // nothing changed
  })

  it("is forgotten when the data is reset", () => {
    const store = freshStore()
    store.updateWallet("wallet-bca", { name: "BCA", description: "", color: "rose", icon: "gem" })
    store.reset()
    assert.equal(walletOf(store, "wallet-bca")?.color, "sky")
    assert.equal(walletOf(store, "wallet-bca")?.icon, undefined)
  })
})

describe("correcting a balance", () => {
  it("sets the balance to what the real account shows, without creating a transaction", () => {
    const store = freshStore()
    const { wallet } = store.correctWalletBalance("wallet-bca", { value: 8_717_300 }, NOW)!
    assert.equal(wallet.balance, 8_717_300)
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(total(store), 51_337_800 - 25_000)
  })

  it("is remembered in the wallet's history as a correction, with the old and new balance", () => {
    const store = freshStore()
    store.correctWalletBalance("wallet-bca", { value: 8_717_300 }, NOW)
    const [entry] = store.getWalletHistory("wallet-bca")!
    assert.equal(entry.kind, "correction")
    assert.equal(entry.oldBalance, 8_742_300)
    assert.equal(entry.newBalance, 8_717_300)
    assert.match(entry.at, /^2026-09-30T14:05:00[+-]\d{2}:\d{2}$/)
  })

  it("does not count as an investment's value update on the wallet card", () => {
    const store = freshStore()
    store.correctWalletBalance("wallet-bca", { value: 1 }, NOW)
    assert.equal(walletOf(store, "wallet-bca")?.lastValueChange, undefined)
  })

  it("is not for investments, which have their market value instead (and the other way round)", () => {
    const store = freshStore()
    assert.throws(() => store.correctWalletBalance("wallet-pluang", { value: 1 }), /Use Update value/)
    assert.throws(() => store.updateWalletValue("wallet-bca", { value: 1 }), /Only investment wallets/)
    assert.equal(walletOf(store, "wallet-pluang")?.balance, 15_430_000)
  })

  it("refuses a balance that is negative, fractional or not a number, and allows zero", () => {
    const store = freshStore()
    for (const value of [-1, 2.5, "9", null, undefined]) {
      assert.throws(() => store.correctWalletBalance("wallet-bca", { value }), /The balance must be a whole number/)
    }
    assert.equal(store.correctWalletBalance("wallet-bca", { value: 0 })?.wallet.balance, 0)
  })

  it("returns undefined for a wallet that doesn't exist", () => {
    assert.equal(freshStore().correctWalletBalance("wallet-nope", { value: 1 }), undefined)
  })

  it("keeps working with transactions afterwards: later spending is taken from the corrected balance", () => {
    const store = freshStore()
    store.correctWalletBalance("wallet-bca", { value: 1_000_000 }, NOW)
    const { wallets } = store.createTransaction({
      type: "expense",
      amount: 100_000,
      date: "2026-09-30T15:00:00+07:00",
      description: "",
      walletId: "wallet-bca",
      categoryId: "cat-food",
    })
    assert.equal(wallets.find((w) => w.id === "wallet-bca")?.balance, 900_000)
  })
})

describe("a wallet's history", () => {
  it("lists what was set by hand, newest first, both kinds together", () => {
    const store = freshStore()
    store.updateWalletValue("wallet-pluang", { value: 15_550_000 }, NOW)
    store.updateWalletValue("wallet-pluang", { value: 15_400_000 }, NOW)
    const history = store.getWalletHistory("wallet-pluang")!
    assert.deepEqual(
      history.map((h) => [h.kind, h.oldBalance, h.newBalance]),
      [
        ["value", 15_550_000, 15_400_000],
        ["value", 15_430_000, 15_550_000],
      ]
    )
    store.correctWalletBalance("wallet-bca", { value: 5 }, NOW)
    assert.equal(store.getWalletHistory("wallet-bca")?.length, 1) // each wallet has its own
  })

  it("is empty until something is set by hand, and undefined for a wallet that doesn't exist", () => {
    const store = freshStore()
    assert.deepEqual(store.getWalletHistory("wallet-jago"), [])
    assert.equal(store.getWalletHistory("wallet-nope"), undefined)
  })
})

describe("deleting a wallet", () => {
  it("removes the wallet and every transaction that touches it, transfers in both directions included", () => {
    const store = freshStore()
    const before = store.getData()
    const doomed = before.transactions.filter((tx) => touches(tx, "wallet-jago")).map((tx) => tx.id)
    assert.ok(doomed.length > 10)

    const result = store.deleteWallet("wallet-jago")!
    assert.equal(result.wallets.length, 3)
    assert.deepEqual([...result.deletedTransactionIds].sort(), [...doomed].sort())

    const after = store.getData()
    assert.equal(after.transactions.length, before.transactions.length - doomed.length)
    assert.ok(after.transactions.every((tx) => !touches(tx, "wallet-jago")))
    assert.equal(walletOf(store, "wallet-jago"), undefined)
  })

  it("leaves the other wallets' balances exactly as they were", () => {
    const store = freshStore()
    const before = store.getData().wallets
    store.deleteWallet("wallet-jago") // it received transfers from BCA
    const after = store.getData().wallets
    for (const wallet of after) {
      assert.equal(wallet.balance, before.find((w) => w.id === wallet.id)?.balance, wallet.name)
    }
    assert.equal(total(store), 51_337_800 - 2_315_500) // only the deleted wallet's balance leaves the total
  })

  it("takes the wallet's history with it", () => {
    const store = freshStore()
    store.correctWalletBalance("wallet-bca", { value: 5 }, NOW)
    store.deleteWallet("wallet-bca")
    assert.equal(store.getWalletHistory("wallet-bca"), undefined)
  })

  it("can delete a wallet just added, with nothing in it", () => {
    const store = freshStore()
    const { wallet } = store.createWallet(newWallet())
    const result = store.deleteWallet(wallet.id)!
    assert.equal(result.deletedTransactionIds.length, 0)
    assert.equal(result.wallets.length, 4)
  })

  it("refuses while a goal is saved in the wallet, and names the goals", () => {
    const store = freshStore()
    assert.throws(
      () => store.deleteWallet("wallet-superbank"),
      (error: unknown) =>
        error instanceof ValidationError && /"Emergency fund", "Japan in spring"/.test(error.message) && /goals are/.test(error.message)
    )
    assert.throws(() => store.deleteWallet("wallet-pluang"), /a goal is saved in it: "Home down payment"/)
    assert.equal(store.getData().wallets.length, 4) // nothing was deleted
    assert.equal(store.getData().transactions.length, 41)
  })

  it("refuses to delete the last wallet", () => {
    const db = openDatabase(":memory:")
    const store = createStore(db)
    db.exec("DELETE FROM goal_movements") // a goal's history points at the goal
    db.exec("DELETE FROM goals") // goals would block first; this test is about the last wallet
    for (const id of ["wallet-bca", "wallet-jago", "wallet-superbank"]) store.deleteWallet(id)
    assert.throws(() => store.deleteWallet("wallet-pluang"), /Keep at least one wallet/)
    assert.equal(store.getData().wallets.length, 1)
  })

  it("returns undefined for a wallet that doesn't exist", () => {
    assert.equal(freshStore().deleteWallet("wallet-nope"), undefined)
  })

  it("all or nothing: a refused delete removes no transactions", () => {
    const store = freshStore()
    assert.throws(() => store.deleteWallet("wallet-superbank"))
    assert.ok(store.getData().transactions.some((tx) => touches(tx, "wallet-superbank")))
  })
})

describe("putting the wallets in a new order", () => {
  const ids = (store: ReturnType<typeof freshStore>) => store.getData().wallets.map((w) => w.id)

  it("saves the order, and every later read uses it", () => {
    const store = freshStore()
    const reversed = ids(store).reverse()
    const { wallets } = store.reorderWallets({ ids: reversed })
    assert.deepEqual(wallets.map((w) => w.id), reversed)
    assert.deepEqual(ids(store), reversed)
  })

  it("puts a wallet added afterwards last", () => {
    const store = freshStore()
    store.reorderWallets({ ids: ids(store).reverse() })
    const { wallet, wallets } = store.createWallet(newWallet())
    assert.equal(wallets.at(-1)?.id, wallet.id)
  })

  it("still works after a wallet was deleted", () => {
    const store = freshStore()
    store.deleteWallet("wallet-jago")
    const order = ids(store).reverse()
    assert.deepEqual(store.reorderWallets({ ids: order }).wallets.map((w) => w.id), order)
  })

  it("refuses a list that isn't every wallet exactly once", () => {
    const store = freshStore()
    const original = ids(store)
    const bad = [
      { ids: original.slice(1) }, // one missing
      { ids: [...original, "wallet-nope"] }, // an extra one
      { ids: [original[0], original[0], original[1], original[2]] }, // a duplicate
      { ids: ["a", "b", "c", "d"] }, // unknown
      { ids: "wallet-bca" },
      { ids: [1, 2, 3, 4] },
      {},
      null,
    ]
    for (const body of bad) assert.throws(() => store.reorderWallets(body), ValidationError)
    assert.deepEqual(ids(store), original) // nothing changed
  })
})

describe("upgrading a database made by an older version", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabungbego-upgrade-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds the new columns and keeps everything already saved", () => {
    const path = join(dir, "old.db")

    // A database exactly as the earlier version left it: no default_color, no icon, no update kind.
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE wallets (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('bank', 'digital-bank', 'e-wallet', 'investment', 'cash')),
        balance INTEGER NOT NULL, description TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL
      );
      CREATE TABLE wallet_value_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT, wallet_id TEXT NOT NULL REFERENCES wallets (id),
        at TEXT NOT NULL, old_balance INTEGER NOT NULL, new_balance INTEGER NOT NULL
      );
      INSERT INTO wallets VALUES ('w1', 'Old BCA', 'bank', 1000, 'note', 'sky', 0);
      INSERT INTO wallets VALUES ('w2', 'Old Pluang', 'investment', 5000, '', 'moss', 1);
      INSERT INTO wallet_value_updates (wallet_id, at, old_balance, new_balance)
        VALUES ('w2', '2026-09-01T10:00:00+07:00', 4000, 5000);
      PRAGMA user_version = 1;
    `)
    old.close()

    const db = openDatabase(path)
    const store = createStore(db) // version is 1, so nothing is re-seeded
    const wallets = store.getData().wallets
    assert.deepEqual(wallets.map((w) => [w.id, w.name, w.balance, w.color, w.defaultColor]), [
      ["w1", "Old BCA", 1000, "sky", "sky"], // the colour it had is its default
      ["w2", "Old Pluang", 5000, "moss", "moss"],
    ])
    assert.equal(wallets[0].icon, undefined)
    assert.equal(wallets[1].lastValueChange?.change, 1000) // the old update still counts as a value update

    // ...and every new feature works on it.
    assert.equal(store.correctWalletBalance("w1", { value: 900 }, NOW)?.wallet.balance, 900)
    assert.equal(store.updateWallet("w1", { name: "Old BCA", description: "", color: "rose", icon: "gem" })?.wallet.icon, "gem")
    assert.equal(store.getWalletHistory("w2")?.[0].kind, "value")
    assert.equal(store.reorderWallets({ ids: ["w2", "w1"] }).wallets[0].id, "w2")
    assert.equal(store.deleteWallet("w1")?.wallets.length, 1)
    db.close()

    // Opening it again changes nothing.
    const again = openDatabase(path)
    assert.equal(createStore(again).getData().wallets.length, 1)
    again.close()
  })

  it("the database still refuses an icon that isn't on the list", () => {
    const db = openDatabase(":memory:")
    createStore(db) // fills the sample wallets, so there is a row to change
    assert.throws(() => db.exec("UPDATE wallets SET icon = 'rocket' WHERE id = 'wallet-bca'"), /CHECK constraint/)
    assert.throws(
      () => db.exec("INSERT INTO wallet_value_updates (wallet_id, at, old_balance, new_balance, kind) VALUES ('wallet-bca', 'x', 1, 2, 'gift')"),
      /CHECK constraint/
    )
  })
})

describe("the wallet routes for these", () => {
  const app = () => createApp(freshStore())
  const send = (method: string, body?: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  it("correct a balance and read its history", async () => {
    const api = app()
    const corrected = await api.request("/api/wallets/wallet-bca/correction", send("POST", { value: 8_717_300 }))
    assert.equal(corrected.status, 200)
    assert.equal(((await corrected.json()) as SaveWalletResult).wallet.balance, 8_717_300)

    const history = (await (await api.request("/api/wallets/wallet-bca/history")).json()) as BalanceChange[]
    assert.equal(history.length, 1)
    assert.equal(history[0].kind, "correction")

    assert.equal((await api.request("/api/wallets/wallet-pluang/correction", send("POST", { value: 1 }))).status, 400)
    assert.equal((await api.request("/api/wallets/wallet-nope/correction", send("POST", { value: 1 }))).status, 404)
    assert.equal((await api.request("/api/wallets/wallet-nope/history")).status, 404)
  })

  it("delete a wallet, and say why when it can't", async () => {
    const api = app()
    const gone = await api.request("/api/wallets/wallet-jago", send("DELETE"))
    assert.equal(gone.status, 200)
    const result = (await gone.json()) as DeleteWalletResult
    assert.equal(result.wallets.length, 3)
    assert.ok(result.deletedTransactionIds.length > 0)

    const data = (await (await api.request("/api/data")).json()) as AppData
    assert.ok(data.transactions.every((tx) => !touches(tx, "wallet-jago")))

    const blocked = await api.request("/api/wallets/wallet-superbank", send("DELETE"))
    assert.equal(blocked.status, 400)
    assert.match(((await blocked.json()) as { error: string }).error, /Emergency fund/)
    assert.equal((await api.request("/api/wallets/wallet-nope", send("DELETE"))).status, 404)
  })

  it("reorder the wallets (and \"order\" is not mistaken for a wallet id)", async () => {
    const api = app()
    const reordered = await api.request(
      "/api/wallets/order",
      send("PUT", { ids: ["wallet-pluang", "wallet-superbank", "wallet-jago", "wallet-bca"] })
    )
    assert.equal(reordered.status, 200)
    assert.equal(((await reordered.json()) as { wallets: { id: string }[] }).wallets[0].id, "wallet-pluang")

    const data = (await (await api.request("/api/data")).json()) as AppData
    assert.equal(data.wallets[0].id, "wallet-pluang")

    const bad = await api.request("/api/wallets/order", send("PUT", { ids: ["wallet-bca"] }))
    assert.equal(bad.status, 400)
  })

  it("add and edit a wallet with a colour and icon", async () => {
    const api = app()
    const created = await api.request("/api/wallets", send("POST", newWallet({ color: "teal", icon: "credit-card" })))
    assert.equal(created.status, 201)
    const { wallet } = (await created.json()) as SaveWalletResult
    assert.equal(wallet.color, "teal")
    assert.equal(wallet.icon, "credit-card")

    const edited = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "GoPay", description: "", icon: null }))
    assert.equal(((await edited.json()) as SaveWalletResult).wallet.icon, undefined)

    const bad = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "GoPay", description: "", color: "purple" }))
    assert.equal(bad.status, 400)
  })
})

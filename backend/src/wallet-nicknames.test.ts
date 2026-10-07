import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, SaveWalletResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))

const newWallet = (over: Record<string, unknown> = {}) => ({
  name: "GoPay",
  kind: "e-wallet",
  description: "",
  startingBalance: 0,
  ...over,
})
const changes = (over: Record<string, unknown> = {}) => ({ name: "Bank Jago", description: "", ...over })
const nicknameOf = (store: ReturnType<typeof freshStore>, id: string) => store.getData().wallets.find((wallet) => wallet.id === id)?.nickname

const refuses = (run: () => unknown, message: RegExp) =>
  assert.throws(run, (error: unknown) => error instanceof ValidationError && message.test(error.message))

describe("a wallet's nickname", () => {
  it("is saved with a new wallet, with spaces tidied, and comes back with every wallet", () => {
    const store = freshStore()
    const { wallet, wallets } = store.createWallet(newWallet({ nickname: "  go   pay " }))
    assert.equal(wallet.nickname, "go pay")
    assert.equal(wallets.find((entry) => entry.id === wallet.id)?.nickname, "go pay")
    assert.equal(store.getData().wallets.find((entry) => entry.id === wallet.id)?.nickname, "go pay")
  })

  it("is simply missing when there is none: not an empty text", () => {
    const store = freshStore()
    for (const [index, nickname] of [undefined, null, "", "   "].entries()) {
      const { wallet } = store.createWallet(newWallet({ name: `Wallet ${index}`, nickname }))
      assert.equal("nickname" in wallet, false)
    }
    assert.ok(store.getData().wallets.every((wallet) => !("nickname" in wallet))) // the sample wallets have none either
  })

  it("is refused when it is too long, has no letter, isn't text, or is already a name or nickname", () => {
    const store = freshStore()
    refuses(() => store.createWallet(newWallet({ nickname: "x".repeat(21) })), /nickname can be at most 20/)
    assert.equal(store.createWallet(newWallet({ nickname: "x".repeat(20) })).wallet.nickname, "x".repeat(20))
    refuses(() => store.createWallet(newWallet({ name: "A", nickname: "123" })), /at least one letter/)
    refuses(() => store.createWallet(newWallet({ name: "B", nickname: "!!" })), /at least one letter/)
    refuses(() => store.createWallet(newWallet({ name: "C", nickname: 7 })), /nickname must be text/)
    refuses(() => store.createWallet(newWallet({ name: "D", nickname: "bca" })), /BCA is already the name of another wallet/)
    refuses(() => store.createWallet(newWallet({ name: "E", nickname: " BANK  jago " })), /Bank Jago is already the name of another wallet/)
    store.createWallet(newWallet({ name: "F", nickname: "dompet" }))
    refuses(() => store.createWallet(newWallet({ name: "G", nickname: "Dompet" })), /Dompet is already the nickname of F/)
    assert.equal(store.getData().wallets.length, 6) // only the two that were fine were added
  })

  it("lets letters and numbers mix, and non-English letters count as letters", () => {
    const store = freshStore()
    assert.equal(store.createWallet(newWallet({ name: "A", nickname: "kas 2" })).wallet.nickname, "kas 2")
    assert.equal(store.createWallet(newWallet({ name: "B", nickname: "dompet ibu" })).wallet.nickname, "dompet ibu")
    assert.equal(store.createWallet(newWallet({ name: "C", nickname: "café" })).wallet.nickname, "café")
  })

  it("can't be a name that another wallet already has, and a new name can't be another wallet's nickname", () => {
    const store = freshStore()
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    refuses(() => store.createWallet(newWallet({ name: "JAGO" })), /JAGO is already the nickname of Bank Jago\. Choose another name/)
    refuses(() => store.updateWallet("wallet-bca", { name: "Jago", description: "" }), /already the nickname of Bank Jago/)
    // ...and a wallet may still be renamed to its own nickname, or take its own name as one.
    assert.equal(store.updateWallet("wallet-jago", changes({ name: "Jago" }))?.wallet.name, "Jago")
    assert.equal(store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "bca" })?.wallet.nickname, "bca")
  })
})

describe("changing a wallet's nickname", () => {
  it("sets it, changes it, and keeps it when the change doesn't mention it", () => {
    const store = freshStore()
    assert.equal(store.updateWallet("wallet-jago", changes({ nickname: "jago" }))?.wallet.nickname, "jago")
    assert.equal(store.updateWallet("wallet-jago", changes({ description: "Daily", nickname: "jg" }))?.wallet.nickname, "jg")
    assert.equal(store.updateWallet("wallet-jago", changes({ name: "Jago Daily" }))?.wallet.nickname, "jg") // left out: kept
    assert.equal(nicknameOf(store, "wallet-jago"), "jg")
  })

  it("is taken away by null or an empty text", () => {
    const store = freshStore()
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    const cleared = store.updateWallet("wallet-jago", changes({ nickname: null }))
    assert.equal("nickname" in cleared!.wallet, false)
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    assert.equal("nickname" in store.updateWallet("wallet-jago", changes({ nickname: "  " }))!.wallet, false)
    assert.equal(nicknameOf(store, "wallet-jago"), undefined)
  })

  it("refuses what a new wallet would be refused, and changes nothing", () => {
    const store = freshStore()
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    refuses(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "JAGO" }), /already the nickname of Bank Jago/)
    refuses(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "pluang" }), /Pluang is already the name of another wallet/)
    refuses(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "x".repeat(21) }), /at most 20/)
    refuses(() => store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "42" }), /at least one letter/)
    assert.equal(nicknameOf(store, "wallet-bca"), undefined)
    assert.equal(nicknameOf(store, "wallet-jago"), "jago")
  })

  it("never moves money or adds a transaction", () => {
    const store = freshStore()
    const before = store.getData()
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    const after = store.getData()
    assert.deepEqual(after.transactions, before.transactions)
    assert.deepEqual(after.wallets.map((wallet) => wallet.balance), before.wallets.map((wallet) => wallet.balance))
  })
})

describe("deleting a wallet and undoing it", () => {
  it("brings the nickname back", () => {
    const store = freshStore()
    store.updateWallet("wallet-bca", { name: "BCA", description: "", nickname: "bca main" })
    const { undoId } = store.deleteWallet("wallet-bca")!
    assert.equal(nicknameOf(store, "wallet-bca"), undefined)
    store.undo(undoId)
    assert.equal(nicknameOf(store, "wallet-bca"), "bca main")
  })

  it("still puts the wallet back, without its nickname, when another wallet has taken that word since", () => {
    const store = freshStore()
    store.updateWallet("wallet-jago", changes({ nickname: "jago" }))
    const { undoId } = store.deleteWallet("wallet-jago")!
    store.createWallet(newWallet({ name: "Other", nickname: "Jago" }))
    store.undo(undoId)
    assert.equal(nicknameOf(store, "wallet-jago"), undefined)
    assert.equal(store.getData().wallets.find((wallet) => wallet.id === "wallet-jago")?.name, "Bank Jago")
    assert.equal(store.getData().wallets.find((wallet) => wallet.name === "Other")?.nickname, "Jago") // the newcomer keeps it
  })
})

describe("the wallet routes", () => {
  const send = (method: string, body: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  it("add, change, clear and refuse a nickname", async () => {
    const api = createApp(freshStore())
    const created = await api.request("/api/wallets", send("POST", newWallet({ nickname: "gp" })))
    assert.equal(created.status, 201)
    const { wallet } = (await created.json()) as SaveWalletResult
    assert.equal(wallet.nickname, "gp")

    const data = (await (await api.request("/api/data")).json()) as AppData
    assert.equal(data.wallets.find((entry) => entry.id === wallet.id)?.nickname, "gp")

    const changed = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "GoPay", description: "", nickname: "gopay!" }))
    assert.equal(((await changed.json()) as SaveWalletResult).wallet.nickname, "gopay!")
    const cleared = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "GoPay", description: "", nickname: null }))
    assert.equal("nickname" in ((await cleared.json()) as SaveWalletResult).wallet, false)

    const bad = await api.request(`/api/wallets/${wallet.id}`, send("PUT", { name: "GoPay", description: "", nickname: "bca" }))
    assert.equal(bad.status, 400)
    assert.match(((await bad.json()) as { error: string }).error, /BCA is already the name of another wallet/)
  })
})

describe("upgrading a database made before nicknames", () => {
  const dir = mkdtempSync(join(tmpdir(), "kaya-nickname-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds an empty nickname column and keeps everything else", () => {
    const path = join(dir, "before.db")
    const first = openDatabase(path)
    createStore(first) // the sample data, made by the current code...
    first.close()
    // ...then taken back to how the last version left it: no nickname column.
    const old = new DatabaseSync(path)
    old.exec("ALTER TABLE wallets DROP COLUMN nickname")
    assert.equal((old.prepare("PRAGMA table_info(wallets)").all() as { name: string }[]).some((column) => column.name === "nickname"), false)
    old.close()

    const db = openDatabase(path)
    const store = createStore(db)
    const wallets = store.getData().wallets
    assert.deepEqual(wallets.map((wallet) => wallet.name), ["BCA", "Bank Jago", "Superbank", "Pluang"])
    assert.ok(wallets.every((wallet) => !("nickname" in wallet)))
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(store.updateWallet("wallet-jago", changes({ nickname: "jago" }))?.wallet.nickname, "jago")
    db.close()

    // Opening it again changes nothing, and the nickname is still there.
    const again = openDatabase(path)
    assert.equal(createStore(again).getData().wallets.find((wallet) => wallet.id === "wallet-jago")?.nickname, "jago")
    again.close()
  })

  it("the database itself refuses an empty or over-long nickname", () => {
    const db = openDatabase(":memory:")
    createStore(db)
    assert.throws(() => db.exec("UPDATE wallets SET nickname = '' WHERE id = 'wallet-bca'"), /CHECK constraint/)
    assert.throws(() => db.exec(`UPDATE wallets SET nickname = '${"x".repeat(21)}' WHERE id = 'wallet-bca'`), /CHECK constraint/)
    db.exec("UPDATE wallets SET nickname = NULL WHERE id = 'wallet-bca'")
  })
})

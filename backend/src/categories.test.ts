import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { CATEGORY_ICONS, OTHER_CATEGORY_ID, presetCategories } from "./category-look.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, Category, DeleteCategoryResult, SaveCategoryResult } from "./types.ts"
import { ValidationError } from "./validate.ts"
import { WALLET_COLORS } from "./wallet-look.ts"

const freshStore = () => createStore(openDatabase(":memory:"))
type TestStore = ReturnType<typeof freshStore>

const DATE = "2026-09-30T14:05:00+07:00"

const categoryOf = (store: TestStore, id: string) => store.getData().categories.find((category) => category.id === id)
const namesOf = (categories: Category[], type: Category["type"]) =>
  categories.filter((category) => category.type === type).map((category) => category.name)
const balances = (store: TestStore) => Object.fromEntries(store.getData().wallets.map((w) => [w.id, w.balance]))

const coffee = (over: Record<string, unknown> = {}) => ({
  name: "Coffee",
  type: "expense",
  icon: "coffee",
  color: "plum",
  ...over,
})

/** Asserts that `work` is refused with a plain-English message matching `message`. */
const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

describe("the categories in the sample data", () => {
  const { categories, transactions } = freshStore().getData()

  it("are the ten presets, then three of the owner's own", () => {
    assert.equal(categories.length, 13)
    assert.deepEqual(categories.slice(0, 10), presetCategories)
    assert.deepEqual(
      categories.slice(10).map((c) => [c.name, c.type, c.preset]),
      [["Groceries", "expense", false], ["Family & giving", "expense", false], ["Side income", "income", false]]
    )
  })

  it("have the presets the owner asked for, in the order they are shown", () => {
    assert.deepEqual(namesOf(presetCategories, "expense"), ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Other"])
    assert.deepEqual(namesOf(presetCategories, "income"), ["Salary", "Bonus", "Other"])
    assert.ok(presetCategories.every((category) => category.preset))
  })

  it("have an Other for each kind of money, and it is a preset", () => {
    for (const type of ["expense", "income"] as const) {
      const other = categories.find((category) => category.id === OTHER_CATEGORY_ID[type])
      assert.equal(other?.name, "Other")
      assert.equal(other?.type, type)
      assert.equal(other?.preset, true)
    }
  })

  it("only use icons and colours that are on offer", () => {
    for (const category of categories) {
      assert.ok(CATEGORY_ICONS.includes(category.icon), `${category.name}: ${category.icon}`)
      assert.ok(WALLET_COLORS.includes(category.color), `${category.name}: ${category.color}`)
    }
  })

  it("never repeat a name within one kind (capitals ignored)", () => {
    for (const type of ["expense", "income"] as const) {
      const names = namesOf(categories, type).map((name) => name.toLowerCase())
      assert.equal(new Set(names).size, names.length, type)
    }
  })

  it("still fit every sample transaction: each is filed under a category of its own kind", () => {
    const typeOf = new Map(categories.map((category) => [category.id, category.type]))
    for (const tx of transactions) {
      if (tx.type === "transfer") continue
      assert.equal(typeOf.get(tx.categoryId), tx.type, tx.id)
    }
  })
})

describe("adding a category", () => {
  it("puts it last, as one of the owner's own, and hands back every category", () => {
    const store = freshStore()
    const { category, categories } = store.createCategory(coffee())
    assert.match(category.id, /^cat-/)
    assert.deepEqual(
      { name: category.name, type: category.type, icon: category.icon, color: category.color, preset: category.preset },
      { name: "Coffee", type: "expense", icon: "coffee", color: "plum", preset: false }
    )
    assert.equal(categories.length, 14)
    assert.equal(categories.at(-1)?.id, category.id)
    assert.deepEqual(store.getData().categories, categories)
  })

  it("trims the name", () => {
    assert.equal(freshStore().createCategory(coffee({ name: "  Coffee  " })).category.name, "Coffee")
  })

  it("accepts a name of exactly 30 characters", () => {
    assert.equal(freshStore().createCategory(coffee({ name: "x".repeat(30) })).category.name.length, 30)
  })

  it("can be used for a transaction of its own kind, and not of the other kind", () => {
    const store = freshStore()
    const { category } = store.createCategory(coffee())
    const spending = { type: "expense", amount: 25_000, date: DATE, description: "Flat white", walletId: "wallet-jago", categoryId: category.id }
    const saved = store.createTransaction(spending)
    assert.equal(saved.transaction.type === "expense" ? saved.transaction.categoryId : "", category.id)
    refuses(() => store.createTransaction({ ...spending, type: "income" }), /for spending, not income/)
  })

  it("lets the other kind of money use the same name", () => {
    const store = freshStore()
    const { categories } = store.createCategory(coffee({ name: "Groceries", type: "income", icon: "gift" }))
    assert.deepEqual(namesOf(categories, "income"), ["Salary", "Bonus", "Other", "Side income", "Groceries"])
  })

  it("refuses a missing, blank or too long name", () => {
    const store = freshStore()
    refuses(() => store.createCategory(coffee({ name: "" })), /Give the category a name/)
    refuses(() => store.createCategory(coffee({ name: "   " })), /Give the category a name/)
    refuses(() => store.createCategory(coffee({ name: undefined })), /Give the category a name/)
    refuses(() => store.createCategory(coffee({ name: 42 })), /Give the category a name/)
    refuses(() => store.createCategory(coffee({ name: "x".repeat(31) })), /at most 30 characters/)
  })

  it("refuses a name another category of the same kind already has, whatever the capitals or spaces", () => {
    const store = freshStore()
    refuses(() => store.createCategory(coffee({ name: "Food" })), /You already have an expense category called Food\./)
    refuses(() => store.createCategory(coffee({ name: "  groceries " })), /already have an expense category called Groceries\./)
    refuses(() => store.createCategory(coffee({ name: "OTHER" })), /already have an expense category called Other\./)
    refuses(() => store.createCategory(coffee({ name: "salary", type: "income" })), /already have an income category called Salary\./)
  })

  it("refuses a kind, icon or colour that isn't on offer", () => {
    const store = freshStore()
    refuses(() => store.createCategory(coffee({ type: "transfer" })), /spending or for income/)
    refuses(() => store.createCategory(coffee({ type: undefined })), /spending or for income/)
    refuses(() => store.createCategory(coffee({ icon: "rocket" })), /icons on offer/)
    refuses(() => store.createCategory(coffee({ icon: undefined })), /icons on offer/)
    refuses(() => store.createCategory(coffee({ color: "neon" })), /colours on offer/)
    refuses(() => store.createCategory(coffee({ color: undefined })), /colours on offer/)
    refuses(() => store.createCategory("nope"), /JSON object/)
    refuses(() => store.createCategory(null), /JSON object/)
  })

  it("changes nothing when it is refused", () => {
    const store = freshStore()
    const before = store.getData()
    assert.throws(() => store.createCategory(coffee({ name: "Food" })), ValidationError)
    assert.deepEqual(store.getData(), before)
  })
})

describe("changing a category", () => {
  it("changes the name, icon and colour, and leaves everything else alone", () => {
    const store = freshStore()
    const before = store.getData()
    const { category, categories } = store.updateCategory("cat-groceries", { name: "Supermarket", icon: "car", color: "teal" })!
    assert.deepEqual(
      { id: category.id, name: category.name, type: category.type, icon: category.icon, color: category.color, preset: category.preset },
      { id: "cat-groceries", name: "Supermarket", type: "expense", icon: "car", color: "teal", preset: false }
    )
    // Same place in the list, same transactions, same balances.
    assert.deepEqual(categories.map((c) => c.id), before.categories.map((c) => c.id))
    assert.deepEqual(store.getData().transactions, before.transactions)
    assert.deepEqual(store.getData().wallets, before.wallets)
  })

  it("lets a category keep its own name, even with other capitals", () => {
    const store = freshStore()
    assert.equal(store.updateCategory("cat-groceries", { name: "Groceries", icon: "car", color: "teal" })?.category.icon, "car")
    assert.equal(store.updateCategory("cat-groceries", { name: "GROCERIES", icon: "car", color: "teal" })?.category.name, "GROCERIES")
  })

  it("can't be renamed to a name another category of the same kind has", () => {
    const store = freshStore()
    refuses(() => store.updateCategory("cat-groceries", { name: "food", icon: "coffee", color: "teal" }), /already have an expense category called Food/)
    // ...but the other kind of money may use it.
    assert.equal(store.updateCategory("cat-side-income", { name: "Food", icon: "coffee", color: "teal" })?.category.name, "Food")
  })

  it("keeps its kind, whatever is sent", () => {
    const store = freshStore()
    const { category } = store.updateCategory("cat-groceries", { name: "Supermarket", type: "income", icon: "car", color: "teal" })!
    assert.equal(category.type, "expense")
  })

  it("is refused for a preset, which stays exactly as it was", () => {
    const store = freshStore()
    const before = categoryOf(store, "cat-food")
    refuses(() => store.updateCategory("cat-food", { name: "Meals", icon: "coffee", color: "teal" }), /Food is a preset, so it can't be changed/)
    assert.deepEqual(categoryOf(store, "cat-food"), before)
  })

  it("is refused for a bad name, icon or colour, and then nothing changes", () => {
    const store = freshStore()
    const before = store.getData().categories
    refuses(() => store.updateCategory("cat-groceries", { name: "", icon: "car", color: "teal" }), /Give the category a name/)
    refuses(() => store.updateCategory("cat-groceries", { name: "x".repeat(31), icon: "car", color: "teal" }), /at most 30/)
    refuses(() => store.updateCategory("cat-groceries", { name: "Ok", icon: "rocket", color: "teal" }), /icons on offer/)
    refuses(() => store.updateCategory("cat-groceries", { name: "Ok", icon: "car", color: "neon" }), /colours on offer/)
    refuses(() => store.updateCategory("cat-groceries", "nope"), /JSON object/)
    assert.deepEqual(store.getData().categories, before)
  })

  it("answers undefined for a category that doesn't exist", () => {
    assert.equal(freshStore().updateCategory("cat-nope", { name: "Ok", icon: "car", color: "teal" }), undefined)
  })
})

describe("deleting a category", () => {
  const groceryIds = ["tx-003", "tx-017", "tx-030"]

  it("moves its transactions to Other and keeps every one of them", () => {
    const store = freshStore()
    const before = store.getData()
    const result = store.deleteCategory("cat-groceries")!
    assert.equal(result.movedToId, "cat-other-expense")
    assert.deepEqual(result.movedTransactionIds.sort(), groceryIds)
    assert.equal(result.categories.some((c) => c.id === "cat-groceries"), false)
    assert.equal(result.categories.length, 12)

    const after = store.getData()
    assert.equal(after.transactions.length, before.transactions.length)
    for (const tx of before.transactions) {
      const now = after.transactions.find((entry) => entry.id === tx.id)
      // Only the category of the moved ones changed; amount, date, note and wallet are as they were.
      assert.deepEqual(now, groceryIds.includes(tx.id) ? { ...tx, categoryId: "cat-other-expense" } : tx, tx.id)
    }
  })

  it("moves an income category to the income Other", () => {
    const store = freshStore()
    const result = store.deleteCategory("cat-side-income")!
    assert.equal(result.movedToId, "cat-other-income")
    assert.deepEqual(result.movedTransactionIds.sort(), ["tx-007", "tx-014", "tx-027", "tx-032"])
    const moved = store.getData().transactions.filter((tx) => tx.type === "income" && tx.categoryId === "cat-other-income")
    assert.equal(moved.length, 4)
  })

  it("never changes a wallet balance", () => {
    const store = freshStore()
    const before = balances(store)
    store.deleteCategory("cat-groceries")
    store.deleteCategory("cat-family")
    store.deleteCategory("cat-side-income")
    assert.deepEqual(balances(store), before)
  })

  it("deletes a category nothing was filed under without moving anything", () => {
    const store = freshStore()
    const { category } = store.createCategory(coffee())
    const result = store.deleteCategory(category.id)!
    assert.deepEqual(result.movedTransactionIds, [])
    assert.equal(result.categories.length, 13)
  })

  it("takes along the transactions saved into it, wherever they came from", () => {
    const store = freshStore()
    const { category } = store.createCategory(coffee())
    const saved = store.createTransaction({ type: "expense", amount: 25_000, date: DATE, description: "", walletId: "wallet-jago", categoryId: category.id })
    const result = store.deleteCategory(category.id)!
    assert.deepEqual(result.movedTransactionIds, [saved.transaction.id])
  })

  it("leaves transfers alone", () => {
    const store = freshStore()
    const transfers = store.getData().transactions.filter((tx) => tx.type === "transfer")
    store.deleteCategory("cat-groceries")
    assert.deepEqual(store.getData().transactions.filter((tx) => tx.type === "transfer"), transfers)
  })

  it("is refused for a preset, which stays exactly as it was", () => {
    const store = freshStore()
    const before = store.getData()
    refuses(() => store.deleteCategory("cat-food"), /Food is a preset, so it can't be deleted/)
    refuses(() => store.deleteCategory("cat-other-expense"), /Other is a preset/)
    refuses(() => store.deleteCategory("cat-other-income"), /Other is a preset/)
    assert.deepEqual(store.getData(), before)
  })

  it("answers undefined for a category that doesn't exist", () => {
    assert.equal(freshStore().deleteCategory("cat-nope"), undefined)
  })

  it("frees its name for a new category", () => {
    const store = freshStore()
    store.deleteCategory("cat-groceries")
    assert.equal(store.createCategory(coffee({ name: "Groceries" })).category.name, "Groceries")
  })
})

describe("resetting", () => {
  it("brings the sample categories back after adding and deleting", () => {
    const store = freshStore()
    store.createCategory(coffee())
    store.deleteCategory("cat-groceries")
    store.reset()
    const { categories } = store.getData()
    assert.equal(categories.length, 13)
    assert.equal(categories.filter((category) => category.preset).length, 10)
    assert.equal(categories.some((category) => category.id === "cat-groceries"), true)
  })
})

describe("the category API", () => {
  const json = (method: string, payload: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error

  it("adds, changes and deletes a category", async () => {
    const app = createApp(freshStore())

    const created = await app.request("/api/categories", json("POST", coffee()))
    assert.equal(created.status, 201)
    const { category, categories } = (await created.json()) as SaveCategoryResult
    assert.equal(categories.length, 14)

    const changed = await app.request(`/api/categories/${category.id}`, json("PUT", { name: "Cafe", icon: "gift", color: "sky" }))
    assert.equal(changed.status, 200)
    assert.equal(((await changed.json()) as SaveCategoryResult).category.name, "Cafe")

    const deleted = await app.request(`/api/categories/${category.id}`, { method: "DELETE" })
    assert.equal(deleted.status, 200)
    const result = (await deleted.json()) as DeleteCategoryResult
    assert.equal(result.categories.length, 13)
    assert.equal(result.movedToId, "cat-other-expense")

    const data = (await (await app.request("/api/data")).json()) as AppData
    assert.equal(data.categories.length, 13)
  })

  it("sends the preset flag with every category", async () => {
    const data = (await (await createApp(freshStore()).request("/api/data")).json()) as AppData
    assert.equal(data.categories.filter((category) => category.preset).length, 10)
  })

  it("answers 400 with a plain message for bad data and for presets", async () => {
    const app = createApp(freshStore())
    const blank = await app.request("/api/categories", json("POST", coffee({ name: " " })))
    assert.equal(blank.status, 400)
    assert.match(await errorOf(blank), /Give the category a name/)

    const twin = await app.request("/api/categories", json("POST", coffee({ name: "food" })))
    assert.equal(twin.status, 400)
    assert.match(await errorOf(twin), /already have an expense category called Food/)

    const preset = await app.request("/api/categories/cat-food", json("PUT", { name: "Meals", icon: "coffee", color: "teal" }))
    assert.equal(preset.status, 400)
    assert.match(await errorOf(preset), /preset, so it can't be changed/)

    const presetDelete = await app.request("/api/categories/cat-salary", { method: "DELETE" })
    assert.equal(presetDelete.status, 400)
    assert.match(await errorOf(presetDelete), /preset, so it can't be deleted/)

    assert.equal((await app.request("/api/categories", { method: "POST", body: "not json" })).status, 400)
  })

  it("answers 404 for a category that doesn't exist", async () => {
    const app = createApp(freshStore())
    assert.equal((await app.request("/api/categories/cat-nope", json("PUT", { name: "Ok", icon: "coffee", color: "teal" }))).status, 404)
    assert.equal((await app.request("/api/categories/cat-nope", { method: "DELETE" })).status, 404)
  })
})

describe("upgrading a database from before there were presets", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabungbego-categories-upgrade-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  /** The categories the previous version seeded, exactly: no preset column, and the older names. */
  function makeOldDatabase(path: string) {
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE wallets (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('bank', 'digital-bank', 'e-wallet', 'investment', 'cash')),
        balance INTEGER NOT NULL, description TEXT NOT NULL, color TEXT NOT NULL,
        default_color TEXT, icon TEXT, position INTEGER NOT NULL
      );
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL
      );
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount INTEGER NOT NULL CHECK (amount > 0), date TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        wallet_id TEXT REFERENCES wallets (id), category_id TEXT REFERENCES categories (id),
        from_wallet_id TEXT REFERENCES wallets (id), to_wallet_id TEXT REFERENCES wallets (id)
      );
      INSERT INTO wallets VALUES ('w1', 'Old BCA', 'bank', 9000000, '', 'sky', 'sky', NULL, 0);
      INSERT INTO categories VALUES ('cat-salary', 'Salary', 'income', 'briefcase', 'moss', 0);
      INSERT INTO categories VALUES ('cat-side-income', 'Side income', 'income', 'hand-coins', 'teal', 1);
      INSERT INTO categories VALUES ('cat-food', 'Food & drinks', 'expense', 'utensils', 'marigold', 2);
      INSERT INTO categories VALUES ('cat-groceries', 'Groceries', 'expense', 'shopping-basket', 'sand', 3);
      INSERT INTO categories VALUES ('cat-transport', 'Transport', 'expense', 'bus', 'sky', 4);
      INSERT INTO categories VALUES ('cat-home', 'Home & bills', 'expense', 'receipt', 'ochre', 5);
      INSERT INTO categories VALUES ('cat-shopping', 'Shopping', 'expense', 'shopping-bag', 'plum', 6);
      INSERT INTO categories VALUES ('cat-entertainment', 'Entertainment', 'expense', 'clapperboard', 'rose', 7);
      INSERT INTO categories VALUES ('cat-health', 'Health', 'expense', 'heart-pulse', 'clay', 8);
      INSERT INTO categories VALUES ('cat-family', 'Family & giving', 'expense', 'heart-handshake', 'sage', 9);
      INSERT INTO transactions VALUES ('t1', 'expense', 68000, '2026-09-08T08:05:00+07:00', 'Kopi', 'w1', 'cat-food', NULL, NULL);
      INSERT INTO transactions VALUES ('t2', 'expense', 2800000, '2026-09-01T08:30:00+07:00', 'Rent', 'w1', 'cat-home', NULL, NULL);
      INSERT INTO transactions VALUES ('t3', 'expense', 412800, '2026-09-05T10:42:00+07:00', 'Shop', 'w1', 'cat-groceries', NULL, NULL);
      INSERT INTO transactions VALUES ('t4', 'income', 12500000, '2026-09-25T09:00:00+07:00', 'Salary', 'w1', 'cat-salary', NULL, NULL);
      PRAGMA user_version = 1;
    `)
    old.close()
  }

  it("marks the presets, renames the two that differ, adds the missing ones and keeps every transaction", () => {
    const path = join(dir, "old.db")
    makeOldDatabase(path)

    const db = openDatabase(path)
    const store = createStore(db) // version is 1, so nothing is re-seeded
    const { categories, transactions } = store.getData()

    // The ten presets come first, in order, exactly as in a new database.
    assert.deepEqual(categories.slice(0, 10), presetCategories)
    // What the owner already had stays, in its old order, and is theirs to change.
    assert.deepEqual(
      categories.slice(10).map((c) => [c.id, c.name, c.icon, c.color, c.preset]),
      [
        ["cat-side-income", "Side income", "hand-coins", "teal", false],
        ["cat-groceries", "Groceries", "shopping-basket", "sand", false],
        ["cat-family", "Family & giving", "heart-handshake", "sage", false],
      ]
    )
    // Every transaction is exactly where it was.
    assert.deepEqual(
      transactions.map((tx) => [tx.id, tx.type === "transfer" ? "" : tx.categoryId]).sort(),
      [["t1", "cat-food"], ["t2", "cat-home"], ["t3", "cat-groceries"], ["t4", "cat-salary"]]
    )
    assert.equal(store.getData().wallets[0].balance, 9_000_000)

    // The renamed ones took the preset names.
    assert.equal(categories.find((c) => c.id === "cat-food")?.name, "Food")
    assert.equal(categories.find((c) => c.id === "cat-home")?.name, "Bills")

    // ...and everything new works on it.
    const result = store.deleteCategory("cat-groceries")!
    assert.deepEqual(result.movedTransactionIds, ["t3"])
    assert.equal(store.createCategory(coffee()).categories.length, 13) // 13, less Groceries, plus Coffee
    db.close() // Windows won't delete the folder while the file is open
  })

  it("does its work only once: the owner's later changes survive the next start", () => {
    const path = join(dir, "old-twice.db")
    makeOldDatabase(path)

    const first = openDatabase(path)
    const store = createStore(first)
    store.updateCategory("cat-groceries", { name: "Supermarket", icon: "car", color: "teal" })
    store.createCategory(coffee())
    const after = store.getData().categories
    first.close()

    const second = openDatabase(path) // like restarting the backend on the same file
    assert.deepEqual(createStore(second).getData().categories, after)
    second.close()
  })

  it("adds a preset that is missing, and doesn't mind a database with only a few categories", () => {
    const path = join(dir, "old-small.db")
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL
      );
      INSERT INTO categories VALUES ('cat-mine', 'My thing', 'expense', 'tag', 'moss', 0);
      INSERT INTO categories VALUES ('cat-food', 'Food & drinks', 'expense', 'utensils', 'marigold', 1);
      PRAGMA user_version = 1;
    `)
    old.close()

    const db = openDatabase(path)
    const { categories } = createStore(db).getData()
    assert.deepEqual(categories.slice(0, 10), presetCategories)
    assert.deepEqual(categories.slice(10).map((c) => [c.id, c.preset]), [["cat-mine", false]])
    db.close()
  })
})

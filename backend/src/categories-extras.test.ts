import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { Category, ReorderCategoriesResult, SaveCategoryResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))
type TestStore = ReturnType<typeof freshStore>

const idsOf = (categories: Category[]) => categories.map((category) => category.id)
const idsOfKind = (store: TestStore, type: Category["type"]) =>
  idsOf(store.getData().categories.filter((category) => category.type === type))
const categoryOf = (store: TestStore, id: string) => store.getData().categories.find((category) => category.id === id)

/** Asserts that `work` is refused with a plain-English message matching `message`. */
const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
})
const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error

describe("putting the categories in a new order", () => {
  it("saves the order, for spending and income separately", () => {
    const store = freshStore()
    const all = idsOf(store.getData().categories)
    // Move "Other" (spending) to the end of the spending categories, and Side income to the top of income.
    const expense = idsOfKind(store, "expense").filter((id) => id !== "cat-other-expense").concat("cat-other-expense")
    const income = ["cat-side-income", ...idsOfKind(store, "income").filter((id) => id !== "cat-side-income")]
    const { categories } = store.reorderCategories({ ids: [...expense, ...income] })

    assert.equal(categories.length, all.length)
    assert.deepEqual(idsOf(categories.filter((c) => c.type === "expense")), expense)
    assert.deepEqual(idsOf(categories.filter((c) => c.type === "income")), income)
    assert.deepEqual(store.getData().categories, categories)
  })

  it("lets a preset move, and it stays a preset", () => {
    const store = freshStore()
    const ids = idsOf(store.getData().categories)
    store.reorderCategories({ ids: [...ids.filter((id) => id !== "cat-food"), "cat-food"] })
    assert.equal(idsOfKind(store, "expense").at(-1), "cat-food")
    assert.equal(categoryOf(store, "cat-food")?.preset, true)
  })

  it("puts a category added afterwards last, even after a reorder", () => {
    const store = freshStore()
    store.reorderCategories({ ids: idsOf(store.getData().categories).reverse() })
    const { category } = store.createCategory({ name: "Coffee", type: "expense", icon: "coffee", color: "plum" })
    assert.equal(idsOfKind(store, "expense").at(-1), category.id)
  })

  it("changes nothing else about a category", () => {
    const store = freshStore()
    const before = store.getData()
    store.reorderCategories({ ids: idsOf(before.categories).reverse() })
    const after = store.getData()
    assert.deepEqual([...after.categories].sort((a, b) => a.id.localeCompare(b.id)), [...before.categories].sort((a, b) => a.id.localeCompare(b.id)))
    assert.deepEqual(after.transactions, before.transactions)
  })

  it("is refused for a list that isn't every category exactly once, and then nothing moves", () => {
    const store = freshStore()
    const ids = idsOf(store.getData().categories)
    const before = store.getData().categories
    refuses(() => store.reorderCategories({ ids: ids.slice(1) }), /doesn't match your categories/) // one missing
    refuses(() => store.reorderCategories({ ids: [...ids, "cat-nope"] }), /doesn't match your categories/) // one unknown
    refuses(() => store.reorderCategories({ ids: [...ids.slice(1), ids[1]] }), /doesn't match your categories/) // one twice
    refuses(() => store.reorderCategories({ ids: "nope" }), /ids as a list/)
    refuses(() => store.reorderCategories({ ids: [1, 2] }), /ids as a list/)
    refuses(() => store.reorderCategories(null), /ids as a list/)
    assert.deepEqual(store.getData().categories, before)
  })
})

describe("a monthly budget", () => {
  it("can be set on a spending preset, and shows with the category", () => {
    const store = freshStore()
    const { category, categories } = store.setCategoryBudget("cat-food", { budget: 500_000 })!
    assert.equal(category.budget, 500_000)
    assert.equal(category.preset, true)
    assert.equal(categories.find((c) => c.id === "cat-food")?.budget, 500_000)
    assert.equal(categoryOf(store, "cat-food")?.budget, 500_000)
  })

  it("can be set on a spending category of the owner's own", () => {
    const store = freshStore()
    assert.equal(store.setCategoryBudget("cat-groceries", { budget: 1_200_000 })?.category.budget, 1_200_000)
  })

  it("is missing, not zero, on a category that has none", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    for (const category of store.getData().categories) {
      if (category.id === "cat-food") continue
      assert.equal("budget" in category, false, category.name)
    }
  })

  it("can be changed, and taken away with null", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    assert.equal(store.setCategoryBudget("cat-food", { budget: 750_000 })?.category.budget, 750_000)
    const removed = store.setCategoryBudget("cat-food", { budget: null })!
    assert.equal("budget" in removed.category, false)
    assert.equal("budget" in categoryOf(store, "cat-food")!, false)
  })

  it("is refused for income, which has none", () => {
    const store = freshStore()
    refuses(() => store.setCategoryBudget("cat-salary", { budget: 1_000_000 }), /Budgets are for spending categories/)
    refuses(() => store.setCategoryBudget("cat-side-income", { budget: 1_000_000 }), /Budgets are for spending categories/)
    refuses(() => store.setCategoryBudget("cat-salary", { budget: null }), /Budgets are for spending categories/)
  })

  it("must be whole rupiah above zero", () => {
    const store = freshStore()
    refuses(() => store.setCategoryBudget("cat-food", { budget: 0 }), /whole number of rupiah above zero/)
    refuses(() => store.setCategoryBudget("cat-food", { budget: -5 }), /whole number of rupiah above zero/)
    refuses(() => store.setCategoryBudget("cat-food", { budget: 10.5 }), /whole number of rupiah above zero/)
    refuses(() => store.setCategoryBudget("cat-food", { budget: "500000" }), /whole number of rupiah above zero/)
    refuses(() => store.setCategoryBudget("cat-food", {}), /whole number of rupiah above zero/)
    refuses(() => store.setCategoryBudget("cat-food", { budget: 1_000_000_000_000 }), /too large/)
    refuses(() => store.setCategoryBudget("cat-food", "nope"), /JSON object/)
    refuses(() => store.setCategoryBudget("cat-food", null), /JSON object/)
  })

  it("keeps the old budget when a new one is refused", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    assert.throws(() => store.setCategoryBudget("cat-food", { budget: -1 }), ValidationError)
    assert.equal(categoryOf(store, "cat-food")?.budget, 500_000)
  })

  it("answers undefined for a category that doesn't exist", () => {
    assert.equal(freshStore().setCategoryBudget("cat-nope", { budget: 500_000 }), undefined)
  })

  it("survives editing the category", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-groceries", { budget: 1_200_000 })
    const { category } = store.updateCategory("cat-groceries", { name: "Supermarket", icon: "car", color: "teal" })!
    assert.equal(category.budget, 1_200_000)
  })

  it("survives putting the categories in a new order", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    store.reorderCategories({ ids: idsOf(store.getData().categories).reverse() })
    assert.equal(categoryOf(store, "cat-food")?.budget, 500_000)
  })

  it("goes with the category when it is deleted, and a new one starts without", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-groceries", { budget: 1_200_000 })
    store.deleteCategory("cat-groceries")
    const { category } = store.createCategory({ name: "Groceries", type: "expense", icon: "shopping-basket", color: "sand" })
    assert.equal("budget" in category, false)
  })

  it("never changes a transaction or a wallet balance", () => {
    const store = freshStore()
    const before = store.getData()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    store.setCategoryBudget("cat-food", { budget: null })
    const after = store.getData()
    assert.deepEqual(after.transactions, before.transactions)
    assert.deepEqual(after.wallets, before.wallets)
  })

  it("is forgotten when the data is reset", () => {
    const store = freshStore()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    store.reset()
    assert.equal(store.getData().categories.some((category) => "budget" in category), false)
  })
})

describe("the category routes for order and budget", () => {
  it("puts the categories in a new order", async () => {
    const app = createApp(freshStore())
    const before = (await (await app.request("/api/data")).json()) as { categories: Category[] }
    const ids = idsOf(before.categories).reverse()
    const response = await app.request("/api/categories/order", json("PUT", { ids }))
    assert.equal(response.status, 200)
    assert.deepEqual(idsOf(((await response.json()) as ReorderCategoriesResult).categories), ids)
    const after = (await (await app.request("/api/data")).json()) as { categories: Category[] }
    assert.deepEqual(idsOf(after.categories), ids)
  })

  it("explains a list that doesn't match, in plain English", async () => {
    const app = createApp(freshStore())
    const response = await app.request("/api/categories/order", json("PUT", { ids: ["cat-food"] }))
    assert.equal(response.status, 400)
    assert.match(await errorOf(response), /doesn't match your categories\. Reload the page and try again\./)
  })

  it("sets, changes and removes a budget", async () => {
    const app = createApp(freshStore())
    const set = await app.request("/api/categories/cat-food/budget", json("PUT", { budget: 500_000 }))
    assert.equal(set.status, 200)
    const saved = (await set.json()) as SaveCategoryResult
    assert.equal(saved.category.budget, 500_000)
    assert.equal(saved.categories.find((c) => c.id === "cat-food")?.budget, 500_000)

    const removed = await app.request("/api/categories/cat-food/budget", json("PUT", { budget: null }))
    assert.equal("budget" in ((await removed.json()) as SaveCategoryResult).category, false)
  })

  it("answers 400 with a plain message for a bad budget or an income category, and 404 for a missing one", async () => {
    const app = createApp(freshStore())
    const bad = await app.request("/api/categories/cat-food/budget", json("PUT", { budget: 0 }))
    assert.equal(bad.status, 400)
    assert.match(await errorOf(bad), /whole number of rupiah above zero/)

    const income = await app.request("/api/categories/cat-salary/budget", json("PUT", { budget: 1000 }))
    assert.equal(income.status, 400)
    assert.match(await errorOf(income), /Budgets are for spending categories/)

    assert.equal((await app.request("/api/categories/cat-nope/budget", json("PUT", { budget: 1000 }))).status, 404)
    assert.equal((await app.request("/api/categories/cat-food/budget", { method: "PUT", body: "not json" })).status, 400)
  })
})

describe("upgrading a database that has presets but no budgets", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabungbego-budget-upgrade-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds the budget column, changes nothing else, and budgets then work", () => {
    const path = join(dir, "step5.db")

    // A database exactly as Step 5 left it: presets, but no budget column.
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL,
        preset INTEGER NOT NULL DEFAULT 0 CHECK (preset IN (0, 1))
      );
      INSERT INTO categories VALUES ('cat-food', 'Food', 'expense', 'utensils', 'marigold', 0, 1);
      INSERT INTO categories VALUES ('cat-other-expense', 'Other', 'expense', 'circle-ellipsis', 'teal', 1, 1);
      INSERT INTO categories VALUES ('cat-other-income', 'Other', 'income', 'circle-ellipsis', 'sand', 2, 1);
      INSERT INTO categories VALUES ('cat-mine', 'Mine', 'expense', 'tag', 'moss', 3, 0);
      PRAGMA user_version = 1;
    `)
    old.close()

    const db = openDatabase(path)
    const store = createStore(db)
    const categories = store.getData().categories
    assert.deepEqual(categories.map((c) => [c.id, c.name, c.preset]), [
      ["cat-food", "Food", true],
      ["cat-other-expense", "Other", true],
      ["cat-other-income", "Other", true],
      ["cat-mine", "Mine", false],
    ])
    assert.equal(categories.some((c) => "budget" in c), false)

    // ...and budgets work on it, for a preset and for the owner's own.
    assert.equal(store.setCategoryBudget("cat-food", { budget: 500_000 })?.category.budget, 500_000)
    assert.equal(store.setCategoryBudget("cat-mine", { budget: 250_000 })?.category.budget, 250_000)
    db.close() // Windows won't delete the folder while the file is open

    // Opening it again (a restart) keeps the budgets and doesn't try to add the column twice.
    const again = openDatabase(path)
    const reopened = createStore(again).getData().categories
    assert.deepEqual(reopened.filter((c) => "budget" in c).map((c) => [c.id, c.budget]), [["cat-food", 500_000], ["cat-mine", 250_000]])
    again.close()
  })

  it("also upgrades a database from before presets, in one go", () => {
    const path = join(dir, "step4.db")
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        icon TEXT NOT NULL, color TEXT NOT NULL, position INTEGER NOT NULL
      );
      INSERT INTO categories VALUES ('cat-food', 'Food & drinks', 'expense', 'utensils', 'marigold', 0);
      PRAGMA user_version = 1;
    `)
    old.close()
    const db = openDatabase(path)
    const store = createStore(db)
    assert.equal(categoryOf(store, "cat-food")?.name, "Food")
    assert.equal(store.setCategoryBudget("cat-food", { budget: 100_000 })?.category.budget, 100_000)
    db.close()
  })
})

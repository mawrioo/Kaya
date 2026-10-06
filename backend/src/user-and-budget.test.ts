import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData } from "./types.ts"
import { ValidationError } from "./validate.ts"

function freshStack() {
  const db = openDatabase(":memory:")
  return { db, store: createStore(db) }
}

/** Asserts that `work` is refused with a plain-English message matching `message`. */
const refuses = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

const json = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload),
})

const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error

describe("the owner's name", () => {
  it("starts as the sample name", () => {
    assert.equal(freshStack().store.getData().user.name, "Mario")
  })

  it("is saved without the spaces around it, and shows in the data", () => {
    const { store } = freshStack()
    assert.deepEqual(store.updateUser({ name: "  Dewi  " }), { user: { name: "Dewi" } })
    assert.equal(store.getData().user.name, "Dewi")
  })

  it("can be exactly 30 characters long", () => {
    const { store } = freshStack()
    const name = "A".repeat(30)
    assert.equal(store.updateUser({ name }).user.name, name)
  })

  it("is refused when it is empty, blank, missing, not text or too long, and nothing changes", () => {
    const { store } = freshStack()
    refuses(() => store.updateUser({ name: "" }), /Enter your name/)
    refuses(() => store.updateUser({ name: "   " }), /Enter your name/)
    refuses(() => store.updateUser({}), /Enter your name/)
    refuses(() => store.updateUser({ name: 42 }), /Enter your name/)
    refuses(() => store.updateUser("Dewi"), /JSON object/)
    refuses(() => store.updateUser({ name: "A".repeat(31) }), /at most 30 characters/)
    assert.equal(store.getData().user.name, "Mario")
  })

  it("is saved even when the row for it has gone missing", () => {
    const { db, store } = freshStack()
    db.exec("DELETE FROM app_user")
    assert.equal(store.updateUser({ name: "Dewi" }).user.name, "Dewi")
    assert.equal(store.getData().user.name, "Dewi")
  })

  it("is kept when the monthly budget changes, and the budget is kept when the name changes", () => {
    const { store } = freshStack()
    store.setMonthlyBudget({ budget: 5_000_000 })
    store.updateUser({ name: "Dewi" })
    assert.equal(store.getData().monthlyBudget, 5_000_000)
    store.setMonthlyBudget({ budget: 6_000_000 })
    assert.equal(store.getData().user.name, "Dewi")
  })

  it("goes back to the sample name when the data is reset", () => {
    const { store } = freshStack()
    store.updateUser({ name: "Dewi" })
    store.reset()
    assert.equal(store.getData().user.name, "Mario")
  })
})

describe("the budget for the whole month", () => {
  it("is missing until one is set", () => {
    const data = freshStack().store.getData()
    assert.equal("monthlyBudget" in data, false)
  })

  it("can be set, changed and taken away", () => {
    const { store } = freshStack()
    assert.deepEqual(store.setMonthlyBudget({ budget: 5_000_000 }), { monthlyBudget: 5_000_000 })
    assert.equal(store.getData().monthlyBudget, 5_000_000)

    assert.deepEqual(store.setMonthlyBudget({ budget: 4_500_000 }), { monthlyBudget: 4_500_000 })
    assert.equal(store.getData().monthlyBudget, 4_500_000)

    assert.deepEqual(store.setMonthlyBudget({ budget: null }), {})
    assert.equal("monthlyBudget" in store.getData(), false)
  })

  it("is refused unless it is a whole number of rupiah above zero, and the old budget stays", () => {
    const { store } = freshStack()
    store.setMonthlyBudget({ budget: 5_000_000 })
    refuses(() => store.setMonthlyBudget({ budget: 0 }), /above zero/)
    refuses(() => store.setMonthlyBudget({ budget: -1 }), /above zero/)
    refuses(() => store.setMonthlyBudget({ budget: 1.5 }), /whole number/)
    refuses(() => store.setMonthlyBudget({ budget: "5000000" }), /whole number/)
    refuses(() => store.setMonthlyBudget({}), /whole number/)
    refuses(() => store.setMonthlyBudget({ budget: 1_000_000_000_000 }), /too large/)
    refuses(() => store.setMonthlyBudget(null), /JSON object/)
    assert.equal(store.getData().monthlyBudget, 5_000_000)
  })

  it("is saved even when the row for it has gone missing", () => {
    const { db, store } = freshStack()
    db.exec("DELETE FROM app_user")
    store.setMonthlyBudget({ budget: 3_000_000 })
    assert.equal(store.getData().monthlyBudget, 3_000_000)
  })

  it("is separate from the budgets of single categories", () => {
    const { store } = freshStack()
    store.setCategoryBudget("cat-food", { budget: 500_000 })
    store.setMonthlyBudget({ budget: 5_000_000 })
    store.setMonthlyBudget({ budget: null })
    assert.equal(store.getData().categories.find((c) => c.id === "cat-food")?.budget, 500_000)
  })

  it("is forgotten when the data is reset", () => {
    const { store } = freshStack()
    store.setMonthlyBudget({ budget: 5_000_000 })
    store.reset()
    assert.equal("monthlyBudget" in store.getData(), false)
  })
})

describe("the name and monthly budget API", () => {
  const freshApp = () => createApp(createStore(openDatabase(":memory:")))

  it("saves the name with PUT /api/user", async () => {
    const app = freshApp()
    const res = await app.request("/api/user", json("PUT", { name: "Dewi" }))
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { user: { name: "Dewi" } })
    const data = (await (await app.request("/api/data")).json()) as AppData
    assert.equal(data.user.name, "Dewi")
  })

  it("answers 400 with a plain message for a bad name", async () => {
    const res = await freshApp().request("/api/user", json("PUT", { name: "  " }))
    assert.equal(res.status, 400)
    assert.match(await errorOf(res), /Enter your name/)
    assert.equal((await freshApp().request("/api/user", { method: "PUT", body: "not json" })).status, 400)
  })

  it("sets and removes the monthly budget with PUT /api/monthly-budget, and sends it in /api/data", async () => {
    const app = freshApp()
    const set = await app.request("/api/monthly-budget", json("PUT", { budget: 5_000_000 }))
    assert.equal(set.status, 200)
    assert.deepEqual(await set.json(), { monthlyBudget: 5_000_000 })
    assert.equal(((await (await app.request("/api/data")).json()) as AppData).monthlyBudget, 5_000_000)

    const removed = await app.request("/api/monthly-budget", json("PUT", { budget: null }))
    assert.deepEqual(await removed.json(), {})
    assert.equal("monthlyBudget" in ((await (await app.request("/api/data")).json()) as AppData), false)
  })

  it("answers 400 for a bad budget", async () => {
    const res = await freshApp().request("/api/monthly-budget", json("PUT", { budget: 0 }))
    assert.equal(res.status, 400)
    assert.match(await errorOf(res), /above zero/)
  })
})

describe("upgrading a database that has no monthly budget column", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabungbego-month-budget-upgrade-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds the column, keeps the name, and the budget then works and survives a restart", () => {
    const path = join(dir, "before.db")

    // A database exactly as the last version left it: the user table has only a name.
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE app_user (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL);
      INSERT INTO app_user VALUES (1, 'Dewi');
      PRAGMA user_version = 1;
    `)
    old.close()

    const db = openDatabase(path)
    const store = createStore(db)
    assert.equal(store.getData().user.name, "Dewi")
    assert.equal("monthlyBudget" in store.getData(), false)
    assert.deepEqual(store.setMonthlyBudget({ budget: 4_000_000 }), { monthlyBudget: 4_000_000 })
    db.close() // Windows won't delete the folder while the file is open

    // Opening it again (a restart) keeps both, and doesn't try to add the column twice.
    const again = openDatabase(path)
    const reopened = createStore(again).getData()
    assert.equal(reopened.monthlyBudget, 4_000_000)
    assert.equal(reopened.user.name, "Dewi")
    again.close()
  })

  it("the database itself refuses a budget of zero or less", () => {
    const { db } = freshStack()
    assert.throws(() => db.exec("UPDATE app_user SET monthly_budget = 0"), /CHECK constraint failed/)
    assert.throws(() => db.exec("UPDATE app_user SET monthly_budget = -5"), /CHECK constraint failed/)
  })
})

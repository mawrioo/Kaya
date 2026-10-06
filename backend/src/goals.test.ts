import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, DeleteGoalResult, Goal, SaveGoalResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))
type TestStore = ReturnType<typeof freshStore>

/** The moment the sample data is written for: 30 Sep 2026, 14:05. */
const NOW = new Date(2026, 8, 30, 14, 5, 0)

const newGoal = (over: Record<string, unknown> = {}) => ({
  name: "New laptop",
  targetAmount: 20_000_000,
  savedAmount: 2_000_000,
  targetDate: "2027-06-30",
  walletId: "wallet-superbank",
  icon: "laptop",
  ...over,
})

const goalOf = (store: TestStore, id: string) => store.getData().goals.find((goal) => goal.id === id)
/** A goal as the form would send it back: only the fields the owner fills in. */
const asInput = (goal: Goal, over: Record<string, unknown> = {}) => ({
  name: goal.name,
  targetAmount: goal.targetAmount,
  savedAmount: goal.savedAmount,
  targetDate: goal.targetDate,
  walletId: goal.walletId,
  icon: goal.icon,
  ...over,
})
const balances = (store: TestStore) => store.getData().wallets.map((wallet) => [wallet.id, wallet.balance])

describe("adding a goal", () => {
  it("adds it last, with an id of its own, and every later read includes it", () => {
    const store = freshStore()
    const { goal, goals } = store.createGoal(newGoal(), NOW)
    assert.match(goal.id, /^goal-/)
    assert.deepEqual(
      { ...goal, id: "x" },
      {
        id: "x",
        name: "New laptop",
        targetAmount: 20_000_000,
        savedAmount: 2_000_000,
        targetDate: "2027-06-30",
        walletId: "wallet-superbank",
        icon: "laptop",
        // The pace note measures from the day the goal was made, with what it held then.
        paceFrom: "2026-09-30",
        paceAmount: 2_000_000,
      }
    )
    assert.equal(goals.length, 4)
    assert.equal(goals.at(-1)?.id, goal.id)
    assert.deepEqual(store.getData().goals, goals)
  })

  it("can start with nothing saved and no date", () => {
    const { goal } = freshStore().createGoal({ name: "Rainy day", targetAmount: 5_000_000, walletId: "wallet-bca", icon: "umbrella" })
    assert.equal(goal.savedAmount, 0)
    assert.equal(goal.targetDate, "")
  })

  it("trims the name", () => {
    assert.equal(freshStore().createGoal(newGoal({ name: "  Trip to Bali  " })).goal.name, "Trip to Bali")
  })

  it("goes last even after other goals were deleted", () => {
    const store = freshStore()
    store.deleteGoal("goal-home")
    store.deleteGoal("goal-japan")
    const { goal, goals } = store.createGoal(newGoal())
    assert.deepEqual(goals.map((g) => g.id), ["goal-emergency", goal.id])
  })

  it("does not touch any wallet or transaction", () => {
    const store = freshStore()
    const before = balances(store)
    store.createGoal(newGoal({ savedAmount: 999_000_000 }))
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("refuses what isn't a proper goal, with a plain message, and adds nothing", () => {
    const store = freshStore()
    const bad: [Record<string, unknown>, RegExp][] = [
      [{ name: "" }, /Give the goal a name/],
      [{ name: "   " }, /Give the goal a name/],
      [{ name: 5 }, /Give the goal a name/],
      [{ name: undefined }, /Give the goal a name/],
      [{ name: "x".repeat(41) }, /at most 40 characters/],
      [{ targetAmount: 0 }, /whole number of rupiah above zero/],
      [{ targetAmount: -5 }, /whole number of rupiah above zero/],
      [{ targetAmount: 1.5 }, /whole number of rupiah above zero/],
      [{ targetAmount: "100" }, /whole number of rupiah above zero/],
      [{ targetAmount: null }, /whole number of rupiah above zero/],
      [{ targetAmount: undefined }, /whole number of rupiah above zero/],
      [{ targetAmount: 1_000_000_000_000 }, /too large/],
      [{ savedAmount: -1 }, /amount saved must be a whole number/],
      [{ savedAmount: 2.5 }, /amount saved must be a whole number/],
      [{ savedAmount: "5" }, /amount saved must be a whole number/],
      [{ savedAmount: 1_000_000_000_000 }, /too large/],
      [{ walletId: "wallet-nope" }, /isn't a wallet that exists/],
      [{ walletId: undefined }, /isn't a wallet that exists/],
      [{ walletId: 5 }, /isn't a wallet that exists/],
      [{ targetDate: "2026-02-30" }, /real date/],
      [{ targetDate: "30-09-2026" }, /real date/],
      [{ targetDate: "2027-3-1" }, /real date/],
      [{ targetDate: "tomorrow" }, /real date/],
      [{ targetDate: 20270331 }, /real date/],
      [{ targetDate: null }, /real date/],
      [{ targetDate: "1999-12-31" }, /real date/],
      [{ targetDate: "2101-01-01" }, /real date/],
      [{ icon: "rocket" }, /icons on offer/],
      [{ icon: "" }, /icons on offer/],
      [{ icon: 5 }, /icons on offer/],
      [{ icon: undefined }, /icons on offer/],
    ]
    for (const [over, message] of bad) {
      assert.throws(() => store.createGoal(newGoal(over)), (error: unknown) => error instanceof ValidationError && message.test(error.message), JSON.stringify(over))
    }
    for (const body of [null, "goal", [], 5]) assert.throws(() => store.createGoal(body), /JSON object/)
    assert.equal(store.getData().goals.length, 3)
  })

  it("accepts a real leap day, and an empty date", () => {
    const store = freshStore()
    assert.equal(store.createGoal(newGoal({ targetDate: "2028-02-29" })).goal.targetDate, "2028-02-29")
    assert.equal(store.createGoal(newGoal({ targetDate: "" })).goal.targetDate, "")
  })
})

describe("changing a goal", () => {
  it("changes everything the owner can edit, and keeps the goal's id and place in the list", () => {
    const store = freshStore()
    const { goal, goals } = store.updateGoal("goal-japan", newGoal({ name: "Japan and Korea", icon: "plane" }), NOW)!
    assert.equal(goal.id, "goal-japan")
    assert.deepEqual(asInput(goal), newGoal({ name: "Japan and Korea", icon: "plane" }))
    // This edit lowers what is saved (6.35M to 2M), so the pace note starts afresh from today.
    assert.deepEqual([goal.paceFrom, goal.paceAmount], ["2026-09-30", 2_000_000])
    assert.deepEqual(goals.map((g) => g.id), ["goal-emergency", "goal-japan", "goal-home"])
  })

  it("can move a goal to another wallet", () => {
    const store = freshStore()
    const moved = store.updateGoal("goal-japan", asInput(goalOf(store, "goal-japan")!, { walletId: "wallet-jago" }))!
    assert.equal(moved.goal.walletId, "wallet-jago")
    assert.equal(goalOf(store, "goal-japan")?.walletId, "wallet-jago")
  })

  it("can set a date and take it away again", () => {
    const store = freshStore()
    const home = goalOf(store, "goal-home")!
    assert.equal(store.updateGoal("goal-home", asInput(home, { targetDate: "" }))?.goal.targetDate, "")
    assert.equal(store.updateGoal("goal-home", asInput(home, { targetDate: "2030-01-15" }))?.goal.targetDate, "2030-01-15")
  })

  it("can correct what has been saved, up or down", () => {
    const store = freshStore()
    const emergency = goalOf(store, "goal-emergency")!
    assert.equal(store.updateGoal("goal-emergency", asInput(emergency, { savedAmount: 17_000_000 }))?.goal.savedAmount, 17_000_000)
    assert.equal(store.updateGoal("goal-emergency", asInput(emergency, { savedAmount: 0 }))?.goal.savedAmount, 0)
  })

  it("returns undefined for a goal that doesn't exist", () => {
    assert.equal(freshStore().updateGoal("goal-nope", newGoal()), undefined)
  })

  it("refuses bad data and changes nothing", () => {
    const store = freshStore()
    const before = store.getData().goals
    assert.throws(() => store.updateGoal("goal-japan", newGoal({ targetAmount: 0 })), ValidationError)
    assert.throws(() => store.updateGoal("goal-japan", newGoal({ walletId: "wallet-nope" })), ValidationError)
    assert.throws(() => store.updateGoal("goal-japan", newGoal({ icon: "rocket" })), ValidationError)
    assert.deepEqual(store.getData().goals, before)
  })

  it("does not touch any wallet or transaction", () => {
    const store = freshStore()
    const before = balances(store)
    store.updateGoal("goal-japan", newGoal({ savedAmount: 24_000_000, walletId: "wallet-bca" }))
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })
})

describe("adding money to a goal", () => {
  it("adds to what is saved and changes nothing else about the goal", () => {
    const store = freshStore()
    const before = goalOf(store, "goal-emergency")!
    const { goal, goals } = store.addToGoal("goal-emergency", { amount: 1_500_000 })!
    assert.deepEqual(goal, { ...before, savedAmount: 20_000_000 })
    assert.deepEqual(goals.map((g) => g.id), ["goal-emergency", "goal-japan", "goal-home"])
    assert.equal(goalOf(store, "goal-japan")?.savedAmount, 6_350_000) // the other goals are as they were
  })

  it("adds up over several additions", () => {
    const store = freshStore()
    store.addToGoal("goal-japan", { amount: 1_000_000 })
    store.addToGoal("goal-japan", { amount: 650_000 })
    assert.equal(goalOf(store, "goal-japan")?.savedAmount, 8_000_000)
  })

  it("lets a goal go past its target", () => {
    const store = freshStore()
    const { goal } = store.addToGoal("goal-emergency", { amount: 12_000_000 })!
    assert.equal(goal.savedAmount, 30_500_000)
    assert.ok(goal.savedAmount > goal.targetAmount)
  })

  it("moves no money between wallets and makes no transaction", () => {
    const store = freshStore()
    const before = balances(store)
    store.addToGoal("goal-emergency", { amount: 2_000_000 })
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("refuses an amount that isn't whole rupiah above zero, and changes nothing", () => {
    const store = freshStore()
    for (const amount of [0, -5, 1.5, "5", null, undefined, 1_000_000_000_000]) {
      assert.throws(() => store.addToGoal("goal-emergency", { amount }), ValidationError, String(amount))
    }
    for (const body of [null, "5", [], 5]) assert.throws(() => store.addToGoal("goal-emergency", body), /JSON object/)
    assert.equal(goalOf(store, "goal-emergency")?.savedAmount, 18_500_000)
  })

  it("refuses to grow past the largest amount the app keeps", () => {
    const store = freshStore()
    const { goal } = store.createGoal(newGoal({ savedAmount: 999_999_999_000, targetAmount: 999_999_999_999 }))
    assert.throws(() => store.addToGoal(goal.id, { amount: 1_000 }), /too large/)
    assert.equal(goalOf(store, goal.id)?.savedAmount, 999_999_999_000)
    assert.equal(store.addToGoal(goal.id, { amount: 999 })?.goal.savedAmount, 999_999_999_999)
  })

  it("returns undefined for a goal that doesn't exist", () => {
    assert.equal(freshStore().addToGoal("goal-nope", { amount: 1_000 }), undefined)
  })
})

describe("deleting a goal", () => {
  it("removes it and returns the goals that are left", () => {
    const store = freshStore()
    const result = store.deleteGoal("goal-japan")!
    assert.deepEqual(result.goals.map((g) => g.id), ["goal-emergency", "goal-home"])
    assert.equal(goalOf(store, "goal-japan"), undefined)
  })

  it("leaves the money in its wallet, and every transaction, exactly as they were", () => {
    const store = freshStore()
    const before = balances(store)
    store.deleteGoal("goal-emergency")
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("returns undefined for a goal that doesn't exist, or one already deleted", () => {
    const store = freshStore()
    assert.equal(store.deleteGoal("goal-nope"), undefined)
    store.deleteGoal("goal-japan")
    assert.equal(store.deleteGoal("goal-japan"), undefined)
  })

  it("can delete every goal", () => {
    const store = freshStore()
    for (const id of ["goal-emergency", "goal-japan", "goal-home"]) store.deleteGoal(id)
    assert.deepEqual(store.getData().goals, [])
  })
})

describe("goals and deleting a wallet", () => {
  it("still refuses while goals are saved in the wallet, and now says to move them", () => {
    const store = freshStore()
    assert.throws(
      () => store.deleteWallet("wallet-superbank"),
      (error: unknown) => error instanceof ValidationError && /goals are saved in it/.test(error.message) && /Move them to another wallet first/.test(error.message)
    )
    assert.throws(() => store.deleteWallet("wallet-pluang"), /a goal is saved in it: "Home down payment"\. Move it to another wallet first/)
  })

  it("allows it once every goal has been moved out, so Superbank and Pluang can be deleted", () => {
    const store = freshStore()
    for (const id of ["goal-emergency", "goal-japan", "goal-home"]) {
      store.updateGoal(id, asInput(goalOf(store, id)!, { walletId: "wallet-bca" }))
    }
    assert.equal(store.deleteWallet("wallet-superbank")?.wallets.length, 3)
    assert.equal(store.deleteWallet("wallet-pluang")?.wallets.length, 2)
    assert.deepEqual(store.getData().goals.map((g) => g.walletId), ["wallet-bca", "wallet-bca", "wallet-bca"])
  })

  it("stays blocked while just one goal is left in the wallet", () => {
    const store = freshStore()
    store.updateGoal("goal-emergency", asInput(goalOf(store, "goal-emergency")!, { walletId: "wallet-bca" }))
    assert.throws(() => store.deleteWallet("wallet-superbank"), /a goal is saved in it: "Japan in spring"/)
  })

  it("allows it once the goals in it are deleted", () => {
    const store = freshStore()
    store.deleteGoal("goal-emergency")
    store.deleteGoal("goal-japan")
    assert.equal(store.deleteWallet("wallet-superbank")?.wallets.length, 3)
  })

  it("refuses to move a goal into a wallet that was deleted", () => {
    const store = freshStore()
    store.deleteGoal("goal-emergency")
    store.deleteGoal("goal-japan")
    store.deleteWallet("wallet-superbank")
    assert.throws(() => store.updateGoal("goal-home", asInput(goalOf(store, "goal-home")!, { walletId: "wallet-superbank" })), /isn't a wallet that exists/)
  })
})

describe("resetting", () => {
  it("brings the sample goals back, with what was saved for them", () => {
    const store = freshStore()
    const sample = store.getData().goals
    store.addToGoal("goal-emergency", { amount: 5_000_000 })
    store.deleteGoal("goal-japan")
    store.createGoal(newGoal())
    store.reset()
    assert.deepEqual(store.getData().goals, sample)
  })
})

describe("the goal routes", () => {
  const freshApp = () => createApp(freshStore())
  const json = (method: string, payload: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  it("adds a goal, and GET /api/data then includes it", async () => {
    const app = freshApp()
    const res = await app.request("/api/goals", json("POST", newGoal()))
    assert.equal(res.status, 201)
    const { goal, goals } = (await res.json()) as SaveGoalResult
    assert.equal(goal.name, "New laptop")
    assert.equal(goals.length, 4)
    const data = (await (await app.request("/api/data")).json()) as AppData
    assert.deepEqual(data.goals, goals)
  })

  it("changes a goal, adds money to it, and deletes it", async () => {
    const app = freshApp()

    const changed = await app.request("/api/goals/goal-japan", json("PUT", newGoal({ name: "Japan and Korea" })))
    assert.equal(changed.status, 200)
    assert.equal(((await changed.json()) as SaveGoalResult).goal.name, "Japan and Korea")

    const added = await app.request("/api/goals/goal-japan/add-money", json("POST", { amount: 500_000 }))
    assert.equal(added.status, 200)
    assert.equal(((await added.json()) as SaveGoalResult).goal.savedAmount, 2_500_000) // 2M from the edit above, plus 500k

    const deleted = await app.request("/api/goals/goal-japan", { method: "DELETE" })
    assert.equal(deleted.status, 200)
    assert.deepEqual(((await deleted.json()) as DeleteGoalResult).goals.map((g) => g.id), ["goal-emergency", "goal-home"])
  })

  it("answers 404 with a plain message for a goal that isn't there", async () => {
    const app = freshApp()
    const requests: [string, RequestInit][] = [
      ["/api/goals/goal-nope", json("PUT", newGoal())],
      ["/api/goals/goal-nope/add-money", json("POST", { amount: 1000 })],
      ["/api/goals/goal-nope", { method: "DELETE" }],
    ]
    for (const [path, init] of requests) {
      const res = await app.request(path, init)
      assert.equal(res.status, 404, path)
      assert.deepEqual(await res.json(), { error: "That goal doesn't exist any more." })
    }
  })

  it("answers 400 with a plain message for bad data, and for something that isn't JSON", async () => {
    const app = freshApp()
    const bad = await app.request("/api/goals", json("POST", newGoal({ name: "" })))
    assert.equal(bad.status, 400)
    assert.deepEqual(await bad.json(), { error: "Give the goal a name." })

    const noAmount = await app.request("/api/goals/goal-japan/add-money", json("POST", { amount: 0 }))
    assert.equal(noAmount.status, 400)
    assert.match(((await noAmount.json()) as { error: string }).error, /above zero/)

    const notJson = await app.request("/api/goals", { method: "POST", body: "not json" })
    assert.equal(notJson.status, 400)
    assert.deepEqual(await notJson.json(), { error: "Send the data as JSON." })
  })
})

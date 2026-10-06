import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AddToGoalResult, AppData, Goal, GoalMovement, ReorderGoalsResult, SaveGoalResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const freshStore = () => createStore(openDatabase(":memory:"))
type TestStore = ReturnType<typeof freshStore>

/** 30 Sep 2026, 14:05, the day the sample data is written for. */
const NOW = new Date(2026, 8, 30, 14, 5, 0)
const LATER = new Date(2026, 9, 15, 9, 30, 0)

const goalOf = (store: TestStore, id: string) => store.getData().goals.find((goal) => goal.id === id)
const walletOf = (store: TestStore, id: string) => store.getData().wallets.find((w) => w.id === id)
const balances = (store: TestStore) => Object.fromEntries(store.getData().wallets.map((w) => [w.id, w.balance]))
const asInput = (goal: Goal, over: Record<string, unknown> = {}) => ({
  name: goal.name,
  targetAmount: goal.targetAmount,
  savedAmount: goal.savedAmount,
  targetDate: goal.targetDate,
  walletId: goal.walletId,
  icon: goal.icon,
  ...over,
})

describe("the sample data's goals", () => {
  it("each carry where their pace note measures from", () => {
    for (const goal of freshStore().getData().goals) {
      assert.equal(goal.paceFrom, "2026-07-01", goal.name)
      assert.ok(goal.paceAmount >= 0 && goal.paceAmount < goal.savedAmount, goal.name)
    }
  })

  it("each come with a history that ends on what they hold", () => {
    const store = freshStore()
    for (const goal of store.getData().goals) {
      const history = store.getGoalHistory(goal.id)!
      assert.ok(history.length >= 4, goal.name)
      assert.equal(history[0].newSaved, goal.savedAmount, goal.name) // newest first
      assert.equal(history.at(-1)!.kind, "start", goal.name)
      assert.equal(history.at(-1)!.oldSaved, 0, goal.name)
      // Each row starts where the one before it ended.
      const oldest = [...history].reverse()
      for (let i = 1; i < oldest.length; i++) assert.equal(oldest[i].oldSaved, oldest[i - 1].newSaved, goal.name)
    }
  })

  it("shows the index fund top-up as money moved from another wallet", () => {
    const [newest] = freshStore().getGoalHistory("goal-home")!
    assert.deepEqual(
      { kind: newest.kind, from: newest.fromWalletId, transferred: newest.transferred, newSaved: newest.newSaved },
      { kind: "add", from: "wallet-bca", transferred: true, newSaved: 15_430_000 }
    )
  })

  it("none is reached yet, so none has a date it was reached on", () => {
    for (const goal of freshStore().getData().goals) assert.equal(goal.reachedAt, undefined, goal.name)
  })
})

describe("adding money that comes from another wallet", () => {
  it("records a transfer, so the two wallet balances really move", () => {
    const store = freshStore()
    const before = balances(store)
    const result = store.addToGoal("goal-emergency", { amount: 2_000_000, fromWalletId: "wallet-bca" }, NOW)!

    assert.equal(result.goal.savedAmount, 20_500_000)
    assert.equal(result.transaction?.type, "transfer")
    assert.deepEqual(
      { from: result.transaction?.type === "transfer" ? result.transaction.fromWalletId : "", to: result.transaction?.type === "transfer" ? result.transaction.toWalletId : "", amount: result.transaction?.amount },
      { from: "wallet-bca", to: "wallet-superbank", amount: 2_000_000 }
    )
    assert.equal(result.transaction?.description, "Saved for Emergency fund")
    assert.match(result.transaction!.date, /^2026-09-30T14:05:00[+-]\d{2}:\d{2}$/)

    const after = balances(store)
    assert.equal(after["wallet-bca"], before["wallet-bca"] - 2_000_000)
    assert.equal(after["wallet-superbank"], before["wallet-superbank"] + 2_000_000)
    assert.deepEqual(result.wallets.map((w) => w.balance), Object.values(after))
    // The total across every wallet is unchanged: money moved, it didn't appear.
    assert.equal(Object.values(after).reduce((a, b) => a + b, 0), Object.values(before).reduce((a, b) => a + b, 0))
  })

  it("puts that transfer in the transactions list, where it can be seen and edited", () => {
    const store = freshStore()
    const { transaction } = store.addToGoal("goal-japan", { amount: 500_000, fromWalletId: "wallet-jago" }, NOW)!
    const saved = store.getData().transactions.find((tx) => tx.id === transaction!.id)
    assert.deepEqual(saved, transaction)
    assert.equal(store.getData().transactions.length, 42)
  })

  it("counts as neither income nor spending, being a transfer", () => {
    const store = freshStore()
    const { transaction } = store.addToGoal("goal-japan", { amount: 500_000, fromWalletId: "wallet-jago" }, NOW)!
    assert.equal(transaction?.type, "transfer")
  })

  it("keeps the money where it is when no wallet is named, and makes no transaction", () => {
    const store = freshStore()
    const before = balances(store)
    const result = store.addToGoal("goal-emergency", { amount: 2_000_000 }, NOW)!
    assert.equal(result.transaction, undefined)
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
    assert.equal(result.goal.savedAmount, 20_500_000)
  })

  it("treats an empty wallet the same as none at all", () => {
    for (const body of [{ amount: 1_000, fromWalletId: "" }, { amount: 1_000, fromWalletId: null }, { amount: 1_000 }]) {
      const store = freshStore()
      assert.equal(store.addToGoal("goal-emergency", body, NOW)!.transaction, undefined, JSON.stringify(body))
      assert.equal(store.getData().transactions.length, 41)
    }
  })

  it("refuses to move money from the wallet the goal is already saved in", () => {
    const store = freshStore()
    assert.throws(
      () => store.addToGoal("goal-emergency", { amount: 1_000, fromWalletId: "wallet-superbank" }, NOW),
      /already saved in that wallet/
    )
    assert.equal(goalOf(store, "goal-emergency")?.savedAmount, 18_500_000)
  })

  it("refuses a wallet that doesn't exist, and saves nothing at all", () => {
    const store = freshStore()
    const before = balances(store)
    assert.throws(() => store.addToGoal("goal-emergency", { amount: 1_000, fromWalletId: "wallet-nope" }, NOW), /isn't a wallet that exists/)
    assert.throws(() => store.addToGoal("goal-emergency", { amount: 1_000, fromWalletId: 5 }, NOW), ValidationError)
    assert.equal(goalOf(store, "goal-emergency")?.savedAmount, 18_500_000)
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("all or nothing: a refused addition leaves no transfer behind", () => {
    const store = freshStore()
    // Too large to save: the transfer is written first, then the goal fails, so both must be undone.
    const { goal } = store.createGoal({ name: "Huge", targetAmount: 999_999_999_999, savedAmount: 999_999_999_000, walletId: "wallet-superbank", icon: "gem" }, NOW)
    const before = balances(store)
    assert.throws(() => store.addToGoal(goal.id, { amount: 1_000_000, fromWalletId: "wallet-bca" }, NOW), /too large/)
    assert.equal(store.getData().transactions.length, 41)
    assert.deepEqual(balances(store), before)
    assert.equal(goalOf(store, goal.id)?.savedAmount, 999_999_999_000)
  })

  it("deleting the wallet the money came from keeps the history row, without the wallet", () => {
    const store = freshStore()
    store.addToGoal("goal-emergency", { amount: 1_000_000, fromWalletId: "wallet-jago" }, NOW)
    store.deleteWallet("wallet-jago")
    const [newest] = store.getGoalHistory("goal-emergency")!
    assert.equal(newest.newSaved, 19_500_000)
    assert.equal(newest.fromWalletId, undefined) // that wallet is gone
    assert.equal(newest.transferred, true) // but we still know money was moved
    assert.equal(goalOf(store, "goal-emergency")?.savedAmount, 19_500_000) // the goal keeps what it holds
  })
})

describe("taking money out of a goal", () => {
  it("lowers what is saved, moving no money and making no transaction", () => {
    const store = freshStore()
    const before = balances(store)
    const { goal } = store.takeFromGoal("goal-emergency", { amount: 500_000 }, NOW)!
    assert.equal(goal.savedAmount, 18_000_000)
    assert.deepEqual(balances(store), before)
    assert.equal(store.getData().transactions.length, 41)
  })

  it("can empty a goal completely", () => {
    const store = freshStore()
    assert.equal(store.takeFromGoal("goal-japan", { amount: 6_350_000 }, NOW)!.goal.savedAmount, 0)
  })

  it("refuses to take out more than is saved, and says how much there is", () => {
    const store = freshStore()
    assert.throws(
      () => store.takeFromGoal("goal-japan", { amount: 6_350_001 }, NOW),
      (error: unknown) => error instanceof ValidationError && /Only Rp 6\.350\.000 is saved/.test(error.message)
    )
    assert.equal(goalOf(store, "goal-japan")?.savedAmount, 6_350_000)
  })

  it("refuses an amount that isn't whole rupiah above zero", () => {
    const store = freshStore()
    for (const amount of [0, -5, 1.5, "5", null, undefined]) {
      assert.throws(() => store.takeFromGoal("goal-japan", { amount }, NOW), ValidationError, String(amount))
    }
    assert.equal(goalOf(store, "goal-japan")?.savedAmount, 6_350_000)
  })

  it("returns undefined for a goal that doesn't exist", () => {
    assert.equal(freshStore().takeFromGoal("goal-nope", { amount: 1_000 }, NOW), undefined)
  })

  it("takes a reached goal back to in progress, and forgets the date it was reached", () => {
    const store = freshStore()
    store.addToGoal("goal-japan", { amount: 18_650_000 }, NOW)
    assert.ok(goalOf(store, "goal-japan")?.reachedAt)
    const { goal } = store.takeFromGoal("goal-japan", { amount: 1 }, LATER)!
    assert.equal(goal.reachedAt, undefined)
    assert.equal(goal.savedAmount, 24_999_999)
  })

  it("is remembered in the history as taken out", () => {
    const store = freshStore()
    store.takeFromGoal("goal-emergency", { amount: 500_000 }, NOW)
    const [newest] = store.getGoalHistory("goal-emergency")!
    assert.deepEqual(
      { kind: newest.kind, oldSaved: newest.oldSaved, newSaved: newest.newSaved, transferred: newest.transferred },
      { kind: "take-out", oldSaved: 18_500_000, newSaved: 18_000_000, transferred: false }
    )
  })
})

describe("when a goal is reached", () => {
  it("remembers the day it happened", () => {
    const store = freshStore()
    const { goal } = store.addToGoal("goal-japan", { amount: 18_650_000 }, NOW)!
    assert.match(goal.reachedAt!, /^2026-09-30T14:05:00[+-]\d{2}:\d{2}$/)
  })

  it("keeps that day when more money is added later", () => {
    const store = freshStore()
    const first = store.addToGoal("goal-japan", { amount: 18_650_000 }, NOW)!.goal.reachedAt
    const after = store.addToGoal("goal-japan", { amount: 1_000_000 }, LATER)!.goal
    assert.equal(after.reachedAt, first)
  })

  it("counts being reached by lowering the target, and by raising what is saved in an edit", () => {
    const store = freshStore()
    const lowered = store.updateGoal("goal-japan", asInput(goalOf(store, "goal-japan")!, { targetAmount: 6_000_000 }), NOW)!.goal
    assert.ok(lowered.reachedAt)
    const raised = store.updateGoal("goal-home", asInput(goalOf(store, "goal-home")!, { savedAmount: 150_000_000 }), NOW)!.goal
    assert.ok(raised.reachedAt)
  })

  it("loses the date when the target is raised out of reach again", () => {
    const store = freshStore()
    store.addToGoal("goal-japan", { amount: 18_650_000 }, NOW)
    const again = store.updateGoal("goal-japan", asInput(goalOf(store, "goal-japan")!, { targetAmount: 40_000_000 }), LATER)!.goal
    assert.equal(again.reachedAt, undefined)
  })

  it("starts a new date when it is reached a second time", () => {
    const store = freshStore()
    store.addToGoal("goal-japan", { amount: 18_650_000 }, NOW)
    store.takeFromGoal("goal-japan", { amount: 5_000_000 }, NOW)
    const again = store.addToGoal("goal-japan", { amount: 5_000_000 }, LATER)!.goal
    assert.match(again.reachedAt!, /^2026-10-15T09:30:00/)
  })

  it("a goal made already past its target is reached from the start", () => {
    const { goal } = freshStore().createGoal({ name: "Done already", targetAmount: 1_000, savedAmount: 5_000, walletId: "wallet-bca", icon: "gem" }, NOW)
    assert.match(goal.reachedAt!, /^2026-09-30/)
  })
})

describe("where the pace note measures from", () => {
  it("starts on the day a goal is made, with what it holds then", () => {
    const { goal } = freshStore().createGoal({ name: "Car", targetAmount: 50_000_000, savedAmount: 5_000_000, walletId: "wallet-bca", icon: "car" }, NOW)
    assert.deepEqual([goal.paceFrom, goal.paceAmount], ["2026-09-30", 5_000_000])
  })

  it("is left alone by adding money, so progress can be judged over time", () => {
    const store = freshStore()
    const { goal } = store.addToGoal("goal-emergency", { amount: 1_000_000 }, LATER)!
    assert.deepEqual([goal.paceFrom, goal.paceAmount], ["2026-07-01", 12_000_000])
  })

  it("starts afresh when money is taken out", () => {
    const store = freshStore()
    const { goal } = store.takeFromGoal("goal-emergency", { amount: 1_000_000 }, LATER)!
    assert.deepEqual([goal.paceFrom, goal.paceAmount], ["2026-10-15", 17_500_000])
  })

  it("starts afresh when an edit lowers what is saved, but not when it raises it", () => {
    const store = freshStore()
    const raised = store.updateGoal("goal-emergency", asInput(goalOf(store, "goal-emergency")!, { savedAmount: 19_000_000 }), LATER)!.goal
    assert.deepEqual([raised.paceFrom, raised.paceAmount], ["2026-07-01", 12_000_000])
    const lowered = store.updateGoal("goal-emergency", asInput(goalOf(store, "goal-emergency")!, { savedAmount: 1_000_000 }), LATER)!.goal
    assert.deepEqual([lowered.paceFrom, lowered.paceAmount], ["2026-10-15", 1_000_000])
  })

  it("is left alone by an edit that changes only the name or the date", () => {
    const store = freshStore()
    const { goal } = store.updateGoal("goal-emergency", asInput(goalOf(store, "goal-emergency")!, { name: "Rainy day", targetDate: "2028-01-01" }), LATER)!
    assert.deepEqual([goal.paceFrom, goal.paceAmount], ["2026-07-01", 12_000_000])
  })
})

describe("a goal's history", () => {
  it("starts empty for a goal made with nothing saved", () => {
    const store = freshStore()
    const { goal } = store.createGoal({ name: "Fresh", targetAmount: 1_000_000, walletId: "wallet-bca", icon: "gift" }, NOW)
    assert.deepEqual(store.getGoalHistory(goal.id), [])
  })

  it("opens with a 'start' row when a goal is made with something saved", () => {
    const store = freshStore()
    const { goal } = store.createGoal({ name: "Fresh", targetAmount: 1_000_000, savedAmount: 250_000, walletId: "wallet-bca", icon: "gift" }, NOW)
    assert.deepEqual(store.getGoalHistory(goal.id)!.map((m) => [m.kind, m.oldSaved, m.newSaved]), [["start", 0, 250_000]])
  })

  it("records every kind of change, newest first", () => {
    const store = freshStore()
    const { goal } = store.createGoal({ name: "Trip", targetAmount: 10_000_000, savedAmount: 1_000_000, walletId: "wallet-superbank", icon: "plane" }, NOW)
    store.addToGoal(goal.id, { amount: 500_000 }, NOW)
    store.addToGoal(goal.id, { amount: 2_000_000, fromWalletId: "wallet-bca" }, NOW)
    store.takeFromGoal(goal.id, { amount: 300_000 }, NOW)
    store.updateGoal(goal.id, asInput(goalOf(store, goal.id)!, { savedAmount: 4_000_000 }), NOW)

    const history = store.getGoalHistory(goal.id)!
    assert.deepEqual(history.map((m) => m.kind), ["correction", "take-out", "add", "add", "start"])
    assert.deepEqual(history.map((m) => m.newSaved), [4_000_000, 3_200_000, 3_500_000, 1_500_000, 1_000_000])
    assert.deepEqual(history.map((m) => m.transferred), [false, false, true, false, false])
    assert.equal(history[2].fromWalletId, "wallet-bca")
    assert.equal(history[3].fromWalletId, undefined)
    assert.ok(history.every((m) => /^2026-09-30T14:05:00/.test(m.at)))
    // Every row's id is its own, and they climb with time.
    assert.deepEqual([...history].map((m) => m.id).sort((a, b) => b - a), history.map((m) => m.id))
  })

  it("says nothing about edits that leave what is saved alone", () => {
    const store = freshStore()
    const before = store.getGoalHistory("goal-japan")!.length
    store.updateGoal("goal-japan", asInput(goalOf(store, "goal-japan")!, { name: "Japan and Korea", icon: "gem", targetAmount: 40_000_000 }), NOW)
    assert.equal(store.getGoalHistory("goal-japan")!.length, before)
  })

  it("returns undefined for a goal that doesn't exist, and goes when the goal is deleted", () => {
    const store = freshStore()
    assert.equal(store.getGoalHistory("goal-nope"), undefined)
    store.deleteGoal("goal-japan")
    assert.equal(store.getGoalHistory("goal-japan"), undefined)
    // Deleting a goal leaves the wallets and transactions alone.
    assert.equal(store.getData().transactions.length, 41)
  })

  it("is forgotten when the data is reset, and the sample history comes back", () => {
    const store = freshStore()
    const sample = store.getGoalHistory("goal-emergency")!.length
    store.addToGoal("goal-emergency", { amount: 1_000 }, NOW)
    assert.equal(store.getGoalHistory("goal-emergency")!.length, sample + 1)
    store.reset()
    assert.equal(store.getGoalHistory("goal-emergency")!.length, sample)
  })
})

describe("putting the goals in a new order", () => {
  const ids = (store: TestStore) => store.getData().goals.map((g) => g.id)

  it("saves the order, and every later read uses it", () => {
    const store = freshStore()
    const reversed = ids(store).reverse()
    assert.deepEqual(store.reorderGoals({ ids: reversed }).goals.map((g) => g.id), reversed)
    assert.deepEqual(ids(store), reversed)
  })

  it("puts a goal added afterwards last", () => {
    const store = freshStore()
    store.reorderGoals({ ids: ids(store).reverse() })
    const { goal, goals } = store.createGoal({ name: "Later", targetAmount: 1_000, walletId: "wallet-bca", icon: "gift" }, NOW)
    assert.equal(goals.at(-1)?.id, goal.id)
  })

  it("still works after a goal was deleted", () => {
    const store = freshStore()
    store.deleteGoal("goal-japan")
    const order = ids(store).reverse()
    assert.deepEqual(store.reorderGoals({ ids: order }).goals.map((g) => g.id), order)
  })

  it("refuses a list that isn't every goal exactly once", () => {
    const store = freshStore()
    const original = ids(store)
    const bad = [
      { ids: original.slice(1) },
      { ids: [...original, "goal-nope"] },
      { ids: [original[0], original[0], original[1]] },
      { ids: ["a", "b", "c"] },
      { ids: "goal-japan" },
      { ids: [1, 2, 3] },
      {},
      null,
    ]
    for (const body of bad) {
      assert.throws(() => store.reorderGoals(body), (error: unknown) => error instanceof ValidationError && /goal/.test(error.message), JSON.stringify(body))
    }
    assert.deepEqual(ids(store), original)
  })
})

describe("the extra goal routes", () => {
  const freshApp = () => createApp(freshStore())
  const json = (method: string, payload: unknown): RequestInit => ({
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  it("adds money from a wallet, takes money out, reads the history and saves a new order", async () => {
    const app = freshApp()

    const added = await app.request("/api/goals/goal-emergency/add-money", json("POST", { amount: 1_000_000, fromWalletId: "wallet-bca" }))
    assert.equal(added.status, 200)
    const result = (await added.json()) as AddToGoalResult
    assert.equal(result.goal.savedAmount, 19_500_000)
    assert.equal(result.transaction?.type, "transfer")
    assert.equal(result.wallets.find((w) => w.id === "wallet-bca")?.balance, 8_742_300 - 1_000_000)

    const took = await app.request("/api/goals/goal-emergency/take-out", json("POST", { amount: 500_000 }))
    assert.equal(took.status, 200)
    assert.equal(((await took.json()) as SaveGoalResult).goal.savedAmount, 19_000_000)

    const history = await app.request("/api/goals/goal-emergency/history")
    assert.equal(history.status, 200)
    const rows = (await history.json()) as GoalMovement[]
    assert.deepEqual(rows.slice(0, 2).map((m) => m.kind), ["take-out", "add"])

    const data = (await (await app.request("/api/data")).json()) as AppData
    const order = [...data.goals].reverse().map((g) => g.id)
    const reordered = await app.request("/api/goals/order", json("PUT", { ids: order }))
    assert.equal(reordered.status, 200)
    assert.deepEqual(((await reordered.json()) as ReorderGoalsResult).goals.map((g) => g.id), order)
  })

  it("does not mistake 'order' for a goal id", async () => {
    const app = freshApp()
    const data = (await (await app.request("/api/data")).json()) as AppData
    const res = await app.request("/api/goals/order", json("PUT", { ids: data.goals.map((g) => g.id) }))
    assert.equal(res.status, 200)
  })

  it("answers 404 for a goal that isn't there, and 400 with a plain message for bad data", async () => {
    const app = freshApp()
    for (const [path, init] of [
      ["/api/goals/goal-nope/add-money", json("POST", { amount: 1_000 })],
      ["/api/goals/goal-nope/take-out", json("POST", { amount: 1_000 })],
      ["/api/goals/goal-nope/history", { method: "GET" }],
    ] as [string, RequestInit][]) {
      const res = await app.request(path, init)
      assert.equal(res.status, 404, path)
      assert.deepEqual(await res.json(), { error: "That goal doesn't exist any more." })
    }

    const tooMuch = await app.request("/api/goals/goal-japan/take-out", json("POST", { amount: 99_000_000 }))
    assert.equal(tooMuch.status, 400)
    assert.match(((await tooMuch.json()) as { error: string }).error, /Only Rp 6\.350\.000 is saved/)

    const badWallet = await app.request("/api/goals/goal-japan/add-money", json("POST", { amount: 1_000, fromWalletId: "wallet-nope" }))
    assert.equal(badWallet.status, 400)
    assert.match(((await badWallet.json()) as { error: string }).error, /isn't a wallet that exists/)

    const badOrder = await app.request("/api/goals/order", json("PUT", { ids: ["nope"] }))
    assert.equal(badOrder.status, 400)
    assert.match(((await badOrder.json()) as { error: string }).error, /doesn't match your goals/)
  })
})

describe("upgrading a database that has goals but none of this", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabungbego-goals-upgrade-"))
  after(() => rmSync(dir, { recursive: true, force: true }))

  it("adds the new columns, keeps every goal, and every new feature works", () => {
    const path = join(dir, "old-goals.db")

    // A database exactly as the previous version left it: goals without pace, reached_at or a history table.
    const old = new DatabaseSync(path)
    old.exec(`
      CREATE TABLE wallets (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('bank', 'digital-bank', 'e-wallet', 'investment', 'cash')),
        balance INTEGER NOT NULL, description TEXT NOT NULL, color TEXT NOT NULL,
        default_color TEXT, icon TEXT, position INTEGER NOT NULL
      );
      CREATE TABLE goals (
        id TEXT PRIMARY KEY, name TEXT NOT NULL,
        target_amount INTEGER NOT NULL CHECK (target_amount > 0),
        saved_amount INTEGER NOT NULL CHECK (saved_amount >= 0),
        target_date TEXT NOT NULL, wallet_id TEXT NOT NULL REFERENCES wallets (id),
        icon TEXT NOT NULL, position INTEGER NOT NULL
      );
      INSERT INTO wallets VALUES ('w1', 'Old BCA', 'bank', 9000000, 'note', 'sky', 'sky', NULL, 0);
      INSERT INTO wallets VALUES ('w2', 'Old Superbank', 'digital-bank', 20000000, '', 'plum', 'plum', NULL, 1);
      INSERT INTO goals VALUES ('g1', 'Old trip', 10000000, 4000000, '2027-06-30', 'w2', 'plane', 0);
      INSERT INTO goals VALUES ('g2', 'Old done', 1000000, 1000000, '', 'w2', 'gem', 1);
      PRAGMA user_version = 1;
    `)
    old.close()

    const db = openDatabase(path)
    const store = createStore(db) // version is 1, so nothing is re-seeded
    const goals = store.getData().goals
    assert.deepEqual(goals.map((g) => [g.id, g.name, g.savedAmount]), [["g1", "Old trip", 4_000_000], ["g2", "Old done", 1_000_000]])
    // A goal from before this begins today, holding what it holds, so its pace note starts from now.
    const today = new Date()
    const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    assert.deepEqual(goals.map((g) => [g.paceFrom, g.paceAmount]), [[todayText, 4_000_000], [todayText, 1_000_000]])
    // An already-reached goal has no date it was reached on, because nobody recorded one.
    assert.equal(goals[1].reachedAt, undefined)
    // Its history starts empty rather than inventing rows.
    assert.deepEqual(store.getGoalHistory("g1"), [])

    // ...and everything new works on it.
    const added = store.addToGoal("g1", { amount: 1_000_000, fromWalletId: "w1" }, NOW)!
    assert.equal(added.goal.savedAmount, 5_000_000)
    assert.equal(added.wallets.find((w) => w.id === "w1")?.balance, 8_000_000)
    assert.equal(store.takeFromGoal("g1", { amount: 500_000 }, NOW)?.goal.savedAmount, 4_500_000)
    assert.deepEqual(store.getGoalHistory("g1")!.map((m) => m.kind), ["take-out", "add"])
    assert.deepEqual(store.reorderGoals({ ids: ["g2", "g1"] }).goals.map((g) => g.id), ["g2", "g1"])
    assert.equal(store.deleteGoal("g1")?.goals.length, 1)

    db.close() // Windows won't delete the folder while the file is open
  })
})

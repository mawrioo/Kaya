import assert from "node:assert/strict"
import { test } from "node:test"
import { createRefreshGuard } from "../lib/live-refresh.ts"
import { remindersFor } from "../lib/reminders.ts"

test("a response started before a save is rejected even after that save finishes", () => {
  const guard = createRefreshGuard()
  const old = guard.ticket()
  guard.begin()
  assert.equal(guard.ticket(), undefined)
  assert.equal(guard.accepts(old), false)
  guard.end()
  assert.equal(guard.accepts(old), false)
  assert.equal(guard.accepts(guard.ticket()), true)
})
test("overlapping saves keep reads blocked until both finish, including a failed save", () => {
  const guard = createRefreshGuard()
  guard.begin(); guard.begin(); guard.end()
  assert.equal(guard.accepts(guard.ticket()), false)
  guard.end()
  assert.equal(guard.accepts(guard.ticket()), true)
})
test("reminders include only unsettled matured depositos and unfinished goals due within seven days", () => {
  const wallets = ["running", "matured", "settled"].map((status) => ({ id: status, name: status, deposito: { status, endDate: "2026-10-01" } }))
  const goal = (id, targetDate, savedAmount = 0) => ({ id, name: id, targetDate, savedAmount, targetAmount: 100 })
  const goals = [goal("past", "2026-12-30"), goal("today", "2026-12-31"), goal("week", "2027-01-07"), goal("later", "2027-01-08"), goal("done", "2027-01-01", 100)]
  const reminders = remindersFor(wallets, goals, "2026-12-31")
  assert.deepEqual(reminders.map((r) => r.id), ["deposito:matured:2026-10-01", "goal:today:2026-12-31", "goal:week:2027-01-07"])
  assert.equal(reminders[1].title, "today: target date is today")
  assert.equal(remindersFor([], [], "2026-12-31").length, 0)
})

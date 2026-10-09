import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, it } from "node:test"

import { AuthError, SESSION_COOKIE, SESSION_DAYS, createAuth } from "./auth.ts"
import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData } from "./types.ts"
import { ValidationError } from "./validate.ts"

/** A clock the tests can move. */
function clock(start = Date.parse("2026-10-09T10:00:00+07:00")) {
  let at = start
  return { now: () => new Date(at), move: (ms: number) => void (at += ms) }
}

function freshAuth() {
  const db = openDatabase(":memory:")
  const time = clock()
  return { db, time, auth: createAuth(db, time.now) }
}

const refusesWith = (work: () => unknown, status: 401 | 429, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof AuthError && error.status === status && message.test(error.message))

const refusesInput = (work: () => unknown, message: RegExp) =>
  assert.throws(work, (error: unknown) => error instanceof ValidationError && message.test(error.message))

describe("the PIN, without a PIN set", () => {
  it("lets everything through: nothing is locked until the owner turns the PIN on", () => {
    const { auth } = freshAuth()
    assert.equal(auth.isPinSet(), false)
    assert.equal(auth.isAllowed(undefined), true)
    assert.deepEqual(auth.status(undefined), { pinSet: false, unlocked: true })
  })

  it("is off in a brand-new database, and the app data says so", () => {
    const store = createStore(openDatabase(":memory:"))
    assert.equal(store.getData().pinSet, false)
  })
})

describe("turning the PIN on", () => {
  it("keeps the device that did it unlocked, and locks every other one", () => {
    const { auth } = freshAuth()
    const { token } = auth.setPin({ pin: "4821" })
    assert.equal(auth.isPinSet(), true)
    assert.equal(auth.isAllowed(token), true, "this device is let in")
    assert.equal(auth.isAllowed(undefined), false, "a device with no cookie is not")
    assert.equal(auth.isAllowed("some-other-token"), false, "nor is one with a made-up cookie")
    assert.deepEqual(auth.status(undefined), { pinSet: true, unlocked: false })
    assert.deepEqual(auth.status(token), { pinSet: true, unlocked: true })
  })

  it("accepts 4 to 8 digits and nothing else, with a plain message for each problem", () => {
    const { auth } = freshAuth()
    refusesInput(() => auth.setPin({ pin: "123" }), /4 to 8 digits/)
    refusesInput(() => auth.setPin({ pin: "123456789" }), /4 to 8 digits/)
    refusesInput(() => auth.setPin({ pin: "12ab" }), /only have digits/)
    refusesInput(() => auth.setPin({ pin: " 1234" }), /only have digits/)
    refusesInput(() => auth.setPin({ pin: 1234 }), /typed as digits/)
    refusesInput(() => auth.setPin({}), /typed as digits/)
    refusesInput(() => auth.setPin(null), /typed as digits/)
    assert.equal(auth.isPinSet(), false, "none of those turned it on")
    for (const pin of ["1234", "12345678", "0000"]) assert.doesNotThrow(() => createAuth(openDatabase(":memory:")).setPin({ pin }))
  })

  it("never keeps the PIN or the cookie's token: only salted hashes of them", () => {
    const { db, auth } = freshAuth()
    const { token } = auth.setPin({ pin: "4821" })
    const lock = db.prepare("SELECT * FROM app_lock").get() as Record<string, unknown>
    const sessions = db.prepare("SELECT * FROM app_sessions").all() as Record<string, unknown>[]
    // A hash is hex, so a short PIN could turn up inside one by chance; compare whole values, not pieces of them.
    assert.ok(Object.values(lock).every((value) => value !== "4821" && value !== 4821))
    assert.ok(!JSON.stringify(sessions).includes(token), "the token itself is not in the database")
    assert.equal(sessions.length, 1)
    assert.equal(String(lock.pin_hash).length, 64)
    assert.notEqual(lock.pin_hash, lock.pin_salt)
  })

  it("gives two owners with the same PIN different hashes (each has its own salt)", () => {
    const first = freshAuth()
    const second = freshAuth()
    first.auth.setPin({ pin: "4821" })
    second.auth.setPin({ pin: "4821" })
    const hash = (db: ReturnType<typeof openDatabase>) => (db.prepare("SELECT pin_hash FROM app_lock").get() as { pin_hash: string }).pin_hash
    assert.notEqual(hash(first.db), hash(second.db))
  })
})

describe("typing the PIN", () => {
  it("lets a device in for a day (SESSION_DAYS), and not a moment longer", () => {
    const { auth, time } = freshAuth()
    auth.setPin({ pin: "4821" })
    const { token } = auth.unlock({ pin: "4821" })
    assert.equal(auth.isAllowed(token), true)
    time.move(SESSION_DAYS * 24 * 60 * 60 * 1000 - 60_000)
    assert.equal(auth.isAllowed(token), true, "still in a minute before the day is up")
    time.move(2 * 60_000)
    assert.equal(auth.isAllowed(token), false, "out once the day is up")
  })

  it("says a wrong PIN is wrong, counting the free tries down", () => {
    const { auth } = freshAuth()
    auth.setPin({ pin: "4821" })
    refusesWith(() => auth.unlock({ pin: "0000" }), 401, /isn't right\. 4 tries left/)
    refusesWith(() => auth.unlock({ pin: "1111" }), 401, /3 tries left/)
    refusesWith(() => auth.unlock({ pin: "2222" }), 401, /2 tries left/)
    refusesWith(() => auth.unlock({ pin: "3333" }), 401, /1 try left/)
  })

  it("makes the next try wait after five wrong ones, longer each time, and not even the right PIN works during the wait", () => {
    const { auth, time } = freshAuth()
    auth.setPin({ pin: "4821" })
    for (let i = 0; i < 4; i++) assert.throws(() => auth.unlock({ pin: "0000" }), AuthError)
    // The fifth wrong try starts a 30 second wait.
    assert.throws(
      () => auth.unlock({ pin: "0000" }),
      (error: unknown) => error instanceof AuthError && error.status === 429 && error.retryAfterSeconds === 30 && /Wait 30 seconds/.test(error.message)
    )
    refusesWith(() => auth.unlock({ pin: "4821" }), 429, /Wait \d+ seconds/)
    time.move(29_000)
    refusesWith(() => auth.unlock({ pin: "4821" }), 429, /Wait 1 second/)
    time.move(2_000)
    // The wait is over, but one more wrong try waits twice as long.
    assert.throws(
      () => auth.unlock({ pin: "0000" }),
      (error: unknown) => error instanceof AuthError && error.status === 429 && error.retryAfterSeconds === 60 && /Wait 1 minute/.test(error.message)
    )
    time.move(61_000)
    assert.ok(auth.unlock({ pin: "4821" }).token, "the right PIN works once the wait is over")
  })

  it("never makes anyone wait longer than 15 minutes", () => {
    const { auth, time } = freshAuth()
    auth.setPin({ pin: "4821" })
    let longest = 0
    for (let i = 0; i < 20; i++) {
      time.move(24 * 60 * 60 * 1000)
      try {
        auth.unlock({ pin: "0000" })
      } catch (error) {
        if (error instanceof AuthError && error.retryAfterSeconds) longest = Math.max(longest, error.retryAfterSeconds)
      }
    }
    assert.equal(longest, 15 * 60)
  })

  it("clears the count of wrong tries when the right PIN is typed", () => {
    const { auth } = freshAuth()
    auth.setPin({ pin: "4821" })
    for (let i = 0; i < 3; i++) assert.throws(() => auth.unlock({ pin: "0000" }), AuthError)
    auth.unlock({ pin: "4821" })
    refusesWith(() => auth.unlock({ pin: "0000" }), 401, /4 tries left/)
  })

  it("remembers the wrong tries in the database, so restarting the backend doesn't hand out free tries", () => {
    const { db, auth, time } = freshAuth()
    auth.setPin({ pin: "4821" })
    for (let i = 0; i < 5; i++) assert.throws(() => auth.unlock({ pin: "0000" }), AuthError)
    const restarted = createAuth(db, time.now)
    refusesWith(() => restarted.unlock({ pin: "4821" }), 429, /Wait/)
  })

  it("asks for the PIN as text", () => {
    const { auth } = freshAuth()
    auth.setPin({ pin: "4821" })
    refusesInput(() => auth.unlock({ pin: 4821 }), /typed as digits/)
    refusesInput(() => auth.unlock({}), /typed as digits/)
    refusesInput(() => auth.unlock(null), /typed as digits/)
  })

  it("refuses to unlock when there is no PIN", () => {
    const { auth } = freshAuth()
    refusesInput(() => auth.unlock({ pin: "4821" }), /no PIN/)
  })
})

describe("locking, changing and removing", () => {
  it("lock forgets only that device", () => {
    const { auth } = freshAuth()
    const mine = auth.setPin({ pin: "4821" }).token
    const phone = auth.unlock({ pin: "4821" }).token
    auth.lock(mine)
    assert.equal(auth.isAllowed(mine), false)
    assert.equal(auth.isAllowed(phone), true)
    auth.lock(undefined) // nothing to forget, and no harm done
  })

  it("changing the PIN needs the current one, signs every other device out and keeps this one in", () => {
    const { auth } = freshAuth()
    const mine = auth.setPin({ pin: "4821" }).token
    const phone = auth.unlock({ pin: "4821" }).token
    refusesWith(() => auth.setPin({ pin: "9999", currentPin: "0000" }), 401, /isn't right/)
    refusesInput(() => auth.setPin({ pin: "9999" }), /typed as digits/)
    const changed = auth.setPin({ pin: "9999", currentPin: "4821" }).token
    assert.equal(auth.isAllowed(changed), true)
    assert.equal(auth.isAllowed(mine), false)
    assert.equal(auth.isAllowed(phone), false)
    refusesWith(() => auth.unlock({ pin: "4821" }), 401, /isn't right/)
    assert.ok(auth.unlock({ pin: "9999" }).token)
  })

  it("a refused change leaves the PIN, and every device, exactly as they were", () => {
    const { auth } = freshAuth()
    const mine = auth.setPin({ pin: "4821" }).token
    assert.throws(() => auth.setPin({ pin: "12", currentPin: "4821" }), ValidationError)
    assert.throws(() => auth.setPin({ pin: "9999", currentPin: "0000" }), AuthError)
    assert.equal(auth.isAllowed(mine), true)
    assert.ok(auth.unlock({ pin: "4821" }).token)
  })

  it("removing the PIN needs it, and opens the app to everyone again", () => {
    const { auth } = freshAuth()
    const mine = auth.setPin({ pin: "4821" }).token
    refusesWith(() => auth.removePin({ currentPin: "0000" }), 401, /isn't right/)
    assert.equal(auth.isPinSet(), true)
    auth.removePin({ currentPin: "4821" })
    assert.equal(auth.isPinSet(), false)
    assert.equal(auth.isAllowed(undefined), true)
    assert.equal(auth.isAllowed(mine), true, "no PIN, so no one is locked out")
    // And an old cookie doesn't come back to life when a new PIN is set.
    auth.setPin({ pin: "1357" })
    assert.equal(auth.isAllowed(mine), false)
  })

  it("forceRemove (npm run pin:reset) turns it off without asking, and signs everyone out", () => {
    const { db, auth } = freshAuth()
    auth.setPin({ pin: "4821" })
    auth.forceRemove()
    assert.equal(auth.isPinSet(), false)
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM app_sessions").get() as { n: number }).n, 0)
    auth.forceRemove() // fine to run when there is nothing to remove
  })

  it("an old database without the PIN tables gets them when it is opened, and nothing else changes", () => {
    const folder = mkdtempSync(join(tmpdir(), "kaya-pin-"))
    try {
      const file = join(folder, "old.db")
      const first = openDatabase(file)
      const before = createStore(first).getData()
      // Make it look like the version before the PIN existed.
      first.exec("DROP TABLE app_lock")
      first.exec("DROP TABLE app_sessions")
      first.close()

      // Opening it is what the backend does when it starts.
      const second = openDatabase(file)
      const store = createStore(second)
      assert.equal(store.auth.isPinSet(), false)
      assert.deepEqual(store.getData(), before)
      store.auth.setPin({ pin: "4821" })
      assert.equal(store.getData().pinSet, true)
      second.close()
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})

describe("the API with a PIN set", () => {
  function app() {
    const store = createStore(openDatabase(":memory:"))
    return { app: createApp(store), store }
  }
  const json = (method: string, payload: unknown, cookie?: string): RequestInit => ({
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload),
  })
  /** "kaya_session=abc" out of a Set-Cookie header. */
  const cookieFrom = (res: Response) => (res.headers.get("set-cookie") ?? "").split(";")[0]

  it("answers everything until a PIN is set, and the health check always", async () => {
    const { app: api } = app()
    assert.equal((await api.request("/api/data")).status, 200)
    const set = await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    assert.equal(set.status, 200)
    assert.equal((await api.request("/api/health")).status, 200)
  })

  it("answers 401 'locked' to a device with no cookie, for data and for every kind of change", async () => {
    const { app: api } = app()
    await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    for (const [method, path] of [
      ["GET", "/api/data"],
      ["POST", "/api/transactions"],
      ["PUT", "/api/user"],
      ["DELETE", "/api/transactions/tx-041"],
      ["POST", "/api/backup"],
      ["POST", "/api/undo/undo-x"],
      ["GET", "/api/wallets/wallet-bca/history"],
    ] as const) {
      const res = await api.request(path, { method, headers: { "content-type": "application/json" }, body: method === "GET" ? undefined : "{}" })
      assert.equal(res.status, 401, `${method} ${path}`)
      assert.deepEqual(await res.json(), { error: "Kaya is locked. Enter your PIN to open it.", locked: true })
    }
  })

  it("sends no data to a locked device: not even the owner's name", async () => {
    const { app: api } = app()
    await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    const res = await api.request("/api/data")
    const text = await res.text()
    assert.ok(!text.includes("Mario"))
    assert.ok(!text.includes("wallet-bca"))
  })

  it("sets the cookie when the right PIN is typed: HttpOnly, for the whole site, for a day", async () => {
    const { app: api } = app()
    await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    const res = await api.request("/api/auth/unlock", json("POST", { pin: "4821" }))
    assert.equal(res.status, 200)
    const header = res.headers.get("set-cookie") ?? ""
    assert.match(header, new RegExp(`^${SESSION_COOKIE}=`))
    assert.match(header, /HttpOnly/i)
    assert.match(header, /Path=\//i)
    assert.match(header, /SameSite=Lax/i)
    assert.match(header, new RegExp(`Max-Age=${SESSION_DAYS * 24 * 60 * 60}`, "i"))
    assert.ok(!/Secure/i.test(header), "it has to work over plain http on a home network")
  })

  it("lets a device with that cookie in, and says so in the data it sends", async () => {
    const { app: api } = app()
    const turnedOn = await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    const cookie = cookieFrom(turnedOn)
    const res = await api.request("/api/data", { headers: { cookie } })
    assert.equal(res.status, 200)
    const data = (await res.json()) as AppData
    assert.equal(data.pinSet, true)
    assert.equal(data.transactions.length, 41)
    assert.deepEqual(await (await api.request("/api/auth/status", { headers: { cookie } })).json(), { pinSet: true, unlocked: true })
    assert.deepEqual(await (await api.request("/api/auth/status")).json(), { pinSet: true, unlocked: false })
  })

  it("answers 401 for a wrong PIN and 429 with Retry-After when too many were wrong", async () => {
    const { app: api } = app()
    await api.request("/api/auth/pin", json("PUT", { pin: "4821" }))
    const wrong = await api.request("/api/auth/unlock", json("POST", { pin: "0000" }))
    assert.equal(wrong.status, 401)
    assert.match(((await wrong.json()) as { error: string }).error, /isn't right/)
    assert.ok(!wrong.headers.get("set-cookie"), "a wrong PIN gets no cookie")
    for (let i = 0; i < 3; i++) await api.request("/api/auth/unlock", json("POST", { pin: "0000" }))
    const waiting = await api.request("/api/auth/unlock", json("POST", { pin: "0000" }))
    assert.equal(waiting.status, 429)
    assert.equal(waiting.headers.get("retry-after"), "30")
    assert.equal(((await waiting.json()) as { retryAfterSeconds: number }).retryAfterSeconds, 30)
  })

  it("lock takes the cookie away, and that device is out", async () => {
    const { app: api } = app()
    const cookie = cookieFrom(await api.request("/api/auth/pin", json("PUT", { pin: "4821" })))
    assert.equal((await api.request("/api/data", { headers: { cookie } })).status, 200)
    const locked = await api.request("/api/auth/lock", json("POST", {}, cookie))
    assert.equal(locked.status, 200)
    assert.equal((await api.request("/api/data", { headers: { cookie } })).status, 401, "the old cookie no longer works")
  })

  it("removing the PIN opens the door for everyone", async () => {
    const { app: api } = app()
    const cookie = cookieFrom(await api.request("/api/auth/pin", json("PUT", { pin: "4821" })))
    assert.equal((await api.request("/api/auth/pin", json("DELETE", { currentPin: "0000" }, cookie))).status, 401)
    assert.equal((await api.request("/api/auth/pin", json("DELETE", { currentPin: "4821" }, cookie))).status, 200)
    assert.equal((await api.request("/api/data")).status, 200)
  })
})

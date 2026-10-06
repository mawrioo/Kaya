import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { DatabaseSync } from "node:sqlite"
import { after, describe, it } from "node:test"

import { createApp } from "./app.ts"
import { displayFolder, makeBackup } from "./backup.ts"
import { openDatabase } from "./db.ts"
import { createStore } from "./store.ts"
import type { AppData, BackupResult } from "./types.ts"
import { ValidationError } from "./validate.ts"

const scratch = mkdtempSync(join(tmpdir(), "nabungbego-backup-"))
const opened: DatabaseSync[] = []
// Windows won't delete a file that is still open, so every database is closed before the folder goes.
after(() => {
  for (const db of opened) db.close()
  rmSync(scratch, { recursive: true, force: true })
})

let counter = 0
/** A database in a file of its own (a backup needs a file), with the sample data. */
function fileStack() {
  const folder = join(scratch, `db-${++counter}`)
  const path = join(folder, "nabungbego.db")
  const db = openDatabase(path)
  opened.push(db)
  return { db, store: createStore(db), path, backups: join(folder, "backups") }
}

/** The data without the "last backup" note, which is the one thing a backup is allowed to change. */
const withoutBackupNote = (data: AppData): Omit<AppData, "lastBackup"> => {
  const { lastBackup: _ignored, ...rest } = data
  return rest
}

describe("Back up now", () => {
  it("is refused, in plain words, for data that isn't in a file", () => {
    const store = createStore(openDatabase(":memory:"))
    assert.throws(() => store.backUp(), (error: unknown) => error instanceof ValidationError && /isn't saved in a file/.test(error.message))
  })

  it("puts a copy in a backups folder beside the data file, named with the day and the time", () => {
    const { store, backups } = fileStack()
    const { backup } = store.backUp()
    assert.match(backup.name, /^nabungbego-\d{4}-\d{2}-\d{2}-\d{6}\.db$/)
    assert.deepEqual(readdirSync(backups), [backup.name])
    assert.match(backup.at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
  })

  it("names the copy after the moment it was made", () => {
    const { db, backups } = fileStack()
    const { backup } = makeBackup(db, new Date(2026, 9, 4, 15, 30, 12))
    assert.equal(backup.name, "nabungbego-2026-10-04-153012.db")
    assert.ok(existsSync(join(backups, backup.name)))
    assert.match(backup.at, /^2026-10-04T15:30:12/)
  })

  it("is a whole database: opening it shows the same data, and it does not start over from the sample", () => {
    const { store, backups } = fileStack()
    store.updateUser({ name: "Dewi" })
    store.setMonthlyBudget({ budget: 5_000_000 })
    const before = store.getData()
    const { backup } = store.backUp()

    const copy = openDatabase(join(backups, backup.name))
    const copied = createStore(copy).getData()
    copy.close()
    assert.deepEqual(copied, withoutBackupNote(before))
    assert.equal(copied.user.name, "Dewi")
    assert.equal(copied.transactions.length, before.transactions.length)
  })

  it("includes what was saved a moment before, even while the app is using the file", () => {
    const { store, backups } = fileStack()
    const wallet = store.getData().wallets[0]
    const category = store.getData().categories.find((entry) => entry.type === "expense")!
    store.createTransaction({
      type: "expense",
      amount: 12_345,
      date: "2026-10-04T10:00:00+07:00",
      description: "Just before the backup",
      walletId: wallet.id,
      categoryId: category.id,
    })
    const { backup } = store.backUp()

    const copy = openDatabase(join(backups, backup.name))
    const copied = createStore(copy).getData()
    copy.close()
    assert.ok(copied.transactions.some((tx) => tx.description === "Just before the backup"))
    assert.equal(copied.wallets.find((entry) => entry.id === wallet.id)!.balance, store.getData().wallets.find((entry) => entry.id === wallet.id)!.balance)
  })

  it("changes nothing in the data", () => {
    const { store } = fileStack()
    const before = store.getData()
    store.backUp()
    assert.deepEqual(withoutBackupNote(store.getData()), withoutBackupNote(before))
  })

  it("never replaces an earlier copy, even two in the same second", () => {
    const { db, backups } = fileStack()
    const moment = new Date(2026, 9, 4, 15, 30, 12)
    const first = makeBackup(db, moment).backup.name
    const second = makeBackup(db, moment).backup.name
    const third = makeBackup(db, moment).backup.name
    assert.deepEqual([first, second, third], [
      "nabungbego-2026-10-04-153012.db",
      "nabungbego-2026-10-04-153012-2.db",
      "nabungbego-2026-10-04-153012-3.db",
    ])
    assert.equal(readdirSync(backups).length, 3)
  })

  it("can be done again and again, and each copy stays", () => {
    const { store, backups } = fileStack()
    for (let i = 0; i < 4; i++) store.backUp()
    assert.equal(readdirSync(backups).length, 4)
  })
})

describe("the last backup, in the data the app draws itself from", () => {
  it("is missing until a copy has been made, and the data has no such key at all", () => {
    const { store } = fileStack()
    assert.equal("lastBackup" in store.getData(), false)
  })

  it("names the newest copy once there is one", () => {
    const { store, db } = fileStack()
    makeBackup(db, new Date(2026, 9, 3, 9, 0, 0))
    const newest = store.backUp().backup
    assert.deepEqual(store.getData().lastBackup, newest)
  })

  it("ignores other files in the folder", () => {
    const { store, backups } = fileStack()
    const { backup } = store.backUp()
    writeFileSync(join(backups, "notes.txt"), "not a backup")
    writeFileSync(join(backups, "other.db"), "not one of ours")
    assert.equal(store.getData().lastBackup?.name, backup.name)
  })

  it("is missing for data that isn't in a file", () => {
    assert.equal("lastBackup" in createStore(openDatabase(":memory:")).getData(), false)
  })
})

describe("how the folder is said in the message", () => {
  it("is backend/data/backups in the project, however the computer writes its paths", () => {
    const project = join(scratch, "project")
    assert.equal(displayFolder(join(project, "backend", "data", "backups"), join(project, "backend")), "backend/data/backups")
  })

  it("is the whole path when the data file lives somewhere else", () => {
    const elsewhere = join(scratch, "elsewhere", "backups")
    assert.equal(displayFolder(elsewhere, join(scratch, "project", "backend")), elsewhere)
  })
})

describe("POST /api/backup", () => {
  it("makes a copy and says which one and where", async () => {
    const { store, backups } = fileStack()
    const res = await createApp(store).request("/api/backup", { method: "POST" })
    assert.equal(res.status, 201)
    const body = (await res.json()) as BackupResult
    assert.match(body.backup.name, /^nabungbego-.*\.db$/)
    assert.equal(typeof body.folder, "string")
    assert.ok(existsSync(join(backups, body.backup.name)))

    const data = (await (await createApp(store).request("/api/data")).json()) as AppData
    assert.deepEqual(data.lastBackup, body.backup)
  })

  it("answers with a plain message when there is no file to copy", async () => {
    const res = await createApp(createStore(openDatabase(":memory:"))).request("/api/backup", { method: "POST" })
    assert.equal(res.status, 400)
    assert.match(((await res.json()) as { error: string }).error, /isn't saved in a file/)
  })
})

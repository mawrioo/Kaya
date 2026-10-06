/**
 * "Back up now": a copy of the database file, saved beside it in a folder called backups. Nothing here runs by itself:
 * a copy is made only when the owner presses the button. To go back to one, stop the app and copy it over
 * nabungbego.db (the README says how).
 */
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import type { DatabaseSync } from "node:sqlite"

import { isoWithOffset } from "./time.ts"
import type { BackupInfo } from "./types.ts"
import { ValidationError } from "./validate.ts"

const PREFIX = "nabungbego-"
const EXTENSION = ".db"

const pad = (n: number) => String(n).padStart(2, "0")

/** "nabungbego-2026-10-04-153012": the day and the time to the second, so the names sort oldest to newest. */
function stampedName(now: Date): string {
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${PREFIX}${day}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/** The folder the copies go in, beside the database file. Nothing for a database that lives only in memory. */
function backupFolder(db: DatabaseSync): string | undefined {
  const file = db.location()
  return file ? join(dirname(file), "backups") : undefined
}

/**
 * The folder as the owner would say it: "backend/data/backups" when it sits in this project, and the whole path when
 * the database was pointed somewhere else.
 */
export function displayFolder(folder: string, cwd: string = process.cwd()): string {
  // The backend runs from its own folder (backend/), so the project is one level up.
  const inProject = relative(dirname(cwd), folder)
  return inProject.startsWith("..") ? folder : inProject.replaceAll("\\", "/")
}

/** Makes a copy of the database now. Throws a ValidationError, in plain English, when it can't. */
export function makeBackup(db: DatabaseSync, now: Date = new Date()): { backup: BackupInfo; folder: string } {
  const folder = backupFolder(db)
  if (!folder) throw new ValidationError("This data isn't saved in a file, so there is nothing to back up.")
  mkdirSync(folder, { recursive: true })

  // Two copies in the same second get -2, -3 and so on, so one never replaces another.
  const stamp = stampedName(now)
  let name = `${stamp}${EXTENSION}`
  for (let again = 2; existsSync(join(folder, name)); again++) name = `${stamp}-${again}${EXTENSION}`

  try {
    // VACUUM INTO writes a whole, consistent copy even while the app is using the file (and its write-ahead log).
    db.prepare("VACUUM INTO ?").run(join(folder, name))
  } catch (error) {
    console.error(error)
    throw new ValidationError("Couldn't make the backup. Nothing was changed.")
  }
  return { backup: { name, at: isoWithOffset(now) }, folder: displayFolder(folder) }
}

/** The newest copy in the backups folder, or nothing when there is none yet. */
export function lastBackup(db: DatabaseSync): BackupInfo | undefined {
  const folder = backupFolder(db)
  if (!folder || !existsSync(folder)) return undefined
  const copies = readdirSync(folder)
    .filter((file) => file.startsWith(PREFIX) && file.endsWith(EXTENSION))
    .map((name) => ({ name, saved: statSync(join(folder, name)).mtime }))
    .sort((a, b) => a.saved.getTime() - b.saved.getTime())
  const newest = copies.at(-1)
  return newest ? { name: newest.name, at: isoWithOffset(newest.saved) } : undefined
}

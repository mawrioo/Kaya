/**
 * Opens Kaya's database: one SQLite file on this computer, using the
 * SQLite that comes built into Node, so there is nothing extra to install.
 */
import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"

import { presetCategories } from "./category-look.ts"
import { calendarDate } from "./time.ts"
import { MAX_WALLET_NICKNAME_LENGTH } from "./validate.ts"
import { WALLET_ICONS } from "./wallet-look.ts"

const here = dirname(fileURLToPath(import.meta.url))

/**
 * Where the database file lives: backend/data/nabungbego.db. Set the DB_PATH
 * environment variable to use another file, or ":memory:" for a throwaway
 * database (the tests do this).
 */
export const DB_PATH = process.env.DB_PATH ?? resolve(here, "../data/nabungbego.db")

/** The database itself refuses an icon that isn't on the list. Empty means the wallet uses its kind's default icon. */
const ICON_CHECK = `CHECK (icon IS NULL OR icon IN (${WALLET_ICONS.map((icon) => `'${icon}'`).join(", ")}))`

/** A nickname is either empty or 1 to 20 characters (the backend's checks are stricter and say why). */
const NICKNAME_CHECK = `CHECK (nickname IS NULL OR length(nickname) BETWEEN 1 AND ${MAX_WALLET_NICKNAME_LENGTH})`

/**
 * A deposito's details live in nullable columns of its wallet. A wallet is a deposito exactly when `deposit_rate_bp` is
 * set; the store then reports its kind as "deposito". Its stored `kind` is "bank": the CHECK on `kind` above can't be
 * widened on a database that already exists without rebuilding the whole table, and no data is worth that risk.
 */
const DEPOSIT_COLUMNS = `
  -- Deposito only: yearly rate in basis points (500 = 5%), the day the first term began, months per term,
  -- 1 when the bank renews it by itself, and when the money was moved out (empty until then).
  deposit_rate_bp    INTEGER CHECK (deposit_rate_bp IS NULL OR deposit_rate_bp > 0),
  deposit_start      TEXT,
  deposit_tenor      INTEGER CHECK (deposit_tenor IS NULL OR deposit_tenor > 0),
  deposit_rollover   INTEGER CHECK (deposit_rollover IS NULL OR deposit_rollover IN (0, 1)),
  deposit_settled_at TEXT,
  -- The wallet the money came from, and goes back to. Empty for a deposito made before this was recorded.
  deposit_source_wallet_id TEXT REFERENCES wallets (id) ON DELETE SET NULL,`

/**
 * The schema. Besides the columns, the CHECK rules let the database itself
 * refuse bad data: a transfer must name two different wallets, spending and
 * income must name one wallet and one category, and amounts must be above zero.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS app_user (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  -- The most the owner wants to spend in a month, across every category. Empty means no budget for the whole month.
  monthly_budget INTEGER CHECK (monthly_budget IS NULL OR monthly_budget > 0)
);

CREATE TABLE IF NOT EXISTS wallets (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('bank', 'digital-bank', 'e-wallet', 'investment', 'cash')),
  balance     INTEGER NOT NULL,
  description TEXT NOT NULL,
  color       TEXT NOT NULL,
  -- The colour the app picked when the wallet was made ("Default" in the colour picker).
  default_color TEXT,
  -- The icon the owner chose. Empty means the default icon for the wallet's kind.
  icon        TEXT ${ICON_CHECK},
  -- A short word for Quick add ("jago" for "Bank Jago"). Empty means the wallet has none.
  nickname    TEXT ${NICKNAME_CHECK},${DEPOSIT_COLUMNS}
  position    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  type     TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon     TEXT NOT NULL,
  color    TEXT NOT NULL,
  position INTEGER NOT NULL,
  -- 1 for the presets that come with the app: they can't be changed or deleted.
  preset   INTEGER NOT NULL DEFAULT 0 CHECK (preset IN (0, 1)),
  -- Spending categories only: the most the owner wants to spend on it in a month. Empty means no budget.
  budget   INTEGER CHECK (budget IS NULL OR budget > 0)
);

CREATE TABLE IF NOT EXISTS goals (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  saved_amount  INTEGER NOT NULL CHECK (saved_amount >= 0),
  target_date   TEXT NOT NULL,
  wallet_id     TEXT NOT NULL REFERENCES wallets (id),
  icon          TEXT NOT NULL,
  position      INTEGER NOT NULL,
  -- Where the "on pace" note measures from: the day the goal began (or some of its savings were last taken out),
  -- and what was saved then.
  pace_from     TEXT,
  pace_amount   INTEGER,
  -- When the goal last reached its target. Empty until it does.
  reached_at    TEXT
);

-- Every time what is saved for a goal changed: the goal's history. Deleting a wallet keeps the row
-- but forgets which wallet the money came from.
CREATE TABLE IF NOT EXISTS goal_movements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id        TEXT NOT NULL REFERENCES goals (id),
  at             TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('start', 'add', 'take-out', 'correction')),
  old_saved      INTEGER NOT NULL,
  new_saved      INTEGER NOT NULL,
  wallet_id      TEXT REFERENCES wallets (id) ON DELETE SET NULL,
  -- The transfer recorded with it, when the money came from another wallet.
  transaction_id TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount         INTEGER NOT NULL CHECK (amount > 0),
  date           TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  wallet_id      TEXT REFERENCES wallets (id),
  category_id    TEXT REFERENCES categories (id),
  from_wallet_id TEXT REFERENCES wallets (id),
  to_wallet_id   TEXT REFERENCES wallets (id),
  CHECK (
    (type = 'transfer'
      AND from_wallet_id IS NOT NULL AND to_wallet_id IS NOT NULL AND from_wallet_id <> to_wallet_id
      AND wallet_id IS NULL AND category_id IS NULL)
    OR
    (type <> 'transfer'
      AND wallet_id IS NOT NULL AND category_id IS NOT NULL
      AND from_wallet_id IS NULL AND to_wallet_id IS NULL)
  )
);

-- Each time the owner sets a balance by hand, the old and new balance are kept here: an investment's
-- market value ('value'), or a fix for a balance that drifted from the real account ('correction').
-- Neither is income or spending, so neither is a transaction.
-- (Tables are created only if missing, so adding one like this upgrades an existing database in place.)
CREATE TABLE IF NOT EXISTS wallet_value_updates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id   TEXT NOT NULL REFERENCES wallets (id),
  at          TEXT NOT NULL,
  old_balance INTEGER NOT NULL,
  new_balance INTEGER NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'value' CHECK (kind IN ('value', 'correction'))
);

CREATE INDEX IF NOT EXISTS transactions_by_date ON transactions (date);
`

function columnsOf(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((column) => column.name)
}

/**
 * A database made before categories had presets. The categories that match a preset are
 * marked as one (and take its name, so "Food & drinks" becomes "Food"), the presets it
 * doesn't have yet are added, and the presets go first, so it ends up looking like a new
 * database. Every other category is left exactly as it was, and is the owner's to change
 * or delete. All or nothing.
 */
function addPresetCategories(db: DatabaseSync) {
  db.exec("BEGIN")
  try {
    db.exec("ALTER TABLE categories ADD COLUMN preset INTEGER NOT NULL DEFAULT 0 CHECK (preset IN (0, 1))")
    const claim = db.prepare("UPDATE categories SET name = ?, preset = 1 WHERE id = ?")
    const add = db.prepare(
      "INSERT INTO categories (id, name, type, icon, color, position, preset) VALUES (?, ?, ?, ?, ?, 0, 1)"
    )
    for (const preset of presetCategories) {
      if (Number(claim.run(preset.name, preset.id).changes) === 0) {
        add.run(preset.id, preset.name, preset.type, preset.icon, preset.color)
      }
    }
    const setPosition = db.prepare("UPDATE categories SET position = ? WHERE id = ?")
    presetCategories.forEach((preset, position) => setPosition.run(position, preset.id))
    const others = db.prepare("SELECT id FROM categories WHERE preset = 0 ORDER BY position, rowid").all() as { id: string }[]
    others.forEach((row, index) => setPosition.run(presetCategories.length + index, row.id))
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

/**
 * CREATE TABLE IF NOT EXISTS leaves a table that already exists alone, so a
 * database made by an older version is missing any columns added since. Add
 * them here, keeping everything already saved.
 */
function addMissingColumns(db: DatabaseSync) {
  const wallets = columnsOf(db, "wallets")
  if (!wallets.includes("default_color")) {
    db.exec("ALTER TABLE wallets ADD COLUMN default_color TEXT")
    // Until now a wallet's colour was picked by the app, so that colour is its default.
    db.exec("UPDATE wallets SET default_color = color")
  }
  if (!wallets.includes("icon")) db.exec(`ALTER TABLE wallets ADD COLUMN icon TEXT ${ICON_CHECK}`)
  // Nobody has a nickname yet, so the new column simply starts empty.
  if (!wallets.includes("nickname")) db.exec(`ALTER TABLE wallets ADD COLUMN nickname TEXT ${NICKNAME_CHECK}`)
  // Nobody has a deposito yet, so the new columns simply start empty. Nothing else is touched.
  const depositColumns: [string, string][] = [
    ["deposit_rate_bp", "INTEGER CHECK (deposit_rate_bp IS NULL OR deposit_rate_bp > 0)"],
    ["deposit_start", "TEXT"],
    ["deposit_tenor", "INTEGER CHECK (deposit_tenor IS NULL OR deposit_tenor > 0)"],
    ["deposit_rollover", "INTEGER CHECK (deposit_rollover IS NULL OR deposit_rollover IN (0, 1))"],
    ["deposit_settled_at", "TEXT"],
    ["deposit_source_wallet_id", "TEXT REFERENCES wallets (id) ON DELETE SET NULL"],
  ]
  for (const [name, definition] of depositColumns) {
    if (!wallets.includes(name)) db.exec(`ALTER TABLE wallets ADD COLUMN ${name} ${definition}`)
  }
  // A deposito has no nickname (only Quick add reads one, and nothing can be recorded in a deposito). Any it was given goes.
  db.exec("UPDATE wallets SET nickname = NULL WHERE deposit_rate_bp IS NOT NULL AND nickname IS NOT NULL")
  if (!columnsOf(db, "wallet_value_updates").includes("kind")) {
    db.exec("ALTER TABLE wallet_value_updates ADD COLUMN kind TEXT NOT NULL DEFAULT 'value' CHECK (kind IN ('value', 'correction'))")
  }

  const goals = columnsOf(db, "goals")
  if (!goals.includes("pace_from")) {
    // All or nothing: the columns and what goes in them are added together.
    db.exec("BEGIN")
    try {
      db.exec("ALTER TABLE goals ADD COLUMN pace_from TEXT")
      db.exec("ALTER TABLE goals ADD COLUMN pace_amount INTEGER")
      // A goal made before this was recorded begins today, with what it holds today.
      db.prepare("UPDATE goals SET pace_from = ?, pace_amount = saved_amount").run(calendarDate(new Date()))
      db.exec("COMMIT")
    } catch (error) {
      db.exec("ROLLBACK")
      throw error
    }
  }
  if (!goals.includes("reached_at")) db.exec("ALTER TABLE goals ADD COLUMN reached_at TEXT")

  if (!columnsOf(db, "categories").includes("preset")) addPresetCategories(db)
  // Nobody has a budget yet, so the new column simply starts empty.
  if (!columnsOf(db, "categories").includes("budget")) {
    db.exec("ALTER TABLE categories ADD COLUMN budget INTEGER CHECK (budget IS NULL OR budget > 0)")
  }
  // Nobody has a budget for the whole month yet either, so this column also starts empty.
  if (!columnsOf(db, "app_user").includes("monthly_budget")) {
    db.exec("ALTER TABLE app_user ADD COLUMN monthly_budget INTEGER CHECK (monthly_budget IS NULL OR monthly_budget > 0)")
  }
}

export function openDatabase(path: string = DB_PATH): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec("PRAGMA foreign_keys = ON")
  db.exec("PRAGMA busy_timeout = 3000")
  // WAL keeps the file safe if the computer stops mid-write, and lets the app read while it writes.
  if (path !== ":memory:") db.exec("PRAGMA journal_mode = WAL")
  db.exec(SCHEMA)
  addMissingColumns(db)
  return db
}

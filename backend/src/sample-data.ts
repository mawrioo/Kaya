/**
 * Sample data for Kaya. It fills a brand-new database the first time the
 * backend starts, and again whenever the database is reset (npm run db:reset).
 * Covers 1 Jul – 28 Sep 2026. All amounts are whole rupiah.
 *
 * Consistency notes, so the screens built on it stay believable:
 * - Goal savings add up to what their wallets hold (Superbank: 18.5M + 6.35M).
 * - Salary lands in BCA on the 25th; spending money moves to Bank Jago the next day.
 */
import { presetCategories } from "./category-look.ts"
import type { Category, Goal, GoalMovementKind, Transaction, User, Wallet } from "./types.ts"

/** Letting the owner set their own name is a later step (see ROADMAP.md). */
export const sampleUser: User = { name: "Mario" }

/** A wallet's default colour is simply the colour it starts with, so the seed only needs the one. */
export const sampleWallets: Omit<Wallet, "defaultColor">[] = [
  {
    id: "wallet-bca",
    name: "BCA",
    kind: "bank",
    balance: 8_742_300,
    description: "Salary and monthly bills",
    color: "sky",
  },
  {
    id: "wallet-jago",
    name: "Bank Jago",
    kind: "digital-bank",
    balance: 2_315_500,
    description: "Everyday spending",
    color: "marigold",
  },
  {
    id: "wallet-superbank",
    name: "Superbank",
    kind: "digital-bank",
    balance: 24_850_000,
    description: "Savings for goals",
    color: "plum",
  },
  {
    id: "wallet-pluang",
    name: "Pluang",
    kind: "investment",
    balance: 15_430_000,
    description: "Long-term investing",
    color: "moss",
  },
]

/**
 * The presets that come with the app, then three categories of the owner's own, so
 * there is something to edit and delete and the sample transactions below still fit.
 */
export const sampleCategories: Category[] = [
  ...presetCategories,
  { id: "cat-groceries", name: "Groceries", type: "expense", icon: "shopping-basket", color: "sand", preset: false },
  { id: "cat-family", name: "Family & giving", type: "expense", icon: "heart-handshake", color: "sage", preset: false },
  { id: "cat-side-income", name: "Side income", type: "income", icon: "hand-coins", color: "teal", preset: false },
]

/** Oldest first. */
export const sampleTransactions: Transaction[] = [
  // July 2026
  { id: "tx-001", type: "expense", amount: 2_800_000, date: "2026-07-01T08:30:00+07:00", description: "Monthly rent", walletId: "wallet-bca", categoryId: "cat-home" },
  { id: "tx-002", type: "expense", amount: 385_000, date: "2026-07-03T20:15:00+07:00", description: "Internet and phone plan", walletId: "wallet-bca", categoryId: "cat-home" },
  { id: "tx-003", type: "expense", amount: 412_800, date: "2026-07-05T10:42:00+07:00", description: "Superindo weekly shop", walletId: "wallet-jago", categoryId: "cat-groceries" },
  { id: "tx-004", type: "expense", amount: 68_000, date: "2026-07-08T08:05:00+07:00", description: "Kopi Kenangan", walletId: "wallet-jago", categoryId: "cat-food" },
  { id: "tx-005", type: "expense", amount: 54_500, date: "2026-07-12T18:20:00+07:00", description: "Gojek to Kemang", walletId: "wallet-jago", categoryId: "cat-transport" },
  { id: "tx-006", type: "expense", amount: 275_000, date: "2026-07-14T07:10:00+07:00", description: "Gym membership", walletId: "wallet-jago", categoryId: "cat-health" },
  { id: "tx-007", type: "income", amount: 2_750_000, date: "2026-07-18T16:00:00+07:00", description: "Freelance: landing page design", walletId: "wallet-bca", categoryId: "cat-side-income" },
  { id: "tx-008", type: "expense", amount: 186_000, date: "2026-07-20T21:30:00+07:00", description: "Netflix and Spotify", walletId: "wallet-bca", categoryId: "cat-entertainment" },
  { id: "tx-009", type: "income", amount: 12_500_000, date: "2026-07-25T09:00:00+07:00", description: "July salary", walletId: "wallet-bca", categoryId: "cat-salary" },
  { id: "tx-010", type: "transfer", amount: 3_000_000, date: "2026-07-26T09:30:00+07:00", description: "Monthly spending budget", fromWalletId: "wallet-bca", toWalletId: "wallet-jago" },
  { id: "tx-011", type: "transfer", amount: 3_000_000, date: "2026-07-26T09:32:00+07:00", description: "Monthly savings", fromWalletId: "wallet-bca", toWalletId: "wallet-superbank" },
  { id: "tx-012", type: "expense", amount: 1_500_000, date: "2026-07-27T19:45:00+07:00", description: "Sent to Mum", walletId: "wallet-bca", categoryId: "cat-family" },
  { id: "tx-013", type: "expense", amount: 649_000, date: "2026-07-29T13:10:00+07:00", description: "Running shoes", walletId: "wallet-bca", categoryId: "cat-shopping" },
  { id: "tx-014", type: "income", amount: 171_250, date: "2026-07-31T23:59:00+07:00", description: "Savings interest", walletId: "wallet-superbank", categoryId: "cat-side-income" },

  // August 2026
  { id: "tx-015", type: "expense", amount: 2_800_000, date: "2026-08-01T08:30:00+07:00", description: "Monthly rent", walletId: "wallet-bca", categoryId: "cat-home" },
  { id: "tx-016", type: "expense", amount: 250_000, date: "2026-08-03T19:05:00+07:00", description: "PLN electricity token", walletId: "wallet-jago", categoryId: "cat-home" },
  { id: "tx-017", type: "expense", amount: 389_500, date: "2026-08-06T11:20:00+07:00", description: "Superindo weekly shop", walletId: "wallet-jago", categoryId: "cat-groceries" },
  { id: "tx-018", type: "expense", amount: 142_000, date: "2026-08-09T20:40:00+07:00", description: "Nasi Padang for two", walletId: "wallet-jago", categoryId: "cat-food" },
  { id: "tx-019", type: "expense", amount: 200_000, date: "2026-08-14T07:50:00+07:00", description: "Flazz card top-up", walletId: "wallet-jago", categoryId: "cat-transport" },
  { id: "tx-020", type: "expense", amount: 100_000, date: "2026-08-17T15:30:00+07:00", description: "Independence Day bazaar", walletId: "wallet-jago", categoryId: "cat-entertainment" },
  { id: "tx-021", type: "expense", amount: 1_249_000, date: "2026-08-23T14:25:00+07:00", description: "Desk lamp and chair cushion", walletId: "wallet-bca", categoryId: "cat-shopping" },
  { id: "tx-022", type: "income", amount: 12_500_000, date: "2026-08-25T09:00:00+07:00", description: "August salary", walletId: "wallet-bca", categoryId: "cat-salary" },
  { id: "tx-023", type: "transfer", amount: 3_000_000, date: "2026-08-26T09:30:00+07:00", description: "Monthly spending budget", fromWalletId: "wallet-bca", toWalletId: "wallet-jago" },
  { id: "tx-024", type: "transfer", amount: 3_000_000, date: "2026-08-26T09:32:00+07:00", description: "Monthly savings", fromWalletId: "wallet-bca", toWalletId: "wallet-superbank" },
  { id: "tx-025", type: "expense", amount: 1_500_000, date: "2026-08-27T19:45:00+07:00", description: "Sent to Mum", walletId: "wallet-bca", categoryId: "cat-family" },
  { id: "tx-026", type: "expense", amount: 185_000, date: "2026-08-30T17:15:00+07:00", description: "Pharmacy", walletId: "wallet-jago", categoryId: "cat-health" },
  { id: "tx-027", type: "income", amount: 186_400, date: "2026-08-31T23:59:00+07:00", description: "Savings interest", walletId: "wallet-superbank", categoryId: "cat-side-income" },

  // September 2026
  { id: "tx-028", type: "expense", amount: 2_800_000, date: "2026-09-01T08:30:00+07:00", description: "Monthly rent", walletId: "wallet-bca", categoryId: "cat-home" },
  { id: "tx-029", type: "expense", amount: 385_000, date: "2026-09-04T20:10:00+07:00", description: "Internet and phone plan", walletId: "wallet-bca", categoryId: "cat-home" },
  { id: "tx-030", type: "expense", amount: 456_200, date: "2026-09-07T10:15:00+07:00", description: "Superindo weekly shop", walletId: "wallet-jago", categoryId: "cat-groceries" },
  { id: "tx-031", type: "expense", amount: 89_000, date: "2026-09-10T12:30:00+07:00", description: "Lunch with the team", walletId: "wallet-jago", categoryId: "cat-food" },
  { id: "tx-032", type: "income", amount: 3_200_000, date: "2026-09-12T16:00:00+07:00", description: "Freelance: brand refresh", walletId: "wallet-bca", categoryId: "cat-side-income" },
  { id: "tx-033", type: "expense", amount: 46_000, date: "2026-09-15T18:45:00+07:00", description: "Grab home in the rain", walletId: "wallet-jago", categoryId: "cat-transport" },
  { id: "tx-034", type: "expense", amount: 150_000, date: "2026-09-19T19:00:00+07:00", description: "Cinema, two tickets", walletId: "wallet-jago", categoryId: "cat-entertainment" },
  { id: "tx-035", type: "expense", amount: 329_000, date: "2026-09-21T15:40:00+07:00", description: "Linen shirt", walletId: "wallet-jago", categoryId: "cat-shopping" },
  { id: "tx-036", type: "expense", amount: 275_000, date: "2026-09-23T07:10:00+07:00", description: "Gym membership", walletId: "wallet-jago", categoryId: "cat-health" },
  { id: "tx-037", type: "income", amount: 12_500_000, date: "2026-09-25T09:00:00+07:00", description: "September salary", walletId: "wallet-bca", categoryId: "cat-salary" },
  { id: "tx-038", type: "transfer", amount: 3_000_000, date: "2026-09-26T09:30:00+07:00", description: "Monthly spending budget", fromWalletId: "wallet-bca", toWalletId: "wallet-jago" },
  { id: "tx-039", type: "transfer", amount: 2_000_000, date: "2026-09-26T09:35:00+07:00", description: "Index fund top-up", fromWalletId: "wallet-bca", toWalletId: "wallet-pluang" },
  { id: "tx-040", type: "expense", amount: 1_500_000, date: "2026-09-27T19:45:00+07:00", description: "Sent to Mum", walletId: "wallet-bca", categoryId: "cat-family" },
  { id: "tx-041", type: "expense", amount: 215_000, date: "2026-09-28T19:40:00+07:00", description: "Sate and es teh dinner", walletId: "wallet-jago", categoryId: "cat-food" },
]

/**
 * All three goals began on 1 Jul 2026, with something already set aside, so on 30 Sep
 * their "on pace" notes show both kinds: the emergency fund is on pace, while the trip
 * and the house are a little behind.
 */
export const sampleGoals: Goal[] = [
  {
    id: "goal-emergency",
    name: "Emergency fund",
    targetAmount: 30_000_000,
    savedAmount: 18_500_000,
    targetDate: "2027-03-31",
    walletId: "wallet-superbank",
    icon: "umbrella",
    paceFrom: "2026-07-01",
    paceAmount: 12_000_000,
  },
  {
    id: "goal-japan",
    name: "Japan in spring",
    targetAmount: 25_000_000,
    savedAmount: 6_350_000,
    targetDate: "2027-04-05",
    walletId: "wallet-superbank",
    icon: "plane",
    paceFrom: "2026-07-01",
    paceAmount: 2_000_000,
  },
  {
    id: "goal-home",
    name: "Home down payment",
    targetAmount: 150_000_000,
    savedAmount: 15_430_000,
    targetDate: "2029-12-31",
    walletId: "wallet-pluang",
    icon: "key-round",
    paceFrom: "2026-07-01",
    paceAmount: 7_430_000,
  },
]

/** One row of a goal's history, as the seed writes it. */
export interface SampleGoalMovement {
  goalId: string
  at: string
  kind: GoalMovementKind
  oldSaved: number
  newSaved: number
  /** The wallet the money came from, and the transfer that recorded it, when there was one. */
  fromWalletId?: string
  transactionId?: string
}

/**
 * How each goal got to what it holds, oldest first. Every goal's last row ends on
 * its saved amount. The 26 Sep addition to the home down payment is the Index fund
 * top-up (tx-039), so one row of the history shows a transfer.
 */
export const sampleGoalMovements: SampleGoalMovement[] = [
  { goalId: "goal-emergency", at: "2026-07-01T09:00:00+07:00", kind: "start", oldSaved: 0, newSaved: 12_000_000 },
  { goalId: "goal-emergency", at: "2026-07-26T09:40:00+07:00", kind: "add", oldSaved: 12_000_000, newSaved: 14_500_000 },
  { goalId: "goal-emergency", at: "2026-08-26T09:40:00+07:00", kind: "add", oldSaved: 14_500_000, newSaved: 16_500_000 },
  { goalId: "goal-emergency", at: "2026-09-26T09:40:00+07:00", kind: "add", oldSaved: 16_500_000, newSaved: 18_500_000 },

  { goalId: "goal-japan", at: "2026-07-01T09:05:00+07:00", kind: "start", oldSaved: 0, newSaved: 2_000_000 },
  { goalId: "goal-japan", at: "2026-07-26T09:42:00+07:00", kind: "add", oldSaved: 2_000_000, newSaved: 3_500_000 },
  { goalId: "goal-japan", at: "2026-08-26T09:42:00+07:00", kind: "add", oldSaved: 3_500_000, newSaved: 5_000_000 },
  { goalId: "goal-japan", at: "2026-09-26T09:42:00+07:00", kind: "add", oldSaved: 5_000_000, newSaved: 6_350_000 },

  { goalId: "goal-home", at: "2026-07-01T09:10:00+07:00", kind: "start", oldSaved: 0, newSaved: 7_430_000 },
  { goalId: "goal-home", at: "2026-07-26T09:45:00+07:00", kind: "add", oldSaved: 7_430_000, newSaved: 10_430_000 },
  { goalId: "goal-home", at: "2026-08-26T09:45:00+07:00", kind: "add", oldSaved: 10_430_000, newSaved: 13_430_000 },
  {
    goalId: "goal-home",
    at: "2026-09-26T09:36:00+07:00",
    kind: "add",
    oldSaved: 13_430_000,
    newSaved: 15_430_000,
    fromWalletId: "wallet-bca",
    transactionId: "tx-039",
  },
]

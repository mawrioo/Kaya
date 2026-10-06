/**
 * What a category can look like, and the categories that come with the app.
 * Kept here (not in types.ts) because the database and the checks need the
 * actual lists, not just their types.
 */
import type { Category, CategoryType, IconName } from "./types.ts"

/** Every icon a category can wear. "tag" is the plain one a new category starts with. */
export const CATEGORY_ICONS: IconName[] = [
  "tag",
  "utensils",
  "coffee",
  "shopping-basket",
  "shopping-bag",
  "shirt",
  "bus",
  "car",
  "house",
  "receipt",
  "zap",
  "smartphone",
  "clapperboard",
  "gamepad-2",
  "heart-pulse",
  "dumbbell",
  "graduation-cap",
  "plane",
  "paw-print",
  "heart-handshake",
  "gift",
  "briefcase",
  "hand-coins",
  "circle-ellipsis",
]

/**
 * The presets: they come with every new database, and can't be changed or deleted.
 * They are listed in the order they are shown. "Bills" keeps the id "cat-home" from
 * when it was called "Home & bills", so transactions saved back then still belong to it.
 */
export const presetCategories: Category[] = [
  { id: "cat-food", name: "Food", type: "expense", icon: "utensils", color: "marigold", preset: true },
  { id: "cat-transport", name: "Transport", type: "expense", icon: "bus", color: "sky", preset: true },
  { id: "cat-home", name: "Bills", type: "expense", icon: "receipt", color: "ochre", preset: true },
  { id: "cat-shopping", name: "Shopping", type: "expense", icon: "shopping-bag", color: "plum", preset: true },
  { id: "cat-entertainment", name: "Entertainment", type: "expense", icon: "clapperboard", color: "rose", preset: true },
  { id: "cat-health", name: "Health", type: "expense", icon: "heart-pulse", color: "clay", preset: true },
  { id: "cat-other-expense", name: "Other", type: "expense", icon: "circle-ellipsis", color: "teal", preset: true },
  { id: "cat-salary", name: "Salary", type: "income", icon: "briefcase", color: "moss", preset: true },
  { id: "cat-bonus", name: "Bonus", type: "income", icon: "gift", color: "sky", preset: true },
  { id: "cat-other-income", name: "Other", type: "income", icon: "circle-ellipsis", color: "sand", preset: true },
]

/**
 * Where the transactions go when a category is deleted: "Other", for the same kind of
 * money. That is why "Other" can't be deleted itself.
 */
export const OTHER_CATEGORY_ID: Record<CategoryType, string> = {
  expense: "cat-other-expense",
  income: "cat-other-income",
}

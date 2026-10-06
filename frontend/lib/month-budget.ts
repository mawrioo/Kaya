/** What the budget for all spending in a month is called wherever it is listed. */
export const MONTH_BUDGET_NAME = "Whole month"

/** Where its name leads: all the spending of that month, so the list adds up to the number shown beside it. */
export const monthSpendingHref = (month: string) => `/transactions?type=expense&month=${month}`

import { budgetProgress, changeText, compareText } from "@/lib/category-summary"
import { formatDate, formatMonth, formatPercent, formatRupiah } from "@/lib/format"
import { goalProgress, sortGoals } from "@/lib/goals"
import { biggestExpenses, breakdown, savingsRate, spendingByWallet, type BreakdownRow } from "@/lib/insights"
import { MONTH_BUDGET_NAME } from "@/lib/month-budget"
import { monthlyNote } from "@/lib/monthly-note"
import { paletteClasses } from "@/lib/palette"
import { describeTransaction, monthKey, monthTotals, shiftMonth } from "@/lib/stats"
import type { Category, Goal, Transaction, Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

interface MonthReportProps {
  month: string
  /** Today, "2026-10-09", for "Prepared on" and for a month that is still going. */
  today: string
  userName: string
  transactions: Transaction[]
  categories: Category[]
  wallets: Wallet[]
  goals: Goal[]
  /** The budget for the whole month, or undefined when there isn't one. */
  monthlyBudget?: number
  /** The first month there is any data for: nothing is compared with a month before it. */
  firstMonth: string
}

/**
 * One month on one sheet of paper: what came in and went out, where the money went, how the budgets did, the biggest
 * expenses, and every transaction. It is drawn in the light colours whatever the theme is (the `paper` class), so what shows
 * on the screen is what comes out of the printer, and it never shows a wallet's balance. Everything here is worked out from
 * what is already on the screen: nothing is sent anywhere.
 */
export function MonthReport({ month, today, userName, transactions, categories, wallets, goals, monthlyBudget, firstMonth }: MonthReportProps) {
  const previousMonth = shiftMonth(month, -1)
  const comparing = previousMonth >= firstMonth
  const totals = monthTotals(transactions, month)
  const previous = comparing ? monthTotals(transactions, previousMonth) : undefined
  const compare = (amount: number, earlier?: number) => compareText(amount, earlier, previousMonth, month)
  const kept = savingsRate(totals.income, totals.spending)

  const inMonth = transactions
    .filter((tx) => monthKey(tx.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const spendingRows = breakdown(transactions, categories, "expense", month, comparing ? previousMonth : undefined)
  const incomeRows = breakdown(transactions, categories, "income", month, comparing ? previousMonth : undefined)
  const walletRows = spendingByWallet(transactions, wallets, month)
  const biggest = biggestExpenses(transactions, month)
  const note = monthlyNote({ transactions, categories, goals, monthlyBudget, month, today })
  const spentBy = new Map(spendingRows.map((row) => [row.category.id, row.amount]))
  const budgeted = categories.filter((category) => category.type === "expense" && category.budget !== undefined)
  const hasBudgets = monthlyBudget !== undefined || budgeted.length > 0
  const empty = totals.income === 0 && totals.spending === 0

  return (
    <article
      aria-label={`Monthly report, ${formatMonth(month)}`}
      className="paper mx-auto w-full max-w-[210mm] rounded-xl bg-card px-6 py-8 text-sm text-foreground shadow-md ring-1 ring-border [print-color-adjust:exact] sm:px-10 sm:py-11 print:max-w-none print:rounded-none print:bg-white print:p-0 print:shadow-none print:ring-0"
    >
      <header className="border-b pb-6">
        <div className="flex items-baseline justify-between gap-6">
          <p aria-hidden className="font-serif text-[1.375rem] font-semibold tracking-[0.04em]">
            Kaya
          </p>
          <p className="text-right text-muted-foreground">Prepared on {formatDate(today)}</p>
        </div>
        <h1 className="type-display mt-8">{formatMonth(month)}</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          Monthly report{userName ? ` for ${userName}` : ""}
          {monthKey(today) === month ? ", up to today" : ""}
        </p>
      </header>

      {empty ? (
        <p className="mt-10 text-base text-muted-foreground">Nothing came in or went out in {formatMonth(month)}.</p>
      ) : (
        <>
          <Section title="The month at a glance">
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border print:grid-cols-3 print:gap-0 print:divide-x print:divide-border">
              <Glance label="Earned" amount={formatRupiah(totals.income, { sign: "always" })} tone="positive" help={compare(totals.income, previous?.income)} />
              <Glance label="Spent" amount={formatRupiah(-totals.spending)} tone="negative" help={compare(totals.spending, previous?.spending)} />
              <Glance
                label="Left over"
                amount={formatRupiah(totals.net, { sign: "always" })}
                help={kept === undefined ? compare(totals.net, previous?.net) : `${formatPercent(Math.max(0, kept))} of what came in was kept.`}
              />
            </dl>
          </Section>

          {note.length > 0 ? (
            <Section title="In words">
              <div className="grid grid-cols-1 gap-5">
                {note.map((slide) => (
                  <div key={slide.id} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6 print:grid-cols-[9rem_minmax(0,1fr)] print:gap-6">
                    <p className="font-medium text-muted-foreground">{slide.title}</p>
                    <div className="grid gap-1.5 font-serif text-[1.0625rem] leading-relaxed">
                      {slide.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {spendingRows.length > 0 ? (
            <Section title="Where it went" allowBreak>
              <Table label="Spending by category" columns={[{ name: "Category" }, { name: "Transactions", right: true, fromSm: true }, { name: "Share" }, { name: "Amount", right: true }]}>
                {spendingRows.map((row) => (
                  <Row key={row.category.id}>
                    <td className="py-2.5 pr-3">
                      <CategoryName row={row} />
                      {row.previous !== undefined && changeText(row.amount, row.previous) ? (
                        <span className="mt-0.5 block pl-[1.125rem] text-muted-foreground">{againstText(row.amount, row.previous, previousMonth, month)}</span>
                      ) : null}
                    </td>
                    <td className={cn("py-2.5 pr-3 text-right whitespace-nowrap text-muted-foreground tabular-nums", FROM_SM)}>{row.count}</td>
                    <td className="py-2.5 pr-3">
                      <ShareBar share={row.share} />
                    </td>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap text-negative tabular-nums">{formatRupiah(-row.amount)}</td>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}

          {hasBudgets ? (
            <Section title="Budgets" allowBreak>
              <ul className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 print:grid-cols-2">
                {monthlyBudget !== undefined ? <BudgetLine key="month" name={MONTH_BUDGET_NAME} spent={totals.spending} budget={monthlyBudget} /> : null}
                {budgeted.map((category) => (
                  <BudgetLine key={category.id} name={category.name} spent={spentBy.get(category.id) ?? 0} budget={category.budget as number} />
                ))}
              </ul>
            </Section>
          ) : null}

          {incomeRows.length > 0 ? (
            <Section title="Where it came from">
              <Table label="Income by category" columns={[{ name: "Category" }, { name: "Transactions", right: true, fromSm: true }, { name: "Amount", right: true }]}>
                {incomeRows.map((row) => (
                  <Row key={row.category.id}>
                    <td className="py-2.5 pr-3">
                      <CategoryName row={row} />
                    </td>
                    <td className={cn("py-2.5 pr-3 text-right whitespace-nowrap text-muted-foreground tabular-nums", FROM_SM)}>{row.count}</td>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap text-positive tabular-nums">{formatRupiah(row.amount, { sign: "always" })}</td>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}

          {biggest.length > 0 ? (
            <Section title="The biggest expenses">
              <Table label="Biggest expenses" columns={[{ name: "Date" }, { name: "What" }, { name: "Wallet", fromSm: true }, { name: "Amount", right: true }]}>
                {biggest.map((tx) => {
                  const { title, categoryName, walletLabel } = describeTransaction(tx, wallets, categories)
                  return (
                    <Row key={tx.id}>
                      <td className="py-2.5 pr-3 align-top whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(tx.date)}</td>
                      <td className="py-2.5 pr-3 align-top wrap-anywhere">
                        {title}
                        <span className="block text-muted-foreground">
                          {categoryName}
                          <span className="sm:hidden"> · {walletLabel}</span>
                        </span>
                      </td>
                      <td className={cn("py-2.5 pr-3 align-top wrap-anywhere text-muted-foreground", FROM_SM)}>{walletLabel}</td>
                      <td className="py-2.5 text-right align-top font-medium whitespace-nowrap text-negative tabular-nums">{formatRupiah(-tx.amount)}</td>
                    </Row>
                  )
                })}
              </Table>
            </Section>
          ) : null}

          {walletRows.length > 0 ? (
            <Section title="Which wallets paid">
              <Table label="Spending by wallet" columns={[{ name: "Wallet" }, { name: "Transactions", right: true, fromSm: true }, { name: "Share" }, { name: "Amount", right: true }]}>
                {walletRows.map((row) => (
                  <Row key={row.wallet.id}>
                    <td className="py-2.5 pr-3 wrap-anywhere">{row.wallet.name}</td>
                    <td className={cn("py-2.5 pr-3 text-right whitespace-nowrap text-muted-foreground tabular-nums", FROM_SM)}>{row.count}</td>
                    <td className="py-2.5 pr-3">
                      <ShareBar share={row.share} />
                    </td>
                    <td className="py-2.5 text-right font-medium whitespace-nowrap text-negative tabular-nums">{formatRupiah(-row.amount)}</td>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}
        </>
      )}

      {goals.length > 0 ? (
        <Section title="Where the goals stand today">
          <ul className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2 print:grid-cols-2">
            {sortGoals(goals).map((goal) => {
              const progress = goalProgress(goal)
              return (
                <li key={goal.id} className="break-inside-avoid">
                  <p className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 font-medium wrap-anywhere">{goal.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">{progress.done ? "Reached" : formatPercent(progress.percent)}</span>
                  </p>
                  <Bar value={progress.fill} className={progress.done ? "bg-positive" : "bg-highlight"} />
                  <p className="mt-1.5 text-muted-foreground tabular-nums">
                    {formatRupiah(goal.savedAmount)} of {formatRupiah(goal.targetAmount)}
                  </p>
                </li>
              )
            })}
          </ul>
        </Section>
      ) : null}

      {inMonth.length > 0 ? (
        <Section title="Every transaction" allowBreak>
          <Table label="Every transaction" columns={[{ name: "Date" }, { name: "What" }, { name: "Wallet", fromSm: true }, { name: "Amount", right: true }]}>
            {inMonth.map((tx) => {
              const { title, categoryName, walletLabel } = describeTransaction(tx, wallets, categories)
              const amount =
                tx.type === "income"
                  ? { text: formatRupiah(tx.amount, { sign: "always" }), className: "text-positive" }
                  : tx.type === "expense"
                    ? { text: formatRupiah(-tx.amount), className: "text-negative" }
                    : { text: formatRupiah(tx.amount, { sign: "never" }), className: "text-muted-foreground" }
              return (
                <Row key={tx.id}>
                  <td className="py-2 pr-3 align-top whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(tx.date)}</td>
                  <td className="py-2 pr-3 align-top wrap-anywhere">
                    {title}
                    <span className="block text-muted-foreground">
                      {tx.description.trim() ? categoryName : null}
                      <span className="sm:hidden">
                        {tx.description.trim() ? " · " : null}
                        {walletLabel}
                      </span>
                    </span>
                  </td>
                  <td className={cn("py-2 pr-3 align-top wrap-anywhere text-muted-foreground", FROM_SM)}>{walletLabel}</td>
                  <td className={cn("py-2 text-right align-top font-medium whitespace-nowrap tabular-nums", amount.className)}>{amount.text}</td>
                </Row>
              )
            })}
          </Table>
          <p className="mt-3 text-muted-foreground">Transfers between your own wallets are listed without a sign: they are not income or spending.</p>
        </Section>
      ) : null}

      <footer className="mt-10 border-t pt-4 text-muted-foreground">Kaya runs on your own computer. These numbers were worked out here and sent nowhere.</footer>
    </article>
  )
}

/** "Rp 162.000 more than in August", "Same as in August". The year is named only when it is another one. */
function againstText(amount: number, earlier: number, previousMonth: string, month: string): string {
  return compareText(amount, earlier, previousMonth, month) ?? ""
}

function Section({ title, allowBreak, children }: { title: string; allowBreak?: boolean; children: React.ReactNode }) {
  return (
    <section className={cn("mt-9", !allowBreak && "break-inside-avoid")}>
      <h2 className="type-title mb-4 break-after-avoid">{title}</h2>
      {children}
    </section>
  )
}

function Glance({ label, amount, tone, help }: { label: string; amount: string; tone?: "positive" | "negative"; help?: string }) {
  return (
    <div className="sm:px-6 sm:first:pl-0 sm:last:pr-0 print:px-6 print:first:pl-0 print:last:pr-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("type-amount mt-1.5", tone === "positive" && "text-positive", tone === "negative" && "text-negative")}>{amount}</dd>
      {help ? <dd className="mt-1.5 text-muted-foreground">{help}</dd> : null}
    </div>
  )
}

/** A table with a quiet header row that repeats on every printed page, and a hairline between rows. */
interface Column {
  name: string
  /** Numbers line up on the right edge. */
  right?: boolean
  /** Left out on a phone, where the table has no room for it. (A printed page is always wide.) */
  fromSm?: boolean
}

/** What a cell needs to belong to a column that is left out on a phone. */
const FROM_SM = "hidden sm:table-cell"

function Table({ label, columns, children }: { label: string; columns: Column[]; children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-left" aria-label={label}>
      <thead className="table-header-group">
        <tr className="border-b text-muted-foreground">
          {columns.map((column) => (
            <th key={column.name} scope="col" className={cn("pr-3 pb-2 font-medium last:pr-0", column.right && "text-right", column.fromSm && FROM_SM)}>
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">{children}</tbody>
    </table>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <tr className="break-inside-avoid">{children}</tr>
}

function CategoryName({ row }: { row: BreakdownRow }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", paletteClasses[row.category.color].fill)} />
      <span className="min-w-0 wrap-anywhere">{row.category.name}</span>
    </span>
  )
}

function Bar({ value, className }: { value: number; className?: string }) {
  return (
    <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-track">
      <span className={cn("block h-full rounded-full", className ?? "bg-highlight")} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  )
}

function ShareBar({ share }: { share: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-track sm:block">
        <span className="block h-full rounded-full bg-cat-moss" style={{ width: `${Math.max(1, Math.min(100, share))}%` }} />
      </span>
      <span className="w-9 text-right whitespace-nowrap text-muted-foreground tabular-nums">{formatPercent(share)}</span>
    </span>
  )
}

function BudgetLine({ name, spent, budget }: { name: string; spent: number; budget: number }) {
  const progress = budgetProgress(spent, budget)
  return (
    <li className="break-inside-avoid">
      <p className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-medium wrap-anywhere">{name}</span>
        <span className={cn("shrink-0 tabular-nums", spent === 0 ? "text-muted-foreground" : "font-medium text-negative")}>{formatRupiah(-spent)}</span>
      </p>
      <Bar value={progress.fill} />
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-3 text-muted-foreground tabular-nums">
        <span>
          {formatPercent(progress.percent)} of {formatRupiah(budget)}
        </span>
        {progress.over > 0 ? (
          <span className="font-medium text-negative">{formatRupiah(progress.over)} over</span>
        ) : (
          <span>{progress.left === 0 ? "Nothing left" : `${formatRupiah(progress.left)} left`}</span>
        )}
      </p>
    </li>
  )
}

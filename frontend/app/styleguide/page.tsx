import type { Metadata } from "next"
import { ArrowDownLeft, PiggyBank, Plus, SlidersHorizontal, Wallet } from "lucide-react"

import { Money } from "@/components/money"
import { GoalRow } from "@/components/goal-row"
import { DelightDemo } from "@/components/delight/delight-demo"
import { CalendarArt } from "@/components/illustrations/calendar"
import { CelenganArt } from "@/components/illustrations/celengan"
import { LedgerArt } from "@/components/illustrations/ledger"
import { MagnifierArt } from "@/components/illustrations/magnifier"
import { TagArt } from "@/components/illustrations/tag"
import { WalletArt } from "@/components/illustrations/wallet"
import { PageHeader } from "@/components/page-header"
import { StatCard } from "@/components/stat-card"
import { TransactionRow } from "@/components/transaction-row"
import { Button } from "@/components/ui/button"
import { loadData } from "@/lib/api"
import { paletteClasses } from "@/lib/palette"
import { recentTransactions } from "@/lib/stats"
import { icons } from "@/lib/icons"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Style guide" }

const SWATCHES = [
  {
    group: "Surfaces",
    items: [
      { token: "background", fill: "bg-background", use: "Page" },
      { token: "card", fill: "bg-card", use: "Cards, pills" },
      { token: "muted", fill: "bg-muted", use: "Quiet fills" },
      { token: "sidebar", fill: "bg-sidebar", use: "Sidebar" },
    ],
  },
  {
    group: "Ink",
    items: [
      { token: "foreground", fill: "bg-foreground", use: "Text" },
      { token: "muted-foreground", fill: "bg-muted-foreground", use: "Secondary text" },
      { token: "primary", fill: "bg-primary", use: "Primary actions" },
    ],
  },
  {
    group: "Accents",
    items: [
      { token: "sage", fill: "bg-sage", use: "Icon badges" },
      { token: "sand", fill: "bg-sand", use: "Chips" },
      { token: "highlight", fill: "bg-highlight", use: "Progress, highlights" },
    ],
  },
  {
    group: "States and lines",
    items: [
      { token: "positive", fill: "bg-positive", use: "Helper lines, income" },
      { token: "negative", fill: "bg-negative", use: "Errors, overspending" },
      { token: "border", fill: "bg-border", use: "Hairlines" },
      { token: "track", fill: "bg-track", use: "Progress track" },
    ],
  },
]

const SEPTEMBER = "2026-09"

function totalFor(transactions: Transaction[], type: "income" | "expense", month: string) {
  return transactions
    .filter((tx) => tx.type === type && tx.date.startsWith(month))
    .reduce((sum, tx) => sum + tx.amount, 0)
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 first:mt-10">
      <h2 className="type-title">{title}</h2>
      {description ? <p className="mt-1.5 max-w-[62ch] text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default async function StyleguidePage() {
  const { categories, goals, transactions, wallets } = await loadData()
  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0)
  const saved = goals.reduce((sum, goal) => sum + goal.savedAmount, 0)
  const target = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)

  return (
    <>
      <PageHeader
        title="Style guide"
        description="Every piece of the KAYA theme in one place. Switch Appearance in the sidebar to check dark mode."
      />

      <Section title="Stat cards" description="Round icon badge, label, serif amount and one helper line.">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Wallet} label="Total balance" value={<Money amount={totalBalance} />} helper="Across 4 wallets" helperTone="muted" />
          <StatCard icon={ArrowDownLeft} label="Income in September" value={<Money amount={totalFor(transactions, "income", SEPTEMBER)} />} helper="Salary plus one freelance job" />
          <StatCard icon={SlidersHorizontal} label="Spent in September" value={<Money amount={totalFor(transactions, "expense", SEPTEMBER)} />} helper="Rent is the largest share" helperTone="muted" />
          <StatCard icon={PiggyBank} label="Saved toward goals" value={<Money amount={saved} />} helper={`${Math.round((saved / target) * 100)}% of the combined target`} />
        </div>
      </Section>

      <Section title="Goals and progress" description="Thin orange bars on a sand track, always with the percentage in text.">
        <div className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
          <ul className="divide-y">
            {goals.map((goal) => (
              <GoalRow key={goal.id} goal={goal} />
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Recent activity" description="Income green with +, spending clay with −, transfers neutral. Sans-serif tabular figures so amounts line up.">
        <div className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
          <ul className="divide-y">
            {recentTransactions(transactions, 5).map((tx) => (
              <TransactionRow key={tx.id} tx={tx} wallets={wallets} categories={categories} />
            ))}
          </ul>
        </div>
      </Section>

      <Section title="Color" description="Raw values and contrast ratios for both themes are in DESIGN.md.">
        <div className="grid gap-8 lg:grid-cols-2">
          {SWATCHES.map(({ group, items }) => (
            <div key={group}>
              <h3 className="text-sm font-medium text-muted-foreground">{group}</h3>
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {items.map((swatch) => (
                  <li key={swatch.token}>
                    <div className={cn("h-16 rounded-lg ring-1 ring-foreground/10 ring-inset", swatch.fill)} />
                    <p className="mt-2 text-sm font-medium">{swatch.token}</p>
                    <p className="text-xs text-muted-foreground">{swatch.use}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Category palette" description="Ten muted earth tones. Each clears 3:1 as a dot or chart mark in both themes.">
        <ul className="flex flex-wrap gap-2.5">
          {categories.map((category) => {
            const Icon = icons[category.icon]
            const palette = paletteClasses[category.color]
            return (
              <li key={category.id} className={cn("inline-flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2 text-sm font-medium", palette.soft)}>
                <span className={cn("grid size-6 place-items-center rounded-full bg-card", palette.icon)}>
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {category.name}
                <span className="text-xs font-normal text-muted-foreground">{category.color}</span>
              </li>
            )
          })}
        </ul>
      </Section>

      <Section title="Type" description="Source Serif 4 for headings and big numbers. Inter for everything you read or scan.">
        <dl className="divide-y rounded-xl border bg-card shadow-sm">
          {[
            { role: "type-display", spec: "Serif 44 / 36 mobile", sample: <span className="type-display">Good evening</span> },
            { role: "type-title", spec: "Serif 22, medium", sample: <span className="type-title">Emergency fund</span> },
            { role: "type-amount-hero", spec: "Serif 64 / 40 mobile", sample: <Money amount={totalBalance} className="type-amount-hero" /> },
            { role: "type-amount", spec: "Serif 28, medium", sample: <Money amount={12_500_000} className="type-amount" /> },
            { role: "text-base", spec: "Inter 16 / 1.5", sample: <span>Salary lands in BCA on the 25th, then spending money moves to Bank Jago.</span> },
            { role: "text-sm", spec: "Inter 14, labels and meta", sample: <span className="text-sm text-muted-foreground">28 Sep 2026 · Bank Jago · Food &amp; drinks</span> },
          ].map(({ role, spec, sample }) => (
            <div key={role} className="grid gap-2 px-5 py-5 md:grid-cols-[12rem_1fr] md:items-center md:gap-6">
              <dt>
                <p className="font-mono text-xs">{role}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{spec}</p>
              </dt>
              <dd className="min-w-0 overflow-hidden">{sample}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Controls" description="Buttons, chips and the date pill. Tab through to see the focus ring.">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Plus aria-hidden />
            Add transaction
          </Button>
          <Button variant="secondary">New goal</Button>
          <Button variant="outline">Export CSV</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Delete</Button>
          <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-sand-foreground">Placeholder</span>
          <span className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-medium text-sage-foreground">On track</span>
          <span className="inline-flex h-9 items-center rounded-full border bg-card px-4 text-sm font-medium shadow-xs">
            Tuesday, 29 Sep 2026
          </span>
        </div>
      </Section>

      <Section
        title="Drawings"
        description="Drawn for this app, not icons: a celengan (the clay piggy bank), a ledger, a magnifier, a wallet, a calendar page and a price tag. They stand in for empty lists and pages."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { name: "Celengan", art: <CelenganArt /> },
            { name: "Ledger", art: <LedgerArt /> },
            { name: "Magnifier", art: <MagnifierArt /> },
            { name: "Wallet", art: <WalletArt /> },
            { name: "Calendar", art: <CalendarArt /> },
            { name: "Tag", art: <TagArt /> },
          ].map(({ name, art }) => (
            <figure key={name} className="flex flex-col items-center rounded-xl border bg-card px-4 py-8 shadow-sm">
              {art}
              <figcaption className="mt-4 text-sm text-muted-foreground">{name}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section
        title="Delight"
        description="Coins are the recurring shape: a milled rim on round badges, a coin that drops into a goal's bar, a shower when a goal is reached. Digits pop when an amount changes. Everything stops for reduce motion."
      >
        <DelightDemo />
      </Section>
    </>
  )
}

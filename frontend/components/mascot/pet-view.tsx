"use client"

import { usePetStatus, useThisMonth } from "@/components/mascot/money-pet"
import { Pet } from "@/components/mascot/pet"
import { formatMonth, formatPercent, formatRupiah } from "@/lib/format"
import { petNextStep, type PetMood, type PetStatus } from "@/lib/mascot"
import { cn } from "@/lib/utils"

const STATES: { mood: PetMood; name: string; rule: string }[] = [
  { mood: "thriving", name: "Thriving", rule: "Kept a fifth or more" },
  { mood: "happy", name: "Happy", rule: "Kept something" },
  { mood: "okay", name: "Okay", rule: "No income yet, or even" },
  { mood: "wilting", name: "Wilting", rule: "Up to a fifth over" },
  { mood: "melted", name: "Melted", rule: "More than a fifth over" },
]

/** The pet's own page: the pet large, this month's numbers, what the next step up takes, and the five states. */
export function PetView() {
  const status = usePetStatus()
  const month = useThisMonth()

  return (
    <div className="mt-8 flex flex-col gap-6 md:mt-10">
      <section
        aria-label="How your pet is doing"
        className="pet-home grid grid-cols-1 items-center gap-6 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-[auto_1fr] md:gap-10 md:p-8"
      >
        {status ? (
          <Pet mood={status.mood} label={status.sentence} className="mx-auto w-56 md:w-72" />
        ) : (
          <span aria-hidden className="mx-auto block aspect-[200/172] w-56 md:w-72" />
        )}
        <div className="min-w-0 text-center md:text-left">
          <p className="text-sm font-medium text-muted-foreground">{month ? formatMonth(month) : " "}</p>
          <h2 className="type-display mt-1">{status?.title ?? " "}</h2>
          {status ? (
            <>
              <p className="mt-2 text-muted-foreground">{withoutPrefix(status.sentence)}</p>
              <p className="mt-4 inline-block rounded-full bg-sand px-3.5 py-1.5 text-sm font-medium text-sand-foreground">{nextStepLine(status)}</p>
            </>
          ) : null}
        </div>
      </section>

      {status ? (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Fact label="Came in" value={formatRupiah(status.income, { sign: status.income > 0 ? "always" : "auto" })} className="text-positive" />
          <Fact label="Went out" value={formatRupiah(-status.spending)} className={status.spending > 0 ? "text-negative" : undefined} />
          <Fact
            label="Kept"
            value={status.income > 0 ? formatPercent(((status.income - status.spending) / status.income) * 100) : "–"}
            hint={status.income > 0 ? "of what came in" : "no income yet"}
          />
        </dl>
      ) : null}

      <section aria-labelledby="pet-states" className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
        <h2 id="pet-states" className="type-title">
          The five states
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">From what you keep of this month&apos;s income. It starts again on the 1st.</p>
        <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STATES.map(({ mood, name, rule }) => {
            const now = status?.mood === mood
            return (
              <li
                key={mood}
                aria-current={now ? "true" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-lg border px-2 py-4 text-center",
                  now ? "border-highlight bg-highlight/8 ring-1 ring-highlight" : "bg-background/40"
                )}
              >
                <Pet mood={mood} className="w-24" />
                <span className="mt-2 text-sm font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">{rule}</span>
                {now ? <span className="mt-2 rounded-full bg-highlight px-2 py-0.5 text-xs font-medium text-highlight-foreground">Now</span> : null}
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function Fact({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("type-figure mt-1 tabular-nums", className)}>{value}</dd>
      {hint ? <dd className="mt-0.5 text-sm text-muted-foreground">{hint}</dd> : null}
    </div>
  )
}

/** "Your pet is happy: you've kept some of …" → "You've kept some of …" */
function withoutPrefix(sentence: string): string {
  const [, rest] = sentence.split(": ")
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : "This month so far."
}

function nextStepLine(status: PetStatus): string {
  const next = petNextStep(status)
  if (status.income <= 0) return "It waits for this month's first income."
  if (!next) return "It can't get any happier."
  const amount = formatRupiah(next.amount)
  switch (next.mood) {
    case "thriving":
      return `Keep ${amount} more and it's thriving.`
    case "happy":
      return "Keep anything at all and it's happy."
    case "okay":
      return `${amount} more coming in, or less going out, and it's okay again.`
    default:
      return `${amount} more coming in, or less going out, and it's only wilting.`
  }
}

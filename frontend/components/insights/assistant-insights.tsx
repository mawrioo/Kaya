"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUpRight, RefreshCw } from "lucide-react"
import { useData } from "@/components/data-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { askSpending, getRecurring, setRecurringPreference } from "@/lib/insights-assistant-api"
import { formatDate, formatRupiah } from "@/lib/format"
import type { SpendingAnswer, SubscriptionCandidate, SubscriptionPreference } from "@/lib/types"

export function AssistantInsights() {
  const { transactions, wallets, categories } = useData()
  const [question, setQuestion] = useState("")
  const [storedAnswer, setAnswer] = useState<{ value: SpendingAnswer; dataKey: string }>()
  const questionDataKey = useRef<string | undefined>(undefined)
  const [asking, setAsking] = useState(false)
  const [questionError, setQuestionError] = useState("")
  const askingRequest = useRef<AbortController | null>(null)
  const recurringRequest = useRef<AbortController | null>(null)
  const [candidates, setCandidates] = useState<SubscriptionCandidate[]>([])
  const [preferences, setPreferences] = useState<SubscriptionPreference[]>([])
  const [recurringError, setRecurringError] = useState("")
  const [recurringLoading, setRecurringLoading] = useState(true)
  const [changing, setChanging] = useState(false)
  const [recurringStatus, setRecurringStatus] = useState("")
  const dataKey = JSON.stringify({
    records: transactions.map(t => [t.id, t.type, t.date, t.amount, t.description, t.type === "transfer" ? [t.fromWalletId, t.toWalletId] : [t.walletId, t.categoryId]]),
    wallets: wallets.map(w => [w.id, w.name, w.nickname, w.kind]),
    categories: categories.map(c => [c.id, c.name, c.type]),
  })
  // Hide an older answer immediately; the timer announces why and clears its state.
  const answer = storedAnswer?.dataKey === dataKey ? storedAnswer.value : undefined
  useEffect(() => {
    if (questionDataKey.current && questionDataKey.current !== dataKey) {
      askingRequest.current?.abort()
      askingRequest.current = null
    }
    const timer = setTimeout(() => {
      if (!questionDataKey.current || questionDataKey.current === dataKey) return
      questionDataKey.current = undefined
      setAnswer(undefined)
      setAsking(false)
      setQuestionError("Records changed. Ask again to refresh the answer and its linked records.")
    }, 0)
    return () => clearTimeout(timer)
  }, [dataKey])

  const loadRecurring = useCallback(async () => {
    recurringRequest.current?.abort()
    const controller = new AbortController()
    recurringRequest.current = controller
    setRecurringLoading(true)
    setRecurringError("")
    try {
      const [rows, state] = await getRecurring(controller.signal)
      if (controller.signal.aborted || recurringRequest.current !== controller) return
      setCandidates(rows)
      setPreferences(state.subscriptions)
    } catch (error) {
      if (!controller.signal.aborted) setRecurringError(error instanceof Error ? error.message : "Could not check recurring payments.")
    } finally {
      if (recurringRequest.current === controller) { recurringRequest.current = null; setRecurringLoading(false) }
    }
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => { void loadRecurring() }, 0)
    return () => { clearTimeout(timer); recurringRequest.current?.abort() }
  }, [dataKey, loadRecurring])
  useEffect(() => () => { askingRequest.current?.abort(); recurringRequest.current?.abort() }, [])

  function stopQuestion() {
    questionDataKey.current = undefined
    askingRequest.current?.abort()
    askingRequest.current = null
    setAsking(false)
  }
  async function ask(text = question) {
    if (!text.trim() || askingRequest.current) return
    const controller = new AbortController()
    askingRequest.current = controller
    questionDataKey.current = dataKey
    setAsking(true)
    setAnswer(undefined)
    setQuestionError("")
    try {
      const result = await askSpending(text, controller.signal)
      if (!controller.signal.aborted && askingRequest.current === controller && questionDataKey.current === dataKey) setAnswer({ value: result, dataKey })
    } catch (error) {
      if (!controller.signal.aborted) setQuestionError(error instanceof Error ? error.message : "Could not answer that question.")
    } finally {
      if (askingRequest.current === controller) { askingRequest.current = null; setAsking(false) }
    }
  }
  async function changePreference(key: string, status: "tracked" | "dismissed" | "remove", name: string) {
    if (changing) return
    setChanging(true)
    setRecurringError("")
    try {
      await setRecurringPreference(key, status, name)
      setRecurringStatus(status === "tracked" ? `${name} is tracked. No future payment is recorded automatically.` : status === "dismissed" ? `${name} was dismissed.` : `${name}'s saved choice was removed.`)
      await loadRecurring()
    } catch (error) { setRecurringError(error instanceof Error ? error.message : "Could not save that choice.") }
    finally { setChanging(false) }
  }
  const active = candidates.filter(c => c.status !== "dismissed")
  const saved = preferences
  return <section aria-labelledby="assistant-insights-title" className="mt-8 grid gap-6 rounded-xl bg-card p-4 ring-1 ring-border sm:p-6">
    <div className="grid gap-3">
      <div className="grid gap-1">
        <h2 id="assistant-insights-title" className="type-title">Ask about your records</h2>
        <p className="max-w-prose text-sm text-muted-foreground">Spending and income totals, month comparisons, or your largest expenses. Every figure links to its records.</p>
      </div>
      <form className="grid gap-2" onSubmit={event => { event.preventDefault(); void ask() }}>
        <label htmlFor="spending-question" className="text-sm font-medium">Your spending question</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id="spending-question" maxLength={500} autoComplete="off" value={question} className="min-w-0 flex-1 bg-background" placeholder="How much did I spend on Food last month?" aria-describedby="spending-help" onChange={event => { stopQuestion(); setQuestion(event.target.value); setAnswer(undefined); setQuestionError("") }} />
          <Button type="submit" disabled={asking || !question.trim()}>{asking ? "Checking records..." : "Ask"}</Button>
          {asking ? <Button type="button" variant="ghost" onClick={() => { stopQuestion(); setQuestionError("Stopped. Your question is still here.") }}>Stop</Button> : null}
        </div>
        <p id="spending-help" className="text-sm text-muted-foreground">English or Indonesian. Try this month, last week, September 2026, or an exact date range.</p>
      </form>
      {questionError ? <p role="alert" className="text-sm text-muted-foreground">{questionError}</p> : null}
      {answer ? <div role="status" aria-live="polite" className="grid gap-3 rounded-lg bg-muted/40 p-3">
        <p className="text-sm">{answer.message}</p>
        {answer.parts.length ? <ul className="grid gap-3">{answer.parts.map((part, index) => <li key={`${part.href}-${index}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <a href={part.href} className="inline-flex max-w-full items-start gap-1 text-sm underline underline-offset-4 wrap-anywhere">{part.label.replace(/\b\d{4}-\d{2}-\d{2}\b/g, date => formatDate(date))}<ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0" /></a>
          <span className="text-sm tabular-nums">{formatRupiah(part.amount)} <span className="text-muted-foreground">({part.count} {part.count === 1 ? "entry" : "entries"})</span></span>
        </li>)}</ul> : null}
      </div> : null}
    </div>
    <details className="border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">Recurring payments{active.length ? ` (${active.length})` : ""}</summary>
      <div className="mt-3 grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="max-w-prose text-sm text-muted-foreground">Possible patterns from recorded expenses. Dates and amounts are estimates; a missing entry may simply not have been recorded.</p>
          <Button type="button" variant="ghost" size="sm" disabled={recurringLoading || changing} onClick={() => void loadRecurring()}><RefreshCw aria-hidden className="size-3.5" />Refresh</Button>
        </div>
        {recurringLoading ? <p role="status" className="text-sm text-muted-foreground">Checking recorded patterns...</p> : null}
        {recurringError ? <p role="alert" className="text-sm text-muted-foreground">{recurringError}</p> : null}
        {!recurringLoading && !active.length ? <p className="text-sm text-muted-foreground">No clear recurring pattern to review yet. At least three similar payments are needed.</p> : null}
        {active.length ? <ul className="grid divide-y divide-border">{active.map(item => {
          const evidence = transactions.filter(t => item.transactionIds.includes(t.id)).sort((a, b) => a.date.localeCompare(b.date))
          const params = new URLSearchParams({ type: "expense", wallet: item.walletId, ids: item.transactionIds.join(","), ...(evidence.length ? { from: evidence[0].date.slice(0, 10), to: evidence[evidence.length - 1].date.slice(0, 10) } : {}) })
          return <li key={item.key} className="grid gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-medium wrap-anywhere">{item.name}</span><span className="text-sm text-muted-foreground">{item.status === "tracked" ? "Tracked" : "Possible pattern"}</span></div>
            <p className="text-sm text-muted-foreground">{wallets.find(w => w.id === item.walletId)?.name ?? "Wallet"} / {item.cadence} / {item.variable ? "Amount varies; latest " : "Latest "}{formatRupiah(item.amount)} / Next estimate {formatDate(item.nextDate)}</p>
            <a href={`/transactions?${params}`} className="justify-self-start text-sm underline underline-offset-4">View {item.transactionIds.length} matching payments</a>
            <div className="flex flex-wrap gap-2">{item.status !== "tracked" ? <Button type="button" size="sm" variant="secondary" disabled={changing} onClick={() => void changePreference(item.key, "tracked", item.name)}>Track payment</Button> : null}<Button type="button" size="sm" variant="ghost" disabled={changing} onClick={() => void changePreference(item.key, "dismissed", item.name)}>Dismiss</Button></div>
          </li>
        })}</ul> : null}
        {saved.length ? <details><summary className="cursor-pointer text-sm underline underline-offset-4">Manage saved choices ({saved.length})</summary><ul className="mt-3 grid gap-2">{saved.map(item => <li key={item.key} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="wrap-anywhere">{item.name} / {item.status}</span><Button type="button" size="sm" variant="ghost" disabled={changing} onClick={() => void changePreference(item.key, "remove", item.name)}>Remove choice</Button></li>)}</ul></details> : null}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{recurringStatus}</p>
      </div>
    </details>
  </section>
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, X } from "lucide-react"
import { useData } from "@/components/data-provider"
import { remindersFor } from "@/lib/reminders"

export function QuietReminders({ today }: { today: string }) {
  const { wallets, goals } = useData()
  const [dismissed, setDismissed] = useState<string[]>([])
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem("kaya-reminders") ?? "[]")
        if (Array.isArray(saved)) setDismissed(saved.filter((id): id is string => typeof id === "string"))
      } catch { /* Storage is optional. */ }
    }, 0)
    return () => clearTimeout(timer)
  }, [])
  const reminders = remindersFor(wallets, goals, today).filter((item) => !dismissed.includes(item.id))
  if (reminders.length === 0) return null
  return (
    <section aria-labelledby="reminders-heading" className="rounded-xl border bg-card px-5 py-4 md:px-6">
      <h2 id="reminders-heading" className="font-serif text-xl">A little heads-up</h2>
      <ul className="mt-2 divide-y">
        {reminders.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2">
            <Link href={item.href} className="min-h-11 min-w-0 flex-1 rounded-md py-1 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex items-center gap-2 font-medium">{item.title}<ArrowUpRight className="size-4 shrink-0" aria-hidden /></span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{item.detail}</span>
            </Link>
            <button type="button" aria-label={`Dismiss ${item.title}`} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" onClick={() => {
              const next = [...dismissed, item.id]
              setDismissed(next)
              try { sessionStorage.setItem("kaya-reminders", JSON.stringify(next)) } catch { /* Storage is optional. */ }
            }}><X className="size-4" aria-hidden /></button>
          </li>
        ))}
      </ul>
    </section>
  )
}

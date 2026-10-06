import { Moon, Sun, Sunrise, Sunset } from "lucide-react"
import { connection } from "next/server"

import { UserName } from "@/components/user-name"
import { formatDate } from "@/lib/format"

interface PageHeaderProps {
  /** Page title. Leave it out on Home to greet the owner by time of day instead. */
  title?: string
  description?: string
}

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 18) return "Good afternoon"
  return "Good evening"
}

/** The sky outside, for the little glyph in the date pill. */
const SKY = { sunrise: Sunrise, sun: Sun, sunset: Sunset, moon: Moon }

function skyFor(hour: number): keyof typeof SKY {
  if (hour >= 5 && hour < 11) return "sunrise"
  if (hour >= 11 && hour < 17) return "sun"
  if (hour >= 17 && hour < 20) return "sunset"
  return "moon"
}

function toCalendarDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Serif page title with today's date in a pill. Rendered per request so the
 * greeting and date are always current (the app runs on the owner's machine,
 * so server time is local time).
 */
export async function PageHeader({ title, description }: PageHeaderProps) {
  await connection()
  const now = new Date()
  const Sky = SKY[skyFor(now.getHours())]

  return (
    <header className="flex flex-col-reverse gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
      <div className="min-w-0">
        <h1 className="type-display wrap-anywhere">
          {title ?? (
            <>
              {greetingFor(now.getHours())}, <UserName />
            </>
          )}
        </h1>
        {description ? <p className="mt-2 max-w-[60ch] text-muted-foreground">{description}</p> : null}
      </div>
      <time
        dateTime={toCalendarDate(now)}
        className="inline-flex h-9 w-fit shrink-0 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium whitespace-nowrap shadow-xs lg:mt-1.5"
      >
        <Sky className="size-4 text-highlight" aria-hidden />
        {formatDate(now, { weekday: true })}
      </time>
    </header>
  )
}

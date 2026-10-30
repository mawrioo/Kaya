import { Moon, Sun, Sunrise, Sunset } from "lucide-react"
import { connection } from "next/server"

import { RotatingGreeting } from "@/components/rotating-greeting"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/format"
import { dayPartFor } from "@/lib/greetings"

interface PageHeaderProps {
  /** Page title. Leave it out on Home to greet the owner by time of day instead. */
  title?: string
  description?: string
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
    <header className={cn("phone-page-header flex flex-col-reverse gap-2 md:gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8", !title && "phone-home-heading")}>
      <div className="min-w-0">
        {/* The phone greeting stays still and needs no reserved typing space. */}
        <h1 className={cn("type-display wrap-anywhere", !title && "text-wrap!")}>
          {title ?? <RotatingGreeting part={dayPartFor(now.getHours())} />}
        </h1>
        {description ? <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground md:mt-2 md:text-base">{description}</p> : null}
      </div>
      <time
        dateTime={toCalendarDate(now)}
        className={cn("hidden md:inline-flex", "h-7 md:h-9 w-fit shrink-0 items-center gap-2 rounded-full border bg-card px-4 text-sm font-medium whitespace-nowrap shadow-xs lg:mt-1.5")}
      >
        <Sky className="size-4 text-highlight" aria-hidden />
        <span className="md:hidden">{formatDate(now)}</span>
        <span className="hidden md:inline">{formatDate(now, { weekday: true })}</span>
      </time>
    </header>
  )
}

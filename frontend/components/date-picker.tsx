"use client"

import { useState } from "react"
import { CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { datePresets, fromDateInput, toDateInput } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** The look shared by every field: same height, border and white fill as the inputs and dropdowns. */
const triggerClasses =
  "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[invalid=true]:border-destructive data-[invalid=true]:ring-3 data-[invalid=true]:ring-destructive/20 dark:bg-card dark:hover:bg-muted"

interface DatePickerProps {
  id: string
  /** "2026-09-30", or "" when nothing is picked. */
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  describedBy?: string
  /** The earliest day that can be picked, "2026-09-30". Earlier days are greyed out. */
  min?: string
  /** What the button says while nothing is picked. */
  placeholder?: string
  /** Adds a "Clear date" button under the calendar, for a date that is optional. */
  clearable?: boolean
}

/** One date, shown like "30 Sep 2026", picked from a calendar. Weeks start on Monday. */
export function DatePicker({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  min,
  placeholder = "Pick a date",
  clearable,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = fromDateInput(value)
  const earliest = min ? fromDateInput(min) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          data-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          className={triggerClasses}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? formatDate(selected) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={selected}
          defaultMonth={selected ?? earliest}
          disabled={earliest ? { before: earliest } : undefined}
          weekStartsOn={1}
          onSelect={(date) => {
            onChange(toDateInput(date))
            setOpen(false)
          }}
        />
        {clearable ? (
          <div className="flex justify-end border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!value}
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              Clear date
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  /** "2026-09-01", or "" for no start. */
  from: string
  /** "2026-09-30", or "" for no end. */
  to: string
  onChange: (from: string, to: string) => void
  /** Today's date, "2026-09-30", which the quick ranges are worked out from. */
  today: string
  className?: string
}

/** A date range for filtering: click a first day, then a last day. Reads "All dates" until one is picked. */
export function DateRangePicker({ from, to, onChange, today, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const start = fromDateInput(from)
  const end = fromDateInput(to)

  const label = !start
    ? "All dates"
    : end
      ? `${formatDate(start)} – ${formatDate(end)}`
      : `From ${formatDate(start)}`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Date range: ${label}`} className={cn(triggerClasses, className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("truncate", !start && "text-muted-foreground")}>{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto gap-0 p-0" align="start">
        <div role="group" aria-label="Quick ranges" className="flex flex-wrap gap-2 border-b p-3">
          {datePresets(today).map((preset) => {
            const active = preset.from === from && preset.to === to
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChange(preset.from, preset.to)
                  setOpen(false)
                }}
                className={cn(
                  "h-8 rounded-full border px-3 text-sm font-medium transition-colors duration-150",
                  active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
        <div className="flex justify-center">
          <Calendar
            mode="range"
            selected={start ? { from: start, to: end } : undefined}
            defaultMonth={start}
            weekStartsOn={1}
            onSelect={(range) => onChange(range?.from ? toDateInput(range.from) : "", range?.to ? toDateInput(range.to) : "")}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!start}
            onClick={() => onChange("", "")}
          >
            Clear dates
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

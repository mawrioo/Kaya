"use client"

import { useRef, useState } from "react"
import { ChevronUp, Pencil, Sprout } from "lucide-react"

import { useData } from "@/components/data-provider"
import { SidebarBackup } from "@/components/sidebar-backup"
import { MENU_ROW } from "@/components/sidebar-menu-row"
import { ThemeToggle } from "@/components/theme-toggle"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/** The id of the row, so keyboard focus can come back to it when the name box closes. */
export const SIDEBAR_USER_ID = "sidebar-user-button"

/**
 * The only thing at the bottom of the sidebar: the owner's name on one row. Pressing it opens a small menu above it with
 * the things that are used now and then: Change name, Back up now, Light / Dark / Auto, and the calm line. A long name wraps
 * instead of being cut off. `onChangeName` opens the box for the name (the menu has closed by then), and `onBackupStart`
 * lets a phone's menu close before the backup message appears.
 */
export function SidebarUser({ onChangeName, onBackupStart }: { onChangeName: () => void; onBackupStart?: () => void }) {
  const { user } = useData()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  // The first letter (a whole character, so an emoji isn't cut in half).
  const initial = Array.from(user.name.trim())[0]?.toUpperCase() ?? ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type="button"
          id={SIDEBAR_USER_ID}
          className="group -mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-1 text-left outline-none transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring data-[state=open]:bg-sidebar-accent"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-foreground/15 text-sm font-semibold text-sidebar-accent-foreground"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] leading-snug font-medium break-words text-sidebar-foreground">{user.name}</span>
            <span className="block text-[0.8125rem] leading-snug text-sidebar-muted transition-colors duration-150 group-hover:text-sidebar-foreground">
              Settings
            </span>
          </span>
          <ChevronUp
            aria-hidden
            className="size-4 shrink-0 text-sidebar-muted transition-transform duration-200 group-hover:text-sidebar-accent-foreground group-data-[state=open]:rotate-180"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-(--radix-popover-trigger-width) min-w-60 gap-0 border-0 bg-sidebar p-2 text-sidebar-foreground shadow-lg ring-1 ring-sidebar-foreground/20"
      >
        <button
          type="button"
          className={MENU_ROW}
          onClick={() => {
            // Focus goes back to this row when the name box closes, so it is remembered before the menu goes.
            trigger.current?.focus({ preventScroll: true })
            setOpen(false)
            onChangeName()
          }}
        >
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-foreground/15 text-sidebar-accent-foreground">
            <Pencil className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] leading-snug font-medium text-sidebar-foreground">Change name</span>
            <span className="block text-[0.8125rem] leading-snug text-sidebar-muted transition-colors duration-150 group-hover:text-sidebar-foreground">
              Used in the greeting on Home
            </span>
          </span>
        </button>

        <SidebarBackup
          onStart={() => {
            setOpen(false)
            onBackupStart?.()
          }}
        />

        <div className="mt-2 border-t border-sidebar-border px-1 pt-3">
          <p className="mb-2 px-1 text-[0.8125rem] font-medium text-sidebar-muted">Appearance</p>
          <ThemeToggle />
        </div>

        <div className="group/calm mt-3 flex gap-3 border-t border-sidebar-border px-2 pt-3 pb-1 text-[0.8125rem] leading-relaxed text-sidebar-muted">
          <Sprout className="mt-0.5 size-4 shrink-0 group-hover/calm:animate-sprout-sway" aria-hidden />
          <p>Runs on this computer. Your numbers stay here.</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

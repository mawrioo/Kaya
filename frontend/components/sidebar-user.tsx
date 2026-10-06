"use client"

import { Pencil } from "lucide-react"

import { useData } from "@/components/data-provider"

/** The id of the row, so keyboard focus can come back to it when the box closes. */
export const SIDEBAR_USER_ID = "sidebar-user-button"

/**
 * The owner's name at the bottom of the sidebar, with "Change name" under it. Pressing it opens the box where the
 * name is changed. A long name wraps instead of being cut off.
 */
export function SidebarUser({ onOpen }: { onOpen: () => void }) {
  const { user } = useData()
  // The first letter (a whole character, so an emoji isn't cut in half).
  const initial = Array.from(user.name.trim())[0]?.toUpperCase() ?? ""

  return (
    <button
      type="button"
      id={SIDEBAR_USER_ID}
      onClick={onOpen}
      className="group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 text-left outline-none transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
          Change name
        </span>
      </span>
      <Pencil
        aria-hidden
        className="size-4 shrink-0 text-sidebar-muted transition-colors duration-150 group-hover:text-sidebar-accent-foreground"
      />
    </button>
  )
}

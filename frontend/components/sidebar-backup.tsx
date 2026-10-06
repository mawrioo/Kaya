"use client"

import { useState } from "react"
import { DatabaseBackup } from "lucide-react"
import { toast } from "sonner"

import { useData } from "@/components/data-provider"
import { errorMessage } from "@/lib/api"
import { formatBackupTime } from "@/lib/format"

/** The id of the row, so a test (or a person's keyboard) can find it. */
export const SIDEBAR_BACKUP_ID = "sidebar-backup-button"

/**
 * "Back up now", under the owner's name at the bottom of the sidebar, in the same shape as the name row: a round badge,
 * the words, and a small line saying when the last copy was made. Pressing it copies the data file into the backups
 * folder. It only ever happens when it is pressed. `onStart` lets a phone's menu close first, so the message that follows
 * isn't hidden behind it.
 */
export function SidebarBackup({ onStart }: { onStart?: () => void }) {
  const { lastBackup, backUp } = useData()
  const [busy, setBusy] = useState(false)

  async function backUpNow() {
    // A press while one is already running is ignored. (The button isn't disabled: a disabled button drops keyboard focus.)
    if (busy) return
    setBusy(true)
    onStart?.()
    try {
      const { backup, folder } = await backUp()
      toast.success("Backup saved", { description: `${backup.name} in ${folder}` })
    } catch (error) {
      toast.error("Couldn't back up", { description: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      id={SIDEBAR_BACKUP_ID}
      onClick={() => void backUpNow()}
      aria-busy={busy || undefined}
      className="group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-1 text-left outline-none transition-colors duration-150 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-foreground/15 text-sidebar-accent-foreground"
      >
        <DatabaseBackup className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] leading-snug font-medium text-sidebar-foreground">Back up now</span>
        <span className="block text-[0.8125rem] leading-snug text-sidebar-muted transition-colors duration-150 group-hover:text-sidebar-foreground">
          {busy ? "Backing up…" : lastBackup ? `Last backup: ${formatBackupTime(lastBackup.at)}` : "No backup yet"}
        </span>
      </span>
    </button>
  )
}

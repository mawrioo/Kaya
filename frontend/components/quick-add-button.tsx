"use client"

import { Plus } from "lucide-react"

import { useQuickAdd } from "@/components/quick-add-provider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function shortcutName() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "Cmd+K" : "Ctrl+K"
}

/** Presentation only: both placements open the same shared draft. */
export function QuickAddButton({ placement = "floating" }: { placement?: "floating" | "navigation" }) {
  const control = useQuickAdd()
  const button = (
    <button
      type="button"
      aria-label="Quick add"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      data-quick-add-trigger={placement}
      disabled={!control.ready}
      onClick={event => control.openFrom(event.currentTarget)}
      className={placement === "navigation" ? "mobile-quick-add" : "quick-add-control print-hidden group/coin fixed right-[max(1.5rem,env(safe-area-inset-right))] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-30 grid size-11 cursor-pointer place-items-center rounded-full shadow-md transition-[box-shadow,scale,translate] duration-200 hover:shadow-lg active:scale-[0.94] [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-[3px] disabled:cursor-default max-md:hidden"}
    >
      <span aria-hidden className={placement === "navigation" ? "mobile-quick-add-mark" : "coin-rim grid size-11 place-items-center rounded-full bg-[color-mix(in_oklch,var(--kaya-accent)_92%,var(--muted-foreground))] text-white dark:text-highlight-foreground"}>
        <Plus className={placement === "navigation" ? "size-[1.375rem]" : "size-5"} strokeWidth={placement === "navigation" ? 1.8 : 2.25} />
      </span>
    </button>
  )
  if (placement === "navigation") return button
  return (
    <Tooltip open={control.tipOpen} onOpenChange={control.changeTip}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="left" sideOffset={10}>
        Quick add <span className="text-background/70">{shortcutName()}</span>
      </TooltipContent>
    </Tooltip>
  )
}

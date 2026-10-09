"use client"

import { Menu } from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

/** The id of the button that opens the menu, so keyboard focus can come back to it when something opened from the menu closes. */
export const MENU_BUTTON_ID = "open-menu-button"

/** Below the md breakpoint the sidebar becomes a sheet; this bar opens it. */
export function MobileTopbar() {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <header className="print-hidden sticky top-0 z-20 flex h-16 items-center justify-between bg-sidebar px-4 text-sidebar-foreground md:hidden">
      <BrandMark />
      <Button
        id={MENU_BUTTON_ID}
        variant="ghost"
        size="icon-lg"
        aria-label="Open menu"
        aria-expanded={openMobile}
        onClick={() => setOpenMobile(true)}
        className="size-11 rounded-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0"
      >
        <Menu className="size-5" aria-hidden />
      </Button>
    </header>
  )
}

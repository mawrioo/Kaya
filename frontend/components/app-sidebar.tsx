"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { toast } from "sonner"

import { BrandMark } from "@/components/brand-mark"
import { useData } from "@/components/data-provider"
import { MENU_BUTTON_ID } from "@/components/mobile-topbar"
import { PinDialog } from "@/components/lock/pin-dialog"
import { NameDialog } from "@/components/name-dialog"
import { SidebarUser } from "@/components/sidebar-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useReturnFocus } from "@/hooks/use-return-focus"
import { errorMessage } from "@/lib/api"
import { isActivePath, mainNav } from "@/lib/navigation"

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed" && !isMobile
  const closeMobile = () => setOpenMobile(false)
  const { updateUserName } = useData()
  const [nameOpen, setNameOpen] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  // Where keyboard focus goes when the box for the name closes.
  const returnFocus = useReturnFocus()

  /** Opens the box for the name. On a phone the menu closes first, and focus goes back to the button that opened the menu. */
  function openNameBox() {
    returnFocus.remember()
    if (isMobile) returnFocus.redirect(document.getElementById(MENU_BUTTON_ID))
    closeMobile()
    setNameOpen(true)
  }

  /** Opens the box for the PIN the same way: a phone's menu closes first, and focus goes back to where it came from. */
  function openPinBox() {
    returnFocus.remember()
    if (isMobile) returnFocus.redirect(document.getElementById(MENU_BUTTON_ID))
    closeMobile()
    setPinOpen(true)
  }

  async function saveName(name: string) {
    try {
      const saved = await updateUserName(name)
      toast.success("Name saved", { description: saved.name })
    } catch (error) {
      toast.error("Couldn't save that", { description: errorMessage(error) })
      throw error // tells the box to stay open
    }
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-sidebar-border">
        <SidebarHeader className="flex-row items-center justify-between gap-2 px-4 pt-5 pb-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          <span className="pl-1.5 group-data-[collapsible=icon]:hidden">
            <BrandMark onNavigate={closeMobile} />
          </span>
          {/* Folds the menu down to icons, and opens it again. Only on a desktop: a phone's menu is a sheet. */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-sidebar-muted outline-none transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring max-md:hidden"
          >
            {collapsed ? <PanelLeftOpen className="size-[1.125rem]" aria-hidden /> : <PanelLeftClose className="size-[1.125rem]" aria-hidden />}
          </button>
        </SidebarHeader>

        <SidebarContent className="px-3 group-data-[collapsible=icon]:px-2">
          <nav aria-label="Main">
            <SidebarMenu className="gap-0.5">
              {mainNav.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                      className="h-11 gap-2.5 rounded-lg px-2.5 text-sm font-medium md:h-9 text-sidebar-foreground transition-[color,background-color,transform] duration-150 hover:bg-sidebar-accent active:scale-[0.985] hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:shadow-sm data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground [&_svg]:size-4"
                    >
                      <Link href={href} aria-current={active ? "page" : undefined} onClick={closeMobile}>
                        <Icon aria-hidden />
                        <span className="group-data-[collapsible=icon]:sr-only">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </nav>
        </SidebarContent>

        <SidebarFooter className="px-4 pb-4 group-data-[collapsible=icon]:px-2">
          <SidebarUser onChangeName={openNameBox} onBackupStart={closeMobile} onPinSettings={openPinBox} />
        </SidebarFooter>
      </Sidebar>
      <NameDialog open={nameOpen} onOpenChange={setNameOpen} onSave={saveName} onCloseAutoFocus={returnFocus.restore} />
      <PinDialog open={pinOpen} onOpenChange={setPinOpen} onCloseAutoFocus={returnFocus.restore} />
    </>
  )
}

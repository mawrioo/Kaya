"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sprout } from "lucide-react"
import { toast } from "sonner"

import { BrandMark } from "@/components/brand-mark"
import { useData } from "@/components/data-provider"
import { MENU_BUTTON_ID } from "@/components/mobile-topbar"
import { NameDialog } from "@/components/name-dialog"
import { SidebarBackup } from "@/components/sidebar-backup"
import { SidebarUser } from "@/components/sidebar-user"
import { ThemeToggle } from "@/components/theme-toggle"
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
  const { isMobile, setOpenMobile } = useSidebar()
  const closeMobile = () => setOpenMobile(false)
  const { updateUserName } = useData()
  const [nameOpen, setNameOpen] = useState(false)
  // Where keyboard focus goes when the box for the name closes.
  const returnFocus = useReturnFocus()

  /** Opens the box for the name. On a phone the menu closes first, and focus goes back to the button that opened the menu. */
  function openNameBox() {
    returnFocus.remember()
    if (isMobile) returnFocus.redirect(document.getElementById(MENU_BUTTON_ID))
    closeMobile()
    setNameOpen(true)
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
      <Sidebar className="border-sidebar-border">
        <SidebarHeader className="px-5 pt-7 pb-6">
          <BrandMark onNavigate={closeMobile} />
        </SidebarHeader>

        <SidebarContent className="px-3">
          <nav aria-label="Main">
            <SidebarMenu className="gap-1">
              {mainNav.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className="h-11 gap-3 rounded-lg px-3 text-[0.9375rem] font-medium text-sidebar-foreground transition-[color,background-color,transform] duration-150 hover:bg-sidebar-accent active:scale-[0.985] hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:shadow-sm data-active:hover:bg-sidebar-primary data-active:hover:text-sidebar-primary-foreground [&_svg]:size-[1.125rem]"
                    >
                      <Link href={href} aria-current={active ? "page" : undefined} onClick={closeMobile}>
                        <Icon aria-hidden />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </nav>
        </SidebarContent>

        <SidebarFooter className="gap-5 px-5 pb-6">
          <div className="flex flex-col gap-1">
            <SidebarUser onOpen={openNameBox} />
            <SidebarBackup onStart={closeMobile} />
          </div>
          <div className="group/calm flex gap-3 text-[0.8125rem] leading-relaxed text-sidebar-muted">
            <Sprout className="mt-0.5 size-4 shrink-0 group-hover/calm:animate-sprout-sway" aria-hidden />
            <p>
              Runs on this computer.
              <br />
              Your numbers stay here.
            </p>
          </div>
          <div className="border-t border-sidebar-border pt-5">
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>
      <NameDialog open={nameOpen} onOpenChange={setNameOpen} onSave={saveName} onCloseAutoFocus={returnFocus.restore} />
    </>
  )
}

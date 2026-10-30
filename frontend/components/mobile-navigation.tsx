"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu, Settings2, X } from "lucide-react"

import { MENU_BUTTON_ID } from "@/components/mobile-topbar"
import { QuickAddButton } from "@/components/quick-add-button"
import { SidebarSettings } from "@/components/sidebar-user"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useSidebar } from "@/components/ui/sidebar"
import { isActivePath, mainNav } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface Props {
  onChangeName: () => void
  onPinSettings: () => void
  onEntryPreferences: () => void
}

/** Four destinations around one shared Quick add action. */
export function MobileNavigation({ onChangeName, onPinSettings, onEntryPreferences }: Props) {
  const pathname = usePathname()
  const { openMobile, setOpenMobile } = useSidebar()
  const [settings, setSettings] = useState(false)
  const primary = mainNav.slice(0, 3)
  const inMore = !primary.some(item => isActivePath(pathname, item.href))
  const close = () => setOpenMobile(false)

  return (
    <>
      <nav aria-label="Phone navigation" className="mobile-navigation print-hidden">
        {primary.map(({ href, label, icon: Icon }, index) => (
          <Fragment key={href}>
            {index === 2 ? <QuickAddButton placement="navigation" /> : null}
            <Link href={href} aria-current={isActivePath(pathname, href) ? "page" : undefined} className="mobile-navigation-item" onClick={close}>
              <Icon aria-hidden />
              <span>{label}</span>
            </Link>
          </Fragment>
        ))}
        <button id={MENU_BUTTON_ID} type="button" className="mobile-navigation-item" data-active={inMore || openMobile} aria-label="More pages" aria-haspopup="dialog" aria-expanded={openMobile} onClick={() => { setSettings(false); setOpenMobile(true) }}>
          <Menu aria-hidden />
          <span>More</span>
        </button>
      </nav>
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="bottom" showCloseButton={false} className="mobile-more-panel gap-3 bg-sidebar p-4 text-sidebar-foreground" onOpenAutoFocus={event => {
          event.preventDefault()
          const panel = event.currentTarget as HTMLElement
          ;(panel.querySelector<HTMLElement>('[aria-current="page"]') ?? panel.querySelector<HTMLElement>("button, a"))?.focus({ preventScroll: true })
        }} onCloseAutoFocus={event => {
          event.preventDefault()
          document.getElementById(MENU_BUTTON_ID)?.focus({ preventScroll: true })
        }}>
          <SheetHeader className="flex-row items-center justify-between gap-2 p-0">
            <div className="flex items-center gap-1">
              {settings ? <button type="button" className="grid size-11 place-items-center rounded-lg hover:bg-sidebar-accent" aria-label="Back to More" onClick={() => { setSettings(false); requestAnimationFrame(() => document.getElementById("mobile-settings-button")?.focus()) }}><ArrowLeft className="size-4" aria-hidden /></button> : null}
              <SheetTitle className="font-sans text-base font-medium text-sidebar-foreground">{settings ? "Settings" : "More"}</SheetTitle>
            </div>
            <button type="button" aria-label="Close menu" onClick={close} className="grid size-11 place-items-center rounded-lg hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-sidebar-ring"><X className="size-5" aria-hidden /></button>
            <SheetDescription className="sr-only">{settings ? "Name, appearance, backups and entry preferences." : "Other Kaya pages and settings."}</SheetDescription>
          </SheetHeader>
          {settings ? <SidebarSettings onChangeName={onChangeName} onPinSettings={onPinSettings} onBackupStart={close} onEntryPreferences={onEntryPreferences} onClose={close} /> : (
            <>
              <nav aria-label="More pages" className="grid grid-cols-2 gap-1">
                {mainNav.slice(3).map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={close} aria-current={isActivePath(pathname, href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-medium hover:bg-sidebar-accent", isActivePath(pathname, href) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary")}><Icon className="size-[1.125rem] shrink-0" aria-hidden />{label}</Link>
                ))}
              </nav>
              <button id="mobile-settings-button" type="button" className="flex min-h-11 items-center gap-2.5 border-t border-sidebar-border px-3 pt-2 text-left text-sm hover:text-sidebar-primary" onClick={() => { setSettings(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Back to More"]')?.focus()) }}><Settings2 className="size-[1.125rem]" aria-hidden />Settings</button>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

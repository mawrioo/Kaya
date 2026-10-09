import type { Metadata, Viewport } from "next"
import { Inter, Source_Serif_4 } from "next/font/google"
import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { BalanceVisibilityProvider } from "@/components/balance-visibility"
import { CompareOptions } from "@/components/compare-options"
import { DataProvider } from "@/components/data-provider"
import { LockScreen } from "@/components/lock/lock-screen"
import { MobileTopbar } from "@/components/mobile-topbar"
import { MotionProvider } from "@/components/motion-provider"
import { QuickAddButton } from "@/components/quick-add-button"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HIDDEN_BALANCES_COOKIE, parseHiddenBalances } from "@/lib/balance-visibility"
import { LockedError, loadData } from "@/lib/api"
import { SESSION_COOKIE } from "@/lib/lock"
import type { AppData } from "@/lib/types"
import { cn } from "@/lib/utils"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

// Variable font with the optical-size axis: finer at display sizes, sturdier small.
const sourceSerif = Source_Serif_4({
  // The Home greeting rotates through many languages; these also cover Vietnamese, Turkish, Russian and Greek in the title's own font.
  subsets: ["latin", "latin-ext", "vietnamese", "cyrillic", "greek"],
  axes: ["opsz"],
  variable: "--font-source-serif",
})

export const metadata: Metadata = {
  title: {
    default: "Kaya",
    template: "%s · Kaya",
  },
  description: "A calm personal finance tracker that runs on your own computer.",
  // Added to an iPhone's home screen, it opens full screen like an app. The icon is app/apple-icon.png.
  appleWebApp: { capable: true, title: "Kaya", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  // Lets the page use the whole screen, so the bottom safe-area spacing (the home bar) is measured as it should be.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2E7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1712" },
  ],
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so hidden balances are drawn as dots from the first paint,
  // and so the page arrives with the owner's data already in it.
  const cookieStore = await cookies()
  // With a PIN set, the backend only sends the data to a device that has typed it, and this device proves it with its cookie.
  // Without that, the data never arrives, and the lock screen is all there is to draw.
  const session = cookieStore.get(SESSION_COOKIE)?.value
  let data: AppData | undefined
  try {
    data = await loadData(session ? `${SESSION_COOKIE}=${session}` : undefined)
  } catch (error) {
    if (!(error instanceof LockedError)) throw error
  }
  const hiddenBalances = parseHiddenBalances(cookieStore.get(HIDDEN_BALANCES_COOKIE)?.value)
  // The menu's open or collapsed state is kept in this cookie by the sidebar itself; it is open until it has been collapsed.
  const menuOpen = cookieStore.get("sidebar_state")?.value !== "false"

  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, sourceSerif.variable, "antialiased")}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {data ? (
            <>
              {/* The first stop for the keyboard: jumps past the menu to the page. It only shows while it has focus. */}
              <a
                href="#main-content"
                className="print-hidden sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-sidebar-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-sidebar-primary-foreground focus:shadow-md"
              >
                Skip to main content
              </a>
              <MotionProvider>
                <BalanceVisibilityProvider initialHidden={hiddenBalances}>
                  <DataProvider initial={data}>
                    <TooltipProvider delayDuration={400}>
                      {/* On desktop the menu is 224px wide and can fold down to icons with the button beside the name; below md it is a sheet opened from the top bar */}
                      <SidebarProvider defaultOpen={menuOpen} style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
                        <AppSidebar />
                        <SidebarInset id="main-content" tabIndex={-1} className="outline-none">
                          <MobileTopbar />
                          <div className="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 md:pt-10 md:pb-24 xl:px-12 print:max-w-none print:p-0">
                            {children}
                          </div>
                        </SidebarInset>
                        <QuickAddButton />
                        <CompareOptions />
                      </SidebarProvider>
                    </TooltipProvider>
                    {/* Messages come from the top right (the owner's pick, 8 Oct 2026). On a phone they start under the 64px top bar. */}
                    <Toaster
                      position="top-right"
                      offset={{ top: "calc(1.5rem + env(safe-area-inset-top))" }}
                      mobileOffset={{ top: "calc(4.5rem + env(safe-area-inset-top))" }}
                    />
                  </DataProvider>
                </BalanceVisibilityProvider>
              </MotionProvider>
            </>
          ) : (
            <LockScreen />
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}

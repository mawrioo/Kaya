import type { Metadata, Viewport } from "next"
import { Inter, Source_Serif_4 } from "next/font/google"
import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { BalanceVisibilityProvider } from "@/components/balance-visibility"
import { DataProvider } from "@/components/data-provider"
import { MobileTopbar } from "@/components/mobile-topbar"
import { MotionProvider } from "@/components/motion-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { HIDDEN_BALANCES_COOKIE, parseHiddenBalances } from "@/lib/balance-visibility"
import { loadData } from "@/lib/api"
import { cn } from "@/lib/utils"

import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

// Variable font with the optical-size axis: finer at display sizes, sturdier small.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-source-serif",
})

export const metadata: Metadata = {
  title: {
    default: "KAYA",
    template: "%s · KAYA",
  },
  description: "A calm personal finance tracker that runs on your own computer.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2E7" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1712" },
  ],
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so hidden balances are drawn as dots from the first paint,
  // and so the page arrives with the owner's data already in it.
  const [cookieStore, data] = await Promise.all([cookies(), loadData()])
  const hiddenBalances = parseHiddenBalances(cookieStore.get(HIDDEN_BALANCES_COOKIE)?.value)

  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, sourceSerif.variable, "antialiased")}>
      <body>
        {/* The first stop for the keyboard: jumps past the menu to the page. It only shows while it has focus. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-sidebar-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-sidebar-primary-foreground focus:shadow-md"
        >
          Skip to main content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <MotionProvider>
          <BalanceVisibilityProvider initialHidden={hiddenBalances}>
            <DataProvider initial={data}>
              <TooltipProvider delayDuration={400}>
                {/* Always open on desktop; below md the sidebar is a sheet opened from the top bar */}
                <SidebarProvider open>
                  <AppSidebar />
                  <SidebarInset id="main-content" tabIndex={-1} className="outline-none">
                    <MobileTopbar />
                    <div className="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 md:px-8 md:pt-10 xl:px-12">
                      {children}
                    </div>
                  </SidebarInset>
                </SidebarProvider>
              </TooltipProvider>
              <Toaster position="bottom-right" />
            </DataProvider>
          </BalanceVisibilityProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

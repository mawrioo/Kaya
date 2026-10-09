import { ArrowLeftRight, ChartColumn, House, PawPrint, Shapes, Target, Wallet, type LucideIcon } from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

/** The money pet's page. TEMPORARY: its link is hidden unless "Own page" is picked in Compare options. */
export const PET_HREF = "/pet"

export const mainNav: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/wallets", label: "Wallets", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/categories", label: "Categories", icon: Shapes },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: PET_HREF, label: "Pet", icon: PawPrint },
]

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { WalletsView } from "@/components/wallets/wallets-view"

export const metadata: Metadata = { title: "Wallets" }

export default function WalletsPage() {
  return (
    <>
      <PageHeader title="Wallets" description="Where your money lives, and what each account is for." />
      <WalletsView />
    </>
  )
}

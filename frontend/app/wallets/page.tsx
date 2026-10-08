import type { Metadata } from "next"
import { connection } from "next/server"

import { PageHeader } from "@/components/page-header"
import { WalletsView } from "@/components/wallets/wallets-view"

export const metadata: Metadata = { title: "Wallets" }

export default async function WalletsPage() {
  await connection()

  return (
    <>
      <PageHeader title="Wallets" description="Where your money lives, and what each account is for." />
      <WalletsView nowIso={new Date().toISOString()} />
    </>
  )
}

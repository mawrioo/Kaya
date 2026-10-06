import type { Metadata } from "next"
import { connection } from "next/server"

import { InsightsView } from "@/components/insights/insights-view"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Insights" }

export default async function InsightsPage() {
  await connection()

  return (
    <>
      <PageHeader title="Insights" description="Where your money went, month by month." />
      <InsightsView nowIso={new Date().toISOString()} />
    </>
  )
}

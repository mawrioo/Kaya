import type { Metadata } from "next"
import { connection } from "next/server"

import { AssistantInsights } from "@/components/insights/assistant-insights"
import { InsightsView } from "@/components/insights/insights-view"
import { MobileDetails } from "@/components/mobile-details"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Insights" }

export default async function InsightsPage() {
  await connection()

  return (
    <>
      <PageHeader title="Insights" description="Where your money went, month by month." />
      <MobileDetails label="Questions and recurring payments" className="mt-3 md:mt-0"><AssistantInsights /></MobileDetails>
      <InsightsView nowIso={new Date().toISOString()} />
    </>
  )
}

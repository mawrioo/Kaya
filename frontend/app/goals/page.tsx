import type { Metadata } from "next"
import { connection } from "next/server"

import { GoalsView } from "@/components/goals/goals-view"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Goals" }

export default async function GoalsPage() {
  await connection()

  return (
    <>
      <PageHeader title="Goals" description="What you’re saving toward, and how far along you are." />
      <GoalsView nowIso={new Date().toISOString()} />
    </>
  )
}

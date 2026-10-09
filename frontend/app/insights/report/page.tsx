import type { Metadata } from "next"
import { connection } from "next/server"

import { PageHeader } from "@/components/page-header"
import { ReportView } from "@/components/report/report-view"
import { isMonth } from "@/lib/dates"
import { formatMonth } from "@/lib/format"

const monthOf = (value: string | string[] | undefined) => (typeof value === "string" && isMonth(value) ? value : undefined)

// The browser offers the page's title as the name of a saved PDF, so it names the month.
export async function generateMetadata({ searchParams }: PageProps<"/insights/report">): Promise<Metadata> {
  const month = monthOf((await searchParams).month)
  return { title: month ? `Kaya report ${formatMonth(month)}` : "Monthly report" }
}

export default async function ReportPage({ searchParams }: PageProps<"/insights/report">) {
  await connection()
  const month = monthOf((await searchParams).month)

  return (
    <>
      <div className="print-hidden">
        <PageHeader title="Monthly report" description="One month on one sheet, ready to print or keep as a PDF." />
      </div>
      <div className="mt-8 md:mt-10 print:mt-0">
        <ReportView nowIso={new Date().toISOString()} month={month} />
      </div>
    </>
  )
}

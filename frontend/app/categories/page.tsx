import type { Metadata } from "next"
import { connection } from "next/server"

import { CategoriesView } from "@/components/categories/categories-view"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Categories" }

export default async function CategoriesPage() {
  await connection()

  return (
    <>
      <PageHeader title="Categories" description="How your income and spending are grouped." />
      <CategoriesView nowIso={new Date().toISOString()} />
    </>
  )
}

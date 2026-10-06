import { connection } from "next/server"

import { HomeContent } from "@/components/home/home-content"
import { PageHeader } from "@/components/page-header"

export default async function HomePage() {
  await connection()

  return (
    <>
      <PageHeader />
      <HomeContent nowIso={new Date().toISOString()} />
    </>
  )
}

import type { Metadata } from "next"

import { PetView } from "@/components/mascot/pet-view"
import { PageHeader } from "@/components/page-header"

export const metadata: Metadata = { title: "Pet" }

export default function PetPage() {
  return (
    <>
      <PageHeader title="Pet" description="How your pet is doing this month, from what you kept of what came in." />
      <PetView />
    </>
  )
}

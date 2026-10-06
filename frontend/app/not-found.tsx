import type { Metadata } from "next"
import Link from "next/link"
import { House } from "lucide-react"

import { MagnifierArt } from "@/components/illustrations/magnifier"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Page not found" }

/** Shown for an address that isn't a page of the app: the same header as every page, and the magnifier from the empty search. */
export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <div className="mt-8 flex flex-col items-center rounded-xl border bg-card px-6 py-12 text-center shadow-sm md:mt-10">
        <MagnifierArt className="w-48" />
        <h2 className="type-title mt-3">We can&apos;t find that page</h2>
        <p className="mt-2 max-w-[42ch] text-muted-foreground">
          The address may have a typo, or the page may have moved. Your money is where you left it.
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href="/">
              <House aria-hidden />
              Go to Home
            </Link>
          </Button>
        </div>
      </div>
    </>
  )
}

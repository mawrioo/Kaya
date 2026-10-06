"use client"

import { useData } from "@/components/data-provider"

/** The owner's name, read from the shared data so it can change without reloading the page. */
export function UserName() {
  return <>{useData().user.name}</>
}

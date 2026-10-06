"use client"

import { useState } from "react"

import { Money } from "@/components/money"
import { Button } from "@/components/ui/button"
import { coinShower } from "@/lib/celebrate"

/** The style guide's playground for the delight layer: press to see the digits pop, or to make it rain coins. */
export function DelightDemo() {
  const [amount, setAmount] = useState(8_742_300)

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <p className="type-amount">
        <Money amount={amount} roll />
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setAmount((value) => value + 1_250_000)}>
          Add Rp 1.250.000
        </Button>
        <Button variant="outline" onClick={() => setAmount(8_742_300)}>
          Reset
        </Button>
        <Button onClick={() => coinShower()}>Make it rain</Button>
      </div>
    </div>
  )
}

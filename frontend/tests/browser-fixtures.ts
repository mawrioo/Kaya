import { test as base, expect } from "@playwright/test"
export * from "@playwright/test"

// Each file has its own project/worker and starts from proven sample data, including after a failure.
export const test = base.extend<object, { sampleData: void }>({
  sampleData: [async ({}, use) => {
    const response = await fetch("http://127.0.0.1:4200/__test/reset", {
      method: "POST", headers: { authorization: process.env.KAYA_BROWSER_TOKEN! },
    })
    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.transactions).toHaveLength(41)
    expect(data.wallets.find((wallet: { id: string }) => wallet.id === "wallet-bca").balance).toBe(8_742_300)
    await use()
  }, { scope: "worker", auto: true }],
})

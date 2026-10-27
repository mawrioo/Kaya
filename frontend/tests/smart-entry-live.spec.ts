import { expect, test } from "./browser-fixtures"
import type { AppData } from "../lib/types"

// Opt in explicitly; normal browser runs must not require Ollama or load a model.
test.skip(process.env.KAYA_BROWSER_REAL_AI !== "1", "Set KAYA_BROWSER_REAL_AI=1 to run against the real local model.")

test("real local model prepares expense and income, and a transfer needs no inference", async ({ page, request }, info) => {
  test.setTimeout(150_000)
  const stats = async () => {
    const response = await fetch("http://127.0.0.1:4200/__test/model-stats", { headers: { authorization: process.env.KAYA_BROWSER_TOKEN! } })
    expect(response.ok).toBe(true)
    return response.json() as Promise<{ liveAI: boolean; model: string; modelTimings: number[] }>
  }
  const initial = await stats()
  expect(initial.liveAI).toBe(true)
  expect(initial.modelTimings).toHaveLength(0)
  const measurements: unknown[] = []
  const browserErrors: string[] = []
  page.on("pageerror", e => browserErrors.push(e.message))
  const cases = [
    { text: "paid for noodles from BCA yesterday", type: "expense", amount: 35000, category: "Food", source: "BCA", target: undefined, calls: 1 },
    { text: "gaji masuk Bank Jago hari ini", type: "income", amount: 5000000, category: "Salary", source: "Bank Jago", target: undefined, calls: 2 },
    { text: "transfer from BCA to Bank Jago", type: "transfer", amount: 500000, category: undefined, source: "BCA", target: "Bank Jago", calls: 2 },
  ] as const
  for (const fixture of cases) {
    const before: AppData = await (await request.get("/api/data")).json()
    await page.goto("/transactions")
    await expect(page.getByRole("button", { name: "Quick add", exact: true })).toBeEnabled()
    await page.keyboard.press("Control+k")
    await page.getByLabel("Your transaction").fill(fixture.text)
    const started = Date.now()
    await page.getByLabel("Your transaction").press("Enter")
    await expect(page.getByRole("heading", { name: "Review transaction" })).toBeVisible({ timeout: 35000 })
    const previewMs = Date.now() - started
    await expect(page.locator("#tx-question")).toContainText("How much")
    await expect(page.getByRole("button", { name: "Confirm and save" })).toBeDisabled()
    await page.getByLabel("Reply or correction").fill(String(fixture.amount))
    await page.getByLabel("Reply or correction").press("Enter")
    await expect(page.getByLabel("Reply or correction")).toHaveValue("")
    await expect(page.getByRole("button", { name: "Confirm and save" })).toBeEnabled()
    const observed = await stats()
    expect(observed.modelTimings).toHaveLength(fixture.calls)
    if (fixture.category) await expect(page.locator("#tx-category")).toContainText(fixture.category)
    await expect(page.locator("#tx-wallet")).toContainText(fixture.source)
    if (fixture.target) await expect(page.locator("#tx-to-wallet")).toContainText(fixture.target)
    const previewOnly: AppData = await (await request.get("/api/data")).json()
    expect(previewOnly.transactions).toEqual(before.transactions)
    expect(previewOnly.wallets).toEqual(before.wallets)
    await page.getByLabel("Note (optional)").fill(`Live model ${fixture.type} check`)
    await page.getByLabel("Reply or correction").fill(`make that ${fixture.amount}`)
    await page.getByLabel("Reply or correction").press("Enter")
    await expect(page.getByLabel("Reply or correction")).toHaveValue("")
    await expect(page.getByLabel("Note (optional)")).toHaveValue(`Live model ${fixture.type} check`)
    expect((await stats()).modelTimings).toHaveLength(fixture.calls)
    await page.getByRole("button", { name: "Confirm and save", exact: true }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
    const after: AppData = await (await request.get("/api/data")).json()
    expect(after.transactions).toHaveLength(before.transactions.length + 1)
    const transaction = after.transactions.find(t => t.description === `Live model ${fixture.type} check`)!
    expect(transaction).toMatchObject({ type: fixture.type, amount: fixture.amount })
    const balance = (data: AppData, name: string) => data.wallets.find(w => w.name === name)!.balance
    expect(balance(after, fixture.source) - balance(before, fixture.source)).toBe(fixture.type === "income" ? fixture.amount : -fixture.amount)
    if (fixture.target) expect(balance(after, fixture.target) - balance(before, fixture.target)).toBe(fixture.amount)
    await page.reload()
    const persisted: AppData = await (await request.get("/api/data")).json()
    expect(persisted.transactions.find(t => t.id === transaction.id)).toEqual(transaction)
    measurements.push({ type: fixture.type, previewMs, modelTimings: observed.modelTimings })
  }
  expect(browserErrors).toEqual([])
  console.log(`LIVE_MODEL_RESULTS ${JSON.stringify(measurements)}`)
  await info.attach("live-model-results", { body: JSON.stringify(measurements, null, 2), contentType: "application/json" })
})

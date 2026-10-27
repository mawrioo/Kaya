/** Real model + production preview service, synthetic data only. Never opens a database. */
import { readFile, writeFile } from "node:fs/promises"
import { previewTransaction, type PreviewContext } from "../../backend/src/transaction-preview.ts"
import { createPreviewModel } from "../../backend/src/preview-model.ts"

const context: PreviewContext = {
  wallets: [
    { id: "bca", name: "BCA", kind: "bank" },
    { id: "jago", name: "Bank Jago", nickname: "Jago", kind: "digital-bank" },
    { id: "cash", name: "Cash", kind: "cash" },
  ],
  categories: [
    { id: "food", name: "Food", type: "expense" },
    { id: "transport", name: "Transport", type: "expense" },
    { id: "bills", name: "Bills", type: "expense" },
    { id: "other-expense", name: "Other", type: "expense" },
    { id: "salary", name: "Salary", type: "income" },
    { id: "bonus", name: "Bonus", type: "income" },
    { id: "other-income", name: "Other", type: "income" },
  ], transactions: [],
}
const api = async (path: string, body?: unknown) => {
  const response = await fetch(`http://127.0.0.1:11434/api/${path}`, { ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Ollama status ${response.status}`)
  return response.json() as Promise<{ models?: unknown[] }>
}
const initial = await api("ps")
if (initial.models?.length) throw new Error("A model is already loaded. Avoid interfering with its session.")
const old = JSON.parse(await readFile(new URL("./results.json", import.meta.url), "utf8"))
const amounts = [35000, 25000, 20000, 15000, 250000, 5000000, 8000000, 500000, 1500000, 500000, 1000000, 200000, 100000, 50000, 10000000, 30000]
type Fixture = { input: string; expected: Record<string, unknown> }
const fixtures: Fixture[] = old.results.map((row: { input: string; expected: Record<string, unknown> }, index: number) => {
  if (row.expected.status !== "draft") return { input: row.input, expected: row.expected }
  const e = row.expected
  return { input: row.input, expected: {
    status: "ready", type: e.type, amount: amounts[index], walletId: e.walletId ?? "jago",
    ...(e.toWalletId ? { toWalletId: e.toWalletId } : {}),
    ...(e.categoryId ? { categoryId: e.categoryId } : {}),
    date: /yesterday|kemarin/.test(String(e.dateText)) ? "2026-10-26" : "2026-10-27",
  } }
})
// New paraphrases, frozen before the first combined-service run.
fixtures.push(
  { input: "spent 42k for coffee using Jago yesterday", expected: { status: "ready", type: "expense", amount: 42000, walletId: "jago", categoryId: "food", date: "2026-10-26" } },
  { input: "bayar listrik 125rb pakai BCA", expected: { status: "ready", type: "expense", amount: 125000, walletId: "bca", categoryId: "bills", date: "2026-10-27" } },
  { input: "received gaji 7,5jt into Bank Jago", expected: { status: "ready", type: "income", amount: 7500000, walletId: "jago", categoryId: "salary", date: "2026-10-27" } },
  { input: "pindahkan 250ribu dari Jago ke Cash kemarin", expected: { status: "ready", type: "transfer", amount: 250000, walletId: "jago", toWalletId: "cash", date: "2026-10-26" } },
  { input: "transfer to BCA 75k from Cash today", expected: { status: "ready", type: "transfer", amount: 75000, walletId: "cash", toWalletId: "bca", date: "2026-10-27" } },
  { input: "paid 18rb for lunch from BCA 2026-10-01", expected: { status: "ready", type: "expense", amount: 18000, walletId: "bca", categoryId: "food", date: "2026-10-01" } },
  { input: "paid 18rb lunch and 18rb dinner BCA", expected: { status: "clarify" } },
  { input: "move 300rb BCA Jago", expected: { status: "clarify" } },
  { input: "beli kopi 25rb pakai Mandiri", expected: { status: "clarify" } },
  { input: "paid 45rb from BCA last Friday", expected: { status: "clarify" } },
  { input: "paid 45rb from BCA 2026-02-30", expected: { status: "clarify" } },
  { input: "deposito baru 10jt BCA", expected: { status: "unsupported" } },
)
const model = createPreviewModel({ enabled: true })
let modelCalls = 0
const results: unknown[] = []
try {
  for (const [index, fixture] of fixtures.entries()) {
    const start = performance.now()
    const before = modelCalls
    try {
      const result = await previewTransaction({ text: fixture.input, defaultWalletId: "jago" }, context, async (input, signal) => { modelCalls++; return model(input, signal) }, { now: new Date("2026-10-27T12:00:00+07:00") })
      const actual = { status: result.status, ...result.draft }
      const mismatches = Object.entries(fixture.expected).filter(([key, value]) => actual[key as keyof typeof actual] !== value).map(([key]) => key)
      const row = { input: fixture.input, set: index < 30 ? "original" : "held-out", expected: fixture.expected, actual: result, mismatches, pass: !mismatches.length, modelUsed: modelCalls > before, elapsedMs: Math.round(performance.now() - start) }
      results.push(row)
      console.log(JSON.stringify(row))
    } catch (error) {
      const row = { input: fixture.input, error: String(error), pass: false }
      results.push(row)
      console.log(JSON.stringify(row))
      break
    }
  }
} finally {
  if (modelCalls) await api("generate", { model: "qwen3.5:2b", keep_alive: 0 })
  await writeFile(new URL("./preview-results.json", import.meta.url), JSON.stringify({ evaluatedOn: "2026-10-27", version: await api("version"), modelCalls, results, finalModels: await api("ps") }, null, 2) + "\n")
}

import type { AssistantData, SpendingAnswer, SubscriptionCandidate } from "@/lib/types"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { "content-type": "application/json", ...init?.headers } })
  const data = await response.json().catch(() => undefined)
  if (response.status === 401 && data?.locked) {
    window.location.reload()
    return new Promise<never>(() => {})
  }
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Could not reach the assistant. Try again when Kaya is connected.")
  return data as T
}
export const askSpending = (text: string, signal: AbortSignal) => request<SpendingAnswer>("/api/assistant/questions", { method: "POST", body: JSON.stringify({ text }), signal })
export const getRecurring = (signal: AbortSignal) => Promise.all([
  request<SubscriptionCandidate[]>("/api/assistant/subscriptions", { signal }),
  request<AssistantData>("/api/assistant", { signal }),
])
export const setRecurringPreference = (key: string, status: "tracked" | "dismissed" | "remove", name: string) => request<unknown>("/api/assistant/subscriptions", { method: "PUT", body: JSON.stringify({ key, status, name }) })

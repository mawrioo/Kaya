import { expect, test, type BrowserContext, type Page } from "./browser-fixtures"
import type { AppData } from "../lib/types"

// The PIN lock, in order, on one shared in-memory database. Whatever happens, the PIN is turned off again at the end,
// so the files that run after this one (which know nothing about a PIN) find the app open.
test.describe.configure({ mode: "serial" })

// Contexts made by hand don't get the configured address, so it is given to them.
const BASE = "http://localhost:3200"
const PIN = "4821"
const NEW_PIN = "90210"

// One browser window for the whole file: it types the PIN once, and the cookie it is given stays for the tests that follow.
let context: BrowserContext
let page: Page
const errors: string[] = []

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ baseURL: BASE })
  page = await context.newPage()
  page.on("pageerror", (error) => errors.push(error.message))
})

test.afterAll(async ({ request }) => {
  await context.close()
  for (const currentPin of [NEW_PIN, PIN]) await request.delete("/api/auth/pin", { data: { currentPin } })
})

const account = (on: Page) => on.getByRole("button", { name: /Mario/ })
const lockScreen = (on: Page) => on.getByRole("heading", { name: "Kaya is locked" })

async function unlockWith(on: Page, pin: string) {
  await on.locator("#lock-pin").fill(pin)
  await on.getByRole("button", { name: "Unlock" }).click()
}

test("a PIN is set from the menu at the bottom of the sidebar; a mismatch is explained and nothing is turned on", async ({ request }) => {
  expect(((await (await request.get("/api/data")).json()) as AppData).pinSet).toBe(false)

  await page.goto("/")
  await account(page).click()
  await page.locator("#sidebar-pin-button").click()
  const dialog = page.getByRole("dialog", { name: "Set a PIN" })
  await expect(dialog).toBeVisible()

  await dialog.locator("#pin-new").fill("12")
  await dialog.locator("#pin-repeat").fill("12")
  await dialog.getByRole("button", { name: "Turn on PIN lock" }).click()
  await expect(dialog.locator("#pin-new-error")).toHaveText("Use 4 to 8 digits.")
  await expect(dialog.locator("#pin-new")).toBeFocused()

  await dialog.locator("#pin-new").fill(PIN)
  await dialog.locator("#pin-repeat").fill("4822")
  await dialog.getByRole("button", { name: "Turn on PIN lock" }).click()
  await expect(dialog.getByText("The two PINs don't match.")).toBeVisible()
  expect(((await (await request.get("/api/data")).json()) as AppData).pinSet).toBe(false)

  await dialog.locator("#pin-repeat").fill(PIN)
  await dialog.getByRole("button", { name: "Turn on PIN lock" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText("PIN lock is on")).toBeVisible()
  expect(errors).toEqual([])
})

test("this device stays open after setting it, with an HttpOnly cookie, while every other one is locked out of the page and the data", async ({ browser, request }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Home" }).first()).toBeVisible()
  const cookies = await page.context().cookies()
  expect(cookies.find((cookie) => cookie.name === "kaya_session")).toMatchObject({ httpOnly: true, path: "/", sameSite: "Lax" })

  // A request with no cookie (another device, another browser) is refused for the data...
  expect((await request.get("/api/data")).status()).toBe(401)
  expect(await (await request.get("/api/auth/status")).json()).toEqual({ pinSet: true, unlocked: false })
  // ...and a page opened without it holds none of the data.
  const other = await browser.newContext({ baseURL: BASE })
  const otherPage = await other.newPage()
  await otherPage.goto("/transactions?wallet=wallet-bca")
  await expect(lockScreen(otherPage)).toBeVisible()
  const html = await otherPage.content()
  for (const secret of ["Superbank", "Mario", "Sate and es teh dinner", "8.742.300", "12.500.000"]) expect(html).not.toContain(secret)
  await other.close()
})

test("Lock Kaya shows the lock screen; a wrong PIN shakes and says how many tries are left; the right one opens the same page", async () => {
  await page.goto("/wallets")
  await account(page).click()
  await page.locator("#sidebar-lock-button").click()
  await expect(lockScreen(page)).toBeVisible()
  await expect(page.locator("#lock-pin")).toBeFocused()

  // Dots fill as digits are typed, and the button waits for four.
  const unlock = page.getByRole("button", { name: "Unlock" })
  await expect(unlock).toBeDisabled()
  await page.locator("#lock-pin").fill("12")
  await expect(page.locator("[data-filled]")).toHaveCount(2)
  await expect(unlock).toBeDisabled()
  await page.locator("#lock-pin").fill("0000")
  await expect(unlock).toBeEnabled()

  await unlock.click()
  // (By id: Next draws its own role="alert" for announcing page changes, so the role alone would find two.)
  await expect(page.locator("#lock-pin-error")).toContainText("That PIN isn't right. 4 tries left")
  await expect(page.locator("#lock-pin")).toHaveValue("")
  await expect(page.locator(".animate-lock-shake")).toHaveCount(1)
  await expect(page.locator("#lock-pin")).toBeFocused()

  // Letters and pasted junk never get in.
  await page.locator("#lock-pin").pressSequentially("4a8b2c1d99999999")
  await expect(page.locator("#lock-pin")).toHaveValue("48219999")

  await page.locator("#lock-pin").fill(PIN)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("heading", { name: "Wallets", exact: true, level: 1 })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe("/wallets")
  expect(errors).toEqual([])
})

test("too many wrong tries make it wait, with a countdown, and the box is off until the wait is over (the server's answer is faked, so there is nothing to wait for)", async () => {
  await page.goto("/")
  await account(page).click()
  await page.locator("#sidebar-lock-button").click()
  await expect(lockScreen(page)).toBeVisible()

  await page.route("**/api/auth/unlock", (route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "Too many tries. Wait 3 seconds, then try again.", retryAfterSeconds: 3 }) })
  )
  await page.locator("#lock-pin").fill("0000")
  await page.getByRole("button", { name: "Unlock" }).click()
  await expect(page.getByRole("status")).toContainText("Too many tries.")
  await expect(page.getByRole("status")).toContainText("Try again in")
  await expect(page.locator("#lock-pin")).toBeDisabled()
  await expect(page.getByRole("button", { name: "Unlock" })).toBeDisabled()

  // When the wait is over the box comes back, ready for the next try.
  await expect(page.locator("#lock-pin")).toBeEnabled({ timeout: 8000 })
  await expect(page.getByRole("status")).toHaveCount(0)
  await page.unroute("**/api/auth/unlock")
  await unlockWith(page, PIN)
  await expect(page.getByRole("link", { name: "Transactions" }).first()).toBeVisible()
})

test("the real server counts wrong tries, and starts the wait on the fifth", async ({ request }) => {
  // Four wrong tries here, then the right one clears the count (so the next test starts fresh).
  for (const left of [4, 3, 2, 1]) {
    const wrong = await request.post("/api/auth/unlock", { data: { pin: "0000" } })
    expect(wrong.status()).toBe(401)
    expect(((await wrong.json()) as { error: string }).error).toContain(`${left} ${left === 1 ? "try" : "tries"} left`)
  }
  expect((await request.post("/api/auth/unlock", { data: { pin: PIN } })).status()).toBe(200)
  const wrong = await request.post("/api/auth/unlock", { data: { pin: "0000" } })
  expect(((await wrong.json()) as { error: string }).error).toContain("4 tries left")
  await request.post("/api/auth/unlock", { data: { pin: PIN } })
})

test("PIN settings: lock now, a wrong current PIN is refused in words, change it, and the old one stops working", async ({ request }) => {
  await page.goto("/")
  await account(page).click()
  await page.locator("#sidebar-pin-button").click()
  const menu = page.getByRole("dialog", { name: "PIN lock is on" })
  await expect(menu.getByRole("button", { name: /Lock now/ })).toBeVisible()
  await menu.getByRole("button", { name: /Change PIN/ }).click()

  const dialog = page.getByRole("dialog", { name: "Change PIN" })
  await dialog.locator("#pin-current").fill("1111")
  await dialog.locator("#pin-new").fill(NEW_PIN)
  await dialog.locator("#pin-repeat").fill(NEW_PIN)
  await dialog.getByRole("button", { name: "Change PIN" }).click()
  await expect(dialog.getByText("That PIN isn't right")).toBeVisible()
  await expect(dialog.locator("#pin-current")).toBeFocused()

  await dialog.locator("#pin-current").fill(PIN)
  await dialog.getByRole("button", { name: "Change PIN" }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText("PIN changed")).toBeVisible()

  // This device stays in; the old PIN no longer opens anything.
  await page.reload()
  await expect(page.getByRole("link", { name: "Insights" }).first()).toBeVisible()
  expect((await request.post("/api/auth/unlock", { data: { pin: PIN } })).status()).toBe(401)
  expect((await request.post("/api/auth/unlock", { data: { pin: NEW_PIN } })).status()).toBe(200)
})

test("turning the PIN off needs it, and then the app opens for everybody", async ({ browser, request }) => {
  await page.goto("/")
  await account(page).click()
  await page.locator("#sidebar-pin-button").click()
  await page.getByRole("dialog", { name: "PIN lock is on" }).getByRole("button", { name: /Turn off PIN lock/ }).click()
  const dialog = page.getByRole("dialog", { name: "Turn off PIN lock" })
  await dialog.locator("#pin-current").fill("0000")
  await dialog.getByRole("button", { name: "Turn off PIN lock" }).click()
  await expect(dialog.getByText("That PIN isn't right")).toBeVisible()

  await dialog.locator("#pin-current").fill(NEW_PIN)
  await dialog.getByRole("button", { name: "Turn off PIN lock" }).click()
  await expect(page.getByText("PIN lock is off")).toBeVisible()

  expect(((await (await request.get("/api/data")).json()) as AppData).pinSet).toBe(false)
  const other = await browser.newContext({ baseURL: BASE })
  const otherPage = await other.newPage()
  await otherPage.goto("/")
  await expect(otherPage.getByRole("link", { name: "Wallets" }).first()).toBeVisible()
  await other.close()

  // The menu offers to set one again.
  await account(page).click()
  await expect(page.locator("#sidebar-pin-button")).toContainText("Set a PIN")
  await expect(page.locator("#sidebar-lock-button")).toHaveCount(0)
})

test("the lock screen fits a phone in both themes, with nothing running off the side", async ({ browser, request }) => {
  await request.put("/api/auth/pin", { data: { pin: PIN } })
  for (const colorScheme of ["light", "dark"] as const) {
    const context = await browser.newContext({ baseURL: BASE, viewport: { width: 360, height: 640 }, colorScheme })
    const page = await context.newPage()
    await page.goto("/")
    await expect(lockScreen(page)).toBeVisible()
    await page.locator("#lock-pin").fill("12345678")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    const box = await page.locator("form").boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(360)
    await context.close()
  }
  expect((await request.delete("/api/auth/pin", { data: { currentPin: PIN } })).status()).toBe(200)
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { emptyWalletForm, formToChanges, formToNewWallet, validateWalletForm, walletToForm } from "../lib/wallet-form.ts"

const bca = { id: "bca", name: "BCA", kind: "bank", balance: 1, description: "", color: "sky", defaultColor: "sky" }
const jago = { id: "jago", name: "Bank Jago", nickname: "jago", kind: "digital-bank", balance: 1, description: "", color: "plum", defaultColor: "plum" }
const wallets = [bca, jago]
const filled = (over) => ({ ...emptyWalletForm(), name: "GoPay", kind: "e-wallet", ...over })

test("a new form has an empty nickname, and an edit form shows the wallet's own", () => {
  assert.equal(emptyWalletForm().nickname, "")
  assert.equal(walletToForm(bca).nickname, "")
  assert.equal(walletToForm(jago).nickname, "jago")
})

test("a new wallet carries its nickname tidied, or none at all", () => {
  assert.equal(formToNewWallet(filled({ nickname: "  go   pay " })).nickname, "go pay")
  for (const nickname of ["", "   "]) assert.equal("nickname" in formToNewWallet(filled({ nickname })), false)
})

test("changes send the nickname, or null to take it away", () => {
  assert.equal(formToChanges(walletToForm(jago), jago).nickname, "jago")
  assert.equal(formToChanges({ ...walletToForm(jago), nickname: "  JG " }, jago).nickname, "JG")
  assert.equal(formToChanges({ ...walletToForm(jago), nickname: "" }, jago).nickname, null)
  assert.equal(formToChanges({ ...walletToForm(jago), nickname: "   " }, jago).nickname, null)
})

test("an empty nickname is fine; so is one that is only the wallet's own name", () => {
  assert.deepEqual(validateWalletForm(filled({ nickname: "" }), wallets), {})
  assert.deepEqual(validateWalletForm({ ...walletToForm(bca), nickname: "bca" }, wallets, bca), {})
  assert.deepEqual(validateWalletForm({ ...walletToForm(jago), nickname: "jago" }, wallets, jago), {}) // its own, unchanged
})

test("a nickname must be short, hold a letter, and not be another wallet's name or nickname", () => {
  assert.match(validateWalletForm(filled({ nickname: "x".repeat(21) }), wallets).nickname, /at most 20/)
  assert.equal(validateWalletForm(filled({ nickname: "x".repeat(20) }), wallets).nickname, undefined)
  assert.match(validateWalletForm(filled({ nickname: "2024" }), wallets).nickname, /at least one letter/)
  assert.match(validateWalletForm(filled({ nickname: " bca " }), wallets).nickname, /BCA is already the name of another wallet/)
  assert.match(validateWalletForm(filled({ nickname: "BANK  jago" }), wallets).nickname, /Bank Jago is already the name of another wallet/)
  assert.match(validateWalletForm(filled({ nickname: "JAGO" }), wallets).nickname, /jago is already the nickname of Bank Jago|JAGO is already the nickname of Bank Jago/)
  assert.match(validateWalletForm({ ...walletToForm(bca), nickname: "jago" }, wallets, bca).nickname, /already the nickname of Bank Jago/)
})

test("a wallet's name can't be another wallet's nickname", () => {
  assert.match(validateWalletForm(filled({ name: "Jago" }), wallets).name, /Jago is already the nickname of Bank Jago\. Choose another name/)
  assert.deepEqual(validateWalletForm({ ...walletToForm(jago), name: "Jago" }, wallets, jago), {}) // its own nickname
  assert.match(validateWalletForm(filled({ name: "bca" }), wallets).name, /already have a wallet called BCA/)
})

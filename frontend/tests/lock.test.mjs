import assert from "node:assert/strict"
import { test } from "node:test"
import { SESSION_COOKIE, cleanPin, pinProblem, validatePinForm, waitText } from "../lib/lock.ts"

test("a PIN box keeps digits only, and no more than eight of them", () => {
  assert.equal(cleanPin("12ab34"), "1234")
  assert.equal(cleanPin(" 4 8 2 1 "), "4821")
  assert.equal(cleanPin("123456789012"), "12345678")
  assert.equal(cleanPin("abc"), "")
  assert.equal(cleanPin("٣٤٥٦"), "", "digits of other alphabets are not digits here")
})

test("a PIN to choose must be four to eight digits, and the problem is said in words", () => {
  assert.equal(pinProblem(""), "Enter a PIN.")
  assert.equal(pinProblem("123"), "Use 4 to 8 digits.")
  assert.equal(pinProblem("123456789"), "Use 4 to 8 digits.")
  assert.equal(pinProblem("12a4"), "Use digits only (0 to 9).")
  for (const fine of ["1234", "0000", "12345678", "4821"]) assert.equal(pinProblem(fine), undefined)
})

test("setting a PIN asks for it twice; the two must match", () => {
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "4821", repeat: "4821" }, false), {})
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "4821", repeat: "" }, false), { repeat: "Type the new PIN again." })
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "4821", repeat: "4822" }, false), { repeat: "The two PINs don't match." })
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "12", repeat: "12" }, false), { pin: "Use 4 to 8 digits." }, "no second complaint about a PIN that is already refused")
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "", repeat: "" }, false), { pin: "Enter a PIN.", repeat: "Type the new PIN again." })
})

test("changing a PIN also asks for the current one, and a new PIN that is the old one is refused", () => {
  assert.deepEqual(validatePinForm({ currentPin: "4821", pin: "9021", repeat: "9021" }, true), {})
  assert.deepEqual(validatePinForm({ currentPin: "", pin: "9021", repeat: "9021" }, true), { currentPin: "Enter your current PIN." })
  assert.deepEqual(validatePinForm({ currentPin: "4821", pin: "4821", repeat: "4821" }, true), { pin: "Choose a different PIN from the current one." })
})

test("a wait is said in seconds up to a minute, then in whole minutes, rounded up", () => {
  assert.equal(waitText(1), "1 second")
  assert.equal(waitText(30), "30 seconds")
  assert.equal(waitText(59), "59 seconds")
  assert.equal(waitText(60), "1 minute")
  assert.equal(waitText(61), "2 minutes")
  assert.equal(waitText(15 * 60), "15 minutes")
})

test("the cookie's name is the one the backend uses", () => {
  assert.equal(SESSION_COOKIE, "kaya_session")
})

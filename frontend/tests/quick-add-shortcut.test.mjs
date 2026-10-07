import assert from "node:assert/strict"
import { test } from "node:test"
import { opensQuickAdd } from "../lib/quick-add-shortcut.ts"

const press = (key, extra = {}) => ({
  key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, defaultPrevented: false, ...extra,
})
const calm = { windowOpen: false }

test("Ctrl+K and Cmd+K open it, in either case", () => {
  assert.equal(opensQuickAdd(press("k", { ctrlKey: true }), calm), true)
  assert.equal(opensQuickAdd(press("K", { ctrlKey: true }), calm), true) // caps lock
  assert.equal(opensQuickAdd(press("k", { metaKey: true }), calm), true)
})

test("K alone, or with other modifiers, does nothing", () => {
  assert.equal(opensQuickAdd(press("k"), calm), false)
  assert.equal(opensQuickAdd(press("k", { altKey: true }), calm), false)
  assert.equal(opensQuickAdd(press("k", { ctrlKey: true, altKey: true }), calm), false)
  assert.equal(opensQuickAdd(press("K", { ctrlKey: true, shiftKey: true }), calm), false) // the browser's own tools
})

test("a plain Q, or Q with any modifier, does nothing: no letter ever opens it", () => {
  assert.equal(opensQuickAdd(press("q"), calm), false)
  assert.equal(opensQuickAdd(press("Q", { shiftKey: true }), calm), false)
  for (const modifier of ["ctrlKey", "metaKey", "altKey"]) assert.equal(opensQuickAdd(press("q", { [modifier]: true }), calm), false)
})

test("nothing opens while a dialog, menu or list is already open", () => {
  assert.equal(opensQuickAdd(press("k", { ctrlKey: true }), { windowOpen: true }), false)
})

test("a held key, text being composed, or a key already handled is left alone", () => {
  for (const extra of [{ repeat: true }, { isComposing: true }, { defaultPrevented: true }]) {
    assert.equal(opensQuickAdd(press("k", { ctrlKey: true, ...extra }), calm), false)
  }
})

test("other keys do nothing", () => {
  for (const key of ["a", "n", "/", "Enter", "Escape", "Control", "1"]) assert.equal(opensQuickAdd(press(key), calm), false)
  for (const key of ["a", "n", "/", "Enter", "Escape", "1"]) assert.equal(opensQuickAdd(press(key, { ctrlKey: true }), calm), false)
})

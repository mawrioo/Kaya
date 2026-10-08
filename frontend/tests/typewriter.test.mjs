import assert from "node:assert/strict"
import { test } from "node:test"
import { GREETING_LANGUAGES } from "../lib/greetings.ts"
import {
  DELETE_MS,
  GAP_MS,
  HOLD_MS,
  START,
  TYPE_MS,
  letters,
  stepTypewriter,
  visibleCount,
} from "../lib/typewriter.ts"

/** Plays the steps one after another, with a clock, and writes down what is on screen after each. */
function play(lengths, steps) {
  let state = START
  let clock = 0
  const log = []
  for (let i = 0; i < steps; i++) {
    const { next, wait } = stepTypewriter(state, lengths[state.index], lengths.length)
    clock += wait
    state = next
    log.push({ clock, index: state.index, phase: state.phase, shown: visibleCount(state, lengths[state.index]) })
  }
  return log
}

test("a page that has just opened shows the first line whole", () => {
  assert.equal(START.index, 0)
  assert.equal(visibleCount(START, 19), 19)
})

test("a line rests, is deleted one letter at a time, then the next line is typed one letter at a time", () => {
  // Two lines: 3 letters, then 2.
  const log = play([3, 2], 10)
  assert.deepEqual(
    log.map((entry) => [entry.phase, entry.index, entry.shown]),
    [
      ["deleting", 0, 3], // the rest is over
      ["deleting", 0, 2],
      ["deleting", 0, 1],
      ["deleting", 0, 0],
      ["typing", 1, 0], // empty, and the next line starts
      ["typing", 1, 1],
      ["typing", 1, 2],
      ["hold", 1, 2], // whole again
      ["deleting", 1, 2],
      ["deleting", 1, 1],
    ]
  )
})

test("the waits are the rest, a quick delete per letter, a short empty pause and a slower type per letter", () => {
  const log = play([3, 2], 8)
  const gaps = log.map((entry, i) => entry.clock - (i === 0 ? 0 : log[i - 1].clock))
  assert.deepEqual(gaps, [HOLD_MS, DELETE_MS, DELETE_MS, DELETE_MS, GAP_MS, TYPE_MS, TYPE_MS, 0])
  assert.ok(DELETE_MS < TYPE_MS, "deleting is quicker than typing")
})

test("every language comes round in order, and then it starts again at the first", () => {
  const lengths = GREETING_LANGUAGES.map(() => 6)
  // Every time a line has been typed out whole and starts resting, write down which line it was.
  const typedWhole = play(lengths, 20 * 20)
    .filter((entry) => entry.phase === "hold")
    .map((entry) => entry.index)
  // The first line was already showing when the page opened, so the first one typed is the second.
  assert.deepEqual(typedWhole.slice(0, 21), [...Array(19).keys()].map((n) => n + 1).concat([0, 1]))
})

test("a name that changes while the line is showing is followed: nothing is left over and nothing is skipped", () => {
  // Being deleted with 10 letters left, then the line gets shorter (the name was shortened): it carries on from 4.
  const shorter = stepTypewriter({ phase: "deleting", index: 0, count: 10 }, 4, 3)
  assert.deepEqual(shorter.next, { phase: "deleting", index: 0, count: 3 })
  // Being typed with 2 letters showing, and the line gets longer: it keeps typing until it is whole.
  const longer = stepTypewriter({ phase: "typing", index: 2, count: 2 }, 9, 3)
  assert.deepEqual(longer.next, { phase: "typing", index: 2, count: 3 })
  // A resting line is always whole, whatever length it has.
  assert.equal(visibleCount({ phase: "hold", index: 0, count: 1 }, 12), 12)
})

test("a language takes a few seconds, even with the longest name", () => {
  // The longest greeting plus a 30-letter name.
  const longest = Math.max(...GREETING_LANGUAGES.flatMap((language) => [language.morning, language.afternoon, language.evening].map((text) => letters(text).length))) + 2 + 30
  const perLanguage = HOLD_MS + longest * DELETE_MS + GAP_MS + longest * TYPE_MS
  assert.ok(perLanguage < 9000, `${perLanguage} ms`)
})

test("letters are cut the way a person sees them: a mark stays with its letter", () => {
  assert.deepEqual(letters("Mario"), ["M", "a", "r", "i", "o"])
  assert.deepEqual(letters("สวัสดีตอนเช้า"), ["ส", "วั", "ส", "ดี", "ต", "อ", "น", "เ", "ช้", "า"])
  const accented = String.fromCharCode(0x65, 0x301) + "a" // an "e" with an accent drawn on it, then an "a"
  assert.equal(letters(accented).length, 2)
})

test("cutting a greeting into letters loses nothing, in any language or time of day", () => {
  for (const language of GREETING_LANGUAGES) {
    for (const part of ["morning", "afternoon", "evening"]) {
      const line = `${language[part]}, Mario`
      assert.equal(letters(line).join(""), line, `${language.lang} ${part}`)
    }
  }
})

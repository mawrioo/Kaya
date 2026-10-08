import assert from "node:assert/strict"
import { test } from "node:test"
import { GREETING_LANGUAGES, dayPartFor, greetingAt } from "../lib/greetings.ts"

test("the day is split at 5, 12 and 18 o'clock", () => {
  assert.deepEqual(
    [0, 4, 5, 11, 12, 17, 18, 23].map(dayPartFor),
    ["evening", "evening", "morning", "morning", "afternoon", "afternoon", "evening", "evening"]
  )
})

test("English comes first, and the owner's first picks follow it", () => {
  assert.deepEqual(GREETING_LANGUAGES.slice(0, 5).map((language) => language.lang), ["en", "id", "zh", "ko", "ja"])
  assert.equal(greetingAt(0, "morning").text, "Good morning")
  assert.equal(greetingAt(1, "morning").text, "Selamat pagi")
  assert.equal(greetingAt(2, "morning").text, "早上好")
  assert.equal(greetingAt(3, "morning").text, "좋은 아침이에요")
  assert.equal(greetingAt(4, "morning").text, "おはようございます")
})

test("there are 20 languages, each with its own tag, and every greeting is filled in", () => {
  assert.equal(GREETING_LANGUAGES.length, 20)
  assert.equal(new Set(GREETING_LANGUAGES.map((language) => language.lang)).size, 20)
  for (const language of GREETING_LANGUAGES) {
    for (const part of ["morning", "afternoon", "evening"]) assert.ok(language[part]?.trim(), `${language.lang} ${part}`)
  }
})

test("counting past the last language starts again at English", () => {
  assert.equal(greetingAt(20, "evening").text, "Good evening")
  assert.equal(greetingAt(21, "evening").text, "Selamat malam")
})

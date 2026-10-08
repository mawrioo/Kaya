/**
 * A line that types itself out, rests, deletes itself, and then types the next line. Written as pure steps (what
 * comes next, and how long to wait for it), so the order and the timing can be tried out without a browser.
 */

/** How long one letter takes to type, and to delete (deleting is quicker, like holding the key down). */
export const TYPE_MS = 70
export const DELETE_MS = 35
/** How long a finished line stays before it is deleted, and the empty pause before the next one starts. */
export const HOLD_MS = 2500
export const GAP_MS = 300

export type TypewriterPhase = "typing" | "hold" | "deleting"

export interface Typewriter {
  phase: TypewriterPhase
  /** Which line this is (counting from the first). */
  index: number
  /** How many letters are showing while typing or deleting. While the line is resting it is whole, whatever this says. */
  count: number
}

/** A page that has just opened shows the first line whole. */
export const START: Typewriter = { phase: "hold", index: 0, count: 0 }

/** The letters on show for a line that is `length` letters long. */
export function visibleCount(state: Typewriter, length: number): number {
  return state.phase === "hold" ? length : Math.min(state.count, length)
}

/**
 * What happens next, and how long to wait before it does. `length` is how many letters the current line has now
 * (it can change while the line is showing, for instance when the owner changes their name), and `lines` is how
 * many lines there are to go round.
 */
export function stepTypewriter(state: Typewriter, length: number, lines: number): { next: Typewriter; wait: number } {
  const shown = visibleCount(state, length)

  if (state.phase === "hold") {
    return { next: { phase: "deleting", index: state.index, count: shown }, wait: HOLD_MS }
  }
  if (state.phase === "deleting") {
    if (shown > 0) return { next: { phase: "deleting", index: state.index, count: shown - 1 }, wait: DELETE_MS }
    return { next: { phase: "typing", index: (state.index + 1) % lines, count: 0 }, wait: GAP_MS }
  }
  if (shown < length) return { next: { phase: "typing", index: state.index, count: shown + 1 }, wait: TYPE_MS }
  return { next: { phase: "hold", index: state.index, count: shown }, wait: 0 }
}

const segmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : undefined

/**
 * A line cut into what a person sees as one letter each, so typing it never leaves half a letter on screen: a Thai
 * letter and the mark above it, a Hindi letter with its vowel sign, an accent on its letter, stay together.
 */
export function letters(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text)
}

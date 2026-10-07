/** When a key press should open Quick add. Pure, so it can be checked without a browser. */

/** The parts of a keyboard event this needs. */
export interface ShortcutKey {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  isComposing: boolean
  defaultPrevented: boolean
}

/** What the page looked like when the key went down. */
export interface ShortcutContext {
  /** A dialog, menu or list is already open. */
  windowOpen: boolean
}

/**
 * Ctrl+K (Cmd+K on a Mac) opens Quick add from anywhere, even while typing in a box. A plain letter never does, so
 * nothing is ever taken out of a note. Nothing opens while something else is open, and a key held down or already
 * handled by another part of the page is left alone.
 */
export function opensQuickAdd(event: ShortcutKey, context: ShortcutContext): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing || context.windowOpen) return false
  return event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
}

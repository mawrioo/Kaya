import { useRef } from "react"

/**
 * Keeps keyboard focus from getting lost around a dialog.
 *
 * Call remember() as the dialog opens, and pass restore to the dialog's
 * onCloseAutoFocus so focus goes back to the button that opened it. (A dialog
 * that focuses its own first field would otherwise make the browser forget
 * what opened it.) redirect() sends focus somewhere else instead, such as the
 * next row after a delete.
 */
export function useReturnFocus() {
  const target = useRef<HTMLElement | null>(null)

  return {
    remember() {
      target.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    },
    redirect(element: HTMLElement | null) {
      if (element) target.current = element
    },
    restore(event: Event) {
      event.preventDefault()
      // The page must not jump: the owner may have scrolled to something new while the dialog closed.
      target.current?.focus({ preventScroll: true })
    },
  }
}

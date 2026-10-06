/**
 * Hands a text to the browser as a file to save. A byte order mark goes first so a spreadsheet reads the
 * accents and symbols in notes correctly. Only works in the browser.
 */
/** U+FEFF, the character that tells a spreadsheet the file is UTF-8. */
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

export function downloadTextFile(filename: string, text: string, type = "text/csv;charset=utf-8"): void {
  const blob = new Blob([BYTE_ORDER_MARK, text], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the address is let go.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

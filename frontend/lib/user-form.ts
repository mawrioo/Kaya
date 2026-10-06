/** The most characters a name can have. The backend enforces the same limit. */
export const MAX_USER_NAME_LENGTH = 30

/** A plain-English problem with the name typed in the box, or undefined when it is fine. */
export function validateUserName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return "Enter your name."
  if (name.length > MAX_USER_NAME_LENGTH) return `Your name can be at most ${MAX_USER_NAME_LENGTH} characters.`
  return undefined
}

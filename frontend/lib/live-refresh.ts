/** A foreground refresh must never replace a save that began while its read was in flight. */
export function createRefreshGuard() {
  let revision = 0
  let pending = 0
  return {
    begin() { pending++; revision++ },
    end() { pending--; revision++ },
    ticket: () => pending === 0 ? revision : undefined,
    accepts: (ticket: number | undefined) => ticket !== undefined && pending === 0 && ticket === revision,
  }
}

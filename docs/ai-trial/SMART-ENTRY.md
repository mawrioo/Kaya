# Smart entry delivery — 27 Oct 2026

Quick add now opens Smart entry through the existing coin or Ctrl+K. It prepares supported expense, income and transfer sentences using the preview service, opens the ordinary editable transaction form, and saves only when Confirm and save or Save and add another is deliberately activated.

The existing expense parser is preserved behind Simple expense. No silent fallback drops dates or transfer meaning. Use form instead remains available if preparation is unavailable or a sentence needs clarification. Smart entry is available by default; `KAYA_AI_ENABLED=false` disables its endpoint. Ollama is only called for category suggestions that explicit categories or local history cannot supply. No runtime download, cloud service or database migration was added.

## Interaction checks

- Enter in the sentence prepares; Enter in the amount field does not implicitly save. A deliberate button activation does.
- Every field is editable. Editing a prepared note retains the category instead of replacing or clearing it.
- Editing the sentence invalidates its old review. Stop, close and switching to the manual form abort pending preparation. Late responses are discarded.
- Review identifies default date/wallet/category choices. Transfers show both wallet directions and no category field.
- Save uses a synchronous in-flight guard against duplicate clicks. An uncertain acknowledgement disables retrying the draft and links to Transactions for checking what saved.
- PIN expiry/locking returns to the existing lock screen and clears the draft. Simple entry, ordinary Add/Edit, duplicate and save-and-add-another remain available.

## Verification

Project typecheck, lint and all 733 unit tests passed (483 backend, 250 frontend). Final typecheck and targeted lint passed after the UI correction.

Browser verification covered 50 existing regression cases plus 10 new smart-entry cases. The first pass exposed one defect: changing a prepared note cleared its category. That was corrected, and the complete 10-case smart-entry suite passed on the final run. Its coverage includes all three saved transaction types and exact balance changes, preview without writes, double Enter/double click, manual edits, clarification, stale responses, Stop/close, offline fallback, lost save acknowledgement, save-and-add-another and PIN locking during preparation.

The browser harness copied both applications under `.nb-test`, used `localhost:3200` and backend 4200 with a throwaway database, and proved BCA Rp 8.742.300 and 41 transactions before each suite. It used a deterministic category-model stub while exercising the real preview route, validation and save route. Real Ollama extraction was evaluated separately in Stage 2; these browser tests do not claim live-model accuracy. No real database was read or changed.

Desktop and phone screenshots were inspected in light/dark themes. Layout checks covered widths down to 320px, dialog scrolling, reachable confirmation and keyboard/focus behaviour. The test processes and copies were removed afterwards. No production build, Safari/Firefox, real-phone hardware or browser-to-live-Ollama test was run in this stage.

## Remaining limits

Stage 4 subsequently passed the real-model browser flow in both development and an isolated production build. See [live browser verification](LIVE-BROWSER.md) for timings, exact checks and repeat instructions. This supersedes the Stage 3 production/live-model testing gaps above; real-phone hardware and other browser engines remain untested.

Category suggestions can be wrong: the earlier real-model evaluation matched 41/42 cases, with electricity suggested as Other once. The grammar deliberately asks for clarification on unsupported dates, compound entries and uncertain transfers. Use exact wallet names or configured nicknames. Review remains part of the intended workflow, not an optional step.

The delivered interface is ready for owner review. Broader language support, voice and read-only spending chat remain separate features.

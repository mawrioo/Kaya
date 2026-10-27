# Kaya assistant: follow-up questions and corrections

Delivered 27 Oct 2026. The owner subsequently authorised all five steps together, with no intermediate review stops. Steps 5-9 below are complete; see [verification and limits](ai-trial/CONVERSATION.md). The other feature ideas remain unselected.

## Agreed direction

Complete and correct one unsaved expense, income or transfer through short typed exchanges, then review and explicitly confirm. Reuse Quick add, its editable form, existing PIN protection, local model and transaction validation. English and Indonesian input; English interface text. No microphone, batch saving or persistent conversation history in this version.

Example:

1. Owner: `Bought lunch from BCA yesterday`
2. Kaya: `How much was it?`
3. Owner: `35rb`
4. Kaya prepares Expense / Rp 35.000 / Food / BCA / the exact date.
5. Owner: `Actually use Bank Jago`
6. Only the wallet changes. The amount, category, date and note stay.
7. Owner reviews and presses Confirm and save.

For a transfer, `use Bank Jago` can mean either end. Kaya must ask `Should Bank Jago be the source or destination?` rather than guess. A typed `yes`, `okay` or `save it` never substitutes for the confirmation button.

## Step 5: preserve a complete draft state

The current preview can return early when information is missing, losing other information it could have understood. Refactor extraction to collect independent facts before deciding which question to ask.

- Represent missing fields explicitly. Separate missing, invalid, ambiguous and unsupported input.
- Track each field's source: explicit sentence, reply, manual edit, visible default or category suggestion. This prevents unrelated suggestions from replacing a confirmed choice.
- Return a stable pending-field identifier and allowed choices, not only a prose error message. Keep the existing preview contract compatible while introducing this state.
- Maintain one draft revision in browser memory. Sending a response includes the base draft and pending question; the backend validates them as untrusted input. A response for an older revision cannot replace newer edits.
- Preserve dates already resolved to calendar days. Resolve newly requested relative dates against the server's current Asia/Jakarta date.

Deliverable: a testable draft representation that retains wallet, type, date and note when an amount is missing, including for transfers. No database migration or interface change expected. Completed.

## Step 6: answer missing-field questions

Extend the preview service to understand a short reply in the context of its pending question.

- `35rb` answers an amount question; `BCA` answers a wallet question. Reuse deterministic amount parsing and current wallet IDs/nicknames.
- Ask one question at a time: resolve transaction type when necessary, then amount, source/wallet, transfer destination, and any unresolved date/category. Explicitly ambiguous values must be resolved rather than replaced with defaults.
- An expense/income can keep the existing visibly labelled default wallet when none was named. A transfer always needs an unambiguous source and destination.
- Invalid replies keep the draft and repeat a useful question. Never throw away the entered sentence just because a reply is incomplete.
- Unrelated input or what appears to be a second transaction must not silently change the current draft. Offer an explicit Start new action.
- Do not call the model for an amount, date or known-wallet reply. Category suggestions remain the model's bounded job.

Deliverable: the example exchange above works through the backend without creating a transaction. Completed.

## Step 7: correct an existing draft

Introduce validated changes to selected fields, rather than re-parsing and replacing the entire draft.

Initial correction vocabulary:

| Owner says | Proposed behaviour |
| --- | --- |
| `make that 40rb` / `ganti jadi 40rb` | Change only the amount |
| `use BCA` / `pakai BCA` | Change the expense/income wallet; clarify the end of a transfer |
| `from BCA` / `dari BCA` | Change only a transfer's source |
| `to Bank Jago` / `ke Bank Jago` | Change only a transfer's destination |
| `actually yesterday` / `tanggalnya kemarin` | Change only the date |
| `category Food` | Select an existing category of the correct type |
| `note: lunch with friends` | Change only the note |
| `this was income` | Change type; keep compatible fields and ask for any newly required fields |

Every correction is atomic: invalid or ambiguous changes leave the previous draft intact. A new explicit correction may replace an earlier manual choice for that field; unrelated changes may not. Type changes must remove incompatible category/transfer fields and revalidate the draft. Initially handle one correction per reply, asking the owner to separate compound requests.

These commands apply only to the open, unsaved draft. Editing a previously saved transaction remains the existing Edit flow.

Deliverable: corrections preserve every untouched field, including manual edits, and cannot save. Completed.

## Step 8: connect the conversation to Quick add

Keep the current dialog and standard form. Show the original sentence, the current question and a reply box alongside the current draft; avoid turning this into a separate general-purpose chatbot.

- Give wallet/category questions their existing pickers as an alternative to typing.
- Keep the review form editable. A manual edit that answers the pending question advances the draft, rather than causing the assistant to ask it again.
- Summarise the last change in plain text, such as `Wallet changed to Bank Jago.` Do not rely on colour alone.
- Preserve keyboard focus and announce new questions and completed changes. Retain Stop, Simple expense and Use form instead.
- Confirm and save is available only for a valid reviewed draft. Enter in the reply box never saves.
- After a successful save, clear conversation context. Save and add another starts a new draft, retaining only the ordinary defaults already promised by that control.
- Close, lock or session expiry clears the conversation and aborts pending inference. Keep only a bounded recent exchange in tab memory, with no database or localStorage transcript.

Apply the relevant UI skill and read the installed Next.js guidance before implementation. Follow PRODUCT.md and DESIGN.md; document the delivered behaviour after it is tested.

Deliverable: the owner can complete and correct one transaction without retyping it or losing form edits. Completed.

## Step 9: evaluate and release

- Create a fixed set of at least 40 multi-turn English/Indonesian scenarios before tuning: valid replies, corrections, manual edits, unknown wallets, same-wallet transfers, incompatible categories, midnight boundaries, unrelated replies and stale requests.
- Require exact amounts, dates, type and wallet direction for every supported ready draft. Every designated ambiguous case must ask for clarification. Measure category suggestions separately from financial-field correctness.
- Test that missing-field replies and deterministic corrections make zero model calls. Measure inference only where category suggestions are required.
- Test no writes before confirmation, one write after confirmation, uncertain-save recovery, close/lock cancellation, keyboard use, light/dark themes and narrow screens.
- Run unit/type/lint checks and relevant browser regressions. Use copies of both apps in `.nb-test`, ports 3200/4200 and a throwaway DB_PATH; prove BCA Rp 8.742.300 and 41 transactions before browser tests. Never test against the real database or 3000/4000.
- Run a separate live-Ollama, multi-turn browser check in development and production. Keep ordinary automated tests deterministic. Report real-device/browser coverage honestly and clean up owned processes/copies.

Deliverable: measured acceptance results and updated product, design, usage and roadmap documentation. Completed; ready for owner review. If a case fails, narrow the supported wording or fix the implementation; do not conceal it behind a confidence score.

## Other possible features — not selected for implementation

| Feature | What it adds | Relative scope / boundary |
| --- | --- | --- |
| Possible-duplicate notice | Shows a similar existing transaction before confirmation | Small–medium; advisory, never silently discards an entry |
| Better category learning | Reuses the owner's repeated corrections for familiar merchants | Medium; prefer existing history first, make any durable rules inspectable/removable |
| Broader dates and wording | Last Friday, two days ago, more Indonesian paraphrases | Medium; explicit date rules and new evaluation fixtures |
| Undo last draft change | Reverts a correction before saving | Small; browser-memory history only, separate from undoing a saved transaction |
| Favourite transaction templates | Prepares familiar entries such as lunch, rent or a weekly transfer | Small–medium; every use still produces a reviewable draft |
| Several drafts from one message | Separates lunch and parking into individual transactions | Large; per-row review, batch confirmation, validation and duplicate handling |
| Split one payment by category | Divides a supermarket bill into groceries and household spending | Large; requires clear ledger/report semantics, not just text parsing |
| Receipt or bank-screenshot entry | Extracts amount, merchant, date and possible wallet into a draft | Large; separate local OCR/vision trial and image-handling decisions |
| Voice entry | Transcribes speech, then follows the same draft/confirmation flow | Large; separate local transcription, microphone and real-phone testing |
| Read-only spending questions | Answers questions with computed totals and links to records | Medium–large; separate from transaction entry, with no model-calculated money |
| Repeating-payment suggestions | Identifies likely subscriptions and proposes reminders/drafts | Medium–large; no automatic transaction creation by default |
| Reconciliation help | Helps explain a difference between recorded and bank balances | Large; depends on statement data, never silently changes balances |

Recommended order after steps 5–9: duplicate notices, better category learning, then broader dates. Batch entry, receipts and voice come after the single-draft workflow is dependable. Persistent learning, templates or recurring-payment data may need schema work; build those in isolated copies and rehearse migrations as AGENTS.md requires.

## Delivery status

All five steps are implemented and verified. See [the release report](ai-trial/CONVERSATION.md) for tests, live-model measurements, isolation and remaining limits. PRODUCT.md, DESIGN.md and usage notes describe the delivered behaviour. No additional feature from the ideas table is authorised by this release.

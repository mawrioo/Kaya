# Assistant expansion: scope review

Reviewed 28 Oct 2026 against the current source. The owner selected duplicate notices, category learning, broader dates, draft undo, favourite templates, multiple transactions, spending questions, subscription detection and reconciliation for the roadmap. Receipt/screenshot entry and voice are future updates. This selects direction for review; it is not an instruction to implement every feature immediately.

Delivery update, 28 Oct: the owner subsequently authorised the first three items in the reviewed build order (stages A-C): duplicate notices, draft undo and broader dates. These are implemented; see [the release report](ai-trial/ENTRY-IMPROVEMENTS.md). The other stages below remain reviewed proposals. The original numbered feature 2, category learning, is stage D and was not included in this three-item build.

Delivery update, 28 Oct: the owner also authorised reviewed items 4-8 (stages D-H): category learning, favourite templates, several transactions, spending questions and subscription detection. These are now delivered; see [migration and acceptance results](ai-trial/ASSISTANT-EXPANSION.md). Reconciliation (stage I), images and voice remain future work. The original proposals below remain the review record.

## Existing foundations

- Smart entry prepares one expense, income or transfer, preserves partial drafts, accepts deterministic replies/corrections and requires explicit confirmation. Dates are currently today, yesterday and ISO calendar dates. The local model only suggests categories.
- `frontend/lib/bank-csv.ts` already detects possible import duplicates and reads statement balances. `backend/src/store.ts` imports a reviewed batch atomically, with undo. New message batches should share validation and ledger operations, while keeping CSV replacement behaviour separate.
- `frontend/lib/category-suggestion.ts` suggests from exact, prefix and shared-word history matches. The Smart entry backend reuses the latest exact-note category. Neither is an inspectable correction-rule system, and the different policies should be reconciled.
- Transaction date-range, wallet, category and type filters already exist, as do computed Insights totals, wallet corrections and balance history. Reuse these for spending evidence and reconciliation rather than making another ledger.

## Recommended build order

| Stage | Selected items | Proposed first deliverable | Relative scope |
| --- | --- | --- | --- |
| A | 1: Duplicate notices | Explain similar existing entries before confirmation; let the owner inspect or save another | Small-medium |
| B | 4: Draft undo | Undo the last applied correction or completed manual edit, including dependent fields and question state | Small-medium |
| C | 3: Broader dates | English/Indonesian weekdays, days ago and explicit previous-month dates, with exact calendar-day review | Medium |
| D | 2: Category learning | Explicit, editable remembered category rules integrated with existing history suggestions | Medium |
| E | 5: Favourite templates | Named, reusable expense/income/transfer drafts with optional amounts and fresh dates | Medium |
| F | 6: Multiple transactions | A bounded list of editable drafts, per-row questions and duplicate checks, one reviewed atomic save | Large |
| G | 8: Spending questions | Read-only supported questions with code-calculated totals and links to the matching records | Medium-large |
| H | 9a: Subscription detection | Explain likely recurring payments and let the owner confirm or dismiss candidates | Medium-large |
| I | 9b: Reconciliation | One wallet and statement period at a time, matching recorded entries and explaining unresolved differences | Large |
| Future | 7: Images and voice | Separate extraction/transcription trials feeding the same reviewed draft system | Large; deferred |

This is a proposed order, not a delivery-time estimate. Spending questions can move ahead of templates/batches if understanding spending becomes the higher priority. Items 9a and 9b are separate releases with different data needs.

## Feature boundaries and acceptance

### 1. Duplicate notices

Start with same type, exact amount, same wallet and Jakarta calendar day; a similar note strengthens the match. Transfers must match both endpoints in the same direction. Show a small bounded list with why each entry matched and a link to inspect it. A possible duplicate remains advisory; two real identical payments must remain recordable. Recheck after draft edits and against current data at confirmation. Future batches also compare rows with one another.

Keep duplicate detection separate from retry protection: a lost response must not create a second record when the same confirmed request is repeated. Do not claim a duplicate warning alone guarantees that.

Acceptance: repeated lunch is flagged, a reversed transfer is not treated as the same transfer, amount/date/wallet changes refresh the warning, and the owner can deliberately save another payment.

### 4. Undo a draft correction

Store a bounded sequence of complete draft snapshots in browser memory: values, provenance, pending question and any transfer-end choice. One Undo reverses one applied command or completed form edit rather than each typed character. Typing a reply alone does not create an undo step. Undo aborts pending work and advances the request revision; restoring an old revision could let a stale response overwrite the draft.

Successful save, Start new, close and lock clear history. This undo affects only unsaved drafts, not saved records or persistent category rules.

Acceptance: undoing an expense-to-transfer change restores the original category and wallet fields, while a delayed response cannot reapply the reverted change.

### 3. Broader dates

Share one deterministic date resolver between initial sentences, corrections and later spending queries. Proposed first grammar: last Friday/Jumat lalu, two days ago/dua hari lalu, and the 25th of last month/tanggal 25 bulan lalu. Keep existing today/yesterday/ISO support. A transaction needs one day; a question may need a date range, which should be a distinct validated result.

Recommended convention: last Friday means the most recent Friday strictly before today; on a Friday it means seven days earlier. Bare Friday or numeric 03/04 should ask for clarification. Always show the resolved date. Preserve an already resolved date across midnight; resolve only new relative wording against Jakarta today. Invalid dates such as the 31st of a shorter month must ask rather than roll forward.

Acceptance: bilingual examples, weekday boundaries, leap years, year changes, invalid days and midnight are covered by fixed tests.

### 2. Category learning

Start with an explicit Remember this category choice after a correction. Propose a concrete note/merchant match for the owner to review; begin with exact normalized phrases rather than broad keyword rules such as coffee. Rules are scoped by transaction type and point to existing category IDs. A correction in an abandoned draft must not teach the system. Save an opted-in rule only after the transaction save is confirmed, preferably atomically with that save.

Proposed precedence: explicit sentence/manual category, then an exact remembered rule, then existing history, then model suggestion. Manual choices always survive unrelated edits. Show why a rule matched. Provide edit/delete controls; define category-deletion and restore behaviour so rules cannot retain invalid IDs. Automatic promotion from repeated corrections can come later after correction events and a threshold are designed.

Acceptance: cancel never creates a rule; a saved opted-in rule survives restart; wrong-type matches are rejected; deleting a rule restores ordinary suggestions. Persistent rules require a reviewed schema/backup change.

### 5. Favourite templates

A named template stores type, wallet references, category where applicable, note and an optional amount. Dates default to the day the template is used. Expense/income/transfer templates open as unsaved drafts and enter the same correction, undo and duplicate-review flow. Support create, rename, edit and delete. A missing wallet or category asks for a replacement, never substitutes silently.

Acceptance: a variable-amount Lunch template asks how much, a transfer template keeps direction, and all templates require confirmation. Persistent templates require schema and backup coverage; do not implement a second transaction schema.

### 6. Multiple transactions

Propose a first limit of five entries per message. Each draft has a stable ID, individual revision/history and independent validation. A shared date or wallet applies only when the wording makes its scope clear. Missing information asks which row is affected; editing row two cannot modify row one. Use an explicit review list rather than stretching the single-draft form indefinitely.

Recommend saving all selected, valid rows in one database transaction: all succeed or none do. Reuse the atomic import foundation through an appropriate shared service; ordinary message entry must not gain CSV's ability to replace existing records. Include request deduplication that survives a lost acknowledgement, plus duplicate checks within the batch and against saved data. Display exact per-wallet effects before confirmation, respecting hidden balances.

Acceptance: three reviewed rows create exactly three transactions, an invalid reference causes zero writes, a retry of the same confirmed batch creates zero additional rows, and a failed preparation never saves any row. This is several separate transactions, not one payment split across categories.

### 8. Spending questions

Start with totals by period/category/wallet, largest expenses and month comparisons. Interpret into an allowlisted query object; code validates filters and calculates all numbers. Exclude transfers from spending/income totals and distinguish balance adjustments from transactions. No arbitrary model-generated SQL. Every answer states its period and includes links to the records supporting the displayed figure. Comparison answers should link each period separately.

Give questions a clearly labelled entry point, proposed in Insights, while Quick add remains transaction entry. Ask about ambiguous periods/categories. An empty period reports no recorded entries rather than inventing an explanation. Say what records show; causal claims such as why spending rose need evidence, and forecasts/advice are outside the first release.

Acceptance: answer totals equal the records at the linked filters, including empty ranges and transfers. Reuse PIN/session protection and the existing local runtime; evaluate query interpretation and arithmetic separately from prose quality.

### 9a. Subscription detection

Propose candidates from saved expense history with similar descriptions and roughly weekly, monthly or annual timing. Explain the matched transactions and allow confirm, dismiss and later removal. Separate fixed-price and variable-price recurring bills. Start with an explainable minimum history, proposed three occurrences for weekly/monthly candidates; sparse annual histories may remain undetected.

Next expected dates are estimates and missing records may mean the owner has not entered a payment. Do not treat a candidate as a confirmed contract, send cancellation actions, or automatically record future payments. Confirmed tracked subscriptions and dismissals need durable state.

Acceptance: one-off shopping is not automatically labelled a subscription, end-of-month schedules tolerate month length, and dismissed candidates stay dismissed according to the chosen rule.

### 9b. Reconciliation

Start with one wallet, a statement period and an explicit opening or closing balance at a known cutoff. Reuse CSV matching and existing balance-history information, but keep matching existing rows separate from importing new ones. Show matched, unmatched, possible duplicate and timing-difference entries. A transfer is matched to the correct side; opening balances and corrections are not income. Investment valuation and deposito interest need separate semantics and should be excluded from the first version.

Recommend session-only matching first. If saved reconciliation sessions are needed, design durable statement IDs/matches and backup behaviour separately. Bank formats and available statement balances must be checked with anonymised examples before claiming support. Prefer a statement cutoff or ledger balance over an available balance that may include pending charges.

Acceptance: matching an already recorded payment never imports it twice; a difference remains explicitly unresolved until the owner approves a transaction or uses the existing balance-correction flow. No silent balancing adjustment.

### 7. Images and voice: future updates

Keep deferred. Receipts need total/subtotal/tax/change handling, while bank screenshots may contain multiple records. Voice needs transcription and confirmation of uncertain money/wallet words. Both feed the existing draft/batch review; neither gains a separate save path. Trial local extraction/transcription and realistic resource use before selecting a runtime. Any external service, retention or upload decision needs a separate scope discussion; it is not authorised by this roadmap selection.

## Proposed decisions for the first implementation pass

Recommended defaults, not yet owner-confirmed specifications:

1. Duplicate notices are advisory; identical legitimate payments can be saved.
2. Learning begins with an explicit remembered rule after a confirmed save.
3. Last weekday means strictly before today; ambiguous bare weekdays ask.
4. Undo covers all completed edits in the open draft, with bounded memory-only history.
5. Message batches begin at five rows and save atomically with retry protection.
6. Spending questions begin in Insights; reconciliation begins session-only with CSV statements.

Persistent rules, templates, subscription tracking and any durable batch-request keys require schema work. Build and rehearse those changes in isolated frontend/backend copies under `.nb-test`, including upgrade compatibility and backup/restore tests, before copying completed code to the live workspace. All browser verification continues to use proven sample data on localhost:3200/4200. Each implemented stage should update product/usage docs and report its own unit, browser and live-model coverage. The prior instruction to build five earlier steps without stops was scoped to the delivered steps 5-9; this review does not extend that authorisation to these new stages.

Review only: no application code, database, model settings or running services changed, and no application tests were run. PRODUCT.md and DESIGN.md continue to describe shipped behaviour.

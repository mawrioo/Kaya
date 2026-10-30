# Learning, favourites, batches, questions and recurring payments

Final verification update: [the later full QA pass](FINAL-TESTING.md) passes 916 unit cases and all 137 regular production browser cases, with both live-model suites separately verified. It also records the final parser fixes. Counts below describe the initial release checks.

Delivered 28 Oct 2026 at the owner's request to build items 4-8 in the reviewed order (stages D-H). The earlier duplicate/undo/date release remains intact. Reconciliation is the following stage; receipts/screenshots and voice remain future updates.

## Delivered

- **Category learning:** an explicit checkbox on a Smart entry opts into an exact normalized note/type/category rule. The transaction and opted-in rule save atomically. Cancelled or abandoned drafts teach nothing. Remembered rules precede incidental category words, historical inference and model suggestions; actual category commands and manual choices still win. A prepared draft explains when a rule matched. Rules can be inspected, edited and forgotten. Deleting a category cascades its rules; category-delete Undo does not resurrect the removed rules. Automatic promotion from repeated corrections is not implemented.
- **Favourite templates:** named drafts with optional amounts, existing wallet/category references and no retained transaction date. Use opens today's editable draft in Jakarta; unavailable references are cleared for replacement. Create, use, rename/update and delete controls live in Quick add. Saving a template does not save a ledger entry.
- **Several transactions:** at most five separately reviewable expense/income/transfer drafts with stable IDs, individual replies/revisions, field edits, undo and selection. Semicolons/newlines are the clearest separators; supported comma/conjunction splitting is conservative and never inherits another row's date/wallet. Review shows duplicates against saved/selected entries and per-wallet effects, respecting hidden balances. Selected valid rows save atomically, through the existing ledger insertion path without CSV replacement privileges.
- **Durable batch retry:** a stored request key and canonical validated payload prevent repeated writes after a lost or malformed acknowledgement. The browser freezes its exact confirmed rows/timestamps for retry. Replaying the same request returns its original transaction IDs and current wallet balances; changing the payload under that key is rejected. Keys survive restart and backup. Closing an uncertain browser draft loses its retry controls, so the owner should inspect Transactions before starting the same entries again.
- **Spending questions:** Insights interprets bounded English/Indonesian totals, largest expenses and whole-month comparisons into validated filters. Code calculates every number; no arbitrary SQL or model arithmetic. Transfers/balance adjustments are excluded. Each figure links to the corresponding date/wallet/category or exact record scope. Unknown filters, exclusions, unsupported constraints, conflicting periods and ambiguous inputs ask instead of broadening the answer. Records changing clears old answers and aborts delayed ones. Questions currently use deterministic parsing and no inference.
- **Recurring payments:** at least three distinct-day expense occurrences with the same normalized note/wallet can suggest weekly, monthly or annual patterns. The bounded recent-history detector tolerates calendar month ends and variable prices, excludes income/transfers/deposito/investment wallets, and links its evidence. Next date is an estimate after the latest recorded occurrence, possibly already past if records are missing. Track/dismiss/remove preferences persist; no future payment, cancellation action or push notification is created.

## Migration and data protection

Built first in copies of both apps under `.nb-test`. Four additive tables hold category rules, templates, recurring preferences and durable batch keys. Existing whole-file backups include them. No existing ledger schema or money semantics were replaced.

Before applying source changes, the owner's database and any SQLite sidecars were copied into the isolated workspace. Only that copy was opened for rehearsal. Every pre-existing table's contents remained identical after the upgrade; integrity passed, no new foreign-key violations appeared and assistant preferences began empty. No owner values were printed or used in inference. The rehearsal copy was removed at cleanup. Tests also cover synthetic older-schema upgrade, repeat opening, persistence, backup/reopen, category deletion and reset.

The normal backend opens the new tables automatically at startup; no data reset or manual SQL command is needed. Testing never used the real app ports 3000/4000 or wrote the owner's database.

## Verification

| Check | Result |
| --- | --- |
| Full unit suites | 900 passed: 644 backend, 256 frontend |
| New backend acceptance coverage | 16 persistence tests, 7 API/boundary tests, 55 question/recurring tests |
| Typecheck and lint | Passed |
| Existing Quick add/conversation/improvement browser checks | 25 passed in the first integration run; passed again in final production |
| Entry expansion browser cases | 10 passed after correcting field labels and grid sizing |
| Insights browser cases | 8 passed after correcting test assumptions and locator scope |
| Legacy and CSV-import browser run | 58 passed |
| Final production build and acceptance run | 43 passed, covering all new entry/Insights cases and existing Smart entry safeguards |
| Expanded live-model flow | Passed separately in development and production |

The first browser integration found real accessibility/layout defects in the batch amount field; linked labels and flex/grid minimum widths were fixed. Insights tests initially assumed a nonempty BCA Food period and treated the existing Groceries category as unknown; fixtures were corrected to test actual data and an unknown category. Acceptance checks were retained rather than suppressing failures.

Browser coverage includes cancellation/opt-in-only learning, rule/template management, independent batch corrections and explicit missing-type selection, no writes before confirmation, exact three-type wallet effects, lost and malformed acknowledgements, exact same-key retry, stale row/question responses, evidence links/record scope, tracked/dismissed preference persistence, no future-payment writes, PIN locking, ordinary manual entry and CSV import. Request/body bounds and atomic failure/replay are tested at the API/store level.

The live test uses the installed local qwen3.5:2b. It infers an unfamiliar entry's category, saves an explicit Shopping rule, reuses the rule without inference, then prepares an expense, income and missing-amount transfer. Row replies and undo make no model calls. A deliberately lost batch acknowledgement is retried with the same key and exactly three records result, with exact balances. A read-only question leaves the ledger unchanged and makes no inference call. Model output still only selects a compatible category.

| One live observation | Development | Production |
| --- | --- | --- |
| First inference including load | 9.260 seconds | 6.552 seconds |
| Later inferences | 2.154 / 1.776 seconds | 2.134 / 1.783 seconds |
| Complete expanded browser scenario | 21.986 seconds | 14.771 seconds |
| Actual inference calls | 3 | 3 |
| Batch attempts / resulting records | 2 / 3 | 2 / 3 |

These are single observations, not guarantees. Raw measurements and migration booleans are in [assistant-expansion-results.json](assistant-expansion-results.json).

## Repeating checks and limits

Ordinary deterministic acceptance:

```powershell
npm.cmd run test:browser -w frontend -- --project=assistant-expansion --project=assistant-insights
```

Production acceptance uses the same command with KAYA_BROWSER_PRODUCTION=1. The separately opt-in live test is:

```powershell
$env:KAYA_BROWSER_REAL_AI = "1"
npm.cmd run test:browser -w frontend -- --project=assistant-expansion-live
```

Set KAYA_BROWSER_PRODUCTION=1 as well for its isolated production build. The harness requires an idle local model before each live run and unloads it afterward.

Every browser run copied both apps, used localhost:3200/4200 and a throwaway DB_PATH, and proved sample BCA Rp 8.742.300 and 41 transactions before testing. Owned copies/processes and rehearsal data were cleaned up; the existing Ollama service and unrelated scratch file were left alone. Desktop light and narrow light/dark screenshots were inspected in bounded passes. Real phone hardware, Safari and Firefox remain untested. No model download, configuration change, external service, commit or reconciliation/image/voice implementation.

The natural-language grammar and candidate detector are deliberately bounded. Unknown wording can require manual fields or a clearer supported query. Duplicate notices remain advisory; durable retry protects one confirmed batch key rather than detecting every logically similar future entry. Category suggestions still need review. Persistent preferences are backed up with the database; conversation and undo history remain memory-only.

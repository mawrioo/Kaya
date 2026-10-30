# Final assistant verification

Completed 28 Oct 2026 at the owner's request, after the learning/templates/batches/questions/recurring release. No schema change, model download, configuration change or commit was needed for this verification.

## Final results

| Check | Result |
| --- | --- |
| Backend unit suite | 660 passed |
| Frontend unit suite | 256 passed |
| Total unit cases | 916 passed, zero failures |
| Typecheck and lint | Passed |
| Full production Chromium suite | 137 passed; two explicitly opt-in live suites skipped here |
| Latest-source production Insights + single-entry live model | 9 passed |
| Latest-source production expanded batch live model | 1 passed |
| Corrected development dynamic suite | 7 passed |
| Whitespace and cleanup checks | Passed |

The full production run built the isolated app and covered every regular browser project, rather than only the earlier assistant acceptance subset. Coverage includes PIN/session locking, CSV import, dynamic refresh, transaction filters/totals, category learning, favourites, independent batch drafts, uncertain saves, durable retry, spending evidence, subscription choices, keyboard interaction and responsive layouts. Live suites were then opted into separately, so their earlier skip is not an untested integration gap. The final post-fix Insights production pass also uses the strengthened highest-expense evidence assertion.

## Defects and test issues found

1. Largest-expense synonyms were inconsistent: a request for 10 highest expenses could return the default five. Requested counts now work with all supported synonyms; competing, decimal-style or signed counts ask for clarification. The browser evidence test now requests three highest expenses and requires three links.
2. Category/month words inside a recognized wallet name or nickname could unintentionally narrow a query or add a period. Wallet spans are now masked before those filters are extracted, while separate explicit category requests remain effective. A bare label shared by a wallet and category asks which role was intended. Sixteen regression cases were added across these parser fixes; all 63 question cases pass.
3. The first complete development browser run passed 136 cases but found one outdated test setup: the stale-poll test expected expense-only Quick add and intercepted every data read, including the new fresh duplicate check. Its setup now explicitly selects Simple expense and holds only the polling read. The original balance/stale-response assertions remain. It passed in the seven-case development retest and the full production run.
4. A backup unit fixture occasionally crossed a second boundary between its requested backup time and filesystem modification time. The newest-backup test now controls both file times explicitly, preserving its newest-copy and timestamp assertions. Production backup behaviour was not changed.

No failed check remains unresolved. Earlier failing runs were retained during diagnosis rather than treated as passing; the final unit/type/lint and production checks above passed after the relevant fixes.

## Actual local-model verification

The installed qwen3.5:2b was called through browser, Next proxy and Hono in production, without a cloud fallback.

- Single-entry flow: expense and income made two actual category-inference calls; transfer made none. Missing amounts and corrections stayed deterministic, undo preserved manual notes, and explicit confirmation created one correct record per type with exact balance changes and persistence.
- Expanded flow: three actual category-inference calls, learned-rule reuse without inference, three independent transaction types, missing-field replies, undo, and a deliberately lost acknowledgement. Two attempts with the same durable batch key created exactly three records. Read-only questions made no model call and left the ledger unchanged.

Observed single-entry preview times were 8.588 seconds for the first expense (including load), 1.922 seconds for income, and 0.083 seconds for a transfer. The expanded scenario took 12.906 seconds, with inference timings 5.297 / 2.067 / 1.697 seconds. These are individual observations, not performance guarantees. [Raw counts and measurements](final-testing-results.json) accompany this report.

## Isolation and practical limits

All browser runs used copied frontend/backend apps under `.nb-test`, localhost:3200/4200 and throwaway databases. Each harness first proved sample BCA Rp 8.742.300 and 41 transactions. Unit tests used isolated/in-memory stores, with a defensive disposable DB_PATH that was not created. The real database and real app ports 3000/4000 were never used for testing. No new migration rehearsal against owner data was needed because this pass changed no schema; the earlier rehearsal is documented in [the release report](ASSISTANT-EXPANSION.md).

Owned test copies/processes were cleaned up, test ports closed and the model unloaded. The pre-existing Ollama service and unrelated scratch file were preserved. No commit or push was made.

This is automated Chromium verification. Real phone hardware, Safari and Firefox remain untested. Bounded wording still matters; unsupported questions or ambiguous inputs should clarify rather than guess. Category suggestions require review and duplicate notices remain advisory. These checks provide measured acceptance evidence, not a guarantee for arbitrary language or every device.

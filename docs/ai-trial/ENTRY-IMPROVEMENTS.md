# Duplicate notices, draft undo and broader dates

Delivered 28 Oct 2026. The owner requested the first three items in the reviewed build order: duplicate notices, undo for draft edits and broader dates (stages A-C in [the expansion review](../AI-ASSISTANT-EXPANSION-REVIEW.md)). Category learning and the later stages remain future work.

## Delivered behaviour

**Duplicate notices.** Transaction forms compare type, exact amount, wallet and Asia/Jakarta calendar day against saved records. Transfers compare both endpoints in the same direction; editing excludes the row itself. A matching normalized note strengthens the explanation, while a different note/category still permits a notice. The muted notice shows at most three records, the total count and a link to the wallet's monthly Transactions in a new tab. A legitimate repeat payment remains saveable.

Confirmation also reads fresh data through the existing PIN-protected API. A newly observed or changed match keeps the draft open and asks for review again. Double-clicking cannot skip that review. An offline check preserves the draft with zero save requests. Checks are advisory: a concurrent entry created after the last check is still possible. Existing in-flight and uncertain-save protection remains separate; no durable idempotency or uniqueness constraint was added.

**Undo last change.** Smart entry keeps up to 20 draft snapshots in dialog memory. A snapshot restores form values, category provenance/suggestion, review state and the pending question, including transfer-end choices. Typing within one field forms one undo step until focus leaves it. Applied replies create a step only when the form or question changes; rejected or unchanged replies do not. Undo aborts pending work and uses a new revision, so an old response cannot restore the reverted change. Missing wallet/category references are cleared rather than resurrected. Saving, Start new, switching modes, replacing the original sentence, closing or locking clears the relevant history. Undo never changes a saved transaction or deletes a newly created category.

**Broader dates.** A shared deterministic resolver handles initial sentences and corrections, removing date numbers before money extraction. Supported phrases include last Friday/Jumat lalu, two days ago/dua hari lalu, and the 25th of last month/tanggal 25 bulan lalu, alongside today/yesterday/ISO dates. Numeric days ago support 1-365; English and Indonesian number words support one through ten. Last weekday is strictly before today, including seven days back on that weekday itself. Bare weekdays, numeric dates such as 03/04, invalid previous-month days and competing dates ask for clarification. Minggu lalu is ambiguous (last week/Sunday); hari Minggu lalu explicitly means last Sunday. Newly requested relative dates use Jakarta today; already resolved calendar days survive midnight and unrelated edits.

## Verification

| Check | Result |
| --- | --- |
| Full unit suites, final source | 822 passed: 566 backend, 256 frontend |
| Added unit coverage | 34 date/resolver/preview cases; 6 duplicate-matching cases |
| Typecheck, lint and whitespace | Passed |
| First conversation/entry browser run | 24 passed |
| Broader browser regression run | 60 passed: 50 existing cases and 10 improvement cases |
| Final affected development browser run | 28 passed, including double-click, offline check and existing save safeguards |
| Final production build/browser run | 11 passed: all 10 improvement cases plus the live-model flow; includes the final original-sentence history-reset fix |
| Live local model in development | Expense, income and transfer conversations passed |

Browser assertions cover advisory duplicates, an entry added by another device during confirmation, double-click protection, offline checks, whole manual-edit undo, dependent category restoration, missing-field restoration, rejected corrections, stale requests, all reset paths, exact saved dates, zero writes before confirmation and exact single-write balance effects. Existing checks also cover PIN locking, uncertain-save acknowledgements, keyboard entry, manual forms and wallet nicknames.

The live suite freezes its server's reference day to 28 Oct 2026 and verifies last Friday = 23 Oct, dua hari lalu = 26 Oct, and tanggal 25 bulan lalu = 25 Sep. Each type starts without an amount, receives an answer, preserves a manual note through an amount correction and undo, then confirms once. Exactly two local category-inference calls occur per run (Food and Salary); transfers, date calculations, replies and undo make none. Categories remain suggestions and these two examples are not a general accuracy measurement.

| Initial preparation, one observation | Development | Final production |
| --- | --- | --- |
| Expense including model load | 7.584 seconds | 5.484 seconds |
| Income with model loaded | 1.458 seconds | 1.902 seconds |
| Transfer without inference | 0.144 seconds | 0.069 seconds |

These are individual measurements, not performance guarantees. Raw results: [entry-improvements-live-results.json](entry-improvements-live-results.json). The opt-in commands in [LIVE-BROWSER.md](LIVE-BROWSER.md) run the expanded live suite. For the final production acceptance suite, add `--project=smart-entry-improvements` alongside `--project=smart-entry-live`.

## Isolation and remaining limits

Every browser run used copies of both apps under `.nb-test`, localhost:3200/4200 and a throwaway DB_PATH. The harness proved sample BCA Rp 8.742.300 and 41 transactions before testing. Unit tests used isolated/in-memory stores; the defensive DB_PATH files were not created. No tests used the owner's real database or app ports 3000/4000. Owned app copies/processes were removed and the model unloaded; the pre-existing Ollama service and unrelated scratch file were left alone. No schema, model configuration, model download or commit.

Desktop light, 390px dark and 320px light screenshots were inspected in two bounded passes. The notice wraps without horizontal overflow and confirmation remains reachable by scrolling. Real phone hardware, Safari and Firefox were not tested. Date grammar remains bounded; arbitrary dates/compound messages still need clarification or the ordinary form. Durable learning, templates, batches, images, voice, spending questions, subscriptions and reconciliation are outside this release.

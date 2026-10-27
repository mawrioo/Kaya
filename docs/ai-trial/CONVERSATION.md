# Smart entry: follow-ups and corrections

Delivered 27 Oct 2026. The owner authorised all five next-version steps in one pass, overriding the earlier review stops. These correspond to steps 5-9 in [the plan](../AI-ASSISTANT-NEXT-STEPS.md).

## Delivered behaviour

- Initial extraction preserves independently understood type, amount, wallets, date and note before choosing a missing-field question. Replies carry one bounded, validated draft with field provenance and a revision. No schema changes or saved transcript.
- Short English/Indonesian answers fill missing details. One correction changes one field atomically. Invalid corrections retain the previous draft. Transfers require distinct wallets and ask which end an ambiguous correction refers to.
- The original sentence, current question, reply box and editable form share one dialog. Manual answers advance the question; unrelated corrections preserve manual choices. Start new, close, lock and save-and-add-another clear conversation context. Editing while a request is in flight invalidates its response.
- Financial fields and replies are deterministic. The local model sees only the initial note and compatible category vocabulary. No model calls are made for follow-up answers or corrections; a newly required category after a type change is selected by the owner.
- Enter never saves. Confirmation remains disabled for incomplete drafts or unresolved ambiguity. Existing duplicate-submit and uncertain-save safeguards remain active.

## Verification

| Check | Result |
| --- | --- |
| Fixed multi-turn corpus | 44/44 cases passed; English/Indonesian, all three types, missing fields, valid and invalid corrections |
| Additional conversation unit checks | 5/5 passed: manual provenance/midnight, forged context, atomic changes, simultaneous missing fields, colliding wallet names |
| Full unit suites | 782 passed: 532 backend, 250 frontend |
| Typecheck and lint | Passed |
| Smart entry browser suite | 10 passed |
| New conversation browser suite | 5 passed, then passed again with the broader regressions |
| Broader browser regression run | 55 passed, including the 5 conversation cases and 50 existing cases |
| Live Ollama, development | Passed all three multi-turn transaction flows |
| Production build and live Ollama | Passed all three multi-turn transaction flows |

The fixed corpus is in `backend/src/preview-conversation.test.ts`; established before tuning the flow, it checks expected financial fields and requires zero extra model calls for replies. Additional tests compare entire drafts and provenance for atomic corrections. Browser checks cover no writes before confirmation, exactly one write afterward, exact balance changes, retained manual choices, stale replies, keyboard use, cancellation, PIN locking and uncertain acknowledgements. Automated tests are evidence for the supported grammar, not a guarantee for arbitrary sentences.

The live test starts each transaction without an amount, supplies it through the reply box, manually edits the note, then applies an amount correction before confirming. Food and Salary were suggested correctly by two actual inference calls in each run. The transfer and every reply/correction used no inference. Category quality is separate from financial parsing; two live examples are not a broad category-accuracy measurement.

| Initial preparation | Development | Production |
| --- | --- | --- |
| Expense, including model load | 6.517 seconds | 6.504 seconds |
| Income, warm model | 1.908 seconds | 1.936 seconds |
| Transfer, no model | 0.128 seconds | 0.083 seconds |

Single observations, not performance guarantees. Raw measurements are in [conversation-live-results.json](conversation-live-results.json). The commands in [LIVE-BROWSER.md](LIVE-BROWSER.md) now run this multi-turn live test.

## Isolation and limits

Every browser run copied both apps into `.nb-test`, used localhost:3200/4200 and a throwaway DB_PATH, and proved sample BCA Rp 8.742.300 and 41 transactions first. Tests did not use the owner's database or app ports 3000/4000. The harness removed its owned copies/processes and unloaded the model. Existing unrelated scratch files are left alone. No model download, configuration change or commit.

Desktop light and 390px dark/320px light review screenshots were inspected. The dialog scrolls on narrow screens; confirmation remains reachable. Real phone hardware, Safari and Firefox were not tested. Supported dates remain today, yesterday and ISO dates. One transaction and one correction per reply; broader dates, voice, receipts, batches, recurring entries and persistent learning remain separate work. A model outage still offers the ordinary form. Category suggestions always need review.

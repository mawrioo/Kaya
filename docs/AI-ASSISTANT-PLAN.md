# Kaya AI assistant: improved Quick add

Revised 27 Oct 2026 after the owner's clarification. Stages 1 through 4 are complete: model trial, backend preview, Quick add UI and automated release verification. Owner review is next. This replaces the earlier proposal to start with a separate read-only Assistant page. Build one stage at a time and stop after each for review.

## What the owner wants

Type a natural sentence, let Kaya prepare the transaction, then confirm it to save. The owner chose typing first; microphone input is deferred.

Keep the existing Quick add coin and Ctrl+K entry point. The normal path is sentence -> prepared transaction -> Confirm and save. The owner should not have to fill every field again. All prepared fields remain editable, and nothing changes a wallet balance before confirmation.

Examples (relative dates resolve at the time of entry):

| Input | Prepared transaction |
| --- | --- |
| paid 35rb for lunch from BCA yesterday | Expense, Rp 35.000, Food, BCA, yesterday, note Lunch |
| gaji 5jt masuk Jago hari ini | Income, Rp 5.000.000, Salary, Bank Jago, today |
| pindahin 500rb dari BCA ke Jago | Transfer, Rp 500.000, BCA to Bank Jago, today |

Expense, income and transfers are confirmed first-release scope, approved by the owner on 27 Oct 2026. This deliberately extends the existing expense-only Quick add. Support one transaction per submission initially; ask the owner to split a sentence containing several transactions instead of silently omitting one. Spending questions, screenshots, voice, recurring entries and saved chat history are later features. The pet and template Monthly note are outside this change.

## Existing pieces to reuse

- frontend/lib/quick-add.ts: exact parsing of rupiah shorthand and wallet names/nicknames. It currently supports only expenses and does not understand natural dates.
- frontend/components/transactions/transaction-dialog.tsx: text entry, form filling, category suggestions, review and explicit save. Extend this flow rather than building a separate chat page.
- frontend/lib/transaction-form.ts: the common expense/income/transfer form and conversion into a NewTransaction.
- frontend/lib/category-suggestion.ts: categories previously used for similar notes.
- backend/src/validate.ts: authoritative transaction validation, including IDs, type, amount and date.
- Existing POST /api/transactions and frontend data-provider action: saving and updating displayed balances.
- Existing PIN middleware in backend/src/app.ts and /api proxy in frontend/next.config.ts.

No schema change is expected. Do not promise an Undo-after-create feature without checking the existing save behaviour; adding that would be a separate choice.

## How it should feel

Open Quick add and type a sentence. Enter or Prepare transaction fills the review. Show the amount most prominently, followed by type, wallet (or transfer direction), category, exact calendar date and note. Use the existing form controls for corrections, with a clear Confirm and save action. Pressing Enter to submit the sentence must not also save the generated draft.

For a complete sentence, one confirmation is all that is needed. When essential information is missing, ask one focused question or show the existing field picker. Examples: "How much was it?" and "Which wallet paid?" Keep the original sentence and already understood fields while resolving it.

Defaults and uncertainty:

- No date: use today, visibly shown in the review. Resolve yesterday/kemarin and other relative dates in code using the entry date in Asia/Jakarta. An ambiguous numeric date needs clarification.
- No wallet: keep the currently selected/last-used wallet and visibly label it as a default. If the sentence explicitly names an unknown or ambiguous wallet, ask instead of silently substituting one. A transfer needs two different, valid wallets and an unambiguous direction.
- Category: an explicit valid category wins, followed by an established note suggestion, followed by an AI suggestion among existing categories of the correct type. Otherwise visibly propose Other or ask for a category. Never create a category automatically.
- Missing or ambiguous amount: ask. Interpret rb/k/ribu/jt/juta and whole rupiah with deterministic parsing. Never let a model invent an amount. Multiple amounts, discounts, quantities or fees that require interpretation need clarification in the first version.
- Unsupported wallet operations, such as depositing into a deposito or updating an investment's market value, lead to the existing specialised flow. Do not misclassify these as income or ordinary transfers.
- Keep interface labels in English and accept English/Indonesian input. Manual edits take priority. A delayed model result cannot overwrite a newer sentence or an edited draft.

## Technical flow

1. The browser submits text to a proposed POST /api/transactions/preview endpoint through the existing Next proxy. Register preview before /api/transactions/:id. The endpoint is protected by the existing PIN middleware and has no write capability.
2. The backend supplies Ollama only the sentence, reference date and minimal valid wallet/category vocabulary. No balances, full transaction history, PIN data or database access go to the model. Existing note-category matching can run in code.
3. Ask for a structured draft: transaction type, amount expression from the original text, matched wallet/category references, date expression and short note, plus any unresolved fields. Treat the model response as untrusted data. Source text must support the amount and direction; JSON shape alone is insufficient.
4. Code normalises money and dates, resolves names to current IDs and checks allowed operations. Validate complete drafts using the existing transaction rules; validate partial drafts separately and return missing-field issues without saving anything.
5. The browser displays the prepared fields and visible defaults. Changes to the sentence invalidate the old preview. Cancel or close aborts pending work and drops the draft. Keep drafts in memory only.
6. Only Confirm and save calls the existing transaction creation flow. Revalidate against current wallets/categories at save time. The model never invokes that endpoint. Disable repeated submissions while saving; after an uncertain network outcome, reconcile with saved data before retrying rather than automatically creating another transaction.

Keep short, exact expense shorthand fast through the local parser only when it is demonstrably within that parser's supported grammar. Its current success flag is not enough: a sentence containing "yesterday" or an income/transfer verb can currently parse as an expense with those words left in the note. Route richer input through the AI interpretation path; if Ollama is unavailable, offer the ordinary form or explicit simple expense input rather than silently dropping meaning.

Use one bounded model request per draft, not an autonomous agent loop. Add finite input/output limits, timeout, cancellation, one active inference at a time and stale-response protection. Allow AI to stay off. Keep Ollama bound to loopback, with cloud features disabled and no cloud fallback. Do not log financial sentences in routine logs. Lock/session expiry clears the draft, cancels inference and discards late responses.

## Stage 1: trial transaction extraction

The roadmap records Ollama 0.40.4 and qwen3.5:2b installed on 16 Oct, with cloud features disabled. It records a Ryzen 7 8840HS, 16 GB shared RAM and Radeon 780M. These are historical observations; runtime availability, free memory, inference quality and GPU acceleration have not been checked in this planning session.

Verify the existing setup and use synthetic wallet/category fixtures. Begin with the recorded 2B model, a 4K context and short structured output. Trial non-thinking mode only if supported by the installed runtime/model. Measure cold load, warm response time and memory use separately. Do not download a larger model before testing what is installed.

Prepare around 30 English/Indonesian examples covering expenses, income, transfers, dates, nicknames, category suggestions, missing amounts, unknown wallets, two amounts, multiple transactions and requests to bypass confirmation. Include instruction-like notes and invalid model output. Measure field-level correctness, especially amount, direction, wallet and date. Suggested target: at least 90% completely correct drafts for unambiguous supported examples, every ambiguous/unsupported fixture explicitly flagged, no writes during preview, and warm previews within about 10 seconds. These are review targets, not performance claims. Confirmation remains necessary even if fixtures pass.

Deliverable: measured results and recommended supported sentence types. Stop for review. If extraction is unreliable, narrow the supported language before integration; consider a separate larger-model trial only if memory permits.

## Stage 2: build the preview endpoint

Add a small injectable Ollama client, draft types and validators, deterministic amount/date normalisation and the PIN-protected preview route. Share types through backend/src/types.ts and the existing frontend type-only re-export. Give preview logic only the read methods it needs. Keep model/network tests separate from deterministic fixture tests.

Deliverable: typed, validated drafts or actionable missing-field messages; no database writes. Stop for review.

## Stage 3: upgrade Quick add

Extend the existing dialog to accept natural sentences and review expense/income/transfer drafts. Preserve the existing coin, Ctrl+K, keyboard/focus behaviour, standard form and manual fallback. Make complete input require only review and confirmation. Handle ambiguity with an inline picker or short follow-up that updates the draft without losing the original input.

Read frontend/AGENTS.md and relevant installed Next.js documentation before code changes. Apply the relevant UI skill during implementation. Follow DESIGN.md: existing cream/forest tokens, serif amount hierarchy, Inter controls, calm errors and reduced motion. Test loading, cancel, retry, unavailable model and phone keyboard states. Do not show model reasoning or technical field names in the product.

Deliverable: working sentence-to-confirmation flow. Stop for owner review.

## Stage 4: verify saving and release

- Unit tests: exact rupiah parsing, relative dates/month boundaries, type/category compatibility, wallet resolution, transfer direction, missing data and malformed model output.
- API tests: PIN enforcement, preview never writes, invalid/deleted IDs rejected at save, unsupported commands cannot mutate data, timeout/cancellation and concurrency.
- UI tests: generation does not save; confirmation creates exactly one transaction and updates the correct balances; edits override suggestions; repeat clicks, stale responses and uncertain save outcomes do not silently duplicate entries. Test expense/income/transfer, keyboard use, both themes and narrow layouts.
- Real-model smoke test: synthetic data only; report correctness, latency and memory without presenting mocked tests as proof of model reliability.
- Follow the isolated test procedure: inspect port ownership; copy both apps into .nb-test; use localhost:3200, backend 4200 and explicit throwaway DB_PATH. Prove BCA Rp 8.742.300 and 41 transactions before browser tests. Never test against 3000/4000 or the owner's real database. Clean up owned processes/copies afterwards.
- Run npm run typecheck, npm run lint, npm test and relevant isolated browser checks. State whether a real phone was tested.
- Update PRODUCT.md, DESIGN.md, ROADMAP.md and docs/USAGE.md with shipped behaviour, supported examples and local model startup/unload instructions. Stop for review.

## Status and references

Typing first and support for expenses, income and transfers are confirmed by the owner. Visible defaults and one transaction at a time are implemented. Stages 1 through 4 are complete, including browser-to-live-Ollama checks in development and production; see docs/ai-trial/LIVE-BROWSER.md. See docs/ai-trial/REPORT.md for the original model trial and docs/ai-trial/PREVIEW-SERVICE.md for the bounded backend service and combined evaluation. The model now suggests only a category; code owns the other fields. The existing dialog is connected and tested; see docs/ai-trial/SMART-ENTRY.md for delivery evidence and limitations. Next: owner review on their own device.

Planning inspected the product/design/roadmap docs, Quick add parser and dialog, shared form helpers, backend validation and API routing. No application code, model setup or real data changed. No inference or application tests ran during planning.

Official references checked for the initial plan on 27 Oct 2026: [Ollama chat API](https://docs.ollama.com/api/chat), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs) and [context length](https://docs.ollama.com/context-length). Confirm API compatibility with the installed version during the trial. Structured output constrains shape; it does not guarantee a correctly understood transaction.

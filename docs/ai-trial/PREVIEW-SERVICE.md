# Quick add preview service — Stage 2

Built 27 Oct 2026. Stage 3 now connects this service to Quick add; see [Smart entry delivery](SMART-ENTRY.md).

## API contract

`POST /api/transactions/preview` accepts `{ "text": "paid 35rb for lunch from BCA yesterday", "defaultWalletId": "wallet-bca" }`. The default wallet is optional. The route uses the existing PIN middleware; bodies are limited to 4096 bytes and sentences to 500 characters.

The response contains `status` (`ready`, `clarify`, or `unsupported`), `draft`, `defaults`, and a plain-English `message`. A ready draft contains type, positive integer amount, calendar date (`YYYY-MM-DD`), description and valid wallet/category references. Transfers use `walletId` for the source and `toWalletId` for the destination, without a category. Incomplete drafts may contain only the fields that have been understood. Never treat a non-ready response as a save request.

`defaults` identifies the date, wallet or category chosen by default on a ready draft. The next UI must display them clearly. The service never creates a transaction or adjusts balances. Only a later user confirmation should call the existing `POST /api/transactions`, which validates current references again. Shared response types are in backend/src/types.ts and already available through the frontend's type-only re-export.

## Local setup

With the Stage 3 interface release, the endpoint is available by default. Set `KAYA_AI_ENABLED=false` before starting the backend to turn it off. `KAYA_AI_MODEL` defaults to `qwen3.5:2b`; use an already installed local model. The server URL is fixed to `http://127.0.0.1:11434`. No runtime install, download, cloud fallback or database migration is performed. Keep Ollama's cloud-disabled configuration in place.

For a future isolated development server, set those variables in the backend's terminal alongside the established throwaway `DB_PATH` and port 4200. Do not test against the owner's database or ports 3000/4000. The app's backend starts normally when AI is off or Ollama is unavailable.

The model client returns distinct `disabled`, `busy`, `missing-model`, `unavailable`, `timeout`, `cancelled` and `invalid-response` codes with calm messages. It limits model work to one request at a time per backend process, 30 seconds, a 4K context, 100 output tokens and 16 KiB response bytes. A request abort cancels inference. The API also rechecks PIN access before returning a result. UI lock/close cancellation remains Stage 3 work.

## What code handles

- Whole rupiah and rb/k/ribu/jt/juta, including decimal shorthand such as 1,5jt. Multiple amounts, fractions of a rupiah and values outside the existing limits need clarification.
- Exact wallet names/nicknames, with explicit defaults supplied by the caller. Explicit wallet clauses using from/dari/to/ke/with/dengan/using/pakai and similar words must resolve to known wallets. The service never accepts model-selected wallets.
- Transfer direction written as from ... to ... or dari ... ke ..., in either order. Both wallets must differ. Deposito movements use their specialised flow.
- Today/hari ini, yesterday/kemarin and valid ISO calendar dates. Relative dates use Asia/Jakarta. Other date expressions require clarification.
- Explicit income/transfer vocabulary; ordinary expense shorthand remains the default. Conflicting type signals require clarification. This is a bounded parser, not general language understanding.
- Notes retained from the source sentence after recognised amounts, wallet references, dates and entry words are removed. No generated note can invent a merchant.
- Explicit categories, then the most recent exact normalised note match from local history, then a model category suggestion. This first backend version uses exact historical matches, not all of the frontend's fuzzy suggestion rules.

Only the remaining description and compatible category names/IDs go to Ollama. It cannot choose the amount, type, date, wallet, transfer direction or note. Null category suggestions fall back visibly to Other when available. Invalid IDs, extra model fields and malformed responses are rejected. Categories remain suggestions requiring review: the evaluation misclassified electricity as Other once.

## Deliberate limits

One transaction per sentence. Compound phrases containing and/then/dan/kemudian are conservatively sent to clarification, including innocent combined merchant descriptions. Discounts, refunds, splits, fees and unsupported date expressions go to the ordinary form. An arbitrary unintroduced unknown word can still be part of the note; use explicit wallet clauses and review any displayed default. The service does not claim to recognise every bank or every income/transfer paraphrase.

No conversation history, follow-up merging, microphone input or UI changes were added. Manual editing and preservation of newer user input will be implemented in the dialog stage. The API has no access to a model-driven write operation.

## Evaluation and tests

The [combined evaluation runner](preview-run.mts) imports the production preview service and uses only fictional data. It rechecks the original 30 sentences plus 12 new paraphrases frozen before the first combined run. The omitted-wallet case now supplies a known default and checks it explicitly. Expected amounts are numeric and dates are resolved, so this measures the full preview rather than the Stage 1 raw extraction contract.

Run `node --disable-warning=ExperimentalWarning docs/ai-trial/preview-run.mts`. It refuses an already loaded model, uses the existing local runtime and unloads the model afterwards. See [the results](preview-results.json). First combined run: 41/42 matched, 21/22 ready drafts matched completely, all 20 clarification/unsupported cases handled correctly, and all 12 new paraphrases passed. The sole miss was electricity -> Other instead of Bills. Warm model-assisted requests took 0.65–1.55 seconds (median 1.35 seconds); the first request including model load took 6.45 seconds. These are fixture-run observations, not performance guarantees or results while Kaya is running.

The final rerun after additional conservative validation checks also matched 41/42, with the same category miss. Its first model-assisted request took 4.95 seconds, and warm model-assisted requests ranged from 0.56 to 1.44 seconds (median 1.28 seconds). The linked JSON contains this final run. The model was unloaded afterwards and Ollama reported no loaded models.

Added 36 focused tests covering arithmetic/dates, ambiguous inputs, transfer direction, stale/default IDs, category isolation, cancellation, PIN enforcement, zero database writes, unchanged save validation, response limits, timeout and concurrency. Full project typecheck, lint and existing unit suites passed; targeted backend typecheck and the preview suite were repeated after the final validation changes. No browser, real-phone, live-data or end-to-end save/confirmation tests ran because the UI is unchanged. Test databases were in memory or existing isolated test fixtures; the real database was not read or changed.

The interface now preserves editable review and requires confirmation for every expense, income and transfer. See SMART-ENTRY.md for UI verification; owner review is next.

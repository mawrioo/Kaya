# Quick add extraction trial — 27 Oct 2026

Stage 1 is complete. **Do not integrate this extraction approach unchanged.** The installed model can handle common expense, income and transfer sentences, but failed the agreed correctness and ambiguity targets. This does not establish that the model cannot work with a narrower extraction task and deterministic checks.

## What ran

One smoke request followed by one 30-case synthetic evaluation using the same fixed prompt/schema. No prompt tuning or repeated attempts were used to improve the score. Ollama 0.40.11 served the existing qwen3.5:2b Q8_0 model locally, with thinking disabled, temperature 0 and a 4096-token context. Cloud-disabled configuration was present; the listener was bound to 127.0.0.1. Ollama reported zero VRAM allocation, so this run used CPU execution.

The trial used fictional BCA, Bank Jago and Cash wallets and fictional categories. No Kaya server, database or browser was used. No listeners were observed on 3000/4000/3200/4200 during the preflight. Windows CIM memory inspection was denied; Node's OS memory readings supplied the measurements instead.

## Results

| Measure | Observed |
| --- | --- |
| All expected fields/status matched | 19 / 30 |
| Complete ordinary drafts matched | 12 / 16 (75%) |
| Exact clarification/unsupported status matched | 7 / 14 |
| Ambiguous inputs incorrectly returned as drafts | 2 / 14 |
| Warm request median | 8.68 seconds |
| Warm range | 6.76–9.83 seconds |
| First full-run request, including load | 13.67 seconds (4.61 seconds loading) |
| Separate smoke request, including load | 15.91 seconds (7.05 seconds loading) |
| Model allocation reported by Ollama | About 2.21 GiB; 0 bytes VRAM |

Free memory was about 1.7 GiB at preflight and fell to about 0.30 GiB during the smoke request. Full-run samples ranged from 0.41 to 5.71 GiB as other system activity changed. These are system-wide free-memory samples, not peak process-memory measurements. Kaya was not running, so performance alongside the app remains untested. After the run, the model was unloaded and `/api/ps` confirmed an empty list; the pre-existing Ollama server was left running.

## Failures that affect the design

- `spent 30rb on lunch` invented Cash rather than leaving the wallet unspecified for the UI's visible default.
- `transfer 500rb BCA Jago` guessed source/destination despite missing an explicit direction.
- `lunch 25rb and dinner 40rb BCA` returned only the first expense as a ready draft.
- `bayar makan 50ribu dari bca kemarin` returned `50.000` rather than the original amount expression. The value is equivalent, but violates the extraction contract.
- `Salary 10.000.000 BCA` included the wallet name in the amount expression.
- A clear Jago-to-BCA transfer with yesterday unnecessarily requested clarification and omitted its date.

Five other misses were clarification-versus-unsupported label differences. Those withheld a ready draft, so they are less serious than silent guesses. One discount case also calculated an amount despite the extraction instructions, but returned a non-draft status. The report retains full raw structured outputs so these distinctions remain reviewable.

## Recommended next revision

Retain the requested expense/income/transfer scope, but reduce the model's responsibilities before UI integration:

1. Parse money expressions in code and reject multiple candidate amounts or multi-transaction input before requesting a draft. The model should select from code-extracted candidates, never rewrite or calculate amounts.
2. Resolve explicit wallet names/nicknames in code. Reject model wallet choices not supported by the sentence. Handle omitted wallets through the existing visibly labelled selection.
3. Require explicit, validated transfer direction and two different wallets. Ask when direction is uncertain.
4. Detect and resolve supported relative dates in code; keep ambiguous dates unresolved.
5. Use the model mainly to suggest transaction type, category and a short note. Keep confirmation and authoritative save validation mandatory.
6. Repeat this set plus fresh held-out paraphrases against the combined extraction/validation pipeline before connecting the UI. Do not interpret passing deterministic mocks as proof of model accuracy.

The next reviewed step should build and test that bounded preview service. UI integration should wait until the combined service satisfies the trial targets. A larger-model download is not recommended on the evidence of this one trial alone.

## Files and verification

- [Runner and fixtures](run.mjs)
- [Full results](results.json)
- [Smoke results](smoke-results.json)
- [Repeat instructions and limitations](README.md)

Verified script syntax, report JSON parsing, 30 completed results and model unload. Repository whitespace check passed. App typecheck, lint, unit suites and browser tests were not run because application source was unchanged. Malformed model output handling is present in the runner but was not independently fault-injected; transaction note generation, date/amount normalisation, follow-up corrections, backend validation and actual saving remain untested and unimplemented in this stage.

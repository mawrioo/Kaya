# Smart entry: real-model browser verification

Final verification, 28 Oct: [916 unit tests, the full 137-case production browser suite and both live-model flows passed](FINAL-TESTING.md). This is the latest check; historical release measurements remain below.

Latest expansion, 28 Oct: [learning, favourites, batches, questions and recurring payments](ASSISTANT-EXPANSION.md) passed 43 production acceptance cases and the expanded live-model flow in development/production. Use that report and its new opt-in suite for current results.

Latest release, 28 Oct: [duplicate notices, draft undo and broader dates](ENTRY-IMPROVEMENTS.md) passed the expanded live test and production acceptance suite. Use that report for current results; the earlier measurements below are historical.

Update: the live suite now covers missing-field replies and corrections as well. See [the multi-turn release report](CONVERSATION.md) for the latest development/production results. The Stage 4 results below remain the historical baseline; the repeat commands run the expanded suite.

Completed 27 Oct 2026. This closes the browser-to-live-Ollama and production-build gaps recorded in Stage 3.

## What passed

The same end-to-end browser test passed against both the isolated development app and an isolated production build:

1. `paid 35rb for noodles from BCA yesterday` prepared an expense with Food suggested by the real local model.
2. `gaji 5jt masuk Bank Jago hari ini` prepared income with Salary suggested by the real local model.
3. `transfer 500rb from BCA to Bank Jago` prepared a transfer without any additional model call.

Test-only instrumentation verified two real inference calls, not stubbed categories or local-history shortcuts. Before confirmation, both the transaction list and wallet data remained identical. Each confirmation created exactly one record, changed the correct wallet balances by the exact amount, and persisted after a page reload. Editing the prepared note retained the category. There were no browser page errors.

The production app was built with Next's build command inside its throwaway copy, then served in production mode on port 3200. Build completion, type checking and the live-model browser flow all passed. No application source changed during this stage.

## Observed response times

| Preview | Development | Production |
| --- | --- | --- |
| First expense, including model load | 9.06 seconds | 7.04 seconds |
| Income with the model already loaded | 1.91 seconds | 1.96 seconds |
| Transfer, without inference | 0.13 seconds | 0.09 seconds |

These are individual observations with Kaya running, not averages or guarantees. The test set is deliberately small; it verifies integration and does not replace the larger earlier language evaluation. Raw browser timings and inference timings are in [live-browser-results.json](live-browser-results.json).

## Isolation and cleanup

Both runs used copies of frontend and backend under `.nb-test`, `localhost:3200`, backend port 4200 and a throwaway database. The harness proved sample BCA Rp 8.742.300 and 41 transactions before running. The real database and ports 3000/4000 were not used.

Ollama's cloud-disabled configuration was checked. Only the existing local `qwen3.5:2b` model was used. The harness required no model to be loaded before each run and unloaded its model afterwards. Both copied apps and their owned processes were removed; final checks found no listeners on the test ports and no loaded Ollama models. The pre-existing Ollama server was left running.

## Repeating the check

The new `smart-entry-live` suite is skipped in ordinary browser runs. In PowerShell, from the repository root:

```powershell
$env:KAYA_BROWSER_REAL_AI = "1"
npm.cmd run test:browser -w frontend -- --project=smart-entry-live
```

For an isolated production build and the same browser check:

```powershell
$env:KAYA_BROWSER_REAL_AI = "1"
$env:KAYA_BROWSER_PRODUCTION = "1"
npm.cmd run test:browser -w frontend -- --project=smart-entry-live
```

Afterwards, clear the test switches in that terminal:

```powershell
Remove-Item Env:KAYA_BROWSER_REAL_AI -ErrorAction SilentlyContinue
Remove-Item Env:KAYA_BROWSER_PRODUCTION -ErrorAction SilentlyContinue
```

The live suite requires an already running local Ollama server and the installed model. Ordinary browser tests retain their deterministic stub. The metrics endpoint exists only in the isolated browser-test backend and requires the harness's random token.

## Checks and remaining limits

Project typecheck and targeted lint for the changed test infrastructure passed. Both live end-to-end runs passed, and the production build passed. The 733 application unit tests and 60 previous browser checks passed in Stage 3; they were not rerun wholesale for these test-only changes.

Real-phone hardware, Safari and Firefox remain untested. Category suggestions can still be wrong, as the earlier 41/42 evaluation demonstrated. Supported date and sentence forms remain bounded, with clarification/manual entry for unsupported cases. Review and confirmation are still required.

The automated release-verification stage is complete. Next is owner review of the delivered flow on their usual device; no further feature was selected.

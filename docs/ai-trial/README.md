# Quick add model trial

Stage 1 of [the implementation plan](../AI-ASSISTANT-PLAN.md). This is a standalone experiment, not a shipped Quick add feature.

Run from the repository root with Ollama already serving the downloaded `qwen3.5:2b` model:

```powershell
node docs/ai-trial/run.mjs --smoke
node docs/ai-trial/run.mjs
```

The first command tests one sentence; the second tests 30 fixed fictional examples. The script refuses to start if Ollama reports a loaded model, uses only loopback port 11434, requests a 4K context, disables thinking, and unloads its model on completion. It never starts Kaya or imports its server/store/database. No real records are read or sent. Close other memory-heavy applications before running. Each request has a 90-second timeout; a transport or parsing error stops the run.

Results are written beside this file as `smoke-results.json` and `results.json`. They include the complete synthetic inputs, expected/actual fields, exact-match failures, wall time, model load time, runtime version, processor allocation and free memory samples. Rerunning replaces these reports.

The trial scores the extracted type, original amount expression, wallet IDs, original date expression and category. Dates and amounts are deliberately left as source text for deterministic normalisation in the next stage. Notes, follow-up correction, backend validation, application save behaviour and browser interaction are not implemented or evaluated here. For clarification/unsupported cases, only status is scored; extra fields must never become a saveable draft without validation.

This is one small, fixed, single-pass evaluation. Passing it does not establish reliability on arbitrary sentences. In particular, constrained JSON does not guarantee semantic accuracy, and all saved transactions must still require owner confirmation.

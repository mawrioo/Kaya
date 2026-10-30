# Bottom navigation and simple Quick add - 29 Oct 2026

The owner selected bottom navigation and asked for a smaller bar and a simpler assistant.

## Delivered

- A 60px phone bar (plus the device safe area) with Home, Transactions, Wallets and More. Icons are 18px, labels 11px, and navigation tap targets at least 44px.
- More opens Goals, Categories, Insights and Pet in two columns, plus Settings. Settings shares the existing name, appearance, backup and PIN tools and adds Entry preferences. The panel scrolls on short screens and returns focus to More. The desktop sidebar is retained.
- Quick add becomes a compact 44px pill above the bar. It hides while More is open. Page padding allows the last record to scroll clear of both controls. Goal spacing is slightly tighter so three ordinary cards still fit clear of Quick add at 390 by 844; the six-wallet Home comparison also remains usable.
- One sentence and Review start Quick add. A missing detail asks one question. The next screen shows amount, note, wallet/category or transfer direction, and exact date. Defaulted values are marked. Edit details opens the existing fields and optional sentence corrections, and Review returns before saving.
- Undo appears only after a draft change. Save is explicit; Enter cannot save a Quick add draft. Successful saves show Done and Add another. Ordinary transaction forms keep their existing Save and add another behaviour.
- Batch entry, favourite loading and Simple expense live under More on entry. Save as favourite and Start new live under More on review. Rules and favourites are managed through Settings > Entry preferences. Remember this category stays optional inside editing, and only learns after saving.
- Existing validation, duplicate checks, abort/revision protection, uncertain-save handling and balance privacy are reused. Below-zero guidance remains visible when appropriate. No backend or database change was needed. The pet implementation was not changed.

## Previews

All previews use the isolated sample database.

| View | Light | Dark |
| --- | --- | --- |
| Phone navigation | [Preview](simple-nav-entry/light-goals.png) | [Preview](simple-nav-entry/dark-goals.png) |
| More | [Preview](simple-nav-entry/light-more.png) | [Preview](simple-nav-entry/dark-more.png) |
| Quick add | [Preview](simple-nav-entry/light-390-entry.png) | [Preview](simple-nav-entry/dark-390-entry.png) |
| Compact review | [Preview](simple-nav-entry/light-390-review.png) | [Preview](simple-nav-entry/dark-390-review.png) |
| Desktop review | [Preview](simple-nav-entry/light-1440-review.png) | [Preview](simple-nav-entry/dark-1440-review.png) |

[Expense](simple-nav-entry/expense-review.png), [income](simple-nav-entry/income-review.png) and [transfer](simple-nav-entry/transfer-review.png) after editing.

## Verification

- Typecheck, lint and all 916 unit tests passed. Isolated production builds passed.
- **159 distinct regular browser cases passed across the full pass and final focused run.** The full production pass ran all 161 cases: 155 passed, four failed and the two opt-in actual-model cases were skipped. After correcting the remaining interactions and an old button selector, the final production run passed all 52 affected cases. Those include all four former failures. This is aggregate coverage, not a claim that the full command ended green.
- The nine new cases cover navigation size/active state/settings/focus, portrait and landscape with enlarged text, exact single saves and balance changes for all three transaction types, clarification, corrections, manual entry, favourites/rules management and 320/390/430/1440px entry/review layouts in both themes. A favourite with a checked fixed amount cannot silently save an empty amount.
- Existing scenarios cover duplicate checks (including a new match from another device), failed duplicate reads, failed and uncertain saves, cancellation, delayed previews/corrections, undo, broader dates, batches and durable retries, PIN lock, polling, imports, goals, wallet privacy, nicknames, reports and touch scrolling.
- Regression work fixed a missing accessible dialog name, an incorrect clarification title, menu focus returning too early, and a view-only manual-entry switch incorrectly creating an Undo entry. Goal spacing was tightened so the floating Quick add does not cover the third card. Existing tests now reach fields and optional tools through the new UI; their financial and persistence assertions remain.
- Final typecheck, lint and whitespace checks passed. Both owned app processes and all browser app copies were removed. The pre-existing `.nb-test/kaya-ai-trial.mjs` helper was retained.

Final focused command (from the repo root):

```powershell
$env:KAYA_BROWSER_PRODUCTION='1'
npm.cmd run test:browser -w frontend -- --project=quick-add --project=smart-entry --project=smart-conversation --project=smart-entry-improvements --project=assistant-expansion --project=simple-phone-entry
```

Ready for owner review on the usual phone. No new feature is selected.

## Boundaries

Browser evidence is Chromium, emulated viewport sizes and synthesized touch. It does not establish iOS Safari or physical Android/iPhone behaviour. The two actual-model suites require explicit opt-in and are separate from normal deterministic browser checks. This task does not diagnose the previously reported Windows graphics timeout.

All browser checks use copied apps under `.nb-test`, localhost:3200/4200, a throwaway database and the harness's proof of BCA Rp 8.742.300 plus 41 transactions before tests begin. The owner's real database and ports 3000/4000 are not used. No commit made.

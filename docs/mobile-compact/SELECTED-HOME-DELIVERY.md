# Selected phone design delivered

29 Oct 2026. Implements the [reviewed build plan](SELECTED-HOME-BUILD-PLAN.md) and [latest selected mockup](../home-concepts/quick-add-centre/comparison.png).

## Result

- Open phone header with a bundled 24px Plus Jakarta Sans wordmark, current date and a static Home greeting. The wordmark link has at least a 44px touch height.
- Forest signature balance card, upright lining/tabular Inter digits, eye beside the amount, and static corner geometry. No phone Breakdown. Applicable below-zero information retains total/wallet privacy guards. Hidden dots have a fixed size independent of amount length.
- Separate compact wallet cards, complete aligned amounts, independent remembered visibility, and Manage. All six ordinary sample wallets fit above navigation at 390 × 844. Small widths and long content can use additional lines.
- Home / Transactions / + / Wallets / More in a 52px bar plus device safe area. The centre orange square is 40px with a 22px plus, no visible label and a touch target of at least 44px. Active destinations use an accent outline/label/short underline, with no filled tile.
- One shared Quick add owner for the phone plus, desktop coin and Ctrl/Cmd+K. The existing describe/review/save flow, confirmation protections, last-used wallet and receipts are reused. Opening Quick add preserves the current page; a draft survives responsive changes and closing returns focus to a visible trigger.
- Mobile grain removed; desktop presentation and the real content below Home wallets remain. No pet implementation, backend, schema, model or money-calculation change was made for this delivery.

## Screenshots from the working app

These use throwaway sample data, not the owner's balances.

| Screen | Preview |
| --- | --- |
| Phone Home, light | [Open](selected-home/light-home.png) |
| Phone Home, dark | [Open](selected-home/dark-home.png) |
| More sheet | [Open](selected-home/dark-more.png) |
| Quick add entry | [Open](selected-home/dark-390-entry.png) |
| Expense review | [Open](selected-home/expense-review.png) |
| Desktop reference, light | [Open](selected-home/light-desktop.png) |
| Desktop reference, dark | [Open](selected-home/dark-desktop.png) |

## Verification

- Final project typecheck and lint passed.
- Unit suites passed: 660 backend and 256 frontend cases, 916 total, no failures.
- Isolated production builds passed. A total of **101 distinct browser cases** passed across the affected suites and follow-up runs. This is aggregate coverage, not a claim that the first 101-case command was all green.
- The first broad production pass had 90 passed / 11 failed. Failures exposed outdated phone-button measurements/placement assertions, font-family quote normalisation in a test, and an invalid new API fixture. The next affected 53-case run passed 50 with three remaining failures: a too-small clickable phone-wordmark area and a fixture timestamp. The target was corrected to at least 44px and the fixture was corrected to the existing API contract. The final **33-case production confirmation passed completely**, including both themes, brand, Home, large/negative amounts and privacy, responsive Quick add, Goals, More/Settings and explicit-save effects.
- Earlier development checks passed 11 of 13 cases; two newly written test setups were corrected before the production passes.
- Source tests retain the existing financial assertions. Added four selected-design checks for six-wallet comparison/privacy, draft and focus behaviour across viewport changes, and large/negative figures. Adapted older 60px/floating-button expectations to the selected layout.
- Verified phone widths 320–430px, short landscape, enlarged text, touch interactions, reduced-motion reference checks and desktop layouts through the affected browser projects. More's modal blocks the centre action; shortcuts do not open over another dialog/menu. Expense/income/transfer preparation does not save; explicit confirmation writes once with correct balance effects. Cancellation does not write.
- Light/dark phone and desktop captures were reviewed together, followed by one final confirmation batch. No further visual polishing pass was performed.

Affected production projects: assistant-expansion, brand, mobile-compact, mobile-goals-menu, mobile-touch, quick-add, selected-phone-design, shortcut, simple-phone-entry, smart-conversation, smart-entry-improvements and smart-entry. See [structured verification](selected-home/verification.json) and retained production logs beside it for the exact run counts.

All browser runs used the existing harness's copied frontend/backend under `.nb-test/browser-*`, localhost:3200 and backend 4200, with a throwaway database. The harness proved BCA Rp 8.742.300 and 41 transactions before running. Owned copies and processes were cleaned up; no test listeners remain. No browser test used 3000/4000 or the real database.

## Limits and review

Chromium ran headlessly with GPU disabled using the optional `KAYA_BROWSER_DISABLE_GPU=1` test configuration. This does not reproduce the owner's physical display or Windows screen-capture path and does not establish a fix for LiveKernelEvent 117. No Chrome acceleration setting, driver or OS configuration was changed.

Physical iPhone/Android, Safari/Firefox, real on-screen keyboard behaviour and device safe-area behaviour are not verified on hardware. The actual local model was not loaded for this presentation change; deterministic preview responses exercised the assistant integration. No commit was made.

Owner review is the next step: check the Home comparison, centre plus and More/Settings on the usual phone.

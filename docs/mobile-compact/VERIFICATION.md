# Compact phone layouts: delivery and verification

28 Oct 2026. The owner authorised all seven planned steps together. The interface changes and available diagnostic work are complete; a physical-phone review and the Windows capture comparison remain outside the evidence collected here.

## Delivered

- Shared phone spacing: 16px sides, shorter page gaps, 28px titles, a 56px top bar and 44px primary touch controls. Home's phone greeting stays still, with no empty typing reserve; today's date is omitted from other phone page headers. Inputs retain at least 16px text.
- Home: compact wallet rows with full aligned balances, wallet links and independent persistent eyes; a shorter total card with expandable balance breakdown. Six ordinary sample wallets fit above the action area at a 390 × 844 CSS viewport. This is not a promise for every screen height, name or text size.
- Wallets: tighter rows keep names, balances, eyes and menus available. Show wallet details expands notes, goal reservations, value/history and deposito details. Matured depositos retain a visible status. Desktop details remain visible.
- Transactions: search, period, Filters, Add and More transaction actions remain near the list. Type/category/wallet filters fold with a visible count and chosen scope; Clear filters remains reachable. Import CSV moves into More on phones. The totals fold from a net summary while preserving full income/spending/net/transfer explanations. Rows use tighter padding and smaller badges.
- Categories: names and amounts align across rows, with smaller decoration, usable menus and budget bars below. Goals: tighter cards, saved/target/progress/pace retained, saving plans expandable and Add money available. Insights: summary figures first on phones, supporting overview/note/questions expandable, with charts and comparison views retained.
- Quick add: a solid bottom action area with safe-area padding and page clearance on phones. Desktop retains its floating coin.
- No database schema, arithmetic, owner data or pet implementation changes were made for this work. Existing uncommitted assistant work was retained.

## Checks

| Check | Result |
| --- | --- |
| Project type checking | Passed |
| Project ESLint | Passed |
| Backend and frontend unit tests | Passed |
| Isolated Next production build | Passed |
| Existing production browser acceptance cases | 137 passed |
| New compact mobile cases | 7 passed |
| New synthesized touch cases | 2 passed |
| Opt-in live-model browser cases | 2 skipped; no inference was needed for these presentation changes |

The 146 distinct browser cases passed across the full sweep and focused reruns. The full sweep initially exposed outdated assertions for the old top-bar/coin dimensions and import entry point, which were updated to verify the intended new behaviour. Its remaining new touch failures were traced and corrected in test input/flow handling, then rechecked against production. This is an aggregate result, not a claim that the first full command exited successfully.

The touch harness originally sent raw horizontal touch events followed by a tap; the first tap also failed on a plain HTML control page without Kaya. Chromium's gesture API completed the horizontal gesture and subsequent action tap correctly. Vertical scrolling is checked with native touch events so the browser must arbitrate against the row's horizontal drag. No application workaround was added for that harness behaviour. Closing the initial Quick add state uses its existing Close control.

Coverage includes light/dark at 360, 390 and 430px across Home, Wallets, Transactions, Categories, Goals and Insights (Month/Compare/Year); six-wallet comparison; remembered hidden balances; wallet menus and investment actions; filter scope, totals and CSV access; long names and a large balance; 20px root text; landscape; desktop controls and layout; actual synthesized touch swiping, action taps and vertical scrolling. Existing suites also exercise 320px layouts, keyboard operation, imports/undo, PIN protection, saved data, live refresh, forms and assistant flows.

## Isolation and cleanup

The existing harness copied both applications into `.nb-test`, served localhost:3200/4200 and used a throwaway database. Before each run it proved sample BCA Rp 8.742.300 and 41 transactions. The six-wallet fixture was created only after that proof. The owner's 3000/4000 servers and real database were not used. Each run removed its owned processes and app copy. Final checks found no listeners on 3200/4200 and no browser app-copy directories. The pre-existing `.nb-test/kaya-ai-trial.mjs` helper was retained.

## Graphics investigation

The two original LiveKernelEvent 117 reports establish display-driver timeouts, with the precise trigger unresolved. Read-only registry inspection identifies ASUS Zenbook 14 UM3406HA and AMD Radeon 780M, driver 32.0.11038.5002. The [ASUS support page](https://www.asus.com/us/supportonly/um3406ha/helpdesk_download/) currently lists that same driver version, so its older internal date is not proof that an OEM update was missed.

Chrome's saved graphics-acceleration preference is enabled. Temporarily disabling it and relaunching remains an owner-side diagnostic, following [Google's guidance](https://support.google.com/chrome/answer/142063?co=genie.platform%3Ddesktop&hl=en). No Chrome setting, driver or system configuration was changed. Protected WATCHDOG/WER dump contents could not be read. A follow-up event query still showed only the two original distinct dump names; headless tests cannot clear the Win+Shift+S / physical-display path. See the [investigation record](../MOBILE-COMPACT-REVIEW.md).

## Sample previews

These captures use synthetic sample data, not the owner's database. The Home capture also demonstrates hidden BCA and total balances; its viewport-fit assertion ran with those figures visible before hiding them.

| Surface | Light | Dark |
| --- | --- | --- |
| Home, six wallets and privacy | [Preview](sample-home-six-wallets.png) | — |
| Wallets | [Preview](light-wallets.png) | [Preview](dark-wallets.png) |
| Transactions | [Preview](light-transactions_month_2026_09.png) | [Preview](dark-transactions_month_2026_09.png) |
| Categories | [Preview](light-categories.png) | [Preview](dark-categories.png) |
| Goals | [Preview](light-goals.png) | [Preview](dark-goals.png) |
| Insights | [Preview](light-insights_month_2026_09.png) | [Preview](dark-insights_month_2026_09.png) |
| Desktop Transactions | [Preview](sample-transactions-desktop.png) | — |

Physical iOS/Android hardware, Safari/Firefox, a real software keyboard and device-specific safe-area behaviour were not tested. Font/viewport and synthesized-touch tests provide useful coverage, but do not establish those hardware behaviours. The Windows freeze has not been reproduced or declared fixed.

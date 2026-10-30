# Selected phone design: implementation plan

29 Oct 2026. The owner subsequently authorised this plan; see the [completed delivery and verification](SELECTED-HOME-DELIVERY.md). The steps below record the reviewed implementation approach.

Visual reference: [latest light/dark mockup](../home-concepts/quick-add-centre/comparison.png) and [interactive preview](../home-concepts/quick-add-centre/index.html). This supersedes the earlier header, font and Quick add placement alternatives for this proposed build.

## 1. Lock the selected design and scope

| Element | Production target at normal text size |
| --- | --- |
| Kaya wordmark | Plus Jakarta Sans, about 24px, weight 650; small date aligned right |
| Phone header | Open page surface, no separate forest-coloured top strip; scrolls with the content |
| Home greeting | Static serif greeting below the brand/date row; owner name from existing data |
| Total balance | Compact forest card in both themes, quiet static corner kawung, full rupiah value |
| Total digits | Upright Inter, lining and tabular figures, about 34px at 390px width |
| Privacy | Eye beside the total; independent eye on each wallet; existing saved privacy choices |
| Breakdown | No chart, legend or Breakdown disclosure on phones |
| Home wallets | “Your wallets” and Manage; separate compact cards, about 55px minimum height and 7–8px gaps |
| Bottom bar | Home / Transactions / + / Wallets / More; 52px at normal settings, plus device safe area |
| Centre action | 40px orange rounded square, 22px plus; no visible text below; at least 44px interactive target |
| Selected destination | Accent outline icon and label, short underline, no filled rounded tile |

Use the existing phone breakpoint, below 768px, throughout. The shared header and bottom navigation apply across phone pages; the new balance and wallet composition applies to Home. Existing page-specific forms and money operations continue through their current components. Desktop presentation is the regression baseline for this phone change; a mobile variant on BrandMark avoids restyling all desktop instances incidentally.

The sample amounts, six-wallet count, date and name in the HTML are illustrative. Production reads actual data and computes totals as it does today. Six ordinary wallets fitting at 390 × 844 is a target for the standard layout, not a cap on the number of wallets or a promise when names/amounts/text size require more room.

## 2. Prepare the workspace and implementation boundary

1. Record the existing working-tree changes. There is substantial uncommitted feature work; do not reset or overwrite it.
2. Recheck PRODUCT.md, DESIGN.md, ROADMAP.md and frontend/AGENTS.md. Resolve the installed Next package before reading its docs: in this workspace its guides are under root `node_modules/next/dist/docs/`, despite the usual frontend-relative path.
3. Read the installed local-font and server/client-component guidance before editing the relevant Next files.
4. List listeners/process ownership for owner ports 3000/4000 and test ports 3200/4200 before starting test services. A response from 3000 is not permission to use it for tests.
5. Keep the work in frontend presentation, its regression tests, bundled font assets and documentation. No database migration or backend change is required by this design.

Deliverable: a file-level implementation scope and preserved baseline. No commit unless requested.

## 3. Bundle the selected font and establish shared phone measurements

Files: `frontend/app/layout.tsx`, `frontend/app/fonts/`, `frontend/app/globals.css`, `frontend/components/brand-mark.tsx`.

1. Copy the already downloaded Plus Jakarta Sans variable font and its OFL licence from `docs/home-concepts/type-navigation/fonts/` into the app's font assets.
2. Register it using the app's existing `next/font/local` approach and a dedicated CSS variable. Use its supported weight range. The browser should load the font locally, including when offline.
3. Add a phone wordmark treatment to BrandMark, retaining its Home link and keyboard focus treatment. Use page-foreground colours on the open header rather than the old sidebar-on-dark colours.
4. Introduce a small set of shared phone values for navigation height, safe-area addition, plus size, horizontal inset and bottom content clearance. Use these in the navigation, More sheet and layout padding so those positions cannot drift apart.
5. Scope the total's sans-serif numeric styling to the phone balance. Keep the other serif headings as shown in the selected mockup.

Done when: the wordmark uses the real bundled font; local font loading works; light and dark text contrast is readable; no broad font replacement has changed the rest of the application.

## 4. Build the open header and Home spacing

Files: `mobile-topbar.tsx`, `page-header.tsx`, `app/layout.tsx`, and Home header composition where necessary.

1. Turn the solid sticky phone bar into the compact open brand/date row, aligned with the page's 16px side insets.
2. Put the small date on the right, greeting below on Home. Other phone pages retain their own title and supporting description beneath the shared row.
3. Remove the duplicate phone date pill from PageHeader; retain the desktop date treatment.
4. Use a consistent initial server timestamp and the app's existing date helpers, with hydration-safe client updates. Never ship the sample date. Avoid recreating timers or resetting forms when the date changes.
5. Recalculate the main top spacing and toast position after removing the tall solid bar.
6. Replace the full-page phone grain with the restrained page surface in the mockup. A subtle static warm tint may be used; keep the decorative emphasis on the balance card.

Done when: Home has exactly one wordmark/date row and one greeting; other pages have a clear title; a long owner name wraps; loading/reloading does not produce a hydration warning or flash an incorrect duplicate header.

## 5. Implement the signature balance card

Files: `home/total-balance-card.tsx`, scoped CSS; `balance-visibility.tsx` or `money.tsx` only if a small reusable presentation option is necessary.

1. Apply the phone forest card and compact padding in both themes. Use a small static corner decoration matching the approved image, preferably ordinary SVG geometry without adding noise filters, blur or extra masks.
2. Render the full existing total using upright Inter with lining/tabular numerals and a common baseline. Keep “Rp” smaller. Preserve the existing formatter and total computation.
3. Place the eye alongside the amount with a 44px touch target, and reuse the current privacy provider/cookie state. Hidden balances must be hidden on the initial server render as well as after hydration.
4. Remove the mobile Breakdown disclosure, chart and percentage legend. Retain desktop breakdown behaviour.
5. Handle existing below-zero information deliberately. It currently lives inside the breakdown component. Extract/retain its applicable message outside the removed phone disclosure or provide equivalent visible wallet status, preserving each wallet's privacy guard. Do not accidentally delete this behaviour with the chart.
6. Cover zero, negative and large totals. If an amount cannot fit comfortably beside the eye, allow a deliberate layout adjustment; never truncate money, hide digits or shrink it to unreadable text. Colour and hidden-dot contrast must also work on the forest surface.

Done when: ordinary totals match the mockup, all amount digits align, privacy works across reload, and mobile has no Breakdown control. Rendering simplification is not evidence that the Windows graphics timeout is fixed.

## 6. Split the Home wallet list into separate cards

Files: `home/wallet-cards.tsx`, scoped CSS; existing WalletBadge and privacy components reused.

1. Replace the phone list's shared border/background/dividers with individual rounded cards and small gaps.
2. Add the “Your wallets” heading and a Manage link to `/wallets`.
3. Align badge/name left, complete amount right and eye at the trailing edge. Keep a consistent amount column across rows.
4. Reuse wallet IDs, owner order, colours, icons, amounts and links to filtered transactions. Each privacy control must operate independently without following the row link.
5. Retain the current semantics for investment and deposito wallets. Do not change what any wallet type counts toward the total.
6. Target roughly 55px ordinary rows, but allow them to grow for long names, large values and accessibility text sizing. Keep the existing 44px eye target even where the visual mockup used a narrower icon slot.

Done when: all six standard sample wallets are visible above the bar at 390 × 844, amounts compare easily, and row links/privacy work. More than six wallets continue naturally down the page.

## 7. Give Quick add one shared dialog owner

Files: `quick-add-button.tsx`, a small new Quick add provider/controller module if needed, and `app/layout.tsx`.

The existing QuickAddButton owns the dialog, last-used wallet, save handler, keyboard shortcut and focus restoration. Simply mounting it again inside MobileNavigation would risk duplicate listeners/dialogs and divergent draft state.

1. Move that existing state and behaviour into one shared provider/controller inside the unlocked app, under DataProvider and the shell providers. Expose an open action to mobile and desktop triggers.
2. Mount exactly one TransactionDialog for Quick add. Preserve default-wallet selection, last-used wallet, explicit save, success receipt, Add another and error handling.
3. Keep one Ctrl/Cmd+K listener with the current guard for already open dialogs, menus and listboxes.
4. Make the desktop coin a presentation trigger for this owner. Make the phone centre plus another presentation trigger; do not mount two copies of the transaction flow.
5. Track the actual trigger/focus origin. Closing returns focus to the centre plus on a phone, the desktop coin on desktop, or the prior control when opened with a shortcut. If the viewport changes while the dialog is open, fall back to a visible, connected trigger.
6. Keep the provider stable across navigation and responsive changes. Opening via the plus must not clear a draft by remounting the host or silently switch the selected page.
7. Preserve current hydration readiness and lock behaviour. A locked app must not expose an active entry flow.

Done when: both entry points and the shortcut reach one existing assistant; typing/preparing/cancelling changes no balances; only confirmation saves. Parsing/model logic does not need alteration for this change.

## 8. Build the five-position bottom navigation

Files: `mobile-navigation.tsx`, `app-sidebar.tsx` as needed, `globals.css`, shared Quick add trigger.

1. Render destinations in this order: Home, Transactions, centre Quick add, Wallets, More.
2. Use a normal 52px bar plus `env(safe-area-inset-bottom)`. Keep the centre orange surface 40 × 40px, corner radius about 12px and plus 22px. Its complete hit area is at least 44 × 44px.
3. Remove the visible “Quick add” label below the plus. Retain an accessible button name and dialog semantics. Adopt one accessible name consistently in code and tests; existing suites currently query “Quick add”, while the mockup uses “Quick add transaction”.
4. Treat the plus as an action, not a route: no `aria-current`, selected-page styling or navigation side effect.
5. Replace the filled selected tile with accent icon/label/short underline. Use `aria-current` for route links and the existing More state for secondary pages; the underline supplies a non-colour visual cue. Keep keyboard focus visually distinct from page selection.
6. Retain More/Settings navigation, dismissal, focus return and scroll handling. Position its sheet using the same bar/safe-area values. An open modal must block clicks through to Quick add.
7. Remove the floating phone Quick add pill and obsolete space reserved for it. Ensure the last page record can scroll fully above the new bar.
8. At larger text settings, let the bar grow rather than clipping labels. Keep all five controls usable at 320px, including Transactions, and respect device cutouts in landscape.

Done when: no overlapping/floating duplicate action exists; current-page selection remains after Quick add closes; every main and secondary page is reachable; keyboard/focus behaviour works.

## 9. Integrate real content and responsive behaviour

The static preview ends with placeholder “This month” copy. Production must keep its real month summary, spending breakdown, reminders, budgets, goals and recent transactions. Do not copy this placeholder or illustrative balances into application components.

Check Home plus Transactions, Wallets, Goals, Categories and Insights under the shared shell. Verify the Pet destination opens with the shared shell; leave its implementation alone. Exercise 320/360/390/430px phone widths, short landscape, enlarged text, reduced motion and desktop reference widths. Match normal 390 × 844 composition while allowing honest extra scrolling for unusual content or accessibility settings.

## 10. Verify with isolated sample data

Use the repository's existing browser harness: copied frontend/backend under `.nb-test/browser-*`, frontend `http://localhost:3200`, backend 4200, throwaway DB. Prove BCA Rp 8.742.300 and 41 transactions before any browser mutation. Do not use 3000/4000 or the real database. Clean up only owned copies and processes.

Update existing tests that assume a 60px bar, floating pill or mobile Breakdown. Preserve their financial assertions; do not weaken tests to accommodate the new markup. Add focused cases only where the shared Quick add host creates new behaviour worth protecting.

| Area | Required evidence |
| --- | --- |
| Home layout | Both themes; six ordinary sample wallets above the bar; long names/large amounts readable; no horizontal overflow |
| Privacy | Total and individual eyes persist across reload; hidden values do not appear before hydration; eye does not activate wallet link |
| Navigation | Correct current route; secondary page activates More; centre plus never activates a page; labels/hit targets/focus usable |
| Assistant | Mobile plus, desktop coin and shortcut open one dialog; selected page preserved; correct focus after close/resize |
| Money flow | Expense/income/transfer prepare without writes; explicit save creates exactly one transaction with correct wallet effects; cancel writes nothing |
| Existing assistant states | Clarification, Edit details, duplicate warning, errors/uncertain save, success/Add another, More tools remain reachable |
| Responsive shell | 320–430px, landscape, enlarged text, safe-area clearance, keyboard-visible form, desktop regression |
| More/Settings | Dismissal and focus return, name/PIN/preferences entry points, no click-through to plus |

Run `npm run typecheck`, `npm run lint`, `npm test`. Use affected browser projects including `mobile-compact`, `simple-phone-entry`, `mobile-goals-menu`, `mobile-touch`, `quick-add`, `shortcut`, `brand`, and the Smart entry/conversation regressions. Run affected checks against the isolated production build with `KAYA_BROWSER_PRODUCTION=1`; broaden only for failures or unresolved cross-page risks.

Reuse deterministic model responses for UI regression coverage. This visual integration does not require repeated real-model/GPU trials. Record actual-model coverage separately if it becomes necessary.

Collect one planned batch of light/dark phone and desktop captures, fix observed issues together, then confirm once. Headless rendering with GPU disabled avoids deliberately repeating the reported F12/capture sequence; it cannot establish that the physical display crash is resolved. Physical phone keyboard/safe-area and Safari checks remain explicit handoff checks unless those devices are available.

## 11. Update documentation and review the delivered result

1. Update PRODUCT.md for the new phone navigation placement and removal of mobile Breakdown.
2. Update DESIGN.md with Plus Jakarta Sans wordmark, upright phone total, signature card, separate rows, active-tab style and exact plus measurements.
3. Update docs/USAGE.md for the centre plus and existing assistant flow.
4. Update ROADMAP.md with delivered work and actual verification, replacing stale “next” descriptions rather than claiming mockups are production.
5. Save representative screenshots and a brief test/limitations report under docs/mobile-compact/.
6. Present the completed phone design for owner review, including anything that differs from the mockup for readability or touch access.

This is one coherent phone-design delivery with the sequence above as implementation checkpoints. It ends with owner review before starting another feature. The owner subsequently authorised the complete build.

## Current status

Implementation and available verification are complete; see [delivery](SELECTED-HOME-DELIVERY.md). The original planning turn changed documentation only; the later authorised build changed frontend presentation, shared Quick add ownership, tests and supporting documentation. No backend/schema, real-data or browser/driver settings change was made.

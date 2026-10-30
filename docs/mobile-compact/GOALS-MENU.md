# Phone goals and menu - 29 Oct 2026

The owner later selected a smaller bottom navigation bar and simpler Quick add. See [the current delivery](SIMPLE-NAV-ENTRY.md). The menu screenshots below document the earlier drawer.

Goals now use shorter comparison cards: name and wallet, saved amount alongside the target, progress, Details and Add money. Three complete typical goals fit above Quick add at 390 by 844. Details contains the remaining amount, pace explanation and saving plan; the pace status appears in the disclosure label when applicable. Long names and amounts wrap.

The phone menu is 256px wide at default text size and ends after Settings. It has an explicit close button, 44px navigation rows, safe-area offsets and its own scrolling on short screens. Desktop navigation keeps its existing layout. Tooltips now mount only for collapsed desktop navigation, fixing a hidden tooltip consuming Escape in the phone menu.

## Sample previews

These screenshots use synthetic data in the isolated test app.

| View | Light | Dark |
| --- | --- | --- |
| Goals | [Preview](goals-menu/light-goals.png) | [Preview](goals-menu/dark-goals.png) |
| Menu | [Preview](goals-menu/light-menu.png) | [Preview](goals-menu/dark-menu.png) |

[Desktop goals with a long name and large amount](goals-menu/desktop-goals.png)

## Verification

- Typecheck, lint, unit tests and isolated production builds passed.
- 20 distinct browser tests passed across runs: seven existing mobile layout cases, nine brand cases and four new goals/menu cases. The final production run passed all 13 brand and goals/menu cases after the Escape fix.
- New cases exercise three-goal viewport fit, menu dimensions and tap targets in both themes, Details, saving money to a goal, History, Settings, page navigation, close-button/Escape focus return, long names, large amounts, enlarged text, landscape and desktop plans.
- Initial failures included test selector ambiguity, an incomplete goal-update fixture and floating-point geometry precision. Those were corrected. The Escape failure exposed the hidden-tooltip issue and was fixed in the app.
- Tests used copied apps under `.nb-test`, localhost:3200/4200, a throwaway database and the harness's initial proof of BCA Rp 8.742.300 plus 41 transactions. The real database was not used. Owned test copies and processes were cleaned up.
- Evidence is Chromium emulation and synthesized touch, not a physical phone. iOS Safari, Android hardware and the Windows screenshot/graphics issue were not tested in this change.

Ready for owner review on the usual phone. No commit made.

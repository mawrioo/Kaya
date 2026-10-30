# Phone batik design implemented - 30 October 2026

The selected New batik design is now in the application below 768px.

- Kaya uses desktop's bundled Source Serif 4 at 20px/600, .04em tracking and a 44px link target. The unused Plus Jakarta Sans font is no longer loaded by the app; mockups retain their original font assets.
- The phone total card uses desktop's four-petal kawung geometry, repeated at 36px and fading from the right over the forest card. A static SVG background and colour fade avoid adding masks, filters or animation.
- Upright balance figures, separate wallet cards, independent privacy, the centre plus and compact navigation retain their behaviour. Desktop retains its original card and lettering.

[Light phone](phone-batik/light-home.png) | [Dark phone](phone-batik/dark-home.png) | [Desktop reference](phone-batik/light-desktop.png)

## Verification

- Type checking and lint passed.
- All 916 unit tests passed: 660 backend and 256 frontend.
- The isolated production build succeeded; all 20 browser cases passed across brand, selected-phone-design and mobile-compact. Checks include both themes, six-wallet fit, persisted privacy, full large amounts, long names, below-zero privacy, enlarged text/landscape, narrow layouts, shared Quick add through viewport changes, desktop behaviour and successful loading of the SVG pattern.
- Reviewed the production light/dark phone captures and desktop capture. No further visual fixes were needed.
- Browser execution used GPU-disabled headless Chromium, copied frontend/backend apps and a throwaway database on localhost:3200/4200. The harness proved BCA Rp 8.742.300 and 41 transactions before tests. Copies and owned processes were cleaned up. [Browser results](phone-batik/browser.log).

No backend/schema, real-data, driver or Chrome-setting changes. Physical phones, Safari and GPU stability were not tested. The earlier display timeout remains unresolved; this visual change is not a confirmed blackout fix.

Next: owner review on the usual phone. No commit made.

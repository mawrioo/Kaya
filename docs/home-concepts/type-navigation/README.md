# New wordmarks, straight numbers and lighter navigation — 29 Oct 2026

**Latest:** owner chose Plus Jakarta Sans and requested Quick add in the middle of the navigation. See the [combined light/dark mockup](../quick-add-centre/README.md).

Owner requested a new Kaya logo font, straight total-balance numbers and an updated selected state for the bottom navigation. These are standalone mockups; the running application is unchanged.

Wordmark options:

- **A — [Manrope](https://fonts.google.com/specimen/Manrope):** understated, clean; 24px, weight 700.
- **B — [Outfit](https://fonts.google.com/specimen/Outfit):** softer shapes and more personality; 24px, weight 600. Recommended for this wordmark.
- **C — [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans):** compact and confident; 24px, weight 650.

These character descriptions are design judgments. Fonts and their OFL licences were downloaded from the official [Google Fonts repository](https://github.com/google/fonts), under `ofl/manrope`, `ofl/outfit` and `ofl/plusjakartasans`. Originals and licences are kept in `fonts/`; generated HTML embeds the three fonts for offline use. No fonts were installed into Windows.

Shared changes:

- Total balance uses upright Inter with lining/tabular numerals, keeping digits on an even baseline. Full rupiah values retained.
- Selected bottom tab has an accent-coloured outline icon and label plus a short underline. The large rounded background is removed. Other icons use a lighter consistent stroke. Click Home, Transactions or Wallets to preview selection; this does not navigate to real data.
- 52px navigation, signature card, six separate wallets, and no Record/Add/Breakdown controls remain. Additional safe-area padding would be needed in production.

[Light comparison](light-comparison.png) · [Dark comparison](dark-comparison.png) · [Interactive preview](index.html) · [Wallets selected](dark-selected-wallets.png)

Individual phones: [A light](light-font-1.png), [B light](light-font-2.png), [C light](light-font-3.png), [A dark](dark-font-1.png), [B dark](dark-font-2.png), [C dark](dark-font-3.png).

Verified in headless Chromium with GPU disabled: all three downloaded fonts loaded, both themes rendered, six wallets visible per phone, lining/tabular number settings active, no selected-tab background, 52px bar, no phone-content overflow or page errors. Tab selection, More/Escape and privacy work; narrow comparison-board scrolling checked. Light/dark screenshots visually reviewed together. See [recorded verification](verification.json).

Uses illustrative balances in 390 × 844 phone frames. No app server, API or database access. No F12 or Windows capture reproduction. Physical phones, Safari and the laptop's graphics fault were not tested.

Rebuild: `node docs/home-concepts/type-navigation/build.cjs`, then `node docs/home-concepts/type-navigation/render.cjs`. Builder derives from the earlier Kaya-header concept. Generated HTML is standalone.

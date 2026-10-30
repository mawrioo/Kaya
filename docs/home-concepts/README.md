# Home and smaller navigation concepts — 29 Oct 2026

**Latest:** the owner chose Compact Kaya and requested the signature card, individual wallets, smaller wordmark, no Breakdown and new header ideas. See the [refined mockups and three header choices](compact-refinement/README.md). The comparisons below preserve the original options.

Three standalone visual concepts for owner review. The running Kaya app is unchanged.

1. **Compact Kaya:** sage balance surface, shared wallet panel and soft active tab. Closest to the current identity with a tighter layout.
2. **Personal ledger:** flat paper surface, fine rules, serif section heading and an aligned amount column.
3. **Signature balance:** forest balance card, a small static kawung detail, open wallet rows and an orange active mark.

All use the same illustrative figures (six wallets totalling Rp 99.715.958), bundled Kaya fonts and a 390 × 844 phone viewport. No database was read. Navigation is 52 CSS px, excluding the additional safe area a real phone needs. Navigation buttons and Add remain at least 44px tall. Add moves into the header so it cannot cover a balance. The intended assistant remains describe → review → save; this preview does not implement the assistant.

- [Light comparison](light-comparison.png)
- [Dark comparison](dark-comparison.png)
- [Interactive preview](index.html): open locally, switch theme, try More, Escape, Breakdown and balance visibility. Other actions show a preview message. No server or internet is needed.
- Individual phone images: [1 light](light-option-1.png), [2 light](light-option-2.png), [3 light](light-option-3.png), [1 dark](dark-option-1.png), [2 dark](dark-option-2.png), [3 dark](dark-option-3.png).
- [Compact More preview](dark-more.png)

Checked in headless Chromium with GPU disabled: all six ordinary wallet rows fit above the bar in all three designs; bar height is 52px; no horizontal overflow inside the phones; theme switching, More/Escape, Breakdown, privacy and Add preview work; no page errors. The comparison board scrolls horizontally in a narrow browser. Light and dark screenshots were visually reviewed together. These checks do not reproduce or diagnose the laptop's graphics timeout, test the Windows capture path, or establish usability on physical phones.

Rebuild from the repository root with `node docs/home-concepts/build.cjs`, then render with `node docs/home-concepts/render.cjs`. The builder reuses embedded fonts from the earlier navigation mockup; the generated HTML itself is self-contained. No app server is started by either command.

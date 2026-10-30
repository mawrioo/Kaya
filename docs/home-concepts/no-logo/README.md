# Logo-free phone mockup — 29 Oct 2026

**Latest:** the owner supplied banking references and requested alternatives to + Add. See [Record inside the balance card versus Record in the navigation](../record-actions/README.md).

Latest owner-requested refinement of Compact Kaya: remove the wordmark and top bar, put the greeting and date on the left with labelled Add on the right. Keep the signature balance card, six separate compact wallet cards, no Breakdown, and 52px bottom navigation. Device safe-area padding would be additional in production.

[Light/dark comparison](comparison.png) · [Interactive preview](index.html) · [Light phone](light.png) · [Dark phone](dark.png)

The two 390 × 844 previews use illustrative balances, not real data. Open the self-contained HTML offline; More/Escape, privacy and Add preview work. Other actions show preview messages. The intended assistant remains describe → review → save.

Rendered and visually reviewed in headless Chromium with GPU disabled. Both themes show all six wallet cards above the navigation; no horizontal phone overflow or page errors. Preview controls and narrow comparison-board scrolling checked. No app server, API or database used. No F12 or Windows capture reproduction. Physical phone and Safari verification are outside this mockup review. Running Kaya is unchanged.

Rebuild: `node docs/home-concepts/no-logo/build.cjs`, then `node docs/home-concepts/no-logo/render.cjs`. Builder derives from the prior refinement; generated HTML is standalone.

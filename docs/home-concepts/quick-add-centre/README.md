# Plus Jakarta Sans with centred Quick add — 29 Oct 2026

Owner selected Plus Jakarta Sans for the Kaya wordmark and requested Quick add in the middle of the bottom bar.

**Implemented:** [working-app screenshots and verification](../../mobile-compact/SELECTED-HOME-DELIVERY.md). The files here preserve the selected mockup.

Implementation plan: [detailed steps for building this in Kaya](../../mobile-compact/SELECTED-HOME-BUILD-PLAN.md).

[Light/dark comparison](comparison.png) · [Interactive mockup](index.html) · [Light phone](light.png) · [Dark phone](dark.png)

Five positions: Home, Transactions, Quick add, Wallets, More. Quick add uses a 40px orange rounded square with a 22px plus, contained within the 52px bar. At the owner's request the visible label below the plus is removed; its accessible name remains “Quick add transaction”. The complete control has a minimum 44px touch target. It opens the same intended describe → review → save assistant and does not become the selected page. Page destinations retain the accent outline/label/short underline active state, without a filled tile.

Kept: 24px Plus Jakarta Sans wordmark, upright lining/tabular Inter balance, signature card, six individual compact wallet cards, no mobile Breakdown. Additional phone safe-area padding would be required in production. Font source/licence: [previous font comparison](../type-navigation/README.md).

Both 390 × 844 previews use illustrative balances, bundled fonts and no API/database. Open HTML offline; Quick add shows the assistant-flow preview message, navigation tabs preview their selected state, More/Escape and privacy work. This is a mockup; running Kaya is unchanged.

Rendered in headless Chromium with GPU disabled and visually reviewed in both themes. Verified Plus Jakarta Sans, 52px navigation, Quick add centred with at least 44px touch width/height, six wallets visible, selection preserved after Quick add, no phone overflow or page errors, and preview controls/narrow comparison scrolling. No server started or F12/Windows capture reproduction. Physical phones and Safari untested.

Rebuild: `node docs/home-concepts/quick-add-centre/build.cjs`, then `node docs/home-concepts/quick-add-centre/render.cjs`. Builder derives from the prior font comparison. Generated HTML is self-contained.

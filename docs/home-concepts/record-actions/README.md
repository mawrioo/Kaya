# Record action concepts — 29 Oct 2026

**Latest:** owner requested the Kaya wordmark back and Record transaction removed. See the [updated light/dark mockup](../kaya-header/README.md). The concepts below preserve the earlier alternatives.

Owner supplied banking-app references and disliked the header's + Add button. These standalone mockups borrow a clear balance-and-action grouping and a restrained warm background, retaining the selected logo-free Compact layout, signature card, separate wallets and no mobile Breakdown.

- **A — Record inside the card:** receipt icon, Record transaction and arrow in a 47px footer. Four navigation destinations remain. The action belongs to the balance summary and scrolls with it.
- **B — Record in the navigation:** five columns, with Record in the centre. The 52px bar stays compact; the Record action remains visible while scrolling. The central orange icon is contained within the bar and does not cover content.

Both keep full rupiah values, the total privacy control beside the amount, six separate wallet cards, and a logo-free greeting/date. Record opens a preview message for the same describe → review → save assistant. It does not initiate a bank payment.

[Light comparison](light-comparison.png) · [Dark comparison](dark-comparison.png) · [Interactive preview](index.html)

Individual phones: [A light](light-card.png), [B light](light-navigation.png), [A dark](dark-card.png), [B dark](dark-navigation.png).

Uses illustrative balances (Rp 99.715.958 across six wallets), bundled fonts, and 390 × 844 viewports. Device safe-area padding is additional in a production implementation. Open HTML offline; switch themes and try Record, More/Escape and the privacy controls. Other actions show a preview message.

Checked in headless Chromium with GPU disabled, and light/dark images visually reviewed together. Both variants show six separate wallets above a 52px navigation bar; Record controls are at least 44px tall; no page errors or horizontal overflow inside phones; preview interactions and narrow comparison-board scrolling checked. No running-app changes, server, API or database access. No F12 or Windows capture reproduction. Physical phones, Safari and the laptop's graphics failure were not tested.

Rebuild from repo root with `node docs/home-concepts/record-actions/build.cjs`, then `node docs/home-concepts/record-actions/render.cjs`. Builder derives from the prior logo-free concept. Generated HTML is self-contained.

# Compact Kaya refinement — 29 Oct 2026

**Latest:** owner requested the open header without the Kaya wordmark. See the [logo-free light/dark mockup](../no-logo/README.md).

Owner-selected Compact Kaya combined with the Signature balance card. This is a standalone mockup, not an application change.

Shared changes in every variant:

- Smaller Kaya wordmark: 18px in A/C, 16px in B.
- Forest-green total-balance card with a small static kawung detail.
- No total-balance Breakdown control or disclosure.
- Six individual wallet cards, each 55px tall, separated by 7px. Full amounts remain aligned.
- Selected Compact bottom navigation, reduced to 52px, with additional device safe-area padding required in production.
- Add remains accessible without covering balances. The assistant flow stays describe → review → save.

Three header alternatives:

- **A — Open header (recommended):** small wordmark and date directly on the page, greeting and labelled Add below. No distinct top-bar surface.
- **B — Greeting first:** centered smaller wordmark, greeting and date grouped together, circular Add control.
- **C — Card-led header:** small wordmark and labelled Add above; greeting and date move into the signature card.

[Light comparison](light-comparison.png) · [Dark comparison](dark-comparison.png) · [Interactive preview](index.html)

Individual phones: [A light](light-header-1.png), [B light](light-header-2.png), [C light](light-header-3.png), [A dark](dark-header-1.png), [B dark](dark-header-2.png), [C dark](dark-header-3.png).

Uses the same illustrative six-wallet data as the previous comparison (Rp 99.715.958 total), bundled fonts, and 390 × 844 viewports. No API or database connection. No app server started. Rendered in headless Chromium with GPU disabled; no F12 or Windows capture reproduction. All six wallets fit above the navigation; no phone-content overflow; no page errors; theme, More/Escape, privacy and Add preview checked. Light/dark images visually reviewed together. Real hardware, Safari and the graphics failure remain outside this mockup verification.

Rebuild from repo root: `node docs/home-concepts/compact-refinement/build.cjs`, then `node docs/home-concepts/compact-refinement/render.cjs`. The builder reads the prior concept template/font definitions. The generated HTML is self-contained and can be opened offline.

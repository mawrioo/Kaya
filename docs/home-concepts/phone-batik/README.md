# Kaya phone comparison - 30 October 2026

Implemented: [application screenshots and verification](../../mobile-compact/BATIK-PHONE-DELIVERY.md). The comparison preserves the previous Current design alongside New batik, which is now used in Kaya.

[Interactive comparison](index.html) | [Light comparison](light-comparison.png) | [Dark comparison](dark-comparison.png)

Compare opens two matching 390 x 844 phone frames: Current on the left, New batik on the right. Current and New batik buttons isolate either version in the same page. Light/Dark changes both together. On narrow screens the comparison stacks; isolating either version makes switching easier.

Both share the same illustrative balances, date, content, 136px balance card, six individual wallet cards, upright Inter amounts and 52px navigation. The centre plus is 40px with a 22px icon and a minimum 44px target. No mobile balance breakdown or visible plus label.

Current is reconstructed from the app's brand/card components and phone CSS before the batik update, checked against the existing delivery captures. It uses Plus Jakarta Sans at 24px/650 and the current SVG leaf geometry/placement. New batik uses the desktop Source Serif 4 wordmark at 20px/600 with .04em tracking and the desktop 36px four-petal kawung geometry. Batik fades from the right through a static background; it has no mask, blur or animation. The comparison HTML does not load the running app.

Scroll positions, balance hiding and selected tabs are linked across the two previews for a fair comparison. More opens a compact menu with focus containment, Escape and focus return. Quick add and other actions show preview messages. The month panel provides representative content below the wallets; values and all content are illustrative.

Checked both themes visually in one initial batch and confirmed the narrow preview. Headless Chromium with GPU disabled verified matching card positions/heights, six wallets clear of navigation, correct bundled fonts, centred plus geometry, linked privacy/tabs/scrolling, Compare/Current/New controls, More keyboard handling, and no horizontal overflow at 320/360/390/430px. No page errors. Text contrast checks exceeded 4.5:1 for the primary/secondary text pairs. See [verification.json](verification.json).

No app, backend or data changes. Physical phones/Safari and GPU stability were not tested. This mockup does not establish a blackout fix.

Build: node docs/home-concepts/phone-batik/build.cjs

Render and verify: node docs/home-concepts/phone-batik/render.cjs

The builder embeds local licensed app fonts, comparison.css and preview.js into index.html so the result works offline. It does not start servers or contact APIs.

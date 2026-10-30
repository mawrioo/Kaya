# Kaya wordmark restored — 29 Oct 2026

**Latest:** owner requested fresh wordmark fonts, straight balance numerals and a modern selected-navigation state. See the [three font mockups and updated navigation](../type-navigation/README.md).

Latest owner-requested mockup: restore and adjust the Kaya wordmark, remove Record transaction. The wordmark is 23px, aligned with a small date in an open header; the greeting sits below. Signature balance, eye beside amount, separate compact wallet cards and four-item 52px navigation remain. No Record, + Add or Breakdown control appears in these phone previews.

[Light/dark comparison](comparison.png) · [Interactive mockup](index.html) · [Light phone](light.png) · [Dark phone](dark.png)

Illustrative balances, 390 × 844 phone frames, bundled Kaya fonts, and no real-data connection. More/Escape and privacy controls work; other destinations show preview messages. This is a visual concept only: removing the entry action here does not remove the assistant from the running app or decide its eventual access point.

Rendered in headless Chromium with GPU disabled; both themes visually reviewed. Six wallets fit above navigation; wordmark 23px; bar 52px with four destinations; no phone overflow or page errors; More/Escape and total privacy checked. Device safe-area padding would be additional in production. No server/API/database access, F12 or Windows capture reproduction. Physical phones and Safari were not tested. Running Kaya is unchanged.

Rebuild: `node docs/home-concepts/kaya-header/build.cjs`, then `node docs/home-concepts/kaya-header/render.cjs`. Builder derives from the previous Record-action concept; generated HTML is self-contained and opens offline.

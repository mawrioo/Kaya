# Mobile compactness and black-screen review

28 Oct 2026. This records the initial review, when no application code, system settings or owner data had changed. The subsequent authorised implementation is recorded under Implementation and diagnostic follow-up, with a linked verification report.

## Black-screen evidence

The owner reports the entire laptop display going black while using Chrome's phone emulation and Windows Win+Shift+S, twice, requiring forced restarts.

Read-only Windows Application event queries found LiveKernelEvent code 117 referring to two distinct dumps:

- `WATCHDOG-20261028-2209.dmp`, first observed reporting at 22:09:31.
- `WATCHDOG-20261028-2219.dmp`, observed reporting at 22:20:01.

Times are local, Asia/Jakarta. Later event entries repeat those same dump names; they are not evidence of additional separate crashes. System events also record Kernel-Power 41 and EventLog 6008 around the restarts; these confirm unclean shutdowns, not their cause.

The display-driver registry entry identifies AMD Radeon 780M Graphics, driver `32.0.11038.5002`, dated 25 Sep 2024. Driver age alone does not establish a defect. WMI hardware inspection and access to the protected WATCHDOG / WER report contents were denied. No dump analysis was possible and no specific faulting module was identified.

Microsoft defines [0x117](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/bug-check-0x117---video-tdr-timeout-detected) as a live dump indicating the display driver failed to respond in time. It is not itself a blue-screen stop code. This supports a graphics/display timeout during the reported incident. It does **not** prove whether Kaya rendering, Chrome, Windows screen capture, another workload, a driver defect, or hardware conditions initiated it.

### Kaya rendering observations

- `frontend/app/globals.css`: the main area repeats a static 200px SVG grain tile made with `feTurbulence`; the balance decoration combines SVG and gradient masks. These are candidates for an isolated comparison, not measured bottlenecks or established crash causes. Static tiles can be cached.
- `frontend/components/rotating-greeting.tsx`: Home repeatedly changes greeting text via timers; reduced motion stops it. The Transactions screen does not have this greeting, so the greeting alone cannot explain both screens.
- Source search did not find a custom WebGL renderer in the inspected app/components/lib files. This does not mean Chrome uses no GPU: normal page compositing still can.
- No GPU profiling or reproduction was attempted. Current processes cannot establish what was using the GPU before a restart. The presence of the Ollama server alone is not evidence of active model inference at the incident.

### Proposed diagnostic sequence

1. Save work; temporarily disable Chrome's graphics acceleration under Settings > System and relaunch. This is a reversible diagnostic supported by [Google's troubleshooting guidance](https://support.google.com/chrome/answer/142063?co=genie.platform%3Ddesktop&hl=en), not a confirmed fix. No Chrome settings were changed in this review.
2. Check the laptop manufacturer's supported graphics-driver updates for the exact laptop model before installing anything. No driver was downloaded or installed.
3. Only after stability is addressed, compare capture on a plain page and an isolated sample-data Kaya, changing one factor at a time. If needed compare Kaya with grain/masks disabled in that copy. Stop on recurrence; do not repeatedly provoke forced restarts.
4. A failure on a plain page would show Kaya is not required. A failure observed only on Kaya would narrow the trigger but would still not identify the underlying driver defect. Successful headless browser screenshots would not clear Windows Snipping Tool or the physical display path.

## Mobile findings and proposed direction

The supplied screenshots show Home barely reaching its first wallet and Transactions showing no transaction before the bottom edge. Screenshot pixels are not assumed to equal CSS pixels; device scale and browser zoom were not measured.

| Priority | Finding | Code evidence | Proposal |
| --- | --- | --- | --- |
| P1 | Wallet comparison requires remembering balances while scrolling | Home wallet grid is one column below 640px; each card stacks icon, name and balance with padding | One shared list of compact rows: small wallet badge and name left, full balance right, eye control accessible. Keep the owner's order. Open details/actions from the row without covering the balance. |
| P1 | Header and balance overview consume the first screen | Mobile title is 36px; Home reserves `2.6em` for the rotating greeting; date is a separate row; total card repeats wallet names and percentages | A smaller static phone greeting, short date on Home, compact title elsewhere, less vertical spacing. Keep one prominent total and put wallet shares alongside the wallet rows or behind an explicit breakdown. |
| P1 | Transaction controls precede the actual work | Search, import/add, full-width dates, type/category, wallet and clear controls form several rows; totals then stack vertically | Keep search, period and Add immediately available. Put secondary filters in a labelled expandable panel with active-filter count and visible chosen scope. Move Import and bulk tools into a labelled secondary menu. Use a compact totals summary with expandable full totals. |
| P2 | Category amounts stack below names, weakening comparison | `category-row.tsx` uses a column until its container reaches `@md`; a 40px menu slot and badge further reduce space | Align category names left and full amounts right; smaller badge and tighter gaps, with budget progress below only when applicable. Long names may wrap; never truncate the money. |
| P2 | Other pages reuse tall stacked sections | Goals and Insights have stacked cards and generous page gaps | Apply the same mobile spacing and summary rules in later reviewed steps; retain essential status and amounts, with secondary explanations expandable. |
| P2 | Floating quick-add coin overlaps the reading area | Visible beside lower-right figures in both supplied screenshots | Reserve space for the action or use a dedicated mobile action area so amounts remain readable. |

Preferred wallet arrangement (schematic, not a measured render):

```text
Wallets                         6 wallets
BCA                         Rp 25.000.000
Mandiri                     Rp 20.000.000
Superbank                   Rp 20.000.000
...
```

Rows are preferred over two narrow cards because they give long rupiah amounts a consistent comparison column. Aim for roughly 56-64 CSS px per ordinary wallet row, with room for long names, hidden balances and larger text. This is a design target, not a verified result. Keep controls comfortably tappable (about 44px), preserve full rupiah amounts, and use the existing plain `formatRupiah()` for smaller list figures; do not shrink the decorative `<Money>` component below its documented contrast limit.

First implementation step proposed: shared phone header plus Home/Wallets compact comparison, then owner review. Transactions follows as a separate step, then Categories/Goals/Insights. Preserve desktop styling and leave the pet alone.

## Initial review verification and limits

Reviewed the supplied screenshots, project product/design/roadmap rules, relevant layout and rendering source, Windows event records and display-driver registry metadata. Consulted Microsoft and Google primary documentation.

No app server was started, no request was sent to the owner's 3000/4000 servers, no database was opened, and no application tests or browser captures were run. This review cannot prove performance, phone layout fit, or the exact graphics crash trigger. Future UI checks must use the prescribed isolated `.nb-test` app on localhost:3200/4200, verify sample BCA Rp 8.742.300 and 41 transactions, cover light/dark and long amounts, and include a real phone when available.


## Implementation and diagnostic follow-up

The owner subsequently authorised steps 1–7 together. Compact phone layouts are implemented across Home, Wallets, Transactions, Categories, Goals and Insights, with a shared disclosure component and dedicated mobile Quick add area. See [verification and sample captures](mobile-compact/VERIFICATION.md) for results and remaining device limits.

Read-only BIOS registry metadata identifies the laptop as ASUS Zenbook 14 UM3406HA. The [official ASUS support page](https://www.asus.com/us/supportonly/um3406ha/helpdesk_download/) currently lists AMD Graphics Driver V32.0.11038.5002, released there on 21 May 2025. This matches the installed version; its internal 25 Sep 2024 driver date is not evidence that the owner missed an OEM update. No driver installation or Chrome restart was performed.

A follow-up Application-log query during headless browser verification still found only the same two distinct WATCHDOG dump names. This provides no new reproduction evidence and does not clear the physical display / Win+Shift+S path. The precise trigger remains unresolved because protected dumps cannot be inspected in this environment. The Chrome acceleration workaround remains a proposed owner-side diagnostic, and no forced-restart reproduction was attempted.

The Chrome Local State graphics-acceleration preference was read without opening other profile fields: it is currently enabled. Temporarily switching it off remains a meaningful next diagnostic; a browser relaunch and Windows capture comparison are still unperformed.

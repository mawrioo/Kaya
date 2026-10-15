# Kaya portfolio pack

[Watch the short demo](kaya-demo.mp4) · [Download the screenshots](kaya-screenshots.zip) · [Read the short case study](CASE-STUDY.md)

The 38-second demo is a silent, captioned recording of the real app: see the balances, add a Rp 25.000 lunch, check Insights, then look at savings goals. It is exported as a 1080p MP4.

All financial data is fictional. The screenshots show the starting point; the video then saves one expense.

| Wallet | Starting balance | Purpose |
| --- | ---: | --- |
| BCA | Rp 10.000.000 | Salary and monthly bills |
| Bank Jago | Rp 2.000.000 | Everyday spending |
| Superbank | Rp 12.000.000 | Savings for goals |
| Pluang | Rp 6.000.000 | Long-term investing |
| **Total** | **Rp 30.000.000** | |

October starts with Rp 10.000.000 income, Rp 4.000.000 spending and Rp 6.000.000 left over. Moving money between wallets is excluded from those totals. After lunch is saved, BCA holds Rp 9.975.000 and October spending is Rp 4.025.000.

## Screenshots

- [Home](screenshots/home.png)
- [Wallets](screenshots/wallets.png)
- [Transactions](screenshots/transactions.png)
- [Goals](screenshots/goals.png)
- [Insights chart](screenshots/insights.png)
- [Monthly summary](screenshots/insights-summary.png)
- [Dark mode](screenshots/home-dark.png)
- [Phone](screenshots/mobile.png) and [full phone page](screenshots/mobile-full.png)

Desktop PNGs are 2160 × 1500. The phone viewport is 390 CSS pixels wide, captured at double resolution. Captures use reduced motion for legible, steady text. The temporary owner-only “Compare options” control is hidden in the capture browser; the app files are unchanged.

## How the scripts fit together

| File | What it does |
| --- | --- |
| [capture.mjs](capture.mjs) | Starts isolated copies of the app, captures nine PNGs, records the demo, checks the saved expense, and stops the servers. |
| [seed-demo.mjs](seed-demo.mjs) | Replaces the standard seed with the fictional portfolio data, only inside the newly created browser copy. |
| [render-video.py](render-video.py) | Cuts the recorded scenes together, adds captions and title cards, and exports the MP4. |
| [CASE-STUDY.md](CASE-STUDY.md) | The short, public-facing story behind Kaya. |

The capture reuses `frontend/tests/browser-server.mjs`. That harness creates copies of both apps under `.nb-test/browser-*`, starts the frontend on **localhost:3200** and the backend on **4200**, and checks the original sample: **41 transactions and BCA Rp 8.742.300**. Only then does `seedDemo()` write the portfolio fixture to that copy's `sample.db`.

The fixture has 20 transactions across September and October 2026. The screenshot pass runs first, so every screenshot shows the same starting balances. The video then visits Home, Wallets, Transactions, Insights and Goals. It saves lunch through the real form and checks the visible row, 21 saved transactions, and BCA's new balance.

Each scene stores its start/end time and caption in `.nb-test/portfolio-media/capture.json`. Navigation happens between scenes, so the renderer removes loading time. The raw WebM is saved alongside that file. The renderer uses short holds to reach 38 seconds without speeding up normal interactions; it can speed up a longer capture to fit the requested duration.

## Recreate the media

Run these commands from the project root. Requirements: **Node 24**, the project's npm dependencies, **Python with Pillow**, and an FFmpeg build that includes the `libx264` encoder. Ports **3200/4200 must be free**; do not run the browser test suite at the same time. Your everyday app can keep using 3000/4000.

### 1. Prepare the tools

```powershell
npm.cmd install
npx.cmd playwright install chromium
python -m pip install Pillow
python -m pip install --target .nb-test/media-tools imageio-ffmpeg
```

The last command puts an encoder in the temporary folder searched by the renderer. An existing full FFmpeg installation also works: omit that install and use `--ffmpeg` below. Playwright's small bundled encoder records WebM but does not include the H.264 encoder needed for this MP4.

### 2. Capture, then render

```powershell
node --disable-warning=ExperimentalWarning docs/portfolio/capture.mjs
python docs/portfolio/render-video.py
```

For an existing encoder or a different length:

```powershell
python docs/portfolio/render-video.py --ffmpeg "C:/tools/ffmpeg/bin/ffmpeg.exe" --target-seconds 40
python docs/portfolio/render-video.py --help
```

`--target-seconds` accepts 35?45 seconds. `--metadata` selects another capture JSON and `--output` selects another MP4 path. The default output is `docs/portfolio/kaya-demo.mp4`: 1920 ? 1080, 30 fps, H.264, silent, with captions below the app. The previous MP4 is replaced only after a successful render and duration check. Screenshots are replaced as each page is captured.

### 3. Check and package

Open the PNGs and play the MP4. Check that the four wallet names and amounts are readable, the saved lunch is visible, the scene cuts are clean, and no development error badge appears. The phone capture checks horizontal overflow, but is browser emulation rather than a physical-phone test.

The ZIP is a separate packaging step; the capture and renderer do not update it:

```powershell
Compress-Archive -Path docs/portfolio/screenshots -DestinationPath docs/portfolio/kaya-screenshots.zip -Force
```

After export, keep the files under `docs/portfolio/`. The app copies and servers are cleaned up by the capture's `finally` block. Raw recordings and timing files remain under `.nb-test/portfolio-media`; encoder files remain under `.nb-test/media-tools`. Once the final files are checked, remove only those two temporary folders if you no longer need them. They were removed after the original portfolio export, so rerendering that export requires a fresh capture and an available encoder.

## Dates and presentation choices

This fixture was made for **15 October 2026**. The desktop still-image pass fixes its browser date to that day; the server, phone capture and interactive video use their actual clocks. For a recording on another date, update the transaction/goal dates in `seed-demo.mjs` and the fixed screenshot date and month URLs in `capture.mjs` together. Otherwise the new lunch may fall outside the displayed October filter.

Keep the interactive video's clock running: freezing it during the first capture prevented the new row's animation from becoming visible. The script now checks that the new section reaches full opacity before continuing.

Reduced motion keeps text steady. The temporary Compare options control is hidden using a capture-only stylesheet after the page is ready; changing its HTML before hydration caused a development warning during an early attempt. A pointer is drawn only in the recording browser so clicks can be followed. These presentation changes do not edit the app's source files.

## If a run stops

- **Port already in use:** stop the other test/capture run that owns 3200/4200. The harness refuses to reuse an existing server.
- **App did not start:** inspect `frontend/test-results/servers.log`.
- **Sample proof failed:** stop and check the isolated harness; do not bypass the balance/count checks or point it at the real database.
- **Capture JSON or raw WebM missing:** run capture first. Keep the raw file until rendering finishes.
- **Pillow or FFmpeg missing:** install the tools above, or pass the full encoder path with `--ffmpeg`.
- **A render fails:** intermediate files are kept in the reported `.nb-test/portfolio-media/render/run-*` folder. A successful render removes its own intermediate folder and writes `render.json` beside `capture.json` with the final scene times and video details.

## What was verified

The delivered pack was reviewed in light/dark mode and at phone width. The capture checked the saved transaction, its visible row and the resulting balance, waited for fonts, and finished without browser page errors. The final server log had no hydration warnings. Every MP4 frame decoded successfully; scene cuts, ZIP integrity and local documentation links were checked. This media workflow is not a replacement for the full app test suite.

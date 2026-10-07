<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="frontend/public/brand/kaya-lockup-on-dark.svg">
    <img src="frontend/public/brand/kaya-lockup.svg" alt="KAYA" width="280">
  </picture>
</p>

# Kaya

A calm personal finance tracker for Indonesian Rupiah. It runs on your own computer and keeps your data in one file that you own.

```
frontend/   what you see: the Next.js app
backend/    what saves your data: a small server and a SQLite database
kaya-logo/  the logo kit: SVG and PNG files, the React mark and the rules for using them
```

## Start it

From this folder:

```
npm install        # the first time only
npm run dev
```

Then open http://localhost:3000. That one command starts both parts. Press Ctrl+C to stop both.

The first start creates your database at `backend/data/nabungbego.db`, filled with sample data. After that it is yours: everything you add, edit or delete is saved, and it is still there after a refresh, a restart, or opening the app another day.

## Use it on your phone

While the app is running on your laptop, open the **Network** address that `npm run dev` prints (something like `http://192.168.1.3:3000`) in your phone's browser. The phone must be on the same Wi-Fi. If Windows asks whether to let Node.js through the firewall, allow it on private networks. The laptop has to stay on and the app running.

There is no login, so anyone on the same Wi-Fi who knows the address could open it.

## Handy commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the frontend and backend for everyday use |
| `npm run db:reset -- --yes` | Erase everything and go back to the sample data |
| `npm test` | Run the backend tests and the quick-add parser and shortcut tests |
| `npm run test:browser -w frontend` | Check quick add, its shortcuts and wallet nicknames in Chromium using a separate app and sample data |
| `npm run typecheck` | Check the code for mistakes |
| `npm run lint` | Check the code style |
| `npm run build`, then `npm run start` | Build and run the production version (built without shrinking the code, see ROADMAP Step 6) |

## Add an expense in one line

Press the round orange **+** coin at the bottom right of any page (or **Ctrl+K**). Type `nasi goreng 25rb BCA`, then press **Fill form** (or Enter). Check the filled details, choose a category if needed, and press **Add transaction** to save.

- Amounts: `25rb`, `25k`, `25 ribu`, `25.000` and `25000` all mean Rp 25.000. `1,5jt` and `1,5 juta` mean Rp 1.500.000. `Rp 25.000` works too. Dots in groups of three mean thousands; use a comma for decimal shorthand, like `12,5rb`.
- Wallets: use a full wallet name, such as `BCA` or `Bank Jago`, or the wallet's **nickname** (see below); capitals don't matter. With no matching name, it keeps the selected wallet (initially the first wallet, then the last one saved through Quick add during this visit). Unknown names stay in the note. Check the Wallet field before saving.
- Categories: suggested from your earlier notes. A category you picked by hand stays selected. A new note without a match needs you to choose one.
- The date starts as today. Change it in the review form for an older expense.
- Use one amount and one wallet. For quantities, give the amount a unit: `2 nasi goreng 25rb BCA` keeps `2 nasi goreng` as the note. Unclear or invalid amounts get a message instead of changing the form.
- This version handles expenses. Use the regular **Add transaction** form for income and transfers. Quick add works locally, with no AI or external service. Filling and cancelling never save a transaction.

### Open it from the keyboard

- Press **Ctrl+K** (**Cmd+K** on a Mac) on any page, even while you are typing in a box such as the search field. When you close it, the keyboard goes back to where it was.
- Only Ctrl+K does it. A plain letter never opens Quick add, so it can't take a letter out of a note.
- Nothing opens while a dialog, menu or list is already open.
- The coin has no word on it. Point at it (or Tab to it) and a small label says "Quick add" and shows the shortcut.

### Wallet nicknames

On **Wallets**, choose **Edit details** (or **Add wallet**) and fill in **Nickname (optional)**: a short word such as `jago` for Bank Jago. Quick add then understands `kopi 20rb jago` as well as `kopi 20rb Bank Jago`.

- Up to 20 characters, with at least one letter. Capitals and extra spaces don't matter.
- It can't be the name of another wallet or another wallet's nickname, and a wallet can't be given a name that is another wallet's nickname.
- It is only used by Quick add: it isn't shown on the wallet cards. Empty the box to take it away. A wallet that you delete and then **Undo** comes back with its nickname, unless another wallet has taken that word in the meantime.
- It is saved in the database, so your phone and your computer share it. The first time the backend starts after this update it adds one empty column (`nickname`) to the wallets table; nothing else in your data changes.

### Checking quick add

`npm test` includes the pure parser and form-fill checks. For the browser checks, install Chromium once with `npx playwright install chromium`, then run `npm run test:browser -w frontend`. They start their own servers on ports 3100 and 4100, use a fresh in-memory sample database, and copy the frontend into `.nb-test/quick-add-*/frontend`. They refuse to reuse occupied test ports and never use the normal app on ports 3000 and 4000. The test servers stop when the checks finish. Screenshots and failed-test traces go into `frontend/test-results/`; disposable frontend copies stay in `.nb-test/`. Both folders are ignored by Git.

## Your data

- It lives in `backend/data/nabungbego.db`.
- **Back it up:** press **Back up now** at the bottom of the sidebar. It copies the file into `backend/data/backups/`, named with the date and time (for example `nabungbego-2026-10-04-153012.db`). It only happens when you press it, and old copies are never deleted. To keep them safe from a broken computer, copy that folder to a USB stick or a cloud drive now and then.
- **Go back to a backup:**
  1. Stop the app (Ctrl+C).
  2. In `backend/data`, rename `nabungbego.db` to something like `nabungbego-before-restore.db`, and **delete** `nabungbego.db-wal` and `nabungbego.db-shm` if they are there (a leftover one would bring the newer data back on top of the backup).
  3. Copy the backup you want from `backend/data/backups/` into `backend/data/` and rename the copy to `nabungbego.db`.
  4. Start the app again.
- Testing something risky? Start the backend on a throwaway database instead: set the `DB_PATH` environment variable to another file.

## More

`PRODUCT.md` says what the app is for, `DESIGN.md` describes how it looks, and `ROADMAP.md` tracks what has been built and what comes next.

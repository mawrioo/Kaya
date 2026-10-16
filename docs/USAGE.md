# Using Kaya

[Back to the project overview](../README.md)

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start both parts for everyday use |
| `npm run build` | Build the frontend for production |
| `npm run start` | Run both parts after building |
| `npm run typecheck` | Check frontend and backend types |
| `npm run lint` | Check frontend code style |
| `npm test` | Run backend and frontend unit tests |
| `npx playwright install chromium` | Install the browser for automated checks |
| `npm run test:browser -w frontend` | Run isolated Chromium browser tests |
| `npm run pin:reset -- --yes` | Turn off a forgotten PIN without deleting financial data |

`npm run db:reset -- --yes` **erases the selected database and restores sample data**. For experiments, set `DB_PATH` to a throwaway file first; never reset a database you want to keep.

Browser tests use copies of **both** apps under `.nb-test/`, a throwaway database and ports **3200/4200**. They refuse occupied test ports, verify the standard sample data (BCA Rp 8.742.300 and 41 transactions), and clean up their processes and copies afterwards. They open `localhost:3200` and never use your everyday app on 3000/4000. Logs, screenshots and retained failure traces go into `frontend/test-results/`.

The latest full validation and its limits are recorded in [ROADMAP.md](../ROADMAP.md#step-30-browser-checks-and-dynamic-finishing-work-14-oct-2026).

## Everyday use

### Add an expense quickly

Press the orange **+** coin or **Ctrl+K** (**Cmd+K** on Mac). Type `nasi goreng 25rb BCA`, press **Fill form**, review the details and category, then press **Add transaction**.

`25rb`, `25k`, `25.000` and `25000` all mean Rp 25.000; `1,5jt` means Rp 1.500.000. Use one amount and one wallet name. Set an optional nickname in **Wallets → Edit details** to write something like `kopi 20rb jago`. Categories can be suggested from earlier notes. Quick add handles expenses; the regular form also handles income and transfers. Nothing saves until you confirm.

### Import a bank CSV

On **Transactions**, choose **Import CSV**, the wallet and your CSV file. The file is read locally. Check the detected columns, dates, amounts and categories before saving. Unreadable rows explain why; likely duplicates start unticked.

Possible transfers are offered for review. Choose whether a row stays income/spending or becomes a transfer to another wallet. When the matching other side is already recorded, Kaya replaces it so the balance is counted once. Nothing becomes a transfer automatically.

The preview explains the balance change. After import, **Undo** is available for ten seconds and restores any replaced rows. Bank-specific formats may need column adjustments; anonymised statements are still needed for further tuning.

### Goals, depositos and reports

A goal sets aside money already in a wallet. **Add money** can update the goal alone or transfer money from another wallet. Deleting a goal leaves the money in place.

A deposito is funded from another wallet. It shows simple daily interest before tax, without counting it as income. Automatic renewal keeps the same principal and rate without compounding. At maturity, **Move money** returns principal and interest to the source wallet and offers **Undo** for ten seconds. Deleting a funded deposito returns **only the principal**; principal corrections adjust the source wallet by the difference.

On **Insights**, choose a month and **Report → Print or save as PDF**. The report includes spending, budgets, goals and transactions, with no wallet balances. **Export** saves a month or year as CSV.

## Use it on your phone

Keep Kaya running on your laptop and open the **Network** address printed by `npm run dev` (for example `http://192.168.1.3:3000`) on a phone connected to the same Wi-Fi. If Windows asks, allow Node.js on private networks.

On iPhone, open the address in **Safari → Share → Add to Home Screen**. Kaya then opens from its own icon. The laptop must stay on and the app must keep running. If the laptop's address changes, update the shortcut; reserving its address in the router avoids this. Away-from-home access is not configured.

### PIN lock

Open your name at the bottom of the sidebar and choose **Set a PIN**. Enter 4–8 digits twice. Each device unlocks for one day; **Lock Kaya** locks it immediately. **PIN settings** changes or removes the PIN and asks for the current one. Repeated wrong attempts introduce a waiting period.

Without a PIN, anyone who can reach the app's address can open it. With one, the backend refuses financial data until the device unlocks. The database and backups are not encrypted, so someone who can read those files can still read the data.

Forgot the PIN? Run `npm run pin:reset -- --yes` on the computer running Kaya. Your financial data stays intact.

## Your data and backups

Your data lives at `backend/data/nabungbego.db`. Choose **your name → Back up now** to make a dated copy in `backend/data/backups/`. Backups happen only when requested and old copies are kept. Copy that folder to another drive for protection against losing the computer.

To restore a backup:

1. Stop the app with **Ctrl+C**.
2. In `backend/data/`, rename `nabungbego.db` to `nabungbego-before-restore.db` (choose another name if that file already exists).
3. Delete `nabungbego.db-wal` and `nabungbego.db-shm` if present, so old journal data cannot override the backup.
4. Copy the backup into `backend/data/` and name the copy `nabungbego.db`.
5. Start the app again. A backup taken with a PIN enabled also restores that PIN.


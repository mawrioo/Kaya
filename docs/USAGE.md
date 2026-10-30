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

### Add a transaction quickly

Press the orange + in the centre of the phone navigation, the coin on desktop, or Ctrl+K (Cmd+K on a Mac). Enter one expense, income or transfer:

- `paid 35rb for lunch from BCA yesterday`
- `received Salary 5jt in Bank Jago today`
- `transfer 500rb from BCA to Bank Jago`

Use the wallet's full name or a nickname you have set. Press Review, check the compact summary and press Save. Edit details opens the fields; press Review again after changes. Enter prepares a sentence or applies a correction, and never saves a Quick add draft. After saving, choose Done or Add another.

For dates, use today/hari ini, yesterday/kemarin, YYYY-MM-DD, `last Friday`/`Jumat lalu`, `two days ago`/`dua hari lalu`, or `the 25th of last month`/`tanggal 25 bulan lalu`. "Last Friday" means the most recent Friday strictly before today; on a Friday it means seven days earlier. A bare weekday or `03/04` asks for clarification. `Minggu lalu` is ambiguous between last week and Sunday; use `hari Minggu lalu` for last Sunday. Check the exact date in the form. Numeric days ago support 1-365; English/Indonesian number words support one through ten.

Missing details appear as one question at a time. For example, `Bought lunch from BCA yesterday` asks for the amount; answer `35rb`. The original sentence and other details stay. You can also answer by editing the form's amount, wallet or category.

Open **Edit details** and use **Describe a change** to change one detail: `make that 40rb`, `ganti jadi 40rb`, `use BCA`, `category Food`, `note: lunch with friends`, `actually yesterday`, or `this was income`. For transfers, `from BCA` changes the source and `to Bank Jago` changes the destination. `use Bank Jago` asks which end you mean. Invalid corrections keep the previous details. Manual choices survive unrelated corrections.

**Undo last change** restores a correction or one completed manual field edit, including the earlier category and any missing-field question. Up to 20 changes are kept only while the draft is open. Start new, closing, locking, switching entry mode or saving the draft clears this history. Undo affects the unsaved draft only.

Before saving, a quiet notice lists entries with the same amount, wallet and Jakarta date. Transfers must also match direction. A matching note is highlighted, but another note or category does not hide a possible duplicate. The notice shows up to three entries and links to that wallet's monthly Transactions in a new tab. You can still confirm a legitimate repeat payment. Saving checks fresh data too; a newly found match asks you to review and confirm again. If the check cannot reach Kaya, the draft stays open and nothing saves. This is an advisory check, not a guarantee against concurrent entries.

Enter applies a reply but never saves. Return to Review and press Save. **More > Start new** clears the unsaved draft for another sentence; closing or locking clears it too. No conversation history is stored. **Enter manually** opens the fields. **More > Simple expense** retains the original expense parser. There is no microphone input.

Smart entry uses the installed local Ollama model for category suggestions. Start Ollama if it is unavailable; you do not need a separate terminal chat. Nothing goes to a cloud model. The category is a suggestion, so check it before saving. If the connection drops during a save, use Check Transactions before adding it again.

### Remembered categories and favourites

In Quick add, open Edit details, choose the correct category and tick **Remember this category** before returning to Review and saving. Kaya remembers the exact normalized note and transaction type only after that transaction saves. Cancelling teaches nothing. On the next matching Smart entry, the remembered rule takes priority over history/model suggestions; an explicit category command or manual choice still wins. A prepared draft explains when a rule supplied its category.

Open **Settings > Entry preferences** to inspect rules, change their category or matching note, or forget them. On a phone, Settings is inside More; on desktop it is under your name. These are explicit rules, not automatic promotion from repeated corrections. Existing history-based suggestions remain available without creating rules. Deleting a category removes its rules; Undo of that category deletion does not recreate the removed rules.

In Quick add, **Review > More > Save as favourite** saves a named favourite from the current draft. **More > Use a favourite** opens one from the entry screen. Leave **Keep this amount** unticked to ask for an amount each time. Templates keep the transaction type, available wallets, category and note; opening one uses today's Jakarta date and creates an unsaved draft. Use its edit/delete controls to manage it. A deleted wallet/category asks for a replacement. Saving a template does not save a transaction.

### Several transactions in one message

Choose **More > Several transactions** in Quick add. Enter up to five entries, separated by semicolons or new lines, for example:

```text
Food 35rb BCA;
Salary 5jt Bank Jago;
transfer 500rb from BCA to Bank Jago
```

Each entry has its own fields, reply box, missing-field checks and undo. Name the wallet/date in each entry when they differ; an omitted non-transfer wallet uses the visible default rather than another entry's wallet. An unspecified date defaults to today. Untick an entry to leave it out. Review duplicate notices and each wallet's displayed balance change, then confirm the selected entries together. Hidden balances stay hidden. Enter in a reply never saves.

Selected rows save atomically: all succeed or none do. If acknowledgement is lost or malformed, editing is frozen and **Retry same batch safely** resends the exact confirmed request with its original key. It cannot insert that batch again. **Check Transactions** opens records in a new tab. Closing an uncertain batch discards the browser's retry controls, so inspect Transactions before preparing the same entries again. This is several separate transactions, not a category split of one payment.

### Spending questions and recurring payments

On **Insights**, use **Ask about your records** for English or Indonesian questions, such as `How much did I spend on Food last month?`, `Compare spending September 2026 with August 2026`, or `Show my 3 largest expenses this year`. Code calculates every amount, excludes transfers/balance adjustments from income and spending, and links to matching records. Whole-month comparisons have a separate link for each period. Largest-expense and recurring-payment links can scope Transactions to exact records; **Show all records in this period** clears that record scope. Unknown filters, exclusions, unsupported wording and ambiguous dates ask for clarification. If records change, an old answer is cleared so its figures do not silently disagree with the linked list.

Expand **Recurring payments** to review patterns backed by at least three recorded expenses with the same normalized note and wallet. Candidates can be weekly, monthly or annual; amounts may vary. The displayed next date estimates the occurrence after the latest recorded payment, so it can be in the past when records are missing. **Track payment** and **Dismiss** are saved choices, manageable under **Manage saved choices**. Tracking never creates a future payment. Sparse annual history, inconsistent descriptions, missed records or multiple same-day payments may prevent detection; a pattern is not proof of a subscription contract.

Rules, templates, subscription choices and durable batch keys are stored locally in Kaya's database and included in its existing whole-file backups. These additions do not upload data or download models. Receipt/screenshot entry, voice and reconciliation remain future work.

### Import a bank CSV

On **Transactions**, choose **Import CSV**, the wallet and your CSV file. The file is read locally. Check the detected columns, dates, amounts and categories before saving. Unreadable rows explain why; likely duplicates start unticked.

Possible transfers are offered for review. Choose whether a row stays income/spending or becomes a transfer to another wallet. When the matching other side is already recorded, Kaya replaces it so the balance is counted once. Nothing becomes a transfer automatically.

The preview explains the balance change. After import, **Undo** is available for ten seconds and restores any replaced rows. Bank-specific formats may need column adjustments; anonymised statements are still needed for further tuning.

### Goals, depositos and reports

A goal sets aside money already in a wallet. **Add money** can update the goal alone or transfer money from another wallet. Deleting a goal leaves the money in place.

A deposito is funded from another wallet. It shows simple daily interest before tax, without counting it as income. Automatic renewal keeps the same principal and rate without compounding. At maturity, **Move money** returns principal and interest to the source wallet and offers **Undo** for ten seconds. Deleting a funded deposito returns **only the principal**; principal corrections adjust the source wallet by the difference.

On **Insights**, choose a month and **Report → Print or save as PDF**. The report includes spending, budgets, goals and transactions, with no wallet balances. **Export** saves a month or year as CSV.

## Use it on your phone

Home, Transactions, the orange +, Wallets and More stay in the compact bottom bar. The + opens Quick add; More opens the other pages and Settings. The current page keeps its selected state when you open or close Quick add. Home shows a compact total and separate wallet cards; its eye controls remember which balances you hide.

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


## Local assistant configuration

Smart entry is available by default. Set KAYA_AI_ENABLED=false in the backend environment before starting Kaya to turn it off; Simple expense and the ordinary form remain available. KAYA_AI_MODEL selects an already installed local model and defaults to qwen3.5:2b. Keep Ollama's cloud-disabled setting enabled. No model is downloaded automatically.

The preview never saves a transaction. Configuration details, supported sentences and isolated evaluation results are in [the preview service notes](ai-trial/PREVIEW-SERVICE.md).

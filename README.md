# KAYA

A calm personal finance tracker for Indonesian Rupiah. It runs on your own computer and keeps your data in one file that you own.

```
frontend/   what you see: the Next.js app
backend/    what saves your data: a small server and a SQLite database
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
| `npm test` | Run the backend's tests |
| `npm run typecheck` | Check the code for mistakes |
| `npm run lint` | Check the code style |
| `npm run build`, then `npm run start` | Build and run the production version (built without shrinking the code, see ROADMAP Step 6) |

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

# Kaya

A personal finance tracker for Indonesian Rupiah, one owner, runs locally.

- `frontend/` is the Next.js app (what the owner sees). `backend/` is a Hono server with a SQLite database that saves the data.
- Read `PRODUCT.md`, `DESIGN.md` and `ROADMAP.md` (all at this level) before changing anything. ROADMAP.md says how to run things, what is done, and what is next.
- Build one step at a time and stop after each step for review. Explain in plain, simple language.
- Run everything with `npm run dev` from this folder. Checks: `npm run typecheck`, `npm run lint`, `npm test` (backend).
- Never test against the real database (`backend/data/nabungbego.db`). Point the backend at a throwaway file with the `DB_PATH` environment variable, and use `npm run db:reset -- --yes` (with the same `DB_PATH`) to restore the sample data.
- The owner may already be running `npm run dev` (ports 3000 and 4000, real data) while you work, and their backend reloads when you edit backend files. Before starting anything, check who owns those ports, and never run browser tests against them (a request to port 3000 answering does not mean it is your server). Use other ports and a throwaway database: see "Testing in a browser while your own `npm run dev` is running" in ROADMAP.md.
- The frontend never calls the backend directly from the browser: it calls `/api/...`, and `frontend/next.config.ts` passes those on. The data types live in `backend/src/types.ts` and are re-exported to the frontend as types only.

@frontend/AGENTS.md

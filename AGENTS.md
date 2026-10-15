# Kaya: instructions for coding agents

A personal finance tracker for Indonesian Rupiah, one owner, runs locally. `CLAUDE.md` in this folder has the same rules for Claude Code; this file is the copy for other agents (Codex and others), so everything you need is here.

## Read first

1. `PRODUCT.md`, `DESIGN.md` and `ROADMAP.md` (all at this level) before changing anything. ROADMAP.md says how to run things, what is done and what is next.
2. `frontend/AGENTS.md`: this Next.js version has breaking changes. Read the relevant guide in `frontend/node_modules/next/dist/docs/` before writing Next code. Don't edit that file; `next dev` rewrites it.

## Where things are

- `frontend/` is the Next.js app (what the owner sees). `backend/` is a Hono server with a SQLite database that saves the data.
- The frontend never calls the backend from the browser: it calls `/api/...`, and `frontend/next.config.ts` passes those on.
- Data types live in `backend/src/types.ts` and are re-exported to the frontend as types only.

## Where we are

The goal now is to **finish the project**. Step 25 (the money pet) is built but waiting for the owner's opinion; **leave the pet alone** unless asked. Work from ROADMAP.md "Next": the other numbered items and the owner's open questions (Step 24, Deposito, the improvements list). Ask the owner which one to build next if it isn't clear.

## How to work

- Build one step at a time and **stop after each step for review**. Explain in plain, simple language; keep code simple.
- The design should be polished and a little fun where money moves, never generic. Follow DESIGN.md (calm over alarm, no scolding words).
- Match the surrounding code's style, comments and naming.
- Don't commit unless the owner asks. Keep unrelated changes out of a commit.
- Many files use CRLF line endings. Preserve them. Be careful with scripts that replace multi-line text.
- The React lint forbids calling setState directly inside an effect body; use a timer or an event.

## Running and checking

- `npm run dev` from this folder starts both parts (frontend on 3000, backend on 4000).
- Checks: `npm run typecheck`, `npm run lint`, `npm test` (backend and frontend unit tests).
- Browser tests: `npm run test:browser -w frontend` (Playwright, `frontend/tests/`). Some older suites assume today is 30 Sep 2026 and fail on untouched code; see ROADMAP.md.

## Never touch the owner's real data

- Never test against the real database (`backend/data/nabungbego.db`). Point the backend at a throwaway file with the `DB_PATH` environment variable, and restore sample data with `npm run db:reset -- --yes` (with the same `DB_PATH`).
- The owner may already be running `npm run dev` (ports 3000 and 4000, real data), and their backend reloads when you edit backend files. Before starting anything, check who owns those ports. A request to port 3000 answering does not mean it is your server.
- Never run browser tests against 3000/4000. Use a copy of the app in `.nb-test` on ports 3200/4200 with a throwaway database, open it as `localhost` (not `127.0.0.1`, or the page never hydrates), prove it shows the sample data first (BCA Rp 8.742.300, 41 transactions), and delete the copy afterwards. See "Testing in a browser while your own `npm run dev` is running" in ROADMAP.md.
- A step that changes the database must be built in copies of both `frontend/` and `backend/` inside `.nb-test`, because the owner's backend restarts on every edit and would run the upgrade on the real file half-finished. Rehearse the upgrade on a copy of the real data before copying files across.

## When you finish

Tell the owner what you changed, what you tested and what you did not test. Update ROADMAP.md (done, next, and any questions for the owner), and DESIGN.md or PRODUCT.md if the look or behaviour changed.

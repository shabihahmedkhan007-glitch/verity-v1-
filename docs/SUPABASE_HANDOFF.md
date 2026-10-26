# Supabase hand-off

For the teammate who switches Supabase on. Read this top to bottom once, then follow "Setup steps".

Status on 2026-10-26: **live.** Project "verity" is created and reachable; `backend/.env` has `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`; `frontend/.env.local` has the public URL and publishable key. `supadmin@verity.com` exists (role `super_admin`); the chats and run-list store picked Supabase (`chats: supabase` in the startup log). Decisions: D47, D48, D50, D51 in `docs/DECISIONS.md`. Requirements: `docs/PRD.md` section 5.7 (SB1 to SB4). Exact interfaces: `backend/CONTRACTS.md` sections 9 to 11. Short version of the steps: `backend/README.md`, "Accounts and saved chats (Supabase)".

## What Supabase does here

- **Sign-in.** Email and password. The team makes every account by hand and hands it to a judge. There is no sign-up anywhere.
- **Saved chats.** Chat threads and their turns are kept in Supabase Postgres, so a chat follows the account to another browser or device.
- **Run list.** Each account's list of runs is kept in Supabase too.
- **What stays on the Verity server.** Run files, events, sign-off sheets and spend ledgers stay in Verity's SQLite database and on its disk. Supabase never sees them.
- **Why the server holds the data.** The browser only signs in with Supabase. It never reads a chat table. The backend reads and writes the tables with a secret key.

## What is built

### Backend

- **Token check.** `AuthService.verify_supabase_token` in `backend/verity/api/auth.py`.
  - Uses PyJWT against the project's keys at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`. The keys are read again after `[supabase] jwks_cache_s` (600 s at most).
  - The token's `kid` picks the key. Only that key's own algorithm is accepted: ES256 for an EC P-256 key, RS256 for an RSA key. A token that claims HS256 or `none` is refused whatever its header says.
  - Required claims: `iss` is `<SUPABASE_URL>/auth/v1`, `aud` is `authenticated`, `exp` is in the future (10 s leeway), `sub` is a uuid.
  - A token from an anonymous sign-in (`is_anonymous`) is refused.
  - An unknown `kid` makes the server read the keys again, at most every 30 s.
- **Legacy fallback.** A project that publishes no keys (it still signs with the shared secret) is checked with `GET <SUPABASE_URL>/auth/v1/user`, using `SUPABASE_PUBLISHABLE_KEY` as `apikey` and the user's token as the bearer. The answer is kept 60 s per token. See `_verify_with_project` in the same file.
- **Who the user is.** A valid token gives the session id `u:<user id>` and role `user`. The server tries its own access-code token first, then the Supabase token. Rate limits, the $3.00 per-day session spend limit (`core.budget.spend_owner`), run ownership, stream tokens, chats and the run list all follow that id, so they follow the user across devices.
- **Chat store.** `SupabaseThreadStore` in `backend/verity/store/supabase_threads.py` implements the `ThreadStore` protocol over PostgREST (`<SUPABASE_URL>/rest/v1/`). The secret key goes in the `apikey` header only, never as a bearer token. `[threads] store = "auto"` in `backend/config.toml` picks Supabase when both `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set, else SQLite. `VERITY_THREADS__STORE=sqlite` forces local.
- **Run index.** `POST /runs` records `(owner, runId, threadId, title)` in `user_runs`. A failed write is logged and never fails the run.
- **Routes** (`backend/verity/api/routes.py`):
  - `GET /runs/mine`: the caller's own runs, newest first, at most 50: `{id, title, threadId, createdAt, status}`.
  - `POST /runs/{id}/stream-token`: a fresh stream token for a run this account started, so a second device can watch a run that is still going.
- **Health.** `GET /health` lists `accounts` in `features` when `SUPABASE_URL` is set.
- **Credits and Admin Onboarding.** (D50)
  - `user_credits` table tracks credits per owner (`owner TEXT PRIMARY KEY, credits INTEGER DEFAULT 3`).
  - Every account starts with 3 run credits. Each run deducts 1 credit.
  - Onboarding is restricted to admins (default `admin@verity.com`, configured via `admin_emails`).
  - Admins can add users directly from the bench sidebar modal dialog (`POST /admin/users`), which creates auto-confirmed accounts in Supabase GoTrue Auth and seeds their starting credits.
- **Schema.** `backend/supabase/schema.sql`: tables `threads`, `thread_turns`, `user_runs`, and `user_credits`, row level security on, no policies, no grants for `anon` or `authenticated`, full grants for `service_role`. Safe to run again.
- **Production guard.** With `VERITY_ENV=production`, `SUPABASE_URL` must be https and its host must end with `.supabase.co`. Production accepts Supabase sign-in or access code hashes (either is enough). `VERITY_THREADS__STORE=supabase` without the URL and the secret key is refused.

### Frontend

- **`/signin`.** `frontend/src/app/signin/page.tsx` and `frontend/src/components/sections/signin/SignInView.tsx`. Title "Sign in to Verity", email and password, "Sign in" as the one amber action. No sign-up link and no sign-up wording. `signUp` is never called.
- **Access code option.** "Have an access code?" opens the bench's access code form, so a judge with only the code still gets in.
- **Client.** `frontend/src/lib/sources/live.ts`. The `@supabase/supabase-js` client loads on first use from a dynamic import, so the replay path and a build without accounts never load it. Plain error sentences: a wrong login reads "That email and password do not match."; too many attempts reads "Too many attempts. Wait a minute and try again."
- **Public config.** `frontend/src/lib/env.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. With either unset there is no sign-in gate.
- **Bench guard.** `frontend/src/components/sections/bench/BenchView.tsx`. When `/health` says `authRequired`, accounts are configured, and the reader has neither an account nor a code session, the page goes to `/signin?next=<path>`. The recorded run (`/studio`) stays public. The landing's live buttons go to `/signin?next=/bench` when accounts are configured.
- **Sidebar lists.** `frontend/src/components/sections/bench/Sidebar.tsx` and `frontend/src/lib/hooks/use-account-lists.ts`. Signed in, "Chats" is `GET /threads` and "Your runs" is `GET /runs/mine`. They refresh after a message, when a run starts or ends, and when the window gets focus again.
- **Sign-out.** Signs out of this browser only (the account stays signed in elsewhere) and clears the chats and runs cached here (`verity.threads`, `verity.openThread`, `verity.recentRuns`), so the next person on this browser does not see them.
- **Opening a chat.** A chat in the list opens `/bench?thread=<id>`. It is rebuilt from the stored replies.

Frontend design notes: `frontend/ARCHITECTURE.md` section 8.4.

## Setup steps

Never use the Supabase CLI and never use the project the CLI is linked to. Make a new project in the dashboard.

1. **Make a new Supabase project** in the dashboard.
2. **Turn off sign-ups.** In Authentication settings, turn **off** "Allow new users to sign up". Keep "Allow anonymous sign-ins" **off**. Leave "Confirm email" (under the Email provider) **on**. Why: step 5 confirms each account by hand. If the sign-up switch is ever missed, a stranger who signs up with the public publishable key then gets no session.
3. **Check the JWT signing keys.** In Project Settings, "JWT signing keys", the project should have an asymmetric key (ES256 or RS256) as its current key. Open `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` in a browser: it should list at least one key. If the list is empty, the project is a legacy one: also set `SUPABASE_PUBLISHABLE_KEY` in step 6 and the server will use the fallback check. I did not confirm from the docs that a new project always starts with an asymmetric key, so look.
4. **Make the tables.** Open the SQL Editor, paste all of `backend/supabase/schema.sql` and run it. Check Table Editor: `threads`, `thread_turns` and `user_runs` exist, each with RLS enabled.
5. **Add the judges.** Authentication, Users, "Add user": email and password, with "Auto Confirm User" **on**. Hand the pair over. Without Auto Confirm the account cannot sign in.
6. **Backend settings** in `backend/.env` (gitignored; the secret key goes nowhere else):
   - `SUPABASE_URL`: the Project URL, `https://<ref>.supabase.co`.
   - `SUPABASE_SECRET_KEY`: the `sb_secret_...` key from API Keys. Server only.
   - `SUPABASE_PUBLISHABLE_KEY`: optional, only for a legacy project (step 3).
   - `VERITY_AUTH__REQUIRED=true` if the bench should demand an account or the access code. `auth.required` is `false` in `backend/config.toml` for local work, and the bench guard only acts when `/health` says `authRequired`. A hosted production backend must set it anyway (the production guard refuses to start without it).
7. **Frontend settings** in `frontend/.env.local`, or in the host's build environment:
   - `NEXT_PUBLIC_SUPABASE_URL`: the same Project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the `sb_publishable_...` key. Public by design.
   - `NEXT_PUBLIC_AGENT_URL` must already point at the backend.
8. **Restart.** Restart the backend (`.venv\Scripts\verity-api.exe` from `backend/`, see the README). Restart `npm run dev`, or rebuild with `npm run build`: `NEXT_PUBLIC_*` values are baked in at build time.

Notes:

- `HANDOFF.md` lists adding the Supabase names to both `.env.example` files as still to do. If they are missing, add the names by hand (names only, no values).
- Chats made before the switch stay in SQLite and do not move into the account (D48). Runs started before the switch are not in `user_runs`, so they are not in "Your runs". Only new chats and new runs appear.
- For a hosted site, `VERITY_CORS_ORIGINS` must contain the site's origin (never `*` in production).

## How to check it works

Do these in order. Stop at the first failure and use "Troubleshooting".

1. **Settings reach the backend.** From `backend/`, print booleans only (this goes through the settings loader and never prints a key):
   ```
   PYTHONIOENCODING=utf-8 .venv/Scripts/python.exe -c "from verity.config import load_settings; s=load_settings(); print(bool(s.supabase.url), bool(s.supabase.secret_key), s.threads.store)"
   ```
   Expect `True True auto`.
2. **Health.** `GET http://127.0.0.1:8000/health`: `features` includes `accounts`, and `authRequired` is `true` if you want the gate.
3. **Sign in on browser A.** Open the site, press "Try it live" (or go to `/signin?next=/bench`), sign in with a judge account. You land on `/bench`. The sidebar foot shows the email and "Sign out".
4. **Make a chat.** Send a chip request. In Supabase Table Editor, `threads` and `thread_turns` have new rows whose `owner` is `u:<user id>`.
5. **Sign in on browser B** (another browser or a private window) with the same account. "Chats" lists the thread. Open it: the messages come back, including the chip card.
6. **Run follows the user.** Start a run on A. On B, "Your runs" lists it. While it is running, B can open it and watch (the stream-token route). `user_runs` has the row.
7. **`GET /runs/mine`.** Copy the `Authorization: Bearer ...` value from any backend request in the browser's network tab and call `GET http://127.0.0.1:8000/runs/mine` with it. Expect `{"runs": [...]}` with that account's runs only. Do not paste the token into chat or a doc.
8. **Isolation.** Sign in as a second judge account. It sees none of the first account's chats or runs.
9. **Sign out.** On A, "Sign out". The chats and runs cached in that browser are gone. B is still signed in.
10. **No sign-up.** The sign-in page has no sign-up link. A direct sign-up attempt with the publishable key is refused by Supabase because sign-ups are off.

## What is tested, and what is not

Tested (mocks and fakes only):

- `backend/tests/api/test_supabase_auth.py`: token checks against a fake key set (algorithms, claims, anonymous tokens, the legacy path).
- `backend/tests/store/test_supabase_threads.py`: `SupabaseThreadStore` over a mock HTTP transport.
- Routes and wiring: `backend/tests/api/test_threads_route.py`, `backend/tests/api/test_main_wiring.py`, `backend/tests/api/test_auth_tokens.py`.
- REPORT 2026-10-23: the targeted backend suites passed 500 tests on mocks after the build. The later full suites passed 987 and then 1030 tests with Docker (these do not call Supabase).
- Frontend: typecheck and lint clean. `/signin` was looked at in a browser at 1440 x 900 and 390 wide with placeholder settings (wrong-login message, access code form).

**Not tested: anything against a real Supabase project.** Specifically:

- The real JWKS document and a real token from a real sign-in.
- `schema.sql` run on a real project, the `service_role` grants, and the real PostgREST answers.
- The browser session refresh, and the `supabase-js` import in a static build with real settings.
- A real Supabase outage (the code returns `502` with "Saved chats are unreachable right now.").
- The legacy `/auth/v1/user` path.
- Two browsers on one account (steps 5 and 6 above are the first real test).

## Security notes

- **The secret key is server only.** It lives in `backend/.env` and nowhere else. Never in `frontend/`, never in a `NEXT_PUBLIC_*` variable, never in the repo or a log. The backend sends it only as the `apikey` header to `<SUPABASE_URL>/rest/v1/`. The log filter scrubs the `apikey` header and any `sb_secret_` string. If it leaks, rotate it in API Keys, update `backend/.env` and restart.
- **Row level security is on with no policies.** `anon` and `authenticated` have no grants on the three tables. Even with the public publishable key, the browser cannot read a row. Only the server, with `service_role`, can, and every server query names its owner (`u:<user id>`).
- **The publishable key is public by design.** Supabase meant it for browsers. Here it only reaches the Auth service for sign-in.
- **Sign-ups off, anonymous sign-ins off, Confirm email on.** The server also refuses anonymous tokens, so a missed switch does not open the bench.
- **Tokens are checked, not trusted.** Only the matched key's own algorithm, `iss`, `aud`, `exp` and a uuid `sub`. No token text is logged.
- **One chat store for every session.** When Supabase is on, access-code sessions use it too. A Supabase outage stops the bench chat for them as well. Starting a run, runs already going, replays and the fact check keep working.
- **Treat model output as untrusted.** Supabase changes nothing about this: no model text starts a run or reaches a table key. Owners come from the verified token only.

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| `/health` has no `accounts` | `SUPABASE_URL` not read | Run the check in step 1 of "How to check it works". Fix `backend/.env`, restart the backend |
| Check prints `True True sqlite` or the chats stay local | `VERITY_THREADS__STORE=sqlite` is set | Remove it, restart |
| The site has no sign-in gate | `NEXT_PUBLIC_SUPABASE_*` missing at build time, or `/health` has `authRequired` false | Set both values and rebuild or restart the dev server. Set `VERITY_AUTH__REQUIRED=true` if the gate should be forced |
| "That email and password do not match." with a correct pair | The account was added without "Auto Confirm User" while "Confirm email" is on | Confirm it in Authentication, Users, or delete and add it again with Auto Confirm |
| Sign-in works but the backend answers `401` | Wrong project (`iss` does not match `SUPABASE_URL`), an empty key list on a legacy project, a clock more than 10 s off, or an anonymous token | Check that both URLs are the same project. Open the JWKS URL. Set `SUPABASE_PUBLISHABLE_KEY` for a legacy project. Check the machine clock |
| `502` "Saved chats are unreachable right now." | `schema.sql` not run, the wrong key in `SUPABASE_SECRET_KEY` (the publishable key will not work), the project is paused or gone, or a timeout (`[supabase] timeout_s`, 8 s) | Check the three tables exist. Check the `sb_secret_` key. Open the project in the dashboard. The backend log shows a status and a Postgres error code, never a key |
| The bench keeps returning to `/signin` | The saved token is rejected by the backend | Sign out, sign in again, then see the `401` row |
| Old chats and runs are missing after the switch | They are in SQLite and are not moved (D48) | Expected. Only new chats and runs appear. `VERITY_THREADS__STORE=sqlite` brings the old server chats back |
| Production refuses to start | The guard: provider, base URL host, `LLM_API_KEY`, `auth.required`, a 32+ character `VERITY_SIGNING_SECRET`, sign-in (Supabase URL or access code hashes), CORS without `*`, and the https `.supabase.co` host | Read the printed problem list and fix each one |
| A second device cannot watch a running run | The stream token lives in the tab that started the run | The web asks `POST /runs/{id}/stream-token` for a fresh one. If that returns `403`, the run belongs to another account |

If something here disagrees with `backend/CONTRACTS.md` sections 9 to 11, the contracts win on interfaces.

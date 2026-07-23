# Manual Verification Plan — Backend Persistence Sync

Step-by-step checklist for verifying Google OAuth, account-scoped offline persistence, and sync on branch `feat/backend-persistence-sync`.

Automated tests (`npm run test:all`, phase gates) cover much of this; these steps confirm behavior in a real browser with your Google OAuth credentials.

---

## Prerequisites

### 1. Environment

Copy and fill [`.env.example`](../.env.example):

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Default: `postgresql://postgres:postgres@127.0.0.1:5432/warmups` |
| `BETTER_AUTH_SECRET` | Yes | Long random string (≥32 chars) |
| `BETTER_AUTH_URL` | Yes | `http://localhost:5173` (browser origin) |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | From Google Cloud Console |
| `E2E_GOOGLE_EMAIL` | Optional | For `npm run test:e2e:auth` only |
| `E2E_GOOGLE_PASSWORD` | Optional | Test account; 2FA must be disabled |

### 2. Google Cloud OAuth client

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Add **Authorized redirect URI**:
   ```
   http://localhost:5173/api/auth/callback/google
   ```
4. If you use `127.0.0.1` instead of `localhost`, add matching redirect URIs and set `BETTER_AUTH_URL` to that origin.

### 3. Start local stack

```bash
npm run db:up
npm run db:migrate
npm run dev:all
```

- Vite: `http://localhost:5173`
- API (proxied): `http://localhost:5173/api/*` → Hono on `:3001`

Use **`npm run dev:all`**, not `npm run dev` alone — auth and sync require the API.

### 4. Quick health check

```bash
curl http://localhost:5173/api/health
```

Expected: `{"ok":true,"service":"10pwarmups-api"}`

---

## Manual verification steps

### Step 1 — First visit shows login (online)

1. Open `http://localhost:5173` in a clean profile or after clearing site data.
2. **Expected:** Login screen with **Sign in with Google**.
3. **Not expected:** Deck list / Train buttons before sign-in.

---

### Step 2 — Google OAuth login

1. Click **Sign in with Google**.
2. Complete Google consent with your test account.
3. **Expected:** Redirect back to the app; brief “Loading progress…” then deck list.
4. Refresh the page.
5. **Expected:** Still logged in (session cookie); deck list loads without login screen.

**If it fails:** Check redirect URI mismatch, missing `GOOGLE_*` in `.env`, or API not running (`dev:all`).

---

### Step 3 — Online progress persists

1. While online, complete one deck (e.g. A1).
2. Note progress on home screen (e.g. streak / attempt count).
3. Hard refresh.
4. **Expected:** Same progress visible.

**Optional DB check:**

```bash
npm run db:psql
```

```sql
SELECT deck_id, final_streak, date FROM attempts ORDER BY created_at DESC LIMIT 5;
```

---

### Step 4 — Offline practice (cached account)

1. After at least one successful login, open DevTools → **Network** → **Offline**.
2. Refresh the app.
3. **Expected:** Deck list loads; **Train** works (no “Connect to sign in” unless you never logged in on this device).
4. Complete a deck offline.
5. **Expected:** Completion screen; progress updates on home.

**LocalStorage check (DevTools → Application → Local Storage):**

- `tp_active_user` — your user id
- `tp_progress:<userId>` — progress JSON with new attempt
- `tp_outbox:<userId>` — queued sync events (if online sync hasn’t run yet)

**Not expected:** New progress only in unscoped `tp_progress` (legacy key).

---

### Step 5 — Reconnect sync

1. With offline progress from Step 4, turn **Network** back online.
2. Focus the tab or wait a few seconds (app syncs on `online` / `focus`).
3. Refresh.
4. **Expected:** Offline attempt still visible in UI.

**Optional DB check:** New row in `attempts` matching the offline deck completion.

---

### Step 6 — Reset ordering (offline reset, then train)

1. Go offline again (optional but exercises the invariant).
2. **Reset all** → confirm reset.
3. Complete a deck offline.
4. Go online; refresh after a few seconds.
5. **Expected:** Only post-reset progress exists; old attempts do **not** reappear from DB.

---

### Step 7 — Legacy import (empty DB account)

Use a **new Google account** or delete that user’s rows in DB so `hasDbProgress` is false.

1. Before login, in DevTools console or Application tab, set legacy key:
   ```javascript
   localStorage.setItem('tp_progress', JSON.stringify({
     A1: {
       bestStreak: 5,
       lastAttemptDate: '2026-06-23',
       attempts: [{ date: '2026-06-23', finalStreak: 5, wrongMoves: [], duration: 60 }]
     }
   }))
   ```
2. Sign in with Google (account with **no** existing attempts in DB).
3. **Expected:** Legacy attempt appears after setup; unscoped `tp_progress` removed.
4. **Expected:** Data under `tp_progress:<userId>`.

---

### Step 8 — DB wins over legacy (account with existing progress)

Use an account that **already has** attempts in DB (from Step 3).

1. Seed conflicting legacy `tp_progress` locally (same as Step 7).
2. Sign in with that account.
3. **Expected:** UI shows **DB** progress, not legacy blob.
4. **Expected:** Legacy `tp_progress` ignored/deleted after hydration.

---

### Step 9 — Login required when offline with no cache

1. Clear site data (or use a fresh profile).
2. Go offline **before** any login.
3. Open `http://localhost:5173`.
4. **Expected:** “Connect to the internet to sign in” (or equivalent offline login message).
5. **Not expected:** Train buttons or anonymous training.

---

## Automated checks (optional)

Run after manual pass or to regression-test:

```bash
npm run type-check
npm run test:run
npm run test:all
npm run test:e2e:auth   # requires E2E_GOOGLE_* in env
node scripts/phaseGate.mjs --phase 8 --label "manual-followup"
```

Phase gate logs: `logs/phase-gates/`

---

## Short pass (minimum)

If time is limited, verify only:

| # | Check |
|---|--------|
| 1 | Google OAuth login → deck list |
| 2 | Online completion → survives refresh |
| 3 | Offline refresh after prior login → can train |
| 4 | Offline completion → syncs after reconnect |
| 5 | Offline reset → old DB progress does not return online |

---

## Common failures

| Symptom | Likely cause |
|---------|----------------|
| Sign in does nothing | Missing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; restart `dev:server` |
| Redirect URI mismatch | Google console URI ≠ `http://localhost:5173/api/auth/callback/google` |
| `/api/*` 404 or network error | Only Vite running; use `npm run dev:all` |
| Stuck on login after Google | `BETTER_AUTH_URL` wrong origin; check API logs |
| Offline shows login only | No prior login on device; `tp_active_user` missing |
| Reset “doesn’t work” online | Old DB data repopulated before reset outbox synced |

---

## Architecture reference

```text
Browser (localhost:5173)
  ├── AppShell + bootstrapMachine → login | loading | RouterProvider
  ├── tp_progress:<userId>  +  tp_outbox:<userId>
  └── /api/* (proxied) → Hono :3001
        ├── /api/auth/*     → Better Auth (Google)
        └── /api/progress, /api/sync → Postgres (Docker)
```

Invariants are documented in the backend persistence sync implementation plan on branch `feat/backend-persistence-sync`.

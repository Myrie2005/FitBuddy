# FitBuddy – Server

Express 5 + TypeScript + Prisma (PostgreSQL) + Zod + Socket.IO

## Getting started

Requires **Node.js 22.12 or newer** (`node -v`).

1. Get the database URL from [Neon](https://neon.tech): ask the project owner to invite you to the
   `fitbuddy` project (send the email you signed up with), then open it → **Connect** →
   choose **Branch: `development`**. Turn **Connection pooling off** and click **Show password**,
   then copy the connection string. Check two things in it:
   - the host must **not** contain `-pooler` (`db push` needs a direct connection) — delete it if it's there
   - change `sslmode=require` to `sslmode=verify-full` (otherwise you get an SSL warning on every start)
2. In the `server` folder:
   ```bash
   npm install                          # works without .env; generates the Prisma Client
   cp .env.example .env                 # fill in DATABASE_URL, JWT_SECRET (and TEST_DATABASE_URL for tests)
   npm run db:push                      # creates / updates the tables to match schema.prisma
   npm run db:reset-demo                # ⚠️ deletes ALL data, then inserts demo data (asks to confirm)
   npm run dev                          # http://localhost:3000
   ```
3. Check: http://localhost:3000/api/health → `{ "ok": true, "database": "up" }` (503 if the database is unreachable)

### Databases: development vs production
The Neon project has three branches (each is a separate database with its own URL):

| Branch | Used by | |
|---|---|---|
| `development` | Everyone's local `.env` (`DATABASE_URL`) | Safe to `db:push` and `db:reset-demo` |
| `test` | `npm test` (`TEST_DATABASE_URL`) | Wiped on every test run — never put real data here |
| `production` | Only the deployed server (set in the hosting service's environment variables) | Never put its URL in `.env` |

**Rules for the team:**
- **Changed a `.prisma` file?** Run `npm run db:push` — it updates the shared `development` database.
- **Pulled changes to `package.json` or to a `.prisma` file?** Run `npm install` only. It installs new
  libraries and updates the Prisma Client on your machine; the database is already updated.
  For any other pull, no install is needed.
- **Getting the URL:** copy it yourself from Neon → Connect → Branch: `development`.
  Don't send URLs in chat (they contain the password) and never commit `.env`.
- **Before `db:reset-demo`:** it prints the host it will wipe. Make sure it's the `development` host
  before typing `delete`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with auto-restart |
| `npm test` | Run all tests once (uses `TEST_DATABASE_URL`, see [Tests](#tests)) |
| `npm run test:watch` | Re-run tests on every file change |
| `npm run db:push` | Apply the `.prisma` files to the database (no migration files) |
| `npm run db:reset-demo` | ⚠️ **Deletes all data** in the database, then inserts demo data. Asks you to type `delete` first |
| `npm run db:studio` | Visual editor for browsing and editing data |
| `npm run db:generate` | Regenerate the Prisma Client from the `.prisma` files (`npm install` already does this) |
| `npm run build` / `npm start` | Production build and run |

### Running from WebStorm
Use an **npm** run configuration, not a Node.js one (Node can't run `.ts` files directly):
Run → Edit Configurations → **+** → **npm** → package.json: `server/package.json`, Command: `run`,
Scripts: `dev` (or `test`). Both ▶️ Run and 🐞 Debug (with breakpoints) work. Don't put
`DATABASE_URL` in the configuration's environment variables — the server reads `.env`.

### Changing the database
We use `prisma db push` instead of migration files: the `.prisma` files are the single source of truth,
and their Git history is the history of the database structure.

1. Edit the relevant file under `prisma/` (see below)
2. `npm run db:push` — Prisma updates the tables. If a change would delete data (dropping a column,
   removing an enum value), it warns and asks for confirmation first.
3. Commit the changed `.prisma` files
4. **Before deploying** code that needs the new structure, apply it to production too. Use the
   production URL (Neon → Connect → Branch: `production`) for this terminal session only:
   ```bash
   export DATABASE_URL="postgresql://...production URL..."
   npm run db:push        # read the warnings carefully; never add --force-reset here
   unset DATABASE_URL     # back to the development URL from .env
   ```

Change the **structure** (tables, columns, enums) only this way, never by hand in the Neon console.
Editing **data** by hand (Neon Tables view or Prisma Studio) is fine.

## Tests

Vitest + Supertest, in `tests/`. One file per area (`workouts`, `users`, `reports`, `admin`, `app`), 55 tests,
including concurrent sign-ups for the last spot and the Socket.IO events.

**Tests delete all data on every run**, so they use their own database: the `test` branch in Neon.
It already exists — don't create another one.

1. Neon → **Connect** → Branch: `test` → pooling off → **Show password** → copy the URL
   (same two fixes as above: no `-pooler`, `sslmode=verify-full`)
2. Add it to `.env`: `TEST_DATABASE_URL="postgresql://...test branch URL..."`
3. `npm test`

Before running, the tests update the test branch's tables (`prisma db push`), so a schema change never
needs a manual step. They refuse to start if `TEST_DATABASE_URL` is missing or points to the same
database as `DATABASE_URL`.

Two people running `npm test` at the exact same time share the `test` branch and can make each other's
tests fail. If a test fails for no clear reason, just run it again.

## Project structure

```
prisma/schema.prisma     Generator + datasource (Prisma merges every .prisma file in prisma/)
prisma/enums.prisma      Role, Category, Level, ReportStatus
prisma/models/           user.prisma, workout.prisma (Workout + Registration), report.prisma
prisma/seed.ts           Demo data
prisma.config.ts         Prisma CLI config (reads DATABASE_URL)
src/index.ts             HTTP server + Socket.IO
src/app.ts               Express app: middleware and routes
src/config/all.ts        Environment variables + app constants (limits, token lifetime, ...)
src/core/                Shared building blocks: Prisma client, Socket.IO, errors, workout response shape
src/middleware/          auth.ts (requireAuth / optionalAuth / requireAdmin), errorHandler.ts
src/routes/              workouts, users, reports, admin
src/schemas/             Zod schemas that validate every input (common, workout, user, report)
tests/                   Vitest tests, helpers.ts (test users and workouts), setup files
```

## API

All paths start with `/api`. Endpoints marked 🔒 require `Authorization: Bearer <token>`; 👑 means admin only.

All ids are UUID strings (e.g. `"0193a5c2-7b4e-7f3a-9c1d-5e8f2a6b4c10"`), not numbers. A path with an
invalid id returns `400 VALIDATION_ERROR`.

### Workouts
| Method | Path | Description |
|---|---|---|
| GET | `/workouts` | List (workouts of blocked users are hidden). Query params: `category`, `level`, `q` (searches title and location), `from`, `to`, `includePast=true`, `limit` |
| GET | `/workouts/:id` | A single workout |
| GET | `/workouts/:id/participants` | List of participants |
| POST 🔒 | `/workouts` | Create a workout. The organizer is registered automatically |
| PATCH 🔒 | `/workouts/:id` | Edit (organizer or admin). Send only the fields to change; `null` clears `description`, `lat`, `lng`, `wazeUrl` |
| DELETE 🔒 | `/workouts/:id` | Delete (organizer or admin) |
| POST 🔒 | `/workouts/:id/register` | Join. 409 if full or already registered |
| DELETE 🔒 | `/workouts/:id/register` | Leave |

Create request body:
```json
{
  "title": "Evening walk in the park",
  "category": "WALKING",
  "level": "ALL",
  "location": "Yarkon Park, Tel Aviv",
  "lat": 32.1, "lng": 34.8,
  "wazeUrl": "https://waze.com/ul?q=Yarkon%20Park",
  "startTime": "2026-11-20T17:00:00.000Z",
  "maxParticipants": 5,
  "cost": 0,
  "description": "Easy pace"
}
```
`lat`, `lng`, `wazeUrl`, `description`, `level` and `cost` are optional. `maxParticipants` is 2–50;
`cost` is in shekels (default 0 = free). If `wazeUrl` is empty the client can build a link from `location`. The form has separate date and time fields; combine them with
`new Date(`${date}T${time}`).toISOString()`.

Workout in responses:
```json
{
  "id": "0193a5c2-7b4e-7f3a-9c1d-5e8f2a6b4c10", "title": "...", "description": null, "category": "RUNNING", "level": "INTERMEDIATE",
  "location": "Sacher Park, Jerusalem", "lat": 31.78, "lng": 35.2, "wazeUrl": null,
  "startTime": "2026-11-16T17:00:00.000Z", "maxParticipants": 8, "cost": 0,
  "participants": 3, "spotsLeft": 5, "isFull": false,
  "organizer": { "id": "0193a5c2-...", "name": "Moshe" },
  "createdAt": "...",
  "isOrganizer": false, "isRegistered": true
}
```
`isOrganizer` and `isRegistered` are included only when the request sends a token.

### Users
| Method | Path | Description |
|---|---|---|
| GET 🔒 | `/users/me` | My profile |
| PATCH 🔒 | `/users/me` | Update `name`, `area`, `level`, `bio`, `preferredCategory`, `preferredTime` (send `null` to clear) |
| GET 🔒 | `/users/me/workouts` | `{ organized: [...], joined: [...] }` |
| GET | `/users/:id` | Public profile (no email) |

### Reports and admin
| Method | Path | Description |
|---|---|---|
| POST 🔒 | `/reports` | `{ reason, workoutId?, reportedUserId? }`. You can't report yourself, or report the same thing twice while it's still open |
| GET 🔒👑 | `/admin/users` | All users |
| PATCH 🔒👑 | `/admin/users/:id` | `{ role?, isBlocked? }` |
| GET 🔒👑 | `/admin/reports?status=OPEN` | Reports |
| PATCH 🔒👑 | `/admin/reports/:id` | `{ status: "RESOLVED" \| "DISMISSED" \| "OPEN" }` |

### Errors
Always the same shape:
```json
{ "error": "Invalid input", "code": "VALIDATION_ERROR", "details": [{ "field": "title", "message": "..." }] }
```
Codes worth handling in the client:

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `BAD_JSON`, `WORKOUT_STARTED`, `WORKOUT_UNAVAILABLE`, `ORGANIZER_CANNOT_LEAVE`, `CANNOT_REPORT_SELF` |
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN` |
| 403 | `FORBIDDEN` (also for blocked accounts) |
| 404 | `NOT_FOUND`, `NOT_REGISTERED` |
| 409 | `WORKOUT_FULL`, `ALREADY_REGISTERED`, `MAX_BELOW_REGISTERED`, `ALREADY_REPORTED` |
| 413 | `PAYLOAD_TOO_LARGE` (body over 100kb) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` (unsupported body charset) |

## Deploying

When `NODE_ENV=production`, the server refuses to start unless `CLIENT_ORIGIN` is set and `JWT_SECRET`
is at least 32 characters. It also checks the database connection on startup and exits with a clear
message if it can't connect.

Set the hosting service's health check path to `/api/health`: it returns 200 when the server and the
database are up, and 503 when the database is unreachable.

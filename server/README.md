
# FitBuddy – Server

Express 5 + TypeScript + Prisma (PostgreSQL) + Zod + Socket.IO + bcrypt + JWT

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
   npm install
   cp .env.example .env
   npm run db:push
   npm run dev
   ```

   Fill in `DATABASE_URL`, `JWT_SECRET` and `TEST_DATABASE_URL` in `.env`.

   The server runs at http://localhost:3000.

   Demo data can optionally be inserted using `npm run db:reset-demo`.

   **Warning:** This command deletes ALL existing data in the selected database.
   Coordinate with the team before running it.

3. Check: http://localhost:3000/api/health → `{ "ok": true, "database": "up" }` (503 if the database is unreachable).

### Databases: development vs production

The Neon project has three branches (each is a separate database with its own URL):

| Branch | Used by | Notes |
|---|---|---|
| `development` | Everyone's local `.env` (`DATABASE_URL`) | Shared development database |
| `test` | `npm test` (`TEST_DATABASE_URL`) | Wiped on every test run — never put real data here |
| `production` | Only the deployed server (set in the hosting service's environment variables) | Never put its URL in `.env` |

**Rules for the team:**

- **Changed a `.prisma` file?** Coordinate with the team and run `npm run db:push` to update the shared `development` database.
- **Pulled changes to `package.json` or to a `.prisma` file?** Run `npm install`. It installs new libraries and updates the Prisma Client on your machine. Confirm that the shared database schema has already been updated.
- **Getting the URL:** copy it yourself from Neon → Connect → Branch: `development`.
- Don't send database URLs in chat (they contain the password).
- Never commit `.env`, database credentials or `JWT_SECRET`.
- **Before `db:reset-demo`:** it prints the host it will wipe. Make sure it's the `development` host and coordinate with the team before typing `delete`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with auto-restart |
| `npm test` | Run all tests once (uses `TEST_DATABASE_URL`, see Tests) |
| `npm run test:watch` | Re-run tests on every file change |
| `npm run db:push` | Apply the `.prisma` files to the database (no migration files) |
| `npm run db:reset-demo` | ⚠️ **Deletes all data** in the database, then inserts demo data. Asks you to type `delete` first |
| `npm run db:studio` | Visual editor for browsing and editing data |
| `npm run db:generate` | Regenerate the Prisma Client from the `.prisma` files (`npm install` already does this) |
| `npm run build` / `npm start` | Production build and run |

### Running from WebStorm

Use an **npm** run configuration, not a Node.js one:

Run → Edit Configurations → **+** → **npm** → package.json: `server/package.json`, Command: `run`,
Scripts: `dev` (or `test`). Both Run and Debug (with breakpoints) work. Don't put
`DATABASE_URL` in the configuration's environment variables — the server reads `.env`.

### Running the client locally

Start the backend from the `server` folder:

```bash
npm run dev
```

Open another terminal in the `client` folder and run:

```bash
python -m http.server 5500 --bind 127.0.0.1
```

Open http://127.0.0.1:5500 in your browser.

The main HTML client communicates with the backend through `client/js/api.js`.

### Changing the database

We use `prisma db push` instead of migration files: the `.prisma` files are the single source of truth,
and their Git history is the history of the database structure.

1. Edit the relevant file under `prisma/` (see below).
2. Coordinate with the team and run `npm run db:push` — Prisma updates the tables. If a change would delete data (dropping a column, removing an enum value), review the warnings carefully.
3. Commit the changed `.prisma` files.
4. **Before deploying** code that needs the new structure, apply it to production too. Use the
   production URL (Neon → Connect → Branch: `production`) for this terminal session only:

   ```bash
   export DATABASE_URL="postgresql://...production URL..."
   npm run db:push
   unset DATABASE_URL
   ```

   Never add `--force-reset` when updating production.

Change the **structure** (tables, columns, enums) only this way, never by hand in the Neon console.

Editing **data** by hand (Neon Tables view or Prisma Studio) is possible, but changes to shared data should be coordinated with the team.

### Trainer status in the database

The User model includes:

```prisma
role      Role    @default(USER)
isTrainer Boolean @default(false)
isBlocked Boolean @default(false)
```

Trainer status is separate from the user's role.

All newly registered users receive `isTrainer: false`.

Administrators can approve or revoke trainer status through the admin API.

Existing users receive the default trainer status when the new field is added to the database.

The demo seed defines the four demo workout organizers as approved trainers. The demo administrator does not need trainer status.

Seeded users still cannot log in with a password until valid password hashes are configured.

## Tests

Vitest + Supertest, in `tests/`. One file per area (`workouts`, `users`, `reports`, `admin`, `app`, `auth`).

The latest full server test run completed successfully with **83 passing tests across 6 test files**.

| Test file | Tests |
|---|---:|
| `workouts.test.ts` | 31 |
| `users.test.ts` | 13 |
| `reports.test.ts` | 5 |
| `admin.test.ts` | 13 |
| `app.test.ts` | 5 |
| `auth.test.ts` | 16 |
| **Total** | **83** |

The tests cover:

- User registration and login.
- Password validation and password hashing.
- Duplicate email prevention.
- Invalid login credentials.
- JWT authentication and protected routes.
- Blocked accounts.
- Trainer approval and revocation.
- Prevention of unauthorized permission changes.
- Workout creation permissions.
- User profiles.
- Workout registration and concurrent sign-ups for the last spot.
- Reports and administrative actions.
- Socket.IO events.

**Tests delete all data on every run**, so they use their own database: the `test` branch in Neon.

It already exists — don't create another one.

1. Neon → **Connect** → Branch: `test` → pooling off → **Show password** → copy the URL
   (same two fixes as above: no `-pooler`, `sslmode=verify-full`).
2. Add it to `.env`: `TEST_DATABASE_URL="postgresql://...test branch URL..."`.
3. Run `npm test`.

Before running, the tests update the test branch's tables (`prisma db push`), so a schema change never
needs a manual step. They refuse to start if `TEST_DATABASE_URL` is missing or points to the same
database as `DATABASE_URL`.

Two people running `npm test` at the exact same time share the `test` branch and can make each other's
tests fail. Coordinate test runs with the team.

To run only the authentication tests:

```bash
npm test -- tests/auth.test.ts
```

To run only the admin tests:

```bash
npm test -- tests/admin.test.ts
```

## Project structure

```
prisma/schema.prisma     Generator + datasource (Prisma merges every .prisma file in prisma/)
prisma/enums.prisma      Role, Category, Level, ReportStatus
prisma/models/          user.prisma, workout.prisma (Workout + Registration), report.prisma
prisma/seed.ts          Demo data
prisma.config.ts        Prisma CLI config (reads DATABASE_URL)
src/index.ts            HTTP server + Socket.IO
src/app.ts              Express app: middleware and routes
src/config/all.ts       Environment variables + app constants (limits, token lifetime, ...)
src/core/               Shared building blocks: Prisma client, Socket.IO, errors, workout response shape
src/middleware/         auth.ts (requireAuth / optionalAuth / requireAdmin / requireTrainerOrAdmin), errorHandler.ts
src/routes/             auth, workouts, users, reports, admin
src/schemas/            Zod schemas that validate input (common, workout, user, report)
tests/                  Vitest tests, helpers.ts (test users and workouts), setup files
```

### Client authentication files

```
client/auth.html        Registration and login interface
client/index.html       Main homepage
client/create.html      Protected workout creation page
client/workouts.html    Workout listing page
client/profile.html     Protected profile page
client/js/api.js        Shared API communication
client/js/store.js      Authentication session, permissions and existing workout functionality
```

## API

All paths start with `/api`. Endpoints marked 🔒 require `Authorization: Bearer <token>`; 👑 means admin only.

All ids are UUID strings (e.g. `"0193a5c2-7b4e-7f3a-9c1d-5e8f2a6b4c10"`), not numbers. A path with an
invalid id returns `400 VALIDATION_ERROR`.

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Log in and receive a JWT token |

#### Registration

Request body:

```json
{
  "name": "Example User",
  "email": "user@example.com",
  "password": "Example1234!"
}
```

Password requirements:

- At least 8 characters.
- At least 4 digits.
- At least one special character.

The registration process:

- Validates the user's input.
- Prevents duplicate email registration.
- Prevents duplicate registration using different email capitalization.
- Hashes passwords using bcrypt before saving them.
- Creates the account with the USER role.
- Sets `isTrainer` to `false`.
- Prevents users from assigning themselves administrator or trainer permissions.

Passwords are not stored as plain text.

Successful registration returns HTTP 201 and user information without the password hash.

#### Login

Request body:

```json
{
  "email": "user@example.com",
  "password": "Example1234!"
}
```

The login process:

- Checks whether the account exists.
- Verifies the password against the stored password hash.
- Rejects invalid credentials.
- Rejects blocked accounts.
- Generates a JWT token after successful authentication.
- Returns the token and user information, including role and trainer status.

Example successful response:

```json
{
  "token": "example-jwt-token",
  "user": {
    "id": "0193a5c2-7b4e-7f3a-9c1d-5e8f2a6b4c10",
    "name": "Example User",
    "email": "user@example.com",
    "role": "USER",
    "isTrainer": false
  }
}
```

The token must be included in protected API requests:

```http
Authorization: Bearer <token>
```

Invalid email addresses and incorrect passwords receive a generic invalid credentials response.

Users who do not have an account must register before logging in.

### User roles and permissions

The application supports regular users, approved trainers and administrators.

Trainer status is represented by `isTrainer`, independently of the `role` field.

| Permission | Regular user | Approved trainer | Admin |
|---|---|---|---|
| View workouts | Yes | Yes | Yes |
| Join workouts | Yes | Yes | Yes |
| Manage own profile | Yes | Yes | Yes |
| Create workouts | No | Yes | Yes |
| Approve trainers | No | No | Yes |
| Revoke trainer status | No | No | Yes |
| Manage user permissions | No | No | Yes |

Administrators do not need trainer status to create workouts.

Approved trainers can also participate in workouts organized by other users.

The backend checks current user permissions from the database when processing authenticated requests.

Workout creation is protected by `requireAuth` and `requireTrainerOrAdmin`.

Users cannot bypass these restrictions by modifying client-side data.

Existing workout editing and deletion permissions remain based on workout ownership or administrator access.

### Trainer approval

All new users are registered as regular users.

Users who wish to become trainers should contact the administrators and provide their trainer certificate manually.

After reviewing the certificate, an administrator can approve the user.

Endpoint:

```http
PATCH /api/admin/users/:id
Authorization: Bearer <admin-token>
```

Request body:

```json
{
  "isTrainer": true
}
```

To revoke trainer permissions:

```json
{
  "isTrainer": false
}
```

Only administrators can perform these actions.

Permission changes take effect on subsequent authenticated server requests without requiring a new JWT token.

Regular users and trainers cannot change their own trainer status through the profile API.

Certificate upload through the website is not currently implemented and may be added as a future feature.

### Client authentication integration

The main HTML client is connected to the authentication API through `client/js/api.js`.

The authentication implementation includes:

- Registration and login forms.
- Password requirement indicators.
- Password confirmation validation.
- Password visibility controls.
- Duplicate email error handling.
- Invalid credentials error handling.
- JWT and current user storage using `sessionStorage`.
- Logout and session cleanup.
- Authentication persistence during page navigation and refresh.
- Current user and permission refresh from `/api/users/me`.
- Protected profile page navigation.
- Restricted access to workout creation.
- Workout creation buttons visible only to approved trainers and administrators.

The client removes old simulated authentication data when establishing or clearing an authentication session.

The backend remains responsible for enforcing permissions.

### Manual authentication testing

The following scenarios were successfully tested in the browser:

- Guest access to the homepage.
- Successful registration.
- Successful login.
- Duplicate email rejection.
- Incorrect password rejection.
- Login rejection for an unregistered email.
- Session persistence during navigation and refresh.
- Logout.
- Guest redirection from the workout creation page.
- Regular user restriction from workout creation.
- Approved trainer access to workout creation.

Trainer page access was verified using a temporary trainer permission on a test account. The temporary permission was removed after testing.

### Integration status

Authentication and trainer permissions are implemented on the server and connected to the main HTML client.

The administrator approval and revocation endpoints are implemented and covered by automated tests.

A dedicated administrator interface has not yet been verified in the browser.

Full workout and profile API integration is still pending. Some existing client functionality continues to use local demonstration data.

Workout creation access was tested in the browser, but actual workout creation and persistence through the main client have not yet been verified.

### Workouts

| Method | Path | Description |
|---|---|---|
| GET | `/workouts` | List (workouts of blocked users are hidden). Query params: `category`, `level`, `q` (searches title and location), `from`, `to`, `includePast=true`, `limit` |
| GET | `/workouts/:id` | A single workout |
| GET | `/workouts/:id/participants` | List of participants |
| POST 🔒 | `/workouts` | Create a workout (approved trainer or admin only). The organizer is registered automatically |
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
  "lat": 32.1,
  "lng": 34.8,
  "wazeUrl": "https://waze.com/ul?q=Yarkon%20Park",
  "startTime": "2026-11-20T17:00:00.000Z",
  "maxParticipants": 5,
  "cost": 0,
  "description": "Easy pace"
}
```

`lat`, `lng`, `wazeUrl`, `description`, `level` and `cost` are optional. `maxParticipants` is 2–50;

`cost` is in shekels (default 0 = free). If `wazeUrl` is empty the client can build a link from `location`. The form has separate date and time fields; combine them with:

```javascript
new Date(`${date}T${time}`).toISOString()
```

Use a future date when creating a new workout.

Workout in responses:

```json
{
  "id": "0193a5c2-7b4e-7f3a-9c1d-5e8f2a6b4c10",
  "title": "...",
  "description": null,
  "category": "RUNNING",
  "level": "INTERMEDIATE",
  "location": "Sacher Park, Jerusalem",
  "lat": 31.78,
  "lng": 35.2,
  "wazeUrl": null,
  "startTime": "2026-11-16T17:00:00.000Z",
  "maxParticipants": 8,
  "cost": 0,
  "participants": 3,
  "spotsLeft": 5,
  "isFull": false,
  "organizer": {
    "id": "0193a5c2-...",
    "name": "Moshe"
  },
  "createdAt": "...",
  "isOrganizer": false,
  "isRegistered": true
}
```

`isOrganizer` and `isRegistered` are included only when the request sends a token.

### Users

| Method | Path | Description |
|---|---|---|
| GET 🔒 | `/users/me` | My profile, including role and current trainer status |
| PATCH 🔒 | `/users/me` | Update `name`, `area`, `level`, `bio`, `preferredCategory`, `preferredTime` (send `null` to clear) |
| GET 🔒 | `/users/me/workouts` | `{ organized: [...], joined: [...] }` |
| GET | `/users/:id` | Public profile (no email) |

The authenticated profile response includes `role` and `isTrainer`.

Users cannot update `role`, `isTrainer` or `isBlocked` through their own profile endpoint.

Password hashes are not included in profile responses.

### Reports and admin

| Method | Path | Description |
|---|---|---|
| POST 🔒 | `/reports` | `{ reason, workoutId?, reportedUserId? }`. You can't report yourself, or report the same thing twice while it's still open |
| GET 🔒👑 | `/admin/users` | All users, including trainer status |
| PATCH 🔒👑 | `/admin/users/:id` | `{ role?, isBlocked?, isTrainer? }` |
| GET 🔒👑 | `/admin/reports?status=OPEN` | Reports |
| PATCH 🔒👑 | `/admin/reports/:id` | `{ status: "RESOLVED" \| "DISMISSED" \| "OPEN" }` |

Administrators can approve or revoke trainer status, block users and manage roles.

The existing restriction preventing administrators from changing their own account permissions remains in place.

### Errors

Always the same shape:

```json
{
  "error": "Invalid input",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "title",
      "message": "..."
    }
  ]
}
```

Codes worth handling in the client:

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `BAD_JSON`, `WORKOUT_STARTED`, `WORKOUT_UNAVAILABLE`, `ORGANIZER_CANNOT_LEAVE`, `CANNOT_REPORT_SELF` |
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN` |
| 403 | `FORBIDDEN` (also for blocked accounts and unauthorized workout creation) |
| 404 | `NOT_FOUND`, `NOT_REGISTERED` |
| 409 | `WORKOUT_FULL`, `ALREADY_REGISTERED`, `MAX_BELOW_REGISTERED`, `ALREADY_REPORTED` |
| 413 | `PAYLOAD_TOO_LARGE` (body over 100kb) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` (unsupported body charset) |

Authentication also handles:

| Status | Description |
|---|---|
| 400 | Invalid registration or login input |
| 401 | Invalid login credentials |
| 403 | Blocked account or insufficient permissions |
| 409 | Email address already registered |

### Security

The authentication implementation includes:

- Password hashing using bcrypt.
- Server-side input validation.
- JWT-based authentication.
- Server-side permission checks.
- Duplicate email prevention.
- Blocked account restrictions.
- Prevention of unauthorized role and trainer status changes.
- Generic invalid credentials responses.
- Password hashes excluded from user responses.

Never expose or commit:

- `.env` files.
- Database connection strings.
- Database passwords.
- JWT secrets.
- Real authentication tokens.

Additional production security measures, such as authentication rate limiting and email ownership verification, should be considered before a public deployment.

## Deploying

When `NODE_ENV=production`, the server refuses to start unless `CLIENT_ORIGIN` is set and `JWT_SECRET`
is at least 32 characters. It also checks the database connection on startup and exits with a clear
message if it can't connect.

Set the hosting service's health check path to `/api/health`: it returns 200 when the server and the
database are up, and 503 when the database is unreachable.

Before deploying:

- Confirm that the production database schema includes `isTrainer`.
- Configure the production database URL and JWT secret securely.
- Configure the allowed client origin.
- Configure the client to use the deployed backend URL instead of the local development server.
- Run the server tests against the dedicated test database.
- Verify authentication and permissions in the deployed environment.
- Complete and verify the remaining client API integrations.

Never run `db:reset-demo` against the production database.

# Milestone 1 handoff

## Result

The backend implements the first complete feature: verified accounts, own-profile creation/reading/editing, photo upload/view/delete and profile completion. The HTTP prototype runs locally and can be demonstrated without external credentials.

P1/P2 and the updated project requirements remain the product and architecture basis. Milestone 2 has not started. There are no questionnaire, preference, discovery, swipe, match, contact, block or report implementations or tables. Frontend development is separate. No production deployment or live student-data integration has been performed.

## Working API

| Method | Path | Demonstrable behavior |
| --- | --- | --- |
| GET | `/api/v1/health` | Process liveness |
| GET | `/api/v1/schools` | Configured enabled schools and accepted email domains |
| GET | `/api/v1/me` | Current verified school identity, one-time application account bootstrap, profile completion |
| GET | `/api/v1/me/profile` | Retrieve own saved profile with short-lived photo URLs |
| PUT | `/api/v1/me/profile` | Create or replace profile text |
| PATCH | `/api/v1/me/profile` | Edit selected existing profile fields |
| POST | `/api/v1/me/photos` | Validate and save a photo, up to three |
| DELETE | `/api/v1/me/photos/{photoId}` | Delete an owned photo |

Registration, confirmation, login, logout, recovery and refresh use Supabase Auth directly as specified in the PRD. The backend integrates `getUser(accessToken)` and enforces confirmed email, exact school-domain membership and active account status. It stores no passwords, trusts no client school/ownership IDs and returns no contact data in profiles.

Profile fields include display name, bio, major, class year and interests. Incomplete text profiles can be saved; one photo completes this milestone's profile step. Images have a 5 MiB file limit, decoding/type checks, 20-megapixel input limit, orientation normalization, resize to fit 1600x1600, metadata removal and private JPEG storage. Photos use five-minute viewing links.

SQL uses private schema `roommate` with five feature tables, foreign keys, unique photo slots, check constraints, RLS and restricted backend grants. Transactions and account row locks coordinate profile/photo writes. Storage failures trigger rollback and best-effort object cleanup. SQL and remote Storage are separate systems; cleanup failures are logged for operator review rather than hidden behind a success response.

## Verification performed

| Check | Actual result |
| --- | --- |
| `npm test` | **36 passed, 0 failed, 0 skipped**, across four suites |
| `npm run api:check` | OpenAPI 3.0.3 validated: **6 paths, 8 operations** |
| `npm run demo:check` | Actual local HTTP process passed create/read/edit, photo upload/view/delete, profile completion and Auth-gate checks; process stopped afterward |
| `node --check` | All source/script/test JavaScript files passed syntax checks |
| Dependency audit | `npm audit` reported **0 vulnerabilities** after updating `multer` to 2.5.0 and `body-parser` to 2.4.0 |

Tests execute real migrations and repository SQL in embedded PostgreSQL, actual image processing and HTTP requests. They cover authentication errors and provider outages; email confirmation; exact/disabled school domains; spoofed metadata; idempotent account creation; suspended accounts; profile validation/replacement/patch semantics; ownership; one-photo completion; three-photo limits under concurrent requests; corrupt/MIME-spoofed/oversized photos; failed uploads, database writes and deletions; restricted-role permissions; migration re-runs/checksums; RLS/grants; CORS; request limits; safe errors; and absence of future-feature routes. Supabase adapter tests simulate the provider's HTTP API and verify the correct keys, request formats, private-bucket check, link lifetime and error handling.

The demo and automated checks simulate Auth and object Storage. They do not send real verification email or prove cloud configuration. No real Supabase credentials were available or written, no real project was configured, and no migration was run against a live student database. Hosted email delivery, confirmation redirects, genuine token verification end to end, actual database role/TLS/pooler connectivity and real photo storage remain to be checked after setup.

## Try it now

From the repository's `backend/` directory:

```powershell
npm.cmd ci
npm.cmd run demo
```

Use the demo base URL `http://127.0.0.1:3001/api/v1` and Bearer token `demo-student` in Postman. Import [openapi.yaml](openapi.yaml), or follow [demo.md](demo.md). The independent demo entry point binds only to loopback, uses embedded PostgreSQL and simulated Auth/Storage, and loses all demo data on exit. Its special tokens and photo route are absent from the normal server.

For an automatic demonstration that starts and stops its own server:

```powershell
npm.cmd run demo:check
```

## Configuration still required for real integration

Follow [setup.md](setup.md):

1. Install dependencies with `npm ci` and create a private `.env` from `.env.example`.
2. Supply the development Supabase URL, publishable key and server-only Storage key.
3. Enable confirmed-email Auth and configure the React team's website origin, callback URLs and email delivery.
4. Supply an owner database URL, use verified TLS for hosted connections, and run `npm run migrate`.
5. Create a restricted database login inheriting `roommate_runtime`, then use it in `DATABASE_URL`.
6. Register the real university and exact accepted domains with `npm run school:add -- --name ... --domain ...`.
7. Create the configured private photo bucket with a 5 MiB limit and JPEG/PNG allowlist.
8. Start the normal API with `npm start` and manually exercise signup/confirmation/login and the profile/photo flow against the real project. Verify persistence across API restarts.

No real university was guessed or seeded. The demo school exists only in the synthetic demo/test database. Runtime startup rejects a public photo bucket. Owner credentials, the server-only key and runtime database password must never be provided to the React browser app.

The presentation tier uses React web. Integration examples use website Auth callbacks and a configurable React browser origin, with `http://localhost:5173` as the example. The Bearer-token API is the integration boundary.

## Files

```text
Roommate-Swiper/
  .gitignore
  README.md
  backend/
    .env.example
    package.json
    package-lock.json
    migrations/
      001_accounts_profiles.sql
    src/
      app.js
      config.js
      database.js
      errors.js
      routes.js
      server.js
      controllers/profiles.js
      integrations/supabase.js
      repositories/accounts.js
      repositories/profiles.js
      services/identity.js
      services/profiles.js
    scripts/
      check-api.js
      check-demo.js
      demo.js
      local-fixtures.js
      migrate.js
      migration.js
      school.js
    test/
      accounts-profiles.test.js
      database-config.test.js
      supabase-adapters.test.js
    docs/
      api.md
      demo.md
      handoff.md
      milestones.md
      openapi.yaml
      setup.md
```

The lockfile is generated by npm and belongs in version control. Installed `node_modules` and real `.env` files are ignored. The layout retains controllers/services/repositories without introducing infrastructure for future milestones.

## Integration notes and next boundary

The contract is documented in [api.md](api.md). `GET /me/profile` retrieves existing values for profile editing. `onboarding.complete` represents the current profile feature only, with missing fields `profile`/`photo`; it is not a claim that later questionnaire/discovery prerequisites are complete. Future additions will be documented at their corresponding milestone.

No extensive load testing, deployment, distributed throttling, background worker, admin UI or frontend was added. Local rate limiting is per-process/per-IP; production distribution is not configured. Failed cross-system cleanup can require an operator check, and already-issued photo links can remain usable until expiry.

Before Vercel deployment, lower the current 5 MiB photo limit to fit within its 4.5 MB request-body limit, allowing for multipart overhead. A proposed 3 MiB limit must be coordinated across the API, frontend validation, Storage bucket, tests and documentation. That change and real Supabase integration verification are still outstanding. See [Vercel payload limits](https://vercel.com/docs/errors/function_payload_too_large).

**Stop here for approval.** Next proposed work is Milestone 2 only: the six-question questionnaire, saved preferences/dealbreakers, and equal-weight compatibility scoring, including the associated database/API/tests/documentation.

# Run the school MVP backend

For a presentation without a Supabase account, see [demo.md](demo.md).
For real saved accounts/photos, use the Supabase setup below. Use a development
project, not a database containing real student data for automated tests.

## 1. Install and configure

Use Node.js 22 or newer. From `backend/`:

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Fill in `.env`:

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (legacy anon key also works) |
| `SUPABASE_SECRET_KEY` | Supabase server secret (legacy service-role key also works) |
| `DATABASE_URL` | Supabase Connect dialog: PostgreSQL direct or session-pooler connection, with your database password |
| `DB_SSL` | `true` for hosted Supabase; `false` for local PostgreSQL without TLS |
| `CORS_ORIGINS` | React origin, usually `http://localhost:5173` |
| `PHOTO_BUCKET` | `profile-photos` unless you choose another name |
| `HOST`, `PORT` | Keep `127.0.0.1` and `3000` for local development |

For this school prototype, the server and setup scripts can use one owner
`DATABASE_URL`; no manual backend-login creation is required. This gives the
server database-owner privileges, so this URL stays exclusively in backend `.env`.
The React app receives only the project URL and publishable key. Never commit
`.env`, database passwords, or the server secret.

URL-encode special characters in the database password. Keep TLS certificate
verification enabled. Remove SSL query parameters from the URL; `DB_SSL` controls
TLS. If a trusted CA is needed, configure `NODE_EXTRA_CA_CERTS`.

## 2. Configure Supabase Auth

Enable email/password registration and require email confirmation. Set the site
URL to the React origin. Add the confirmation/password-reset callback implemented
by your frontend teammate to allowed redirects (for example
`http://localhost:5173/auth/callback`). Verify email delivery with a real school
mailbox. Details: [password-login.md](password-login.md).

React calls Supabase for signup, password login, confirmation, logout and password
reset. It sends the resulting Bearer access token to Express. Express checks the
current user, confirmed email, exact supported school domain and active account.
There is no username or separate backend password table.

## 3. Create tables and register your school

```powershell
npm.cmd run migrate
npm.cmd run school:add -- --name "Your University" --domain your-school.edu
```

Use your actual email domain. Add more accepted domains with repeated `--domain`.
To add domains to the same school later, include `--id` with the UUID printed by
the script. Unlisted subdomains are not accepted automatically.

Migrations run once in numbered order. Existing saved data is retained. Do not
edit applied SQL files; add another migration for future schema changes. The
runner retains checksums to catch accidental edits. The server does not migrate
the database at startup.

Application tables stay in the private `roommate` schema. Do not expose that
schema through Supabase's Data API. Frontend requests go through Express.

## 4. Create the photo bucket

Create a private Supabase Storage bucket named `profile-photos`. Keep the public
setting off, set the file limit to 5 MiB, and allow JPEG/PNG. Express handles
uploads and returns temporary viewing links. No direct browser Storage policies
are needed. A profile needs one photo for completion and supports up to three.

## 5. Start and check

```powershell
npm.cmd start
```

For automatic restarts while editing, use `npm.cmd run dev`.
The API is at `http://127.0.0.1:3000/api/v1`. Set the frontend API base URL to that
address and allow its exact origin in `CORS_ORIGINS`.

```powershell
npm.cmd test
npm.cmd run api:check
npm.cmd run demo:check
```

Tests use embedded PostgreSQL with simulated Auth/Storage. They do not modify
your hosted database. Also manually confirm school signup/login, profile saving,
real photo upload/view/delete and preferences with your Supabase development
project. Hosted credentials and mailbox access are needed for that check.

See [api.md](api.md) for profile endpoints and [preferences.md](preferences.md)
for questionnaire/non-negotiable inputs. Import `openapi.yaml` into Postman.

## Optional: reuse an existing restricted database login

If you already configured `roommate_api_login`, keep it in `DATABASE_URL` and
set `MIGRATION_DATABASE_URL` to your owner connection for setup only. This is
supported, but is not required for the school demonstration. Existing SQL grants,
RLS policies and restricted-login tests are retained.

To create that optional login as the owner:

```sql
CREATE ROLE roommate_api_login LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT roommate_runtime TO roommate_api_login;
```

Use the host/username format from your chosen Supabase connection. A pooler may
require `roommate_api_login.<project-ref>` as the username.

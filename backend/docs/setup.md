# Real Supabase setup for the local API

For an immediate offline demonstration, follow [demo.md](demo.md). The normal API requires a development Supabase project; no real project has been configured by this delivery.

## Install and environment

Use Node.js 22 or newer. In the repository's `backend/` directory:

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Fill `.env` locally. It is excluded by `.gitignore` and must not be committed. Application tables use the private `roommate` schema.

| Variable | Purpose |
| --- | --- |
| `HOST`, `PORT` | Default 127.0.0.1 and 3000 |
| `SUPABASE_URL` | Development project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable/legacy anon key used for current-user validation |
| `SUPABASE_SECRET_KEY` | Server-only secret/legacy service-role key used for private Storage operations |
| `PHOTO_BUCKET` | Private bucket name; default `profile-photos` |
| `DATABASE_URL` | Restricted runtime PostgreSQL login |
| `MIGRATION_DATABASE_URL` | Owner connection used only for migrations/school configuration |
| `DB_SSL` | `true` for hosted Supabase; `false` only for a local development database without TLS |
| `CORS_ORIGINS` | Comma-separated exact HTTP(S) React origins, e.g. http://localhost:5173 |

The React web frontend may receive the project URL and publishable key. It must never receive the server-only key, database credentials or owner URL. A build tool's public environment-variable prefix does not protect a secret from browser users.

## 1. Supabase Auth

Enable email/password signup and require email confirmation. Set the site URL to the React app's actual origin and add its confirmation/recovery callback URL to the allowed redirects. For example, use site URL `http://localhost:5173` and redirect `http://localhost:5173/auth/callback` if that is the route the frontend team implements. These are examples, not a requirement to use a particular frontend build tool or port. The callback is a React route, not an Express API endpoint. Confirm email delivery restrictions or SMTP setup with a real supported-school mailbox.

The client performs signup, email confirmation, login/logout, recovery and refresh through Supabase Auth. After login it calls Express with the session's access token. Unsupported-domain users might create an Auth account, but cannot create application accounts or access protected application APIs. Restricting Auth signup itself with an additional hook is unnecessary for this milestone's application gate.

## 2. Database connection and migration

Set `MIGRATION_DATABASE_URL` to the owner's direct or session-pooler connection string from the dashboard. URL-encode password special characters. Set `DB_SSL=true` for hosted connections. Certificate verification stays enabled; configure a trusted CA, such as with `NODE_EXTRA_CA_CERTS`, if the provider requires one. Do not disable verification to bypass a certificate failure.

Remove `sslmode`, `sslcert`, `sslkey` and `sslrootcert` URL query parameters: the driver configures TLS explicitly and rejects ambiguous overrides.

```powershell
npm.cmd run migrate
```

The script expects the existing Supabase `auth.users` table. It creates private `roommate` schema, the five feature tables, migration history and a NOLOGIN permission role `roommate_runtime`. Transactions, a migration lock and a checksum make unchanged re-runs safe. Changed applied migrations are rejected; no automatic drop/reset occurs. Use a later migration for later features.

The migration creates only the `roommate` application schema and its tables. It does not migrate existing data from other schemas or automatically reset a database.

## 3. Restricted backend database login

As the database owner, create a separate login in the Supabase SQL editor using your own strong random password. The following password is a placeholder:

```sql
CREATE ROLE roommate_api_login LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS
  PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
GRANT roommate_runtime TO roommate_api_login;
```

If that login already exists, reuse or explicitly rotate it as an operator rather than running CREATE ROLE again. Set `DATABASE_URL` to this restricted login, not the owner. For direct/local PostgreSQL use username `roommate_api_login`; a hosted pooler may require `roommate_api_login.<project-ref>` with the appropriate host from your dashboard.

The runtime role can list schools, create/update accounts, maintain profiles and insert/delete photos. It cannot modify the school registry, read migration history or administer the database. Application tables have RLS enabled with a backend-role policy, plus explicit grants. Ownership remains enforced by backend services; the broad backend policy does not authorize browser access. `anon` and `authenticated` have no schema access. Do not add `roommate` to exposed Data API schemas or grant client access.

Keep the owner connection out of the running server environment where practical. Only setup scripts read it. Do not run tests against a real student database.

## 4. Supported university domains

Configure the real university name and exact accepted domains. This is an example, not a preconfigured institution:

```powershell
npm.cmd run school:add -- --name "Example University" --domain example.edu --domain students.example.edu
```

Save the returned school UUID. Include `--id "RETURNED-UUID"` when adding a domain to that same school later. A domain cannot be reassigned from another school by this script. Disabling a school is an owner/operator action. A generic `.edu` suffix and unlisted subdomains are not accepted automatically.

## 5. Private photo bucket

In Supabase Storage create `profile-photos` (or your configured bucket name):

- Keep **Public bucket disabled**.
- Set file limit to 5 MiB and accepted types to `image/jpeg` and `image/png`.
- Do not grant direct browser upload/download policies; Express mediates the operations using the server-only key.

The backend stores normalized JPEGs. It checks the bucket is private before starting. Photo reads use five-minute signed links; no public object URLs or storage keys are returned. The server-only key is privileged, so keep it exclusively in the backend environment.

## 6. Start locally and integrate

```powershell
npm.cmd start
```

Use `npm.cmd run dev` for reloads. The normal server defaults to `http://127.0.0.1:3000/api/v1`. Configure the React team's API base URL to that address, and set `CORS_ORIGINS` to the exact origin from which the browser serves React. `http://localhost:5173` and `http://127.0.0.1:5173` are different origins. Keep frontend and backend on different ports when running separate development servers. HTTP is for local development; hosted traffic will require HTTPS when deployment is authorized.

`src/server.js` is a small local launcher: validate configuration, check the private photo bucket, initialize the database/Auth/Storage clients, create the app and listen. It uses Node's default HTTP timeouts and normal process termination instead of custom shutdown hooks. `src/app.js` remains independent of the listener for testing. A future Vercel entrypoint will still need client/app initialization; deployment wiring is deferred until authorized.

Check `/api/v1/health` for process liveness, then `/api/v1/schools` to exercise the runtime database connection. Sign up and confirm an accepted-school account through Supabase. Call `/me`, create a profile, upload a photo, edit and retrieve it. Repeat `/me` to confirm the application account remains unique. Use [api.md](api.md) or import OpenAPI for exact inputs and responses.

## Validation and limits

```powershell
npm.cmd test
npm.cmd run api:check
npm.cmd run demo:check
```

Automated repository tests execute real SQL in PGlite's embedded PostgreSQL engine, with synthetic `auth.users` fixtures. HTTP tests stub external Auth/Storage and use actual image decoding. Provider-adapter tests simulate Supabase HTTP responses. The demo exercises a separate real HTTP server. None of these proves hosted Supabase email delivery, actual token verification, custom-role connectivity or real object storage end to end.

Before using real students, manually verify migrations, restricted-role connectivity, actual signup/confirmation/login, supported-domain gating, saved-profile persistence across server restarts and real photo operations. These checks need your project credentials and mailbox access.

Storage and PostgreSQL cannot share one transaction. Upload cleanup is best effort; a failed cleanup logs the photo UUID for operator review. Failed deletes can be retried after checking the current profile. There is no background worker or outbox infrastructure in this university-project MVP.

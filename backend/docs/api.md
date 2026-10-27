# Milestone 1 API contract

Base URL for the normal local server: `http://127.0.0.1:3000/api/v1`. Offline demo: `http://127.0.0.1:3001/api/v1`. [OpenAPI](openapi.yaml) describes every implemented method, input, response and common error for import into Postman or tooling.

## Authentication and registration

As specified by the original PRD, the frontend/integration team uses Supabase Auth directly for registration, confirmation, login, logout, password recovery and session refresh. There are no Express signup/login/password endpoints. Supabase stores and verifies passwords; the backend never persists them.

Integration examples, not frontend implementation:

```javascript
await supabase.auth.signUp({ email, password, options: { emailRedirectTo: yourWebAuthCallbackUrl } });
// After email confirmation:
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// If error is null, send data.session.access_token as a Bearer token to Express.
```

Configure email confirmation and redirects as described in [setup.md](setup.md). The Express backend calls Supabase `getUser(accessToken)` on each protected request and checks the current user's confirmed email, exact school-domain allowlist and account status. It never trusts client-provided school IDs or editable Auth metadata. Mailbox verification proves access to that mailbox, not independent current enrollment.

```http
Authorization: Bearer <Supabase access token>
```

Only the Supabase URL and publishable/legacy anon key belong in the React browser environment. Database connections and the server-only secret/service-role key remain in the backend environment. The demo tokens work only in the separate demo process; they are not accepted by real Supabase Auth.

React uses the Supabase browser SDK for sessions and sends `Authorization: Bearer <access_token>` to Express. The API does not use browser session cookies; do not add `credentials: 'include'` for authentication. Configure the exact React origin in `CORS_ORIGINS`. Examples use `http://localhost:5173`, independently of the frontend build tool. Confirmation/recovery callbacks belong to a route handled by the React app, for example `http://localhost:5173/auth/callback`; the frontend team implements that route. See [Supabase's React guide](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs) and [redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## Implemented operations

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| GET | `/health` | Public | Process liveness only |
| GET | `/schools` | Public | Enabled schools and exact supported domains |
| GET | `/me` | Verified school account | Bootstrap application account once and return profile completion |
| GET | `/me/profile` | Verified school account | Return own profile with refreshed photo links |
| PUT | `/me/profile` | Verified school account | Create or replace text fields; photos remain |
| PATCH | `/me/profile` | Verified school account | Update selected fields of existing profile |
| POST | `/me/photos` | Verified school account | Upload one photo to a saved profile |
| DELETE | `/me/photos/{photoId}` | Verified school account | Delete only an owned photo |

Only these routes are implemented. Preferences, questionnaires, discovery, swipes, matches, contact sharing, blocks and reports are future milestones; their paths currently return 404. There is no arbitrary-user profile endpoint in this feature.

## Account and completion response

`GET /me` creates the application account idempotently using the verified Supabase UUID. It does not override suspension. School comes from the current verified email domain. A later verified move to a different supported school updates the account's school; existing profile text/photos remain. Unsupported or disabled schools are denied.

```json
{
  "data": {
    "id": "11111111-1111-4111-8111-111111111111",
    "status": "active",
    "school": {
      "id": "33333333-3333-4333-8333-333333333333",
      "name": "Demo University"
    },
    "onboarding": {
      "complete": false,
      "missingFields": ["profile", "photo"]
    }
  }
}
```

`onboarding.complete` currently means this milestone's profile step is complete: profile text exists and at least one photo is saved. It does not promise readiness for unimplemented discovery or questionnaire features. Missing fields appear in order `profile`, `photo`. No contact values or Auth metadata are returned.

## Profile fields and updates

`PUT /me/profile` requires `displayName`; omitted optional fields reset to the defaults below. It returns 200 for both creation and replacement. `PATCH` requires at least one recognized field and keeps omitted fields unchanged. `GET` or `PATCH` before profile creation returns 404.

| Field | Rules | PUT default |
| --- | --- | --- |
| `displayName` | Trimmed, nonempty, 1-80 characters | Required |
| `bio` | Trimmed, up to 500 characters | Empty string |
| `major` | Trimmed, 1-100 characters, or null | null |
| `classYear` | Integer 2000-2100, or null | null |
| `interests` | Up to 10 trimmed nonempty strings, 30 characters each; unique ignoring case | Empty array |

Unknown fields, ownership/school IDs, arbitrary photo URLs and contacts are rejected. JSON numbers are not coerced from strings. Profile names/bios are plain text, and the client should render them as text.

Example create/replace body:

```json
{
  "displayName": "Demo Student",
  "bio": "Looking for a roommate.",
  "major": "Computer Science",
  "classYear": 2028,
  "interests": ["Reading", "Music"]
}
```

The response envelope contains a profile with exactly `userId`, the five fields above, `school: {id,name}`, and `photos`. Photos are sorted by position. School email, phone, auth metadata, credentials and storage object keys are excluded.

## Photos

Submit `multipart/form-data` with exactly one file field named `photo`. The HTTP client must generate its boundary. No other fields or files are allowed.

- Save profile text before uploading; otherwise 409 `PROFILE_REQUIRED`.
- JPEG or PNG, maximum 5242880 bytes (5 MiB), single-frame, at most 20 megapixels.
- The backend checks decoding and consistency with the MIME type. It fixes orientation, fits within 1600x1600 without enlargement, strips metadata and stores a JPEG.
- At most three photos. One is sufficient for profile completion.
- Upload uses the first free position from 1 through 3; deletion does not renumber other positions.
- Failed uploads trigger transaction rollback and best-effort removal of the generated storage object.

Upload returns 201:

```json
{
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "position": 1,
    "url": "https://example.supabase.co/storage/v1/object/sign/profile-photos/example?token=example",
    "expiresAt": "2026-10-21T18:05:00.000Z"
  }
}
```

Photo URLs expire after five minutes. Retrieve the authorized profile again for fresh URLs. A URL is a temporary bearer capability: do not publish it. The private bucket is checked at normal-server startup. A privileged operator must keep it private. Already viewed data and previously issued URLs cannot be recalled reliably; future blocking will stop new access but cannot undo copies.

Delete returns 204 with no body. Another user's or an absent photo returns 404; an invalid UUID returns 400. Deleting the last photo sets profile completion false. If a request fails after an uncertain network result, retrieve the profile before retrying an upload. Storage and PostgreSQL are separate systems; failed best-effort cleanup logs `photo_cleanup_failed` and the photo UUID for operator review.

## Errors and transport

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the submitted profile fields.",
    "requestId": "55555555-5555-4555-8555-555555555555",
    "details": {
      "fields": [{"path": "displayName", "message": "Example validation message"}]
    }
  }
}
```

`details` is optional. Use status and code for client behavior, not the wording of messages. `X-Request-ID` matches the error request ID. Responses use `Cache-Control: no-store`; ordinary success responses use `{data:...}`; 204 responses have no body.

| Status | Codes |
| --- | --- |
| 400 | `INVALID_JSON`, `VALIDATION_ERROR`, `PHOTO_REQUIRED`, `INVALID_UPLOAD` |
| 401 | `AUTH_REQUIRED`, `INVALID_TOKEN` |
| 403 | `EMAIL_UNVERIFIED`, `SCHOOL_UNSUPPORTED`, `ACCOUNT_INACTIVE`, `ORIGIN_NOT_ALLOWED` |
| 404 | `NOT_FOUND` |
| 409 | `PROFILE_REQUIRED`, `PHOTO_LIMIT_REACHED` |
| 413 | `BODY_TOO_LARGE`, `PHOTO_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 429 | `RATE_LIMITED` (respect `Retry-After`) |
| 500 | `INTERNAL_ERROR` |
| 503 | `AUTH_UNAVAILABLE`, `STORAGE_UNAVAILABLE` |

Refresh an expired session through Supabase; if refresh fails, ask the user to sign in. Provider downtime returns 503 rather than pretending credentials are invalid. JSON limit is 32 KiB. Local throttling is 120 requests/minute per IP, in memory, not a distributed deployment solution. CORS checks exact configured browser origins. Tools such as Postman without an Origin header are supported and still require authentication.

## Contract coordination

This contract covers implemented Milestone 1 operations. Completion currently covers the profile and at least one photo. `GET /me/profile` retrieves existing values for profile editing. Coordinate future contract additions with the frontend and integration teammates before they rely on them.

# Backend handoff: school MVP

## What works now

- Verified school accounts using Supabase Auth, including password login through
  the frontend's Supabase client. Suspended accounts cannot access protected APIs.
- Create, read, replace and edit your own profile.
- Upload/view/delete JPEG/PNG photos; maximum three, one for profile completion.
- Read six questionnaire prompts, save/read/edit answers, and select predefined
  non-negotiables. Custom non-negotiable text is rejected.
- Persist these features in PostgreSQL, with private photos in Supabase Storage.

Controllers handle HTTP, services handle rules, and repositories handle SQL.
This keeps the structure described in P3. `server.js` just connects dependencies
and starts Express. No frontend files are part of this backend refactor.

## Setup and integration

Follow [setup.md](setup.md). A single server-only database URL is sufficient for
the development prototype; an existing restricted login remains supported.
The endpoints and response/error shapes are unchanged by the MVP simplification.
Use [api.md](api.md), [preferences.md](preferences.md) and `openapi.yaml`.

After installation run `npm.cmd test`, `npm.cmd run api:check` and
`npm.cmd run demo:check`. The offline demo uses temporary data and simulated
Auth/Storage; real Supabase login and persistence need a separate manual check.

## Work still planned

Your partner owns reciprocal non-negotiable filtering and equal-weight scoring.
Discovery/swiping, mutual matches, authorized contact sharing, messaging, blocking
and reporting remain future feature work. They are not removed from the project
requirements. See [milestones.md](milestones.md) for the development sequence.
No deployment or real student launch is included in the current work.

## Why some safeguards remain

Ownership checks protect profiles; validation prevents invalid input; transactions
keep photo slots and edits consistent. Private buckets and signed links protect
photos. Applied migrations and their checksums preserve existing databases.
These small pieces are retained rather than changing working behavior.

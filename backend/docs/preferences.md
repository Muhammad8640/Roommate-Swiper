# Milestone 2 preferences API and partner handoff

This implements your preferences/database/API portion. Your partner owns scoring,
reciprocal dealbreaker comparison and shared-trait generation. All paths below
are relative to `/api/v1` and require a verified, supported-school Bearer token.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/questionnaire` | Six versioned prompts/options; profile not required |
| GET | `/me/preferences` | Own saved preferences; 404 before first save |
| PUT | `/me/preferences` | Create/replace all answers and the dealbreaker map |
| PATCH | `/me/preferences` | Merge answers and/or replace the dealbreaker map |

## Data contract

Save a profile using `PUT /me/profile` first. All preferences operations return 409
`PROFILE_REQUIRED` without it. Photos are not required to save preferences.
PATCH requires existing preferences, otherwise 404. PUT returns 200 for both
creation and replacement. The complete PUT body is:

```json
{
  "questionnaireVersion": 1,
  "scenarioAnswers": {
    "cleanliness": 0, "sleep": 1, "noise": 2,
    "guests": 1, "smoking": 0, "sharing": 3
  },
  "dealbreakers": { "smoking": [0], "noise": [0, 1, 2] }
}
```

All three top-level fields and all six answers are required. Answers are JSON
integers 0–3, not strings. Unknown fields/IDs, client ownership IDs, scores, other
versions, duplicate accepted answers and empty accepted-answer arrays are rejected.
The server derives ownership from the token. Accepted-answer arrays are sorted.

Dealbreakers list **acceptable**, not forbidden, roommate answers. `smoking: [0]`
accepts only another student's smoking answer 0. An omitted question imposes no
restriction; listing all four values is also unrestricted. `{}` means no
restrictions. Acceptable roommate habits may differ from the student's own habits.

Read labels from `/questionnaire`. The stable version-1 meanings are:

| ID | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| cleanliness | Clean immediately | By end of day | Within a few days | Weekly cleanup |
| sleep | Before 10 pm | 10 pm–midnight | Midnight–2 am | After 2 am |
| noise | Silent | Headphones/brief talk | Quiet background audio | Normal music/talk |
| guests | Never | Monthly | Weekly | Most days |
| smoking | Neither smoke nor vape | Occasionally outside | Frequently outside | Indoors |
| sharing | Separate belongings | Ask each time | Agreed everyday supplies | Most everyday belongings |

The source is `src/questionnaire.js`. Reinterpreting saved option values requires a
coordinated new questionnaire version. The questionnaire version is independent
of package version. The prompts record habits, not permission to break housing rules.

Responses use `{ "data": ... }`. Preferences contain the PUT fields plus `userId`,
`updatedAt` (ISO timestamp) and `complete: true`. Only complete questionnaires are
saved; partial drafts stay in the UI. This flag means six answers are saved, not
that the student is ready for discovery. The existing `/me` onboarding contract
remains a saved profile plus at least one photo.

## PATCH and errors

`{"scenarioAnswers":{"sleep":3}}` changes only sleep and preserves other answers
and dealbreakers. A supplied dealbreaker object **replaces the entire map**:
`{"dealbreakers":{"smoking":[0,1]}}` removes any previous noise restriction.
`{"dealbreakers":{}}` clears restrictions. Omit dealbreakers to retain them.
Empty patches, empty scenarioAnswers and version-only patches are invalid.
The existing per-account transaction lock preserves concurrent edits to different
answers; competing writes to the same answer use the last writer's value.

Errors use the existing envelope and `details.fields` paths. Typical responses:
400 `VALIDATION_ERROR`, 401 missing/invalid token, 403 verification/school/account
failure, 404 missing preferences, 409 missing profile, 415 non-JSON write.
Existing JSON size limits, CORS and malformed-JSON handling also apply.

## Compatibility partner contract

Consume `questionnaireVersion`, `scenarioAnswers` and `dealbreakers`. Ignore
response metadata when scoring. Import `QUESTION_IDS` and
`QUESTIONNAIRE_VERSION` from `src/questionnaire.js` to share exactly these IDs.
Pure functions should accept two objects with this shape, validating completeness
and version for direct callers that do not come through this API.

The approved algorithm remains equal weights, per-answer similarity
`1 - abs(a-b)/3`, rounded mean similarity times 100. An absent restriction allows
any answer. Reciprocal acceptance checks each student's restrictions against the
other's answers. These functions and score APIs are your partner's work and have
not been implemented here. Discovery/swipes remain a later milestone.

## Local demo and configuration

From `backend/`, run `npm.cmd test`, `npm.cmd run api:check` and
`npm.cmd run demo:check`. Start `npm.cmd run demo` for manual requests at
`http://127.0.0.1:3001/api/v1`, using Bearer token `demo-student` or `demo-second`.
Import `docs/openapi.yaml` into Postman. Create each student's profile, GET the
questionnaire, PUT the example, GET the saved preferences, PATCH one answer and
GET again. Each student's data is isolated. Demo data resets on process exit.

For a real development database, run `npm.cmd run migrate` using the existing
owner-only `MIGRATION_DATABASE_URL` before starting the normal server. Numbered
migrations now run in order. Migration 001 stays unchanged; 002 adds preferences
without losing profile data. Startup does not apply migrations automatically.
No new environment variables are needed. The table has a profile foreign key,
SQL content checks, RLS and runtime-role grants; frontend roles cannot access it.

Automated checks use embedded PostgreSQL and simulated Auth/Storage. Hosted
Supabase migration/connectivity and real verified-user requests remain to be
tested with your development project. No hosted migration was run here.

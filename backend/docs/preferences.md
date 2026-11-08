# Milestone 2 preferences API and partner handoff

This implements your preferences/database/API portion. Your partner owns scoring,
reciprocal non-negotiable comparison and shared-trait generation. All paths below
are relative to `/api/v1` and require a verified, supported-school Bearer token.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/questionnaire` | Six versioned prompts/options; profile not required |
| GET | `/me/preferences` | Own saved preferences; 404 before first save |
| PUT | `/me/preferences` | Create/replace all answers and the non-negotiable map |
| PATCH | `/me/preferences` | Merge answers and/or replace the non-negotiable map |

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
  "nonNegotiables": { "smoking": [1, 2, 3], "noise": [3] }
}
```

All three top-level fields and all six answers are required. Answers are JSON
integers 0–3, not strings. Unknown fields/IDs, client ownership IDs, scores, other
versions, duplicate rejected answers and empty rejected-answer arrays are rejected.
The server derives ownership from the token. Rejected-answer arrays are sorted.

`scenarioAnswers` records the six preferences used for compatibility scoring.
`nonNegotiables` lists **forbidden candidate answers**. For example,
`smoking: [1, 2, 3]` rejects roommates who report any smoking/vaping, while
`noise: [3]` rejects roommates who select normal music/conversation.
A single forbidden-answer match rejects the candidate before scoring.
Omitted questions impose no restriction; `{}` means none. Selecting all four
answers for a question rejects every candidate for that question.

Users choose predefined options; there is no custom-text field.
`GET /questionnaire` includes `nonNegotiableChoices`, a fixed catalog of 24
choices with `questionId`, numeric `value`, and display `label`. The frontend
renders checkboxes and groups selected values by question ID in `nonNegotiables`.
The API and database reject unknown question IDs, text values, and values outside
0–3. Store these selections through `/me/preferences`, not `/me/profile`.
The catalog shares the existing questionnaire version and answer meanings.

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
and nonNegotiables. A supplied non-negotiable object **replaces the entire map**:
`{"nonNegotiables":{"smoking":[0,1]}}` removes any previous noise restriction.
`{"nonNegotiables":{}}` clears restrictions. Omit nonNegotiables to retain them.
Empty patches, empty scenarioAnswers and version-only patches are invalid.
The existing per-account transaction lock preserves concurrent edits to different
answers; competing writes to the same answer use the last writer's value.

Errors use the existing envelope and `details.fields` paths. Typical responses:
400 `VALIDATION_ERROR`, 401 missing/invalid token, 403 verification/school/account
failure, 404 missing preferences, 409 missing profile, 415 non-JSON write.
Existing JSON size limits, CORS and malformed-JSON handling also apply.

## Compatibility partner contract

Consume `questionnaireVersion`, `scenarioAnswers` and `nonNegotiables`. Ignore
response metadata when scoring. Import `QUESTION_IDS` and
`QUESTIONNAIRE_VERSION` from `src/questionnaire.js` to share exactly these IDs.
Pure functions should accept two objects with this shape, validating completeness
and version for direct callers that do not come through this API.

First reject the pair if ANY question satisfies either condition:
- `A.nonNegotiables[q]` contains `B.scenarioAnswers[q]`.
- `B.nonNegotiables[q]` contains `A.scenarioAnswers[q]`.

Only pairs that pass both students' restrictions proceed to scoring.
Score `scenarioAnswers` using equal weights, per-answer similarity
`1 - abs(a-b)/3`, rounded mean similarity times 100. Non-negotiables are hard
filters and never add/subtract scoring points. An absent restriction allows any
answer. The comparison/scoring functions and score APIs remain your partner's
work; this portion supplies validated, persisted inputs. Discovery/swipes remain
a later milestone.

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
without losing profile data. Migration 003 adds `non_negotiables` and converts old
acceptable-answer `dealbreakers` to forbidden-answer complements, then removes
the old column. For example, legacy `smoking: [0]` becomes
`nonNegotiables.smoking: [1, 2, 3]`; unrestricted categories stay unrestricted.
The API now requires `nonNegotiables` instead of `dealbreakers`; update callers.
Migrations 001/002 are unchanged. Startup does not apply migrations automatically.
No new environment variables are needed. The table has a profile foreign key,
SQL content checks, RLS and runtime-role grants; frontend roles cannot access it.

Automated checks use embedded PostgreSQL and simulated Auth/Storage. Hosted
Supabase migration/connectivity and real verified-user requests remain to be
tested with your development project. No hosted migration was run here.

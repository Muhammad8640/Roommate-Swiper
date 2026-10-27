# Feature-based backend milestones

P1/P2 and the updated project requirements define the application. The stack is a React web frontend, JavaScript Node.js + Express backend, Supabase PostgreSQL/Auth/Storage, and REST JSON. The backend follows routes/controllers -> services -> repositories. Frontend and integration work are owned separately. Development proceeds one complete backend feature at a time.

## Sequence and planning budget

| Milestone | Testable backend feature | Approximate allocation |
| --- | --- | --- |
| 1 | School verification, application account bootstrap, create/read/edit own profile, photo upload/read/delete | 5 hours |
| 2 | Six scenario answers, saved roommate preferences and dealbreakers, reciprocal filtering logic, equal-weight compatibility scoring | 2.5 hours |
| 3 | Eligible same-school profile discovery, compatibility information, left/right swipe persistence | 3.5 hours |
| 4 | Mutual matching, match list, authorized contact sharing, blocking, reporting, integration handoff | 4 hours |

These are estimates targeting roughly 15 hours, not promises of elapsed execution time. Prioritize complete working features and meaningful tests. Do not pursue extensive load testing or speculative optimization before core behavior works. P2's response-time/concurrency targets remain eventual verification targets rather than claims already achieved.

For each milestone: implement only necessary schema/API/services, run relevant tests, document integration contracts, summarize changes and limitations, and stop for approval before the next milestone.

## Milestone 1 decisions

- Supabase handles registration, passwords, confirmation emails, login/logout, recovery and refresh. No duplicate password database or Express login facade.
- Exact school-domain allowlist, verified current email and active account required before any profile operation.
- Own-profile fields: display name, bio, major, class year, interests and photos. Questionnaire-derived living habits/preferences arrive in Milestone 2.
- Save profile text before uploading photos. One photo completes this milestone's profile step; maximum three photos.
- Phone/contact preferences are deferred to Milestone 4; no contact sharing endpoint exists yet.
- Minimal five-table application schema plus migration history; no future-feature tables.
- Backend-only, local development. The team reviews each milestone before starting the next one.

## Preserved future behavior

The six initial scenarios cover cleanliness, sleep, noise, guests, smoking/vaping and shared belongings. Each has ordered answers 0..3 with equal weights; similarity is `1 - abs(a-b)/3`, and the score is the rounded average similarity times 100. Dealbreakers exclude candidates reciprocally before scoring/ranking. Both likes create one mutual match. Structured email/phone remain private until an authorized mutual match. Blocking prevents interactions and contact access; reports support manual review.

In-app messaging, push transport, deployment and an administrative UI are outside this milestone. Contact sharing after mutual matching is the planned connection mechanism for the MVP.

## Database scope

Milestone 1 creates only schools, school domains, accounts, profiles and photos, plus migration history, in private schema `roommate`. Add later tables and business logic with their corresponding feature milestone. Do not modify an already-applied migration; create a new migration for schema changes.

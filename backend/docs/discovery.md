# Milestone 3: discovery and swiping checkpoints

1. Profile feed (current): completed profiles, private contact fields excluded.
2. Compatibility: reciprocal non-negotiable filtering and agreed score-table ordering.
3. Swipes: persist like/pass and remove previously swiped profiles from the feed.
4. Integration: check the complete sequence and finalize frontend handoff.

## Step 1 API

`GET /api/v1/profiles?limit=10&offset=0` requires a verified school Bearer token.
The caller must have a saved profile, at least one photo, and saved questionnaire
answers. Otherwise return 409 `SETUP_REQUIRED` with `details.missingFields`
containing `profile`, `photo`, and/or `preferences`.

Candidates must have an active account in the caller's school, a saved profile,
at least one photo and saved questionnaire answers. The caller is excluded.
Existing schema is sufficient: this step adds no database migration.

Response: `{ "data": [ ... ] }`. Each item contains `userId`, `displayName`, `bio`,
`major`, `classYear`, `interests`, `school: {id,name}`, `questionnaireVersion`,
`scenarioAnswers`, and `photos: [{id,position,url,expiresAt}]`. Photos have temporary
signed URLs and are ordered by position. Phone, email, storage keys, and private
non-negotiable selections are excluded. Habits are intended profile information.

`limit` is an integer from 1 to 20 (default 10); `offset` is an integer from 0 to
10000 (default 0). Unknown query fields are rejected. Records are ordered by
user ID for stable pages. An empty result is 200 with `data: []`, not an error.
Normal authentication, CORS and rate limits apply; invalid queries return 400.
Storage failures return 503 through the existing error envelope.

Step 1 results are not yet scored or filtered by non-negotiables, and do not
exclude prior swipes. No compatibility percentage should be invented by the UI.
Those behaviors arrive in the next checkpoints. Mutual matches and contact
sharing remain Milestone 4.

## Manual check

Run the backend and prepare two confirmed GMU accounts. Each needs a profile,
one uploaded photo and saved answers. Using account A's Bearer token, request
`GET /api/v1/profiles` in Postman. Account B should appear, account A should not.
Remove B's only photo and request again; B should no longer appear. A new caller
without completed setup receives 409, while an unsigned request receives 401.

The current frontend may still show the signed-in student's card preview. The
frontend teammate should switch that loader to this list endpoint and retain the
existing API-to-card field conversion. Step 2 will extend each item with its score.

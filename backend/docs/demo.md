# Demonstrate Milestone 1

## Start

In the repository's `backend/` directory:

```powershell
npm.cmd ci
npm.cmd run demo
```

The server binds only to `127.0.0.1:3001`. Stop with Ctrl+C. Override the port with `DEMO_PORT` if needed. All demo accounts, profile data and image bytes disappear on exit.

React browser requests are allowed from `http://localhost:5173` by default. Set `DEMO_CORS_ORIGINS` to your actual React origin (or a comma-separated list) if different. This only configures the demo; the normal server uses `CORS_ORIGINS` in `.env`. The backend does not require a particular React build tool.

Auth and photo storage are simulated only in this separate demo entry point. PostgreSQL, migrations, request validation, authorization, service logic and image decoding are the real implementation. This demo does not send verification emails or prove hosted Supabase integration. The normal server has no demo-token bypass.

## Manual Postman flow

Import [openapi.yaml](openapi.yaml), select the demo server and set Bearer token `demo-student`.

1. `GET /schools`: returns Demo University and `demo.edu`.
2. `GET /me`: returns a verified account with missing `profile` and `photo`.
3. `PUT /me/profile` with the JSON below: saves profile text.
4. `GET /me/profile`: retrieves the saved profile; photos is initially empty.
5. `POST /me/photos`: choose Body -> form-data, key `photo`, type File, then select a JPEG or PNG up to 5 MiB. Do not manually set the multipart Content-Type boundary.
6. Open the returned `data.url`: view the normalized private photo via its five-minute demo link.
7. `GET /me`: onboarding completion is now true, with only one photo.
8. `PATCH /me/profile` with `{"bio":"Edited during the demo"}`; retrieve to show persistence.
9. Upload a second and third photo; a fourth returns `409 PHOTO_LIMIT_REACHED`.
10. `DELETE /me/photos/{photoId}` removes an owned photo. Removing the last sets completion false.

```json
{
  "displayName": "Demo Student",
  "bio": "Looking for a roommate for next semester.",
  "major": "Computer Science",
  "classYear": 2028,
  "interests": ["Music", "Reading"]
}
```

Check access boundaries by switching tokens:

- `demo-second`: independent verified account; cannot read the first student's own-profile resource or delete their photos.
- `demo-unverified`: profile/account endpoints return `403 EMAIL_UNVERIFIED`.
- Any other token: `401 INVALID_TOKEN`.

## Automated HTTP demonstration

```powershell
npm.cmd run demo:check
```

This starts a separate local demo process on an available port, creates a profile, uploads an image generated in memory, views it through its link, verifies completion, edits the bio, deletes the photo, verifies incompletion, and stops the process. It also checks invalid-token and unverified-email rejection. No photo fixture file or external service is required.

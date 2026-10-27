# Roommate-Swiper

CS 321 roommate matching application. The backend currently implements Milestone 1: verified accounts, profiles, and photo uploads.

The frontend is a **React web application**, developed separately. The backend uses JavaScript, Node.js + Express, and Supabase PostgreSQL/Auth/Storage. Browser origin examples use `http://localhost:5173`; change them to the React team's actual origin if different. No frontend build tool is required by the backend.

## Try the prototype

From `backend/`, with Node.js 22 or later:

```powershell
npm.cmd ci
npm.cmd run demo
```

Use `http://127.0.0.1:3001/api/v1` with `Authorization: Bearer demo-student`. The demo starts a real embedded PostgreSQL database and the actual API/image-processing code, with simulated Auth and photo storage. It resets when stopped. No Supabase credentials are required for this demo.

```powershell
npm.cmd run demo:check
npm.cmd test
npm.cmd run api:check
```

`demo:check` starts its own temporary demo server, exercises the entire current feature through HTTP, and stops it. See [the demo walkthrough](backend/docs/demo.md), [frontend integration contract](backend/docs/api.md), [real Supabase setup](backend/docs/setup.md), [milestone plan](backend/docs/milestones.md), and [Milestone 1 handoff](backend/docs/handoff.md).

## Scope

Milestone 1 covers verified accounts, own-profile creation/reading/editing and up to three private photos, with only one required. Registration/login/session management use Supabase Auth directly, as in the original PRD. Express verifies identity and enforces all application-data access.

Later milestones add preferences/scoring, discovery/swiping, then matches/contact sharing/safety. Their endpoints, services and database tables are not implemented here. Development remains local until the real Supabase integration and deployment configuration are verified.

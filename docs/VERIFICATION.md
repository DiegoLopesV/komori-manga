# Verification — 2026-10-12

## Evidence recorded during implementation

- Test-first domain checks failed before the core module existed, then passed after implementation.
- PGlite permission tests failed without schema/policies; after implementation they passed with real Postgres role/RLS execution.
- A regression test exposed pre-publication media visibility; access now additionally requires the exact asset path in the published snapshot.
- Chapter publication tests failed before selective snapshots existed; now preserve other published chapters and omit unreferenced draft media.
- An audio regression failed on the first user interaction; opening audio now respects browser interaction and backward navigation never replays it.
- A save-queue test failed before implementation; writes for one work now execute in order and recover after failure.
- Browser checks cover draft persistence, frame curves, text editing, undo, reading moments, PT/EN, mobile layout, imported video/static alternative and flattened-page import.
- Real Supabase check: disposable author login → private draft → actual Storage upload → published snapshot → anonymous mobile browser reading. Subsequent draft edits preserve the public snapshot; cloud draft survives reload. Test fixtures removed after execution.
- Supabase security advisors reported no issues after the initial schema. Recheck after final migration below.

## Operational limits

Email signup/confirmation/recovery for the public is not verified and is not enabled as a general service: SMTP configuration was explicitly deferred for this pilot. Tests used a disposable confirmed user through the admin API, not a public signup. No service/admin key is part of frontend or repository.

Initial automated browser coverage is Chromium, including a mobile viewport; it is not a real iPhone/Safari compatibility claim. GIF and MP4 are accepted but codec behavior must be reviewed on target devices. Static alternative is optional in editing; creators should supply one for animations. Free-provider quotas and user-content moderation require operational work before broad launch.

See deployment/check results in the repository and the final delivery report for final counts and URLs. Tests reduce regression risk; they do not guarantee absence of bugs.

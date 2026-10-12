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

## Final pilot checks

- 22 unit/component/Postgres policy tests passed; TypeScript and production build passed.
- 5 Chromium browser flow tests passed locally and again against the published site.
- The live author/storage/publication/anonymous-reader test passed against production. Its subsequent draft-isolation and cloud-reload checks also passed.
- Production: https://komori-manga.vercel.app (HTTP 200; accessible without Vercel login at the production alias).
- Deployment ID: `dpl_Awdzj8MsDwerkpLK9a5ujBRg1axH`; application source commit: `883815c`.
- All three SQL migrations applied and recorded; local/remote histories match.
- Final Supabase security and performance advisors returned no issues.
- GitHub workflow is configured for pushes/PRs. Automatic Vercel Git connection was rejected by provider access; deploys currently use the authenticated Vercel CLI, not a promised automatic push deployment.

Tests reduce regression risk; they do not guarantee absence of bugs. Email confirmation/recovery delivery remains deferred by the owner's pilot decision.

## Editable SVG and authoring follow-up

35 unit/component/Postgres tests and 12 Chromium flow tests passed locally. Coverage includes generator-style SVG polygons, nested groups/curves/text/transforms, rejected executable/external SVG content, coordinated parent-child resizing/deletion/duplication, private reusable presets, compatibility with prior PNG drafts, selecting/resizing/removing PNG page layers, deleting pages with undo, direct art/audio import and previews starting on the active page.

`scripts/live-authoring.mjs` passed against the real Supabase with the user-provided generator SVG as a local fixture: four native frames, real art/voice uploads, a linked speech bubble, private cloud preset and anonymous published reader. The original file and its description/tracking metadata are not committed or executed. The committed test fixture is geometry-only. The script uses disposable test accounts and removes its data afterward.

Selection handles now render above overlapping SVG frames. A browser regression test first reproduced the blocked resize handle, then passed after the fix. Final local verification: 35 unit/component/Postgres tests, TypeScript/build, and 13 Chromium flow tests passed. The previous 12 flows and the live SVG/Supabase authoring check also passed against production before this visual correction.

Finished-page import is now a single SVG-only button with a localized hover explanation. Raster import remains through Image/frame art; previous PNG page drafts remain supported. Regression first failed on the missing tooltip, then passed. 35 unit/component/Postgres tests, build and all 14 Chromium flows passed locally.

Sidebar simplification: regression first failed because the Page actions submenu was absent, then passed after consolidation. 35 unit/component/Postgres tests, TypeScript/build and 15 Chromium flows passed locally. Coverage includes hidden secondary actions, a single audio import control, red page deletion, confirmation/cancellation, and existing deletion/undo and preset/audio flows with their new menus. Backend live tests were not repeated for this UI-only change.

Media libraries and synchronized links: new domain regressions failed before implementation; browser regression failed on the missing left audio library. Final local checks passed: 38 unit/component/Postgres tests, TypeScript/build and 17 Chromium flows. Tests cover library-only audio imports, category filters, per-element speech/SFX publication, cue playback/replay and no playback on back, rename/remove confirmation and draft cleanup, link cycles, shared reveal/music and unlinking. Production verification follows the deployment; no claim of real-device Safari validation.

Production follow-up for c79c2e0: all 17 Chromium flows passed against https://komori-manga.vercel.app; live SVG/art/element-speech upload, private preset and anonymous publication checks passed with disposable Supabase data. GitHub CI completed successfully. Visual inspection confirmed left libraries and blue set outlines. Final follow-up corrects an outdated helper text about separate reveals.

Existing-draft links: regressions reproduced unsynchronized saved links and unintended publication normalization. Draft loading now synchronizes panel relationships; published loading explicitly preserves original moment timing. All 40 unit/component/Postgres tests and build passed after this isolation fix; the 17 local Chromium flows passed with draft migration immediately before the published-load switch.

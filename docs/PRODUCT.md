# Komori — product agreement

Free, open-source manga composition and interactive reading studio. GPLv3 covers software; creators retain their artwork and media rights. PT-BR and English interface; one language per work. Desktop editor and responsive browser reader.

Import individual panels or flattened pages. Editable templates and free composition; straight and curved vector frame boundaries. Crop and reposition without distorting images. Text, bubbles and lettering; imported PNG/JPEG/WebP/GIF, MP4/WebM, recorded voices, SFX and ambience. No drawing or animation generation.

Ordered reading moments show/hide layers and trigger transition/audio. Revealed elements persist. Advance finishes a running visual transition, then advances. Moving forward stops voice/SFX. Back restores prior visual state without replay; replay is explicit. Ambient music continues until replaced/stopped. Looping media never blocks navigation. Static alternatives and reduced motion supported. Audio starts only after reader interaction.

Author accounts, works with covers/descriptions/support links, chapters/pages. Draft saves never change published snapshots. Readers need no account; share by link, no discovery catalog. Adult warning before cover/content. Notice is an acknowledgement, not identity/age verification. No internal payments, ads or commission in v0.1.

Architecture: Vite/React/TypeScript frontend on Vercel, Supabase Auth/Postgres/Storage, RLS ownership enforcement and private draft media. Published media is made accessible only when included in a published snapshot. 25 MB per file, 200 MB per work initial guardrails. Self-host documentation and CI tests required. These quotas are safeguards, not a claim about provider plan limits.

Milestones: reader engine; page editor; direction timeline; accounts/publication; polish, validation, self-host/review documentation. Use test-first domain and permission tests, plus browser flow checks. Authentication/provider permission blockers are recorded separately from code completion.

Deletion: Delete/Backspace removes the selected page element, cleans its moment references and supports undo. Ignore these shortcuts while typing or in a modal/reader. The library exposes work deletion with explicit confirmation; this removes the draft, public snapshot and uploaded work media. No actual user work is deleted by development tests, which use disposable fixtures only.

Authoring additions: editable SVG import (typed safe geometry, paths, text, embedded raster and groups); selectable PNG page layer; page deletion with undo; contextual art/audio import; parent-child panel relationships with coordinated movement/resize/duplicate/delete and optional separate reveals; built-in and private reusable element presets. Preserve prior PNG drafts on load. SVG resources outside the supported subset produce notices rather than being executed. Personal presets are stored independently of works, private per author, and omit asset references.

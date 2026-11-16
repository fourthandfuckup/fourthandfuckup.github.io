# Production staging acceptance tests — NOT DEPLOYED

This checklist applies to draft PR #5. Do not merge, publish an edition, or alter production data while testing.

## Automated source checks (2026-11-16)
- PASS: index.html contains no preview-only banner.
- PASS: script.js, comics.js, edition-manager.js, preview-editions.js, published-crossword.js use `tribune_live_published_editions`, not `tribune_published_editions`.
- PASS: The Scandal Edition is not hardcoded into the inspected production files.
- PASS: edition-manager.js includes a top-of-function STAGING SAFETY LOCK that returns before publication.
- PASS: staging editor dependencies added: edition-layout-planner.js, preview-comic-series.js, preview-lead-comic.js, editorial-placement-preview.html.
- NOT TESTED: production build in browser, CSS/layout, image assets, authenticated editor workflow, runtime errors, and existing content continuity.
- NOT TESTED: full static asset/link inventory; prior inspection was incomplete. No claim of comprehensive link validation.

## Browser acceptance sequence (requires separate, isolated staging URL)
1. Open homepage and compare with existing live front page; verify no preview banner, no test stories, correct layout.
2. Navigate all departments; check existing live articles, headlines, images and links.
3. Open The Obituaries; verify existing live comics and ordering.
4. Open Sunday Huddle and archives; verify existing live crossword and historical editions.
5. Open Frank's Office; verify slogan, circulation statistics, subscribers, navigation and moderation controls.
6. Open Edition Manager; verify drafts load and controls display; do not publish. Clicking the staged publish action must show the lock warning and make no database changes.
7. Check developer console for errors and test desktop/mobile widths.
8. Compare live published-edition row counts and identifiers before and after testing; no new or changed rows.
9. Ensure The Scandal Edition, its comics and crossword never appear on the staging reader pages or production published data.

## Release blockers
- Isolated deployable staging URL not configured or verified.
- Browser acceptance not executed.
- Final user approval not granted.
- Publishing lock must be deliberately replaced with a reviewed two-step production flow only after testing and explicit approval.

Live main and live database must remain unchanged.

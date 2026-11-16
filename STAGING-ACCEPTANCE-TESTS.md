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

## Final safety review update — 2026-11-16
- User visually accepted homepage, original comics and crossword, Frank's Office, Sleeping Giant, Westfort Dynasty, Benchwarmer Bulletin, Wall of Shame, and Edition Manager appearance.
- Fixed original-comic fallback and removed browser-stored unpublished department draft leakage in both staging and production-upgrade branches.
- Corrected production publishing confirmations; staging lock still prevents publishing.
- **BLOCKER:** Preview and production share `tribune_editions`, `tribune_article_drafts`, `tribune_comic_drafts`, and `tribune_crossword_drafts`. A production editor could accidentally select a preview test edition/drafts. Must isolate production drafts or implement enforced production-only draft scope before unlocking publication.
- **BLOCKER:** Staging visual test did not exercise real publishing. No production write or isolated-database publishing test completed.
- **BLOCKER:** Confirm public article/comic/crossword continuity and data backup strategy before merging. Keep safety lock until release authorization and verified protections.
- **BLOCKER:** Production-staging code still contains preview-named localStorage layout keys; ensure editorial draft separation and clean production state before allowing editor workflows.
- Live main and live published data have not been intentionally changed.

## Draft-isolation implementation prepared (not deployed)
- Production edition manager now targets `tribune_prod_editions`, `tribune_prod_article_drafts`, `tribune_prod_comic_drafts`, `tribune_prod_crossword_drafts`, and `tribune_prod_edition_comics`.
- Production article editor now targets `tribune_prod_article_drafts`.
- Production editorial layout localStorage keys use `tribune-production-*`, not preview keys. Published layout reader uses the same new keys.
- Added `PRODUCTION-DRAFT-ISOLATION.sql` with empty production-only draft tables, RLS policies, editor-only grants and assignment foreign keys. **Migration not executed**; live database remains untouched.
- Database read-only verification: live published edition count 0, preview published count 2, shared draft edition count 1, production-only draft table does not yet exist. These are point-in-time counts.
- Publication lock still active. Before deployment: review migration with schema tooling, execute after explicit approval, verify policies/API grants, test authorized editor workflow and safe publication using isolated test setup. Do not copy preview drafts or published test content.

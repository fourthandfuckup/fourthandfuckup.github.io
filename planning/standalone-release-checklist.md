# Standalone story release checklist

This branch is not approved for deployment to the live Tribune.

## Isolation
- `standalone-article.html?slug=example-story` is a new route; it does not replace `article.html?id=...`.
- `standalone-article-reader.js` fetches only `is_public=true` records from `tribune_standalone_articles`.
- Existing edition content, comics, crossword, layout and issue metadata are not modified.
- Draft-only and missing stories display an unavailable message.
- Article HTML is escaped before rendering; image URLs require HTTPS.

## Before enabling the Publish button
1. Create a separate Supabase **staging project**, or obtain explicit approval to add the isolated table to the shared production database.
2. Apply and review `planning/standalone-articles-schema.sql`, including RLS and editor ownership policies. Test anonymous access cannot read private records or write any records.
3. Integrate the staging adapter into the Article Editor with explicit confirmation and a saved draft prerequisite.
4. Implement secure image transfer from private draft storage to a public image location **only at release**.
5. Generate one static HTML page per published article with its own Open Graph and Twitter metadata. Client-side meta updates alone are not reliable for social crawlers on GitHub Pages.
6. Release an article only after its static HTML and image are ready. Keep existing edition records untouched.
7. Run browser tests for draft → proof → stage → publish → share, including errors and unauthorized users.
8. Test the preview deployment separately from the live domain, then request explicit approval for live deployment.

## Existing browser checks
- `tests/standalone-publishing.html`: validation and private payload contract.
- `tests/standalone-store.html`: mock private staging adapter.
- The public reader requires a populated test table before a full integration test is possible.

No production database migrations or publishing actions have been performed by this branch.

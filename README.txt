THE FOURTH & FUCKUP TRIBUNE — PHASE 2 LOCAL PREVIEW

1. Extract this ZIP.
2. Open the tribune-phase-2 folder.
3. Double-click index.html in Edge or Chrome.
4. Browse the league sections, Benchwarmer Bulletin, Tip Line, Wall of Shame and the three rotating Chafe-Easy concept ads.

This is a LOCAL DESIGN PREVIEW. Your live GitHub Pages website is not changed.
The story submissions use mailto: links (your email application), NOT a live upload form.
The article editor remains a prototype and does NOT publish automatically.
The $74 story is a preview; the outcome has not been invented.
All advertisements and Frank Haggerty are fictional satire.
The included advertisement artwork is concept art: the product branding and copy need final polishing before public release.

NOTE: article-data.js allows the included stories to open directly from local files, without a web server.

PRIVATE EDITOR'S OFFICE (new):
- office.html is the new private sign-in and case review page; office.js uses Supabase authentication and row-level security.
- The original editor.html is a separate, PUBLIC local article drafting utility and is NOT the private office.
- Opening office.html from a downloaded ZIP (file://) only shows a preview message. Deploy the files to https://fourthandfuckup.github.io before attempting live sign-in.
- In Supabase Authentication > URL Configuration, add https://fourthandfuckup.github.io/office.html to Redirect URLs. Do not send a new invitation until the page is deployed.
- The existing Tip Line remains a local-only preview: no live submission backend or screenshot uploads are connected yet.
- The Office currently displays case data and lets the editor change status/decline reasons. Evidence storage and public intake will be added later.
- No service-role key or password is embedded in the website. The publishable API key is public by design; RLS protects private data.

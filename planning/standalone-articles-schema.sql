-- DEVELOPMENT-ONLY PROPOSAL. Do not apply to production until reviewed.
-- Standalone breaking stories do not modify tribune_live_published_editions.
create table if not exists public.tribune_standalone_articles (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null unique references public.tribune_article_drafts(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  headline text not null,
  author text not null,
  summary text not null default '',
  story text not null,
  categories text[] not null default '{}',
  image_url text,
  is_public boolean not null default false,
  published_by uuid not null references auth.users(id),
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.tribune_standalone_articles enable row level security;
grant select on public.tribune_standalone_articles to anon, authenticated;
grant insert, update on public.tribune_standalone_articles to authenticated;
create policy "Public can read standalone published stories"
  on public.tribune_standalone_articles for select
  to anon, authenticated using (is_public = true);
create policy "Editors can review private standalone staging"
  on public.tribune_standalone_articles for select to authenticated
  using (exists (select 1 from public.tribune_editors e where e.user_id = (select auth.uid())));
create policy "Only editors can publish standalone stories"
  on public.tribune_standalone_articles for insert to authenticated
  with check (published_by = (select auth.uid()) and exists (
    select 1 from public.tribune_editors e where e.user_id = (select auth.uid())
  ));
create policy "Only original editor can update standalone stories"
  on public.tribune_standalone_articles for update to authenticated
  using (published_by = (select auth.uid()) and exists (
    select 1 from public.tribune_editors e where e.user_id = (select auth.uid())
  ))
  with check (published_by = (select auth.uid()) and exists (
    select 1 from public.tribune_editors e where e.user_id = (select auth.uid())
  ));
-- Before activation: add immutable slug rules, explicit public release, safe image publishing,
-- dedicated metadata URLs and integration tests.

-- Staging is editor-only. A later controlled release must set is_public=true
-- and published_at after static metadata pages and public images are ready.

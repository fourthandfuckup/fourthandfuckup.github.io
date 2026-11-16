-- PREPARED ONLY. DO NOT RUN AGAINST LIVE UNTIL EXPLICIT DEPLOYMENT APPROVAL.
-- Creates empty production-only draft tables; preview drafts remain untouched.
-- Run in a single transaction and verify RLS and permissions before unlocking publication.
BEGIN;
CREATE TABLE public.tribune_prod_article_drafts (LIKE public.tribune_article_drafts INCLUDING ALL);
CREATE TABLE public.tribune_prod_comic_drafts (LIKE public.tribune_comic_drafts INCLUDING ALL);
CREATE TABLE public.tribune_prod_crossword_drafts (LIKE public.tribune_crossword_drafts INCLUDING ALL);
CREATE TABLE public.tribune_prod_editions (LIKE public.tribune_editions INCLUDING ALL);
CREATE TABLE public.tribune_prod_edition_comics (LIKE public.tribune_edition_comics INCLUDING ALL);

ALTER TABLE public.tribune_prod_article_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribune_prod_comic_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribune_prod_crossword_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribune_prod_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tribune_prod_edition_comics ENABLE ROW LEVEL SECURITY;

-- No anonymous access to private drafts.
REVOKE ALL ON public.tribune_prod_article_drafts,public.tribune_prod_comic_drafts,public.tribune_prod_crossword_drafts,public.tribune_prod_editions,public.tribune_prod_edition_comics FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tribune_prod_article_drafts,public.tribune_prod_comic_drafts,public.tribune_prod_crossword_drafts,public.tribune_prod_editions,public.tribune_prod_edition_comics TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tribune_prod_article_drafts','tribune_prod_comic_drafts','tribune_prod_crossword_drafts','tribune_prod_editions'] LOOP
    EXECUTE format('CREATE POLICY "prod_editor_read" ON public.%I FOR SELECT TO authenticated USING (editor_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_editors e WHERE e.user_id = (select auth.uid())))',t);
    EXECUTE format('CREATE POLICY "prod_editor_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (editor_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_editors e WHERE e.user_id = (select auth.uid())))',t);
    EXECUTE format('CREATE POLICY "prod_editor_update" ON public.%I FOR UPDATE TO authenticated USING (editor_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_editors e WHERE e.user_id = (select auth.uid()))) WITH CHECK (editor_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_editors e WHERE e.user_id = (select auth.uid())))',t);
    EXECUTE format('CREATE POLICY "prod_editor_delete" ON public.%I FOR DELETE TO authenticated USING (editor_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_editors e WHERE e.user_id = (select auth.uid())))',t);
  END LOOP;
END $$;

CREATE POLICY "prod_comic_assignment_read" ON public.tribune_prod_edition_comics FOR SELECT TO authenticated
USING (editor_id=(select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_prod_editions e WHERE e.id=edition_id AND e.editor_id=(select auth.uid())) AND EXISTS (SELECT 1 FROM public.tribune_prod_comic_drafts c WHERE c.id=comic_id AND c.editor_id=(select auth.uid())));
CREATE POLICY "prod_comic_assignment_insert" ON public.tribune_prod_edition_comics FOR INSERT TO authenticated
WITH CHECK (editor_id=(select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_prod_editions e WHERE e.id=edition_id AND e.editor_id=(select auth.uid())) AND EXISTS (SELECT 1 FROM public.tribune_prod_comic_drafts c WHERE c.id=comic_id AND c.editor_id=(select auth.uid())));
CREATE POLICY "prod_comic_assignment_delete" ON public.tribune_prod_edition_comics FOR DELETE TO authenticated
USING (editor_id=(select auth.uid()) AND EXISTS (SELECT 1 FROM public.tribune_prod_editions e WHERE e.id=edition_id AND e.editor_id=(select auth.uid())));

-- Prevent cross-environment references in production draft assignments.
ALTER TABLE public.tribune_prod_edition_comics ADD CONSTRAINT prod_edition_comics_edition_fk FOREIGN KEY (edition_id) REFERENCES public.tribune_prod_editions(id) ON DELETE CASCADE;
ALTER TABLE public.tribune_prod_edition_comics ADD CONSTRAINT prod_edition_comics_comic_fk FOREIGN KEY (comic_id) REFERENCES public.tribune_prod_comic_drafts(id) ON DELETE CASCADE;
ALTER TABLE public.tribune_prod_editions ADD CONSTRAINT prod_editions_main_fk FOREIGN KEY (main_article_id) REFERENCES public.tribune_prod_article_drafts(id);
ALTER TABLE public.tribune_prod_editions ADD CONSTRAINT prod_editions_left_fk FOREIGN KEY (bulletin_left_id) REFERENCES public.tribune_prod_article_drafts(id);
ALTER TABLE public.tribune_prod_editions ADD CONSTRAINT prod_editions_right_fk FOREIGN KEY (bulletin_right_id) REFERENCES public.tribune_prod_article_drafts(id);
ALTER TABLE public.tribune_prod_editions ADD CONSTRAINT prod_editions_crossword_fk FOREIGN KEY (crossword_draft_id) REFERENCES public.tribune_prod_crossword_drafts(id);
COMMIT;

-- AFTER APPROVAL: verify all five tables are empty and RLS is enabled.
-- Confirm Data API grants and test with an authorized editor session.

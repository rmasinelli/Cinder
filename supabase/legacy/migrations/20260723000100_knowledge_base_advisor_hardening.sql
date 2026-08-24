-- Follow-up from Supabase security and performance advisors.

create index if not exists knowledge_articles_reviewer_idx
  on public.knowledge_articles(reviewer_id);
create index if not exists knowledge_article_revisions_editor_idx
  on public.knowledge_article_revisions(editor_id);

drop policy if exists "Students create their own drafts and submissions" on public.knowledge_articles;
drop policy if exists "Reviewers create articles" on public.knowledge_articles;
create policy "Create owned drafts or reviewer articles"
on public.knowledge_articles for insert
to authenticated
with check (
  (select private.is_kb_reviewer())
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and reviewer_id is null
    and review_notes is null
    and published_at is null
  )
);

drop policy if exists "Students update their editable articles" on public.knowledge_articles;
drop policy if exists "Reviewers update all articles" on public.knowledge_articles;
create policy "Update owned editable articles or review articles"
on public.knowledge_articles for update
to authenticated
using (
  (select private.is_kb_reviewer())
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'changes_requested')
  )
)
with check (
  (select private.is_kb_reviewer())
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and reviewer_id is null
    and published_at is null
  )
);

drop policy if exists "Students delete their own drafts" on public.knowledge_articles;
drop policy if exists "Reviewers delete articles" on public.knowledge_articles;
create policy "Delete owned drafts or reviewer articles"
on public.knowledge_articles for delete
to authenticated
using (
  (select private.is_kb_reviewer())
  or (author_id = (select auth.uid()) and status = 'draft')
);

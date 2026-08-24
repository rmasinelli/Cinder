-- Issue #10: make classroom assignment changes visible across devices.
-- Postgres Changes still evaluates table RLS for each subscriber.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'assigned_tickets'
  ) then
    alter publication supabase_realtime add table public.assigned_tickets;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'lab_notes'
  ) then
    alter publication supabase_realtime add table public.lab_notes;
  end if;
end;
$$;

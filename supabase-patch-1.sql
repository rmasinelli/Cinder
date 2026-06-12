-- Patch 1: add cohort to profiles, allow public class code lookup

alter table profiles add column if not exists cohort text default 'net-hw';

-- Allow unauthenticated reads on classes so signup can validate the class code
drop policy if exists "classes: authenticated read" on classes;
create policy "classes: public read"
  on classes for select
  using (true);

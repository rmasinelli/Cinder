-- Patch 8: admin delete policies + reset RPC

-- Allow admins to delete assigned tickets and lab assignments
create policy "assigned_tickets: admin delete"
  on assigned_tickets for delete using (is_admin());

create policy "lab_assignments: admin delete"
  on lab_assignments for delete using (is_admin());

-- lab_notes cascade-delete from assigned_tickets already, but allow direct delete too
create policy "lab_notes: admin delete"
  on lab_notes for delete using (is_admin());

-- Single security-definer RPC so the admin can wipe all assigned data in one call
create or replace function admin_reset_assigned_tickets()
returns void language plpgsql security definer as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  delete from lab_notes;
  delete from assigned_tickets;
  delete from lab_assignments;
end;
$$;

grant execute on function admin_reset_assigned_tickets() to authenticated;

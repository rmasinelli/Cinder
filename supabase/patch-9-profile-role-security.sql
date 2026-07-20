-- Patch 9: prevent authenticated users from escalating their profile role
--
-- The previous self-update policy allowed an authenticated user to update every
-- column in their own profile, including the role used by is_admin(). Cinder does
-- not currently require client-side profile updates, so remove that path entirely.
--
-- Profile INSERT remains available for class enrollment. Instructor changes made
-- through trusted Supabase dashboard/server roles are unaffected.

drop policy if exists "profiles: update own" on profiles;

-- Defense in depth: a future permissive RLS policy alone must not restore browser
-- UPDATE access without an explicit privilege grant.
revoke update on table profiles from authenticated;

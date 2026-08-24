import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260824173200_harden_classroom_rls.sql",
    import.meta.url,
  ),
  "utf8",
);

test("student writes use narrow server-side RPCs", () => {
  for (const rpc of [
    "complete_student_enrollment",
    "validate_enrollment_codes",
    "resolve_student_login",
    "get_my_classes",
    "update_my_assigned_ticket_status",
    "save_my_lab_note",
  ]) {
    assert.match(app, new RegExp(`supabase\\.rpc\\(\"${rpc}\"`));
  }

  assert.doesNotMatch(app, /from\("profiles"\)\s*\.insert\(/);
  assert.doesNotMatch(app, /from\("profile_classes"\)\s*\.insert\(/);
  assert.doesNotMatch(app, /from\("assigned_tickets"\)\s*\.update\(/);
  assert.doesNotMatch(app, /from\("lab_notes"\)\s*\.(?:insert|update|upsert)\(/);
});

test("class codes are reachable only through controlled enrollment RPCs", () => {
  assert.equal((app.match(/from\("classes"\)/g) || []).length, 1);
  assert.doesNotMatch(app, /from\("classes"\)[\s\S]{0,120}\.ilike\("code"/);

  const enrollmentMigration = readFileSync(
    new URL(
      "../supabase/migrations/20260824180128_private_enrollment_codes.sql",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(enrollmentMigration, /revoke select on table public\.classes from anon/);
  assert.match(enrollmentMigration, /create policy "classes: admin read"/);
  assert.doesNotMatch(enrollmentMigration, /create policy "classes: read for enrollment"/);
  assert.match(enrollmentMigration, /drop function if exists public\.complete_student_enrollment\(text, uuid, uuid\[\]\)/);

  for (const rpc of [
    "validate_enrollment_codes",
    "resolve_student_login",
    "complete_student_enrollment",
    "add_my_class_by_code",
    "rotate_class_enrollment_code",
  ]) {
    assert.match(
      enrollmentMigration,
      new RegExp(
        `(?:create or replace|create) function public\\.${rpc}[\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ),
    );
  }
});

test("all classroom tables explicitly enable RLS", () => {
  for (const table of [
    "classes",
    "profiles",
    "profile_classes",
    "ticket_templates",
    "lab_assignments",
    "assigned_tickets",
    "lab_notes",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security;`),
    );
  }
});

test("students cannot directly mutate protected classroom rows", () => {
  assert.doesNotMatch(migration, /create policy "profiles: (?:own|student) (?:insert|update)"/i);
  assert.doesNotMatch(migration, /create policy "profile_classes: own insert"/i);
  assert.doesNotMatch(migration, /create policy "assigned_tickets: student update"/i);
  assert.doesNotMatch(migration, /create policy "lab_notes: student (?:insert|update|write)"/i);

  assert.match(migration, /create policy "profiles: own read"/);
  assert.match(migration, /create policy "assigned_tickets: student read"/);
  assert.match(migration, /create policy "lab_notes: student read"/);
});

test("instructor operations retain explicit admin-only policies", () => {
  for (const policy of [
    "classes: admin insert",
    "classes: admin update",
    "classes: admin delete",
    "profiles: admin update",
    "profile_classes: admin insert",
    "profile_classes: admin delete",
    "templates: admin insert",
    "templates: admin update",
    "templates: admin delete",
    "assignments: admin insert",
    "assignments: admin delete",
    "assigned_tickets: admin insert",
    "assigned_tickets: admin update",
    "assigned_tickets: admin delete",
  ]) {
    const escaped = policy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(migration, new RegExp(`create policy \"${escaped}\"`));
  }
});

test("privileged functions pin search_path and receive explicit grants", () => {
  const functionNames = [
    "private.is_admin",
    "public.complete_student_enrollment",
    "public.update_my_assigned_ticket_status",
    "public.save_my_lab_note",
    "public.set_student_reset_pin",
    "public.reset_student_password",
    "public.admin_reset_assigned_tickets",
  ];

  for (const name of functionNames) {
    const escaped = name.replace(".", "\\.");
    assert.match(
      migration,
      new RegExp(
        `create or replace function ${escaped}\\([\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      ),
    );
  }

  assert.match(migration, /revoke all on function private\.is_admin\(\)/);
  assert.match(migration, /grant execute on function private\.is_admin\(\) to authenticated/);
});

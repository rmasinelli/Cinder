import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const expectedMigrations = [
  "20260824181523_authoritative_baseline.sql",
  "20260824181524_classroom_authorization.sql",
  "20260824181525_private_enrollment.sql",
  "20260824185004_share_classroom_assignment_updates.sql",
  "20260824191422_classroom_ticket_lifecycle.sql",
  "20260824192643_normalize_ticket_quarter_codes.sql",
  "20260824193301_link_printed_field_journal.sql",
  "20260824195145_instructor_verification_signoff.sql",
  "20260824201440_restore_legacy_login_memberships.sql",
  "20260826165024_readiness_checks.sql",
];

const baseline = readFileSync(
  new URL(expectedMigrations[0], migrationDirectory),
  "utf8",
);
const config = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);
const migrationGuide = readFileSync(
  new URL("../docs/database/migrations.md", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const supabaseClient = readFileSync(
  new URL("../src/lib/supabase.js", import.meta.url),
  "utf8",
);
const classroomDrafts = readFileSync(
  new URL("../src/lib/classroomDrafts.mjs", import.meta.url),
  "utf8",
);

test("the active migration path is complete and ordered", () => {
  const migrations = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  assert.deepEqual(migrations, expectedMigrations);
});

test("active migrations can replace previously deployed functions", () => {
  for (const file of expectedMigrations) {
    const sql = readFileSync(new URL(file, migrationDirectory), "utf8");
    assert.doesNotMatch(sql, /^create function /m);
  }
});

test("the baseline owns every application table", () => {
  for (const table of [
    "classes",
    "profiles",
    "profile_classes",
    "ticket_templates",
    "lab_assignments",
    "assigned_tickets",
    "lab_notes",
    "knowledge_articles",
    "knowledge_article_revisions",
  ]) {
    assert.match(
      baseline,
      new RegExp(`create table if not exists public\\.${table} \\(`),
    );
  }
});

test("the baseline contains final classroom constraints and RLS", () => {
  for (const constraint of [
    "profiles_role_check",
    "classes_course_check",
    "classes_quarter_check",
    "templates_priority_check",
    "templates_mode_check",
    "assigned_tickets_status_check",
  ]) {
    assert.match(baseline, new RegExp(`constraint ${constraint}`));
  }

  assert.match(
    baseline,
    /if not exists \([\s\S]*?quarter not in \('Fall', 'Winter', 'Spring', 'Summer'\)[\s\S]*?validate constraint classes_quarter_check/,
  );

  for (const table of [
    "classes",
    "profiles",
    "profile_classes",
    "ticket_templates",
    "lab_assignments",
    "assigned_tickets",
    "lab_notes",
    "knowledge_articles",
    "knowledge_article_revisions",
  ]) {
    assert.match(
      baseline,
      new RegExp(`alter table public\\.${table} enable row level security;`),
    );
  }
});

test("environment-specific knowledge imports cannot run automatically", () => {
  assert.match(config, /\[db\.seed\][\s\S]*?enabled = false/);
  assert.match(config, /\[db\.seed\][\s\S]*?sql_paths = \[\]/);
  assert.match(migrationGuide, /author\/profile identifiers/i);
});

test("the guide rejects linked production resets", () => {
  assert.match(migrationGuide, /Never run `supabase db reset --linked`/);
  assert.match(migrationGuide, /supabase db push --dry-run/);
  assert.match(migrationGuide, /supabase migration list/);
});

test("custom scenario metadata uses the schema's JSON column", () => {
  assert.match(app, /function toTicketTemplateRow\(/);
  assert.match(app, /scenario:\{\.\.\.\(storedScenario\|\|\{\}\),requesterId,instructorNotes\}/);
  assert.match(app, /data\.map\(fromTicketTemplateRow\)/);
  assert.doesNotMatch(app, /ticket_templates"\)\.insert\(\{\.\.\.scenario,id\}/);
});

test("the app can target a clean local Supabase stack", () => {
  assert.match(supabaseClient, /import\.meta\.env\.VITE_SUPABASE_URL/);
  assert.match(supabaseClient, /import\.meta\.env\.VITE_SUPABASE_PUBLISHABLE_KEY/);
});

test("launch-visible classroom data is shared instead of browser-local", () => {
  assert.doesNotMatch(app, /localStorage\.(?:getItem|setItem)\("hd:/);
  assert.doesNotMatch(app, /label:"(?:Ticket Queue|Inbox|Incidents)"/);
  assert.doesNotMatch(app, /view==="(?:submit|inbox|ir|ticket)"/);
  assert.match(app, /label:"Assignment Queue"/);
  assert.match(app, /\.from\("assigned_tickets"\)/);
  assert.match(app, /postgres_changes[\s\S]*?table:"assigned_tickets"/);
});

test("browser storage is limited to safe device preferences", () => {
  const storageKeys = [...app.matchAll(/localStorage\.(?:getItem|setItem)\((?:`([^`]+)`|"([^"]+)")/g)]
    .map(match=>match[1]||match[2]);
  assert.ok(storageKeys.length > 0);
  assert.ok(storageKeys.every(key=>key.startsWith("cinder:onboarded:")||key==="cinder:codes"));
});

test("unsent classroom notes have truthful save states and draft recovery", () => {
  assert.match(classroomDrafts, /const PREFIX = "cinder:draft:"/);
  assert.match(classroomDrafts, /storage\.setItem\(classroomDraftKey/);
  assert.match(classroomDrafts, /storage\.removeItem\(classroomDraftKey/);
  assert.match(app, /phase:"saving"/);
  assert.match(app, /phase:"failed"/);
  assert.match(app, /phase:"saved"/);
  assert.match(app, /window\.addEventListener\("beforeunload"/);
  assert.match(app, /This note has not reached the server yet/);
  assert.match(app, /await onSaveNote\(selectedAssigned,\{notes:next\}\);[\s\S]*?clearClassroomDraft/);
});

test("retrying a recovered note is idempotent in the client", () => {
  assert.match(classroomDrafts, /notes\.some\(existing=>existing\.id===note\.id\)/);
  assert.match(app, /id:draft\?\.id\|\|crypto\.randomUUID\(\)/);
  assert.match(app, /const next=appendUniqueNote\(atNotes,newNote\)/);
  assert.doesNotMatch(app, /setAtNotes\(next\);[\s\S]*?await onSaveNote/);
});

test("failed status writes do not appear saved", () => {
  assert.match(app, /Status update failed:[\s\S]*?throw error;[\s\S]*?setAssignedTickets/);
  assert.match(app, /await onStatusChange\(ticketId,nextStatus\);[\s\S]*?phase:"saved"/);
  assert.match(app, /lastSavedAt/);
});

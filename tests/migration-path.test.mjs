import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const migrationDirectory = new URL("../supabase/migrations/", import.meta.url);
const expectedMigrations = [
  "20260824181523_authoritative_baseline.sql",
  "20260824181524_classroom_authorization.sql",
  "20260824181525_private_enrollment.sql",
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

test("the active migration path is complete and ordered", () => {
  const migrations = readdirSync(migrationDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  assert.deepEqual(migrations, expectedMigrations);
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

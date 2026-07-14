import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = join(scriptDirectory, "..", "supabase", "migrations");
const database = new PGlite();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runAs(role, userId, sql, parameters = []) {
  const allowedRoles = new Set(["anon", "authenticated"]);
  assert(allowedRoles.has(role), `Unsupported test role: ${role}`);
  await database.exec(`set role ${role};`);
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || ""]);
  try {
    return await database.query(sql, parameters);
  } finally {
    await database.exec("reset role;");
    await database.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

await database.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant select on tables to anon;
  alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
  alter default privileges in schema public grant all on tables to service_role;
  create table auth.users (id uuid primary key);
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`);

const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  const sql = (await readFile(join(migrationsDirectory, file), "utf8"))
    // PGlite provides PostgreSQL's built-in gen_random_uuid(), but does not ship
    // the optional pgcrypto control file used by hosted Supabase.
    .replaceAll("create extension if not exists pgcrypto;", "");
  try {
    await database.exec(sql);
  } catch (error) {
    throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
  }
}

for (const file of migrationFiles.filter((name) => /^(006|007|008)_/.test(name))) {
  const sql = (await readFile(join(migrationsDirectory, file), "utf8"))
    .replaceAll("create extension if not exists pgcrypto;", "");
  try {
    await database.exec(sql);
  } catch (error) {
    throw new Error(`Idempotence check for ${file} failed: ${error.message}`, { cause: error });
  }
}

const expectedColumns = [
  ["donor_leads", "consent_at"],
  ["patient_cases", "requester_email"],
  ["donation_intents", "intended_amount"],
  ["media_assets", "publicly_available"],
  ["media_items", "revision_number"],
  ["operational_events", "error_code"],
];

for (const [tableName, columnName] of expectedColumns) {
  const result = await database.query(`
    select count(*)::integer as count
    from information_schema.columns
    where table_schema = 'public'
      and table_name = $1
      and column_name = $2
  `, [tableName, columnName]);
  assert(result.rows[0]?.count === 1, `Missing ${tableName}.${columnName}`);
}

const expectedViews = [
  "v_media_assets_library",
  "v_public_media_assets",
  "v_public_hero_news",
  "v_public_actions",
  "v_public_media_items",
  "v_public_testimonials",
  "v_public_team_members",
  "v_public_faq_items",
  "v_public_transparency_metrics",
];

for (const viewName of expectedViews) {
  const result = await database.query(`
    select count(*)::integer as count
    from information_schema.views
    where table_schema = 'public' and table_name = $1
  `, [viewName]);
  assert(result.rows[0]?.count === 1, `Missing view ${viewName}`);
}

const hash = "a".repeat(64);
let limiterResult;
for (let request = 1; request <= 6; request += 1) {
  limiterResult = await database.query(`
    select *
    from public.consume_intake_rate_limit('migration-test', $1, 5, 600)
  `, [hash]);
}

assert(limiterResult.rows[0]?.allowed === false, "Rate limiter did not block request 6");
assert(limiterResult.rows[0]?.remaining === 0, "Rate limiter remaining count is invalid");
assert(limiterResult.rows[0]?.retry_after > 0, "Rate limiter retry_after is missing");

const policyResult = await database.query(`
  select policyname
  from pg_policies
  where schemaname = 'public'
    and tablename = 'hero_news'
`);
const policyNames = new Set(policyResult.rows.map((row) => row.policyname));
assert(policyNames.has("hero_news_cms_delete"), "Owner-only CMS delete policy is missing");
assert(policyNames.has("hero_news_public_select"), "Scheduled public policy is missing");

const auditCountBefore = await database.query(`
  select count(*)::integer as count
  from public.audit_logs
  where entity_type = 'hero_news' and action = 'insert'
`);
await database.exec(`
  insert into public.hero_news (title, published)
  values ('Migration audit test', false);
`);
const auditResult = await database.query(`
  select count(*)::integer as count
  from public.audit_logs
  where entity_type = 'hero_news' and action = 'insert'
`);
assert(
  auditResult.rows[0]?.count === auditCountBefore.rows[0]?.count + 1,
  "Editorial audit trigger did not run",
);

const operationalPolicies = await database.query(`
  select policyname
  from pg_policies
  where schemaname = 'public' and tablename = 'operational_events'
`);
const operationalPolicyNames = new Set(operationalPolicies.rows.map((row) => row.policyname));
assert(operationalPolicyNames.has("operational_events_admin_select"), "Operational events read policy is missing");
assert(operationalPolicyNames.has("operational_events_admin_insert"), "Operational events insert policy is missing");

const viewerId = "00000000-0000-4000-8000-000000000001";
const editorId = "00000000-0000-4000-8000-000000000002";
const ownerId = "00000000-0000-4000-8000-000000000003";
await database.query(
  "insert into auth.users (id) values ($1), ($2), ($3)",
  [viewerId, editorId, ownerId],
);
await database.query(`
  insert into public.admin_profiles (user_id, role, active)
  values ($1, 'viewer', true), ($2, 'operator', true), ($3, 'admin', true)
`, [viewerId, editorId, ownerId]);
await database.query(`
  insert into public.admin_app_access (user_id, app_code, access_role, active)
  values ($1, 'cms', 'viewer', true), ($2, 'cms', 'editor', true), ($3, 'cms', 'owner', true)
`, [viewerId, editorId, ownerId]);

const editorInsert = await runAs("authenticated", editorId, `
  insert into public.hero_news (title, published)
  values ('RBAC draft', false)
  returning id, created_by
`);
assert(editorInsert.rows.length === 1, "Editor could not create content");
assert(editorInsert.rows[0].created_by === editorId, "Database did not set editorial authorship");
const draftId = editorInsert.rows[0].id;

const viewerRead = await runAs("authenticated", viewerId, `
  select id from public.hero_news where id = $1
`, [draftId]);
assert(viewerRead.rows.length === 1, "Viewer could not read CMS drafts");

const viewerUpdate = await runAs("authenticated", viewerId, `
  update public.hero_news set title = 'Viewer mutation' where id = $1 returning id
`, [draftId]);
assert(viewerUpdate.rows.length === 0, "Viewer unexpectedly updated content");

const editorDelete = await runAs("authenticated", editorId, `
  delete from public.hero_news where id = $1 returning id
`, [draftId]);
assert(editorDelete.rows.length === 0, "Editor unexpectedly deleted content");

const ownerDelete = await runAs("authenticated", ownerId, `
  delete from public.hero_news where id = $1 returning id
`, [draftId]);
assert(ownerDelete.rows.length === 1, "Owner could not delete content");

await runAs("authenticated", editorId, `
  insert into public.hero_news (title, published)
  values ('RBAC public', true)
`);
const anonymousRead = await runAs("anon", null, `
  select title from public.v_public_hero_news where title = 'RBAC public'
`);
assert(anonymousRead.rows.length === 1, "Anonymous public projection did not return published content");

console.log(`Validated ${migrationFiles.length} migrations and security assertions.`);
await database.close();

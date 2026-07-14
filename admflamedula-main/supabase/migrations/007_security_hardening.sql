-- Server-side authorization, editorial audit and shared rate limiting.
-- Validate this migration with the access matrix in docs/security before production.

create or replace function public.has_app_access(
  p_app_code text,
  p_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        ap.role = 'super_admin'
        or exists (
          select 1
          from public.admin_app_access aaa
          where aaa.user_id = ap.user_id
            and aaa.app_code = p_app_code
            and aaa.active = true
            and (p_roles is null or aaa.access_role = any(p_roles))
        )
      )
  );
$$;

revoke all on function public.is_active_admin(text[]) from public, anon;
grant execute on function public.is_active_admin(text[]) to authenticated;
revoke all on function public.has_app_access(text, text[]) from public, anon;
grant execute on function public.has_app_access(text, text[]) to authenticated;

alter table public.admin_app_access enable row level security;

drop policy if exists "admin_app_access_self_select" on public.admin_app_access;
create policy "admin_app_access_self_select"
on public.admin_app_access
for select
to authenticated
using (user_id = auth.uid() and public.is_active_admin(null));

drop policy if exists "admin_app_access_super_admin_all" on public.admin_app_access;
create policy "admin_app_access_super_admin_all"
on public.admin_app_access
for all
to authenticated
using (public.is_active_admin(array['super_admin']))
with check (public.is_active_admin(array['super_admin']));

-- Replace the broad FOR ALL policies with action-specific CMS policies.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'hero_news',
    'actions',
    'media_items',
    'testimonials',
    'team_members',
    'faq_items',
    'transparency_metrics'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_cms_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.has_app_access(''cms'', array[''owner'', ''editor'', ''viewer'']))',
      table_name || '_cms_select',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_cms_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_app_access(''cms'', array[''owner'', ''editor'']))',
      table_name || '_cms_insert',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_cms_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_app_access(''cms'', array[''owner'', ''editor''])) with check (public.has_app_access(''cms'', array[''owner'', ''editor'']))',
      table_name || '_cms_update',
      table_name
    );

    execute format('drop policy if exists %I on public.%I', table_name || '_cms_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_app_access(''cms'', array[''owner'']))',
      table_name || '_cms_delete',
      table_name
    );
  end loop;
end
$$;

-- Published rows are public only inside their configured publication window.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'hero_news',
    'actions',
    'media_items',
    'testimonials',
    'team_members',
    'faq_items',
    'transparency_metrics'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_public_select', table_name);
    execute format(
      'create policy %I on public.%I for select to anon using (published = true and (scheduled_for is null or scheduled_for <= now()) and (expires_at is null or expires_at > now()))',
      table_name || '_public_select',
      table_name
    );
  end loop;
end
$$;

-- Intake operational roles: readers cannot mutate; operators cannot delete.
drop policy if exists "support_leads_admin_all" on public.support_leads;
drop policy if exists "support_leads_admin_select" on public.support_leads;
create policy "support_leads_admin_select"
on public.support_leads for select to authenticated
using (public.is_active_admin(null));

drop policy if exists "support_leads_operator_update" on public.support_leads;
create policy "support_leads_operator_update"
on public.support_leads for update to authenticated
using (public.is_active_admin(array['super_admin', 'admin', 'operator']))
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "support_leads_admin_delete" on public.support_leads;
create policy "support_leads_admin_delete"
on public.support_leads for delete to authenticated
using (public.is_active_admin(array['super_admin', 'admin']));

-- Media authorization mirrors the CMS policy and exposes only a narrow public view.
drop policy if exists "media_assets_admin_select" on public.media_assets;
drop policy if exists "media_assets_admin_insert" on public.media_assets;
drop policy if exists "media_assets_admin_update" on public.media_assets;
drop policy if exists "media_assets_admin_delete" on public.media_assets;
drop policy if exists "media_assets_cms_select" on public.media_assets;
drop policy if exists "media_assets_cms_insert" on public.media_assets;
drop policy if exists "media_assets_cms_update" on public.media_assets;
drop policy if exists "media_assets_cms_delete" on public.media_assets;

create policy "media_assets_cms_select"
on public.media_assets for select to authenticated
using (public.has_app_access('cms', array['owner', 'editor', 'viewer']));

create policy "media_assets_cms_insert"
on public.media_assets for insert to authenticated
with check (public.has_app_access('cms', array['owner', 'editor']));

create policy "media_assets_cms_update"
on public.media_assets for update to authenticated
using (public.has_app_access('cms', array['owner', 'editor']))
with check (public.has_app_access('cms', array['owner', 'editor']));

create policy "media_assets_cms_delete"
on public.media_assets for delete to authenticated
using (public.has_app_access('cms', array['owner']));

drop policy if exists "media_assets_public_select" on public.media_assets;
create policy "media_assets_public_select"
on public.media_assets for select to anon
using (active = true and publicly_available = true);

revoke all on public.media_assets from anon;
grant select (
  id,
  secure_url,
  original_url,
  delivery_url,
  webp_url,
  card_url,
  thumbnail_url,
  alt_text,
  width,
  height,
  active,
  publicly_available
) on public.media_assets to anon;

revoke all on public.v_media_assets_library from anon;
grant select on public.v_media_assets_library to authenticated;
grant select on public.v_public_media_assets to anon, authenticated;

-- Anonymous users receive only the columns required by the public projections.
revoke all on public.hero_news from anon;
grant select (
  id, category, title, subtitle, image_asset_id, image_url, image_alt,
  cloudinary_public_id, cta_label, cta_url, featured, published, sort_order,
  updated_at, scheduled_for, expires_at
) on public.hero_news to anon;

revoke all on public.actions from anon;
grant select (
  id, title, summary, content, action_date, location, image_asset_id,
  image_url, image_alt, cloudinary_public_id, cta_label, cta_url,
  action_status, featured, published, sort_order, updated_at, scheduled_for,
  expires_at
) on public.actions to anon;

revoke all on public.media_items from anon;
grant select (
  id, type, category, title, description, url, youtube_id, image_asset_id,
  image_url, thumbnail_url, image_alt, cloudinary_public_id, duration, source,
  featured, published, sort_order, updated_at, scheduled_for, expires_at
) on public.media_items to anon;

grant select on public.v_public_hero_news to anon, authenticated;
grant select on public.v_public_actions to anon, authenticated;
grant select on public.v_public_media_items to anon, authenticated;

-- Aggregate views inherit the caller's RLS and are never public.
alter view public.v_dashboard_metrics set (security_invoker = true);
alter view public.v_donor_region_summary set (security_invoker = true);
alter view public.v_content_status set (security_invoker = true);
revoke all on public.v_dashboard_metrics from anon;
revoke all on public.v_donor_region_summary from anon;
revoke all on public.v_content_status from anon;
grant select on public.v_dashboard_metrics to authenticated;
grant select on public.v_donor_region_summary to authenticated;
grant select on public.v_content_status to authenticated;

-- Authorship and revision metadata are set by the database, not trusted from UI.
create or replace function public.set_content_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.revision_number := greatest(coalesce(new.revision_number, 1), 1);
    if new.published = true then
      new.published_at := now();
      new.published_by := auth.uid();
    else
      new.published_at := null;
      new.published_by := null;
    end if;
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce(auth.uid(), old.updated_by);
    new.revision_number := coalesce(old.revision_number, 0) + 1;
    if new.published = true and old.published = false then
      new.published_at := now();
      new.published_by := auth.uid();
    else
      new.published_at := old.published_at;
      new.published_by := old.published_by;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'hero_news',
    'actions',
    'media_items',
    'testimonials',
    'team_members',
    'faq_items',
    'transparency_metrics'
  ]
  loop
    execute format('drop trigger if exists set_content_metadata on public.%I', table_name);
    execute format(
      'create trigger set_content_metadata before insert or update on public.%I for each row execute function public.set_content_metadata()',
      table_name
    );
  end loop;
end
$$;

create or replace function public.set_site_settings_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  new.revision_number := coalesce(old.revision_number, 0) + 1;
  return new;
end;
$$;

drop trigger if exists set_site_settings_metadata on public.site_settings;
create trigger set_site_settings_metadata
before update on public.site_settings
for each row execute function public.set_site_settings_metadata();

-- Audit only editorial/configuration entities. Personal intake rows are intentionally
-- excluded so audit logs do not become a second uncontrolled PII store.
create or replace function public.write_editorial_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id uuid;
begin
  row_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_logs (
    admin_user_id,
    action,
    entity_type,
    entity_id,
    previous_data,
    new_data
  ) values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'admin_app_access',
    'hero_news',
    'actions',
    'media_items',
    'testimonials',
    'team_members',
    'faq_items',
    'transparency_metrics',
    'media_assets',
    'site_settings'
  ]
  loop
    execute format('drop trigger if exists write_editorial_audit_log on public.%I', table_name);
    execute format(
      'create trigger write_editorial_audit_log after insert or update or delete on public.%I for each row execute function public.write_editorial_audit_log()',
      table_name
    );
  end loop;
end
$$;

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
revoke insert, update, delete on public.audit_logs from authenticated;

-- Shared, atomic fixed-window limiter for all Edge Function instances.
create table if not exists public.intake_rate_limits (
  endpoint text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null,
  primary key (endpoint, key_hash),
  check (char_length(key_hash) = 64)
);

create index if not exists idx_intake_rate_limits_expires_at
  on public.intake_rate_limits (expires_at);

alter table public.intake_rate_limits enable row level security;
revoke all on public.intake_rate_limits from public, anon, authenticated;

create or replace function public.consume_intake_rate_limit(
  p_endpoint text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_expiry timestamptz;
begin
  if p_endpoint is null or char_length(p_endpoint) < 1 or char_length(p_endpoint) > 80 then
    raise exception 'invalid endpoint';
  end if;
  if p_key_hash is null or char_length(p_key_hash) <> 64 then
    raise exception 'invalid key hash';
  end if;
  if p_limit < 1 or p_limit > 10000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit configuration';
  end if;

  insert into public.intake_rate_limits as limits (
    endpoint,
    key_hash,
    window_started_at,
    request_count,
    expires_at
  ) values (
    p_endpoint,
    p_key_hash,
    v_now,
    1,
    v_now + make_interval(secs => p_window_seconds)
  )
  on conflict (endpoint, key_hash) do update
  set
    window_started_at = case
      when limits.expires_at <= v_now then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.expires_at <= v_now then 1
      else limits.request_count + 1
    end,
    expires_at = case
      when limits.expires_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else limits.expires_at
    end
  returning request_count, expires_at
  into v_count, v_expiry;

  return query select
    v_count <= p_limit,
    greatest(p_limit - v_count, 0),
    case
      when v_count <= p_limit then 0
      else greatest(ceil(extract(epoch from (v_expiry - v_now)))::integer, 1)
    end,
    v_expiry;
end;
$$;

create or replace function public.prune_intake_rate_limits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_rows bigint;
begin
  delete from public.intake_rate_limits
  where expires_at < clock_timestamp() - interval '1 day';
  get diagnostics deleted_rows = row_count;
  return deleted_rows;
end;
$$;

revoke all on function public.consume_intake_rate_limit(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.prune_intake_rate_limits() from public, anon, authenticated;
grant execute on function public.consume_intake_rate_limit(text, text, integer, integer) to service_role;
grant execute on function public.prune_intake_rate_limits() to service_role;

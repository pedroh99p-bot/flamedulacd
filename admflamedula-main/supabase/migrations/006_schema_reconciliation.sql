-- Reconciles the versioned schema with fields already consumed by the site and ADM.
-- This migration is additive/idempotent so it can be validated against a staging
-- clone before being promoted. Do not edit previously applied migrations.

create extension if not exists pgcrypto;

-- Public intake: preserve real consent metadata and remove the need for fake PII.
alter table public.donor_leads
  add column if not exists consent_at timestamptz,
  add column if not exists is_test boolean not null default false;

alter table public.patient_cases
  add column if not exists requester_email text,
  add column if not exists consent_at timestamptz,
  add column if not exists is_test boolean not null default false;

alter table public.support_leads
  add column if not exists consent_at timestamptz,
  add column if not exists is_test boolean not null default false;

alter table public.donation_intents
  add column if not exists submission_mode text,
  add column if not exists intended_amount numeric(12,2),
  add column if not exists source_section text,
  add column if not exists consent_at timestamptz,
  add column if not exists is_test boolean not null default false,
  add column if not exists provider_name text,
  add column if not exists internal_notes text;

comment on column public.donation_intents.intended_amount is
  'Amount declared by the visitor before payment; never represents a confirmed payment.';
comment on column public.donation_intents.amount is
  'Legacy/processed amount. Payment confirmation must not be inferred from this field alone.';

-- CMS access is application-specific. The global admin profile remains the source
-- for operational modules; this table scopes privileges inside the CMS.
create table if not exists public.admin_app_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  app_code text not null,
  access_role text not null default 'viewer'
    check (access_role in ('owner', 'editor', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, app_code)
);

create index if not exists idx_admin_app_access_lookup
  on public.admin_app_access (user_id, app_code, active);

drop trigger if exists set_admin_app_access_updated_at on public.admin_app_access;
create trigger set_admin_app_access_updated_at
before update on public.admin_app_access
for each row execute function public.update_updated_at_column();

-- Initial compatibility mapping. Review operator access in staging before production.
insert into public.admin_app_access (user_id, app_code, access_role, active)
select
  ap.user_id,
  'cms',
  case ap.role
    when 'super_admin' then 'owner'
    when 'admin' then 'editor'
    when 'operator' then 'editor'
    else 'viewer'
  end,
  ap.active
from public.admin_profiles ap
on conflict (user_id, app_code) do nothing;

-- Fields used by the publication workflows and by a future publish/schedule UI.
alter table public.hero_news
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.actions
  add column if not exists content text,
  add column if not exists featured boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.media_items
  add column if not exists image_url text,
  add column if not exists image_alt text,
  add column if not exists embed_url text,
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.testimonials
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.team_members
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.faq_items
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.transparency_metrics
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists published_at timestamptz,
  add column if not exists scheduled_for timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists published_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

alter table public.site_settings
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists revision_number integer not null default 1;

-- Media metadata emitted by the Cloudinary services.
alter table public.media_assets
  add column if not exists asset_usage text,
  add column if not exists active boolean not null default true,
  add column if not exists publicly_available boolean not null default true,
  add column if not exists original_url text,
  add column if not exists delivery_url text,
  add column if not exists webp_url text,
  add column if not exists card_url text,
  add column if not exists thumbnail_url text,
  add column if not exists transformation_profile text,
  add column if not exists optimization_status text,
  add column if not exists optimized_at timestamptz;

create index if not exists idx_media_assets_public_lookup
  on public.media_assets (active, publicly_available, id);
create index if not exists idx_media_assets_usage
  on public.media_assets (asset_usage, created_at desc);

-- Full library for authenticated CMS users.
create or replace view public.v_media_assets_library
with (security_invoker = true)
as
select
  ma.id,
  ma.cloudinary_public_id,
  ma.secure_url,
  ma.resource_type,
  ma.asset_type,
  ma.asset_usage,
  ma.folder,
  ma.original_filename,
  ma.display_name,
  ma.alt_text,
  ma.format,
  ma.width,
  ma.height,
  ma.duration,
  ma.bytes,
  ma.version,
  ma.original_url,
  ma.delivery_url,
  ma.webp_url,
  ma.card_url,
  ma.thumbnail_url,
  coalesce(ma.delivery_url, ma.webp_url, ma.card_url, ma.secure_url) as preferred_delivery_url,
  ma.transformation_profile,
  ma.optimization_status,
  ma.optimized_at,
  ma.active,
  ma.publicly_available,
  ma.created_at,
  ma.updated_at
from public.media_assets ma;

-- Narrow projection used by the anonymous landing page.
create or replace view public.v_public_media_assets
with (security_invoker = true)
as
select
  ma.id,
  coalesce(ma.delivery_url, ma.webp_url, ma.card_url, ma.secure_url) as preferred_delivery_url,
  ma.delivery_url,
  ma.webp_url,
  ma.card_url,
  ma.thumbnail_url,
  coalesce(ma.original_url, ma.secure_url) as original_url,
  ma.alt_text,
  ma.width,
  ma.height,
  ma.active
from public.media_assets ma
where ma.active = true
  and ma.publicly_available = true;

-- Public content projections exclude authorship and draft metadata while honoring
-- future scheduling fields. RLS remains active because the views are security-invoker.
create or replace view public.v_public_hero_news
with (security_invoker = true)
as
select
  id, category, title, subtitle, image_asset_id, image_url, image_alt,
  cloudinary_public_id, cta_label, cta_url, featured, published, sort_order,
  updated_at
from public.hero_news
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create or replace view public.v_public_actions
with (security_invoker = true)
as
select
  id, title, summary, content, action_date, location, image_asset_id,
  image_url, image_alt, cloudinary_public_id, cta_label, cta_url,
  action_status, featured, published, sort_order, updated_at
from public.actions
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create or replace view public.v_public_media_items
with (security_invoker = true)
as
select
  id, type, category, title, description, url, youtube_id, image_asset_id,
  image_url, thumbnail_url, image_alt, cloudinary_public_id, duration, source,
  featured, published, sort_order, updated_at
from public.media_items
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create index if not exists idx_donation_intents_submission_mode
  on public.donation_intents (submission_mode, created_at desc);
create index if not exists idx_content_schedule_hero
  on public.hero_news (published, scheduled_for, expires_at);
create index if not exists idx_content_schedule_actions
  on public.actions (published, scheduled_for, expires_at);
create index if not exists idx_content_schedule_media
  on public.media_items (published, scheduled_for, expires_at);

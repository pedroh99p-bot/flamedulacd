-- Safe public projections for the editorial sections that were previously static.

create or replace view public.v_public_testimonials
with (security_invoker = true)
as
select
  id, quote, author_name, author_label, image_asset_id, image_url, image_alt,
  cloudinary_public_id, published, sort_order, updated_at
from public.testimonials
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create or replace view public.v_public_team_members
with (security_invoker = true)
as
select
  id, name, role, description, member_type, image_asset_id, image_url, image_alt,
  cloudinary_public_id, published, sort_order, updated_at
from public.team_members
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create or replace view public.v_public_faq_items
with (security_invoker = true)
as
select
  id, question, answer, category, published, sort_order, updated_at
from public.faq_items
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

create or replace view public.v_public_transparency_metrics
with (security_invoker = true)
as
select
  id, key, label, value, description, mode, published, sort_order, updated_at
from public.transparency_metrics
where published = true
  and (scheduled_for is null or scheduled_for <= now())
  and (expires_at is null or expires_at > now());

revoke all on public.testimonials from anon;
grant select (
  id, quote, author_name, author_label, image_asset_id, image_url, image_alt,
  cloudinary_public_id, published, sort_order, updated_at, scheduled_for, expires_at
) on public.testimonials to anon;

revoke all on public.team_members from anon;
grant select (
  id, name, role, description, member_type, image_asset_id, image_url, image_alt,
  cloudinary_public_id, published, sort_order, updated_at, scheduled_for, expires_at
) on public.team_members to anon;

revoke all on public.faq_items from anon;
grant select (
  id, question, answer, category, published, sort_order, updated_at,
  scheduled_for, expires_at
) on public.faq_items to anon;

revoke all on public.transparency_metrics from anon;
grant select (
  id, key, label, value, description, mode, published, sort_order, updated_at,
  scheduled_for, expires_at
) on public.transparency_metrics to anon;

grant select on public.v_public_testimonials to anon, authenticated;
grant select on public.v_public_team_members to anon, authenticated;
grant select on public.v_public_faq_items to anon, authenticated;
grant select on public.v_public_transparency_metrics to anon, authenticated;

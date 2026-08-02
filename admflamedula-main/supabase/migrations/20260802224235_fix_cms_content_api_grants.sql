-- Supabase projects created with "Automatically expose new tables" disabled
-- do not receive Data API grants automatically. RLS remains the authorization
-- layer; these grants only make the existing policies reachable through
-- supabase-js/PostgREST.

grant usage on schema public to authenticated;

grant select on table
  public.admin_profiles,
  public.admin_app_access,
  public.audit_logs
to authenticated;

grant select, update, delete on table
  public.donor_leads,
  public.patient_cases,
  public.support_leads,
  public.donation_intents
to authenticated;

grant select, insert, update, delete on table
  public.hero_news,
  public.actions,
  public.media_items,
  public.testimonials,
  public.team_members,
  public.faq_items,
  public.transparency_metrics,
  public.media_assets,
  public.site_settings
to authenticated;

grant select, insert, update on table public.operational_events to authenticated;

grant select on table
  public.v_public_hero_news,
  public.v_public_actions,
  public.v_public_media_items,
  public.v_public_testimonials,
  public.v_public_team_members,
  public.v_public_faq_items,
  public.v_public_transparency_metrics,
  public.v_media_assets_library,
  public.v_dashboard_metrics,
  public.v_donor_region_summary,
  public.v_content_status
to authenticated;

-- Keep anonymous access narrow. The existing security-invoker views and RLS
-- policies decide which published rows and columns can be returned.
grant usage on schema public to anon;
grant select on table
  public.v_public_hero_news,
  public.v_public_actions,
  public.v_public_media_items,
  public.v_public_testimonials,
  public.v_public_team_members,
  public.v_public_faq_items,
  public.v_public_transparency_metrics,
  public.v_public_media_assets
to anon;

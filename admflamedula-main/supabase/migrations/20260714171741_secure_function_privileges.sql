-- Removes avoidable function exposure reported by the Supabase security advisor.

alter function public.update_updated_at_column()
  set search_path = '';

revoke execute on function public.write_editorial_audit_log()
  from public, anon, authenticated;

-- These two functions are intentionally used by RLS for signed-in dashboard users.
-- Anonymous callers never need to execute them directly.
revoke execute on function public.is_active_admin(text[])
  from public, anon;
grant execute on function public.is_active_admin(text[])
  to authenticated;

revoke execute on function public.has_app_access(text, text[])
  from public, anon;
grant execute on function public.has_app_access(text, text[])
  to authenticated;

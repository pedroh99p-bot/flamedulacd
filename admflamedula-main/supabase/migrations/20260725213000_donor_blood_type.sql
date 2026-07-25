-- Adds the optional ABO/Rh blood type collected by the public donor form.
-- This field supports blood-campaign segmentation only. REDOME compatibility
-- is determined by HLA, not by ABO/Rh blood type.

alter table public.donor_leads
  add column if not exists tipo_sanguineo text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'donor_leads_tipo_sanguineo_check'
      and conrelid = 'public.donor_leads'::regclass
  ) then
    alter table public.donor_leads
      add constraint donor_leads_tipo_sanguineo_check
      check (
        tipo_sanguineo is null
        or tipo_sanguineo in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
      )
      not valid;
  end if;
end
$$;

comment on column public.donor_leads.tipo_sanguineo is
  'ABO/Rh blood type declared by the lead. Not used to infer marrow/HLA compatibility.';

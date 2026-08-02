alter table public.donor_leads
  add column if not exists donation_interest text;

comment on column public.donor_leads.donation_interest is
  'Interesse principal informado no cadastro FlaMedula: sangue, plaquetas, sangue_e_plaquetas ou quero_entender.';

alter table public.donor_leads
  drop constraint if exists donor_leads_donation_interest_check;

alter table public.donor_leads
  add constraint donor_leads_donation_interest_check
  check (
    donation_interest is null
    or donation_interest in ('sangue', 'plaquetas', 'sangue_e_plaquetas', 'quero_entender')
  ) not valid;

create index if not exists donor_leads_donation_interest_idx
  on public.donor_leads (donation_interest)
  where donation_interest is not null;

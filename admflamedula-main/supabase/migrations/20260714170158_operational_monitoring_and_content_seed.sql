-- Makes the official Supabase project the source of truth for public content
-- and adds a privacy-safe operational event stream.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.content_migration_backups (
  id bigint generated always as identity primary key,
  migration_name text not null unique,
  captured_at timestamptz not null default now(),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object')
);

insert into private.content_migration_backups (migration_name, snapshot)
select
  '20260714170158_operational_monitoring_and_content_seed',
  jsonb_build_object(
    'hero_news', coalesce((select jsonb_agg(to_jsonb(item)) from public.hero_news item), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(to_jsonb(item)) from public.actions item), '[]'::jsonb),
    'media_items', coalesce((select jsonb_agg(to_jsonb(item)) from public.media_items item), '[]'::jsonb),
    'testimonials', coalesce((select jsonb_agg(to_jsonb(item)) from public.testimonials item), '[]'::jsonb),
    'team_members', coalesce((select jsonb_agg(to_jsonb(item)) from public.team_members item), '[]'::jsonb),
    'faq_items', coalesce((select jsonb_agg(to_jsonb(item)) from public.faq_items item), '[]'::jsonb),
    'transparency_metrics', coalesce((select jsonb_agg(to_jsonb(item)) from public.transparency_metrics item), '[]'::jsonb),
    'site_settings', coalesce((select jsonb_agg(to_jsonb(item)) from public.site_settings item), '[]'::jsonb)
  )
on conflict (migration_name) do nothing;

create table if not exists public.operational_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  severity text not null default 'error'
    check (severity in ('warning', 'error', 'critical')),
  source text not null check (char_length(source) between 2 and 60),
  event_type text not null check (char_length(event_type) between 2 and 80),
  request_id text check (request_id is null or char_length(request_id) <= 120),
  status_code integer check (status_code is null or status_code between 100 and 599),
  error_code text check (error_code is null or char_length(error_code) <= 80),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 500)
);

comment on table public.operational_events is
  'Privacy-safe failures only. Never store form payloads, names, emails, phones, documents, tokens or secrets.';

alter table public.operational_events enable row level security;

drop policy if exists "operational_events_admin_select" on public.operational_events;
create policy "operational_events_admin_select"
on public.operational_events
for select
to authenticated
using ((select public.is_active_admin(null)));

drop policy if exists "operational_events_admin_insert" on public.operational_events;
create policy "operational_events_admin_insert"
on public.operational_events
for insert
to authenticated
with check ((select public.is_active_admin(array['super_admin', 'admin', 'operator'])));

drop policy if exists "operational_events_admin_update" on public.operational_events;
create policy "operational_events_admin_update"
on public.operational_events
for update
to authenticated
using ((select public.is_active_admin(array['super_admin', 'admin', 'operator'])))
with check ((select public.is_active_admin(array['super_admin', 'admin', 'operator'])));

revoke all on public.operational_events from anon, authenticated;
grant select, insert, update on public.operational_events to authenticated;

create index if not exists idx_operational_events_unresolved
  on public.operational_events (occurred_at desc, severity)
  where resolved_at is null;

create index if not exists idx_operational_events_source_recent
  on public.operational_events (source, occurred_at desc);

-- All editorial CTAs use the one official WhatsApp destination.
update public.hero_news
set cta_url = 'https://wa.me/558599280682'
where cta_url is distinct from 'https://wa.me/558599280682';

update public.actions
set cta_url = 'https://wa.me/558599280682'
where cta_url is distinct from 'https://wa.me/558599280682';

insert into public.hero_news (
  category, title, subtitle, image_url, image_alt, cta_label, cta_url,
  featured, published, sort_order, published_at
)
select seed.*
from (values
  ('Notícia', '15 de junho agora é o Dia do FlaMedula', 'A data entrou no calendário oficial do Rio de Janeiro após aprovação na Câmara, fortalecendo a visibilidade da causa e da doação de sangue e medula.', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782501138/c46f2575-bd3e-429d-8831-b9d9da5ad3a8_ku4r0p.webp', 'Registro institucional do Dia do FlaMedula', 'Falar no WhatsApp', 'https://wa.me/558599280682', true, true, 1, now()),
  ('História real', 'Filha doa medula para o pai', 'A compatibilidade entre familiares costuma ser maior. Entre pessoas sem parentesco, a chance pode chegar a 1 em 100 mil - por isso cada novo cadastro importa.', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782501138/af5b390a-4e86-4737-aaeb-af6daf55b04e_mwhlvt.webp', 'Filha realizando doação de medula para o pai', 'Falar no WhatsApp', 'https://wa.me/558599280682', false, true, 2, now()),
  ('Vitória', 'Rafael VENCEU!!!', 'Depois de dois transplantes de medula, Rafael venceu. Uma história de superação que mostra como a doação pode mudar destinos e salvar vidas.', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782501137/341c873e-d4f5-403c-a589-b6a72287dfde_pj3nh6.webp', 'Vitória de Rafael após dois transplantes de medula', 'Falar no WhatsApp', 'https://wa.me/558599280682', false, true, 3, now())
) as seed(category, title, subtitle, image_url, image_alt, cta_label, cta_url, featured, published, sort_order, published_at)
where not exists (
  select 1 from public.hero_news current_item where current_item.title = seed.title
);

insert into public.actions (
  title, summary, action_date, location, image_url, image_alt, cta_label, cta_url,
  action_status, featured, published, sort_order, published_at
)
select seed.*
from (values
  ('Dia das Mães Solidário', 'Colo, abraço e esperança para mães que acompanham seus filhos durante o tratamento.', date '2026-05-10', 'Hospital Pedro Ernesto, RJ', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862120/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_sygcyi.jpg', 'Registro da ação Dia das Mães Solidário', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 1, now()),
  ('Apoio e Cuidado', 'Doação de cestas básicas, presença e suporte emocional para famílias em uma jornada delicada.', date '2026-05-10', 'Hospital Pedro Ernesto, RJ', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862120/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_1_ipchnu.jpg', 'Registro da ação Apoio e Cuidado', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 2, now()),
  ('Força para as Mães', 'Conforto, escuta e cuidado direto para mães que sustentam a rotina do tratamento.', date '2026-05-10', 'Hospital Albert Sabin', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862417/Dia_das_M%C3%A3es_1_f5umjr.jpg', 'Registro da ação Força para as Mães', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 3, now()),
  ('Cadastro e Esperança', 'Acolher famílias e incentivar novos cadastros conscientes para ampliar as chances de encontro.', date '2026-05-10', 'Hospital Albert Sabin', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862416/Dia_das_M%C3%A3es_sc8ttx.jpg', 'Registro da ação Cadastro e Esperança', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 4, now()),
  ('Páscoa com Carinho', 'Chocolates, presentes e afeto para tornar a rotina hospitalar das crianças mais leve.', date '2026-04-01', 'INCA', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862121/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_1_w1xb8t.jpg', 'Registro da ação Páscoa com Carinho', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 5, now()),
  ('Momentos de Leveza', 'Esperança, sorrisos e presença para pacientes infantis, pais e equipes de apoio.', date '2026-04-01', 'INCA', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862121/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_m1kicl.jpg', 'Registro da ação Momentos de Leveza', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 6, now()),
  ('Corrente do Bem', 'Voluntários, comunidade e parceiros unidos em uma grande corrente de cuidado e mobilização.', date '2026-04-01', 'INCA', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1778862121/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_2_rs3nri.jpg', 'Registro da ação Corrente do Bem', 'Falar no WhatsApp', 'https://wa.me/558599280682', 'concluida', false, true, 7, now())
) as seed(title, summary, action_date, location, image_url, image_alt, cta_label, cta_url, action_status, featured, published, sort_order, published_at)
where not exists (
  select 1 from public.actions current_item
  where current_item.title = seed.title
    and current_item.action_date is not distinct from seed.action_date
    and current_item.location is not distinct from seed.location
);

insert into public.media_items (
  type, category, title, description, url, youtube_id, thumbnail_url,
  featured, published, sort_order, published_at
)
select seed.*
from (values
  ('youtube', 'Vídeo oficial', 'Apresentação do Canal FlaMedula', 'Uma introdução à causa e à orientação sobre cadastro de medula.', 'https://www.youtube.com/watch?v=U4Mk8wK_Ig8', 'U4Mk8wK_Ig8', 'https://img.youtube.com/vi/U4Mk8wK_Ig8/hqdefault.jpg', true, true, 1, now()),
  ('youtube', 'REDOME', 'Fiz cadastro como doador de medula e o REDOME ligou. E agora?', 'Conteúdo educativo sobre o que pode acontecer após um possível contato dos canais oficiais.', 'https://www.youtube.com/watch?v=_W0GsCB-GiQ', '_W0GsCB-GiQ', 'https://img.youtube.com/vi/_W0GsCB-GiQ/hqdefault.jpg', false, true, 2, now()),
  ('youtube', 'Entrevista', 'Dedeco fala sobre a FlaMedula', 'Conversa sobre a história, mobilização e importância da rede FlaMedula.', 'https://www.youtube.com/watch?v=fHT9F5hqwKw', 'fHT9F5hqwKw', 'https://img.youtube.com/vi/fHT9F5hqwKw/hqdefault.jpg', false, true, 3, now()),
  ('youtube', 'Bate-papo', 'Bate-papo sobre doação de medula óssea', 'Uma conversa para ampliar informação, tirar dúvidas e aproximar mais pessoas da causa.', 'https://www.youtube.com/watch?v=ivdMsdLYQl4', 'ivdMsdLYQl4', 'https://img.youtube.com/vi/ivdMsdLYQl4/hqdefault.jpg', false, true, 4, now())
) as seed(type, category, title, description, url, youtube_id, thumbnail_url, featured, published, sort_order, published_at)
where not exists (
  select 1 from public.media_items current_item
  where current_item.youtube_id is not distinct from seed.youtube_id
     or current_item.title = seed.title
);

insert into public.testimonials (
  quote, author_name, author_label, published, sort_order, published_at
)
select seed.*
from (values
  ('Eu tinha medo porque não entendia. Depois da orientação, ficou muito mais claro e decidi me cadastrar.', 'Mariana S.', 'Doadora — Voluntária orientada', true, 1, now()),
  ('Ter alguém explicando o caminho fez diferença em um momento de muita ansiedade para nossa família.', 'Carlos E.', 'Familiar — Campanha acompanhada', true, 2, now()),
  ('A atualização dos dados é simples, mas muita gente esquece. Esse lembrete da FlaMedula importa muito.', 'Ana Beatriz', 'Apoiadora — Mobilização REDOME', true, 3, now()),
  ('Achei que doação era só pela coluna. O vídeo abriu minha mente para começar a ajudar sem medo.', 'Roberto A.', 'Doador — Doador de Sangue', true, 4, now())
) as seed(quote, author_name, author_label, published, sort_order, published_at)
where not exists (
  select 1 from public.testimonials current_item
  where current_item.quote = seed.quote and current_item.author_name = seed.author_name
);

insert into public.team_members (
  name, role, description, member_type, image_url, image_alt, published, sort_order, published_at
)
select seed.*
from (values
  ('André Matos "Dedeco"', 'Fundador e Diretor Geral', null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1781817538/1_1_hv02q8.webp?_s=public-apps', 'Foto de André Matos Dedeco', true, 1, now()),
  ('Décio Simões', null, null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782582273/ef619f36-3ef9-4dd0-ae16-adced1b8bb79_ll06qh.webp', 'Foto de Décio Simões', true, 2, now()),
  ('Ariela Mesquita', null, null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782582273/678ecd31-e992-47dd-a000-46b1d67653ba_qvylbt.webp', 'Foto de Ariela Mesquita', true, 3, now()),
  ('Michel Mesquita', null, null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782582273/a75db0ec-e228-4d8f-b9f4-b3c2dae868cb_zj77ky.webp', 'Foto de Michel Mesquita', true, 4, now()),
  ('Carlos André', null, null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782582273/e5701f89-a6fe-4b42-a12a-7c8f3240596d_h87ect.webp', 'Foto de Carlos André', true, 5, now()),
  ('Silvio Murilo', null, null, 'equipe', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1782582272/92fbf70c-efd1-49f8-b1c8-f29a76a4506f_kpngs1.webp', 'Foto de Silvio Murilo', true, 6, now()),
  ('Zico', 'Referência do futebol brasileiro', 'Registro de Zico em conteúdo institucional da FlaMedula.', 'embaixador', 'https://res.cloudinary.com/dm9mnc97u/image/upload/v1781817539/3_txtuub.webp?_s=public-apps', 'Zico em registro institucional da FlaMedula', true, 100, now())
) as seed(name, role, description, member_type, image_url, image_alt, published, sort_order, published_at)
where not exists (
  select 1 from public.team_members current_item
  where current_item.name = seed.name and current_item.member_type is not distinct from seed.member_type
);

insert into public.faq_items (
  question, answer, category, published, sort_order, published_at
)
select seed.*
from (values
  ('A FlaMedula faz cadastro oficial no REDOME?', 'Não. A FlaMedula orienta e mobiliza. O cadastro oficial, a triagem e os processos de doação seguem pelos canais oficiais, como REDOME, hemocentros e equipes de saúde.', 'Cadastro', true, 1, now()),
  ('Medula óssea é medula espinhal?', 'Não. São coisas diferentes. Essa confusão aumenta o medo sem necessidade. A medula óssea fica dentro dos ossos.', 'Educação', true, 2, now()),
  ('Cadastro na FlaMedula já é doação?', 'Não. O cadastro na rede ajuda a organizar orientação, contato e campanhas. A doação depende dos canais oficiais e das etapas médicas.', 'Cadastro', true, 3, now()),
  ('Posso cadastrar um paciente?', 'Sim. Familiares, responsáveis, profissionais de saúde ou apoiadores podem sinalizar um caso para análise e possível orientação responsável.', 'Pacientes', true, 4, now()),
  ('Como posso apoiar financeiramente?', 'A landing principal direciona para a página Apoie, onde você informa os dados, copia o PIX e envia o comprovante pelo WhatsApp oficial.', 'Apoio', true, 5, now())
) as seed(question, answer, category, published, sort_order, published_at)
where not exists (
  select 1 from public.faq_items current_item where current_item.question = seed.question
);

insert into public.transparency_metrics (
  key, label, value, description, mode, published, sort_order, published_at
)
values
  ('doadores_cadastrados', 'Doadores cadastrados', 328, 'pessoas adicionadas à rede', 'number', true, 1, now()),
  ('interessados_medula', 'Interessados em medula', 146, 'querem receber orientação', 'number', true, 2, now()),
  ('atualizacoes_redome', 'Atualizações REDOME', 89, 'pessoas orientadas', 'number', true, 3, now()),
  ('casos_recebidos', 'Casos recebidos', 24, 'análise inicial', 'number', true, 4, now())
on conflict (key) do nothing;

insert into public.site_settings (key, value_json, description)
values
  ('official_whatsapp', jsonb_build_object('url', 'https://wa.me/558599280682', 'phone', '558599280682'), 'Destino oficial e bloqueado para CTAs editoriais.'),
  ('payment_mode', jsonb_build_object('mode', 'pix_qr_whatsapp', 'gateway_enabled', false), 'Mantém QR Code PIX e envio de comprovante pelo WhatsApp, sem gateway.')
on conflict (key) do update
set value_json = excluded.value_json,
    description = excluded.description,
    updated_at = now();

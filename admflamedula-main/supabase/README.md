# Supabase - Flamedula ADM

Esta pasta versiona a fundacao de banco para o ADM. Ela nao conecta a landing publica e nao usa `service_role` no frontend.

## Ordem das migrations

Execute no SQL Editor do Supabase ou via Supabase CLI, nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_views_and_indexes.sql`
4. `supabase/migrations/005_media_assets_and_cloudinary_links.sql`
5. `supabase/migrations/006_schema_reconciliation.sql`
6. `supabase/migrations/007_security_hardening.sql`
7. `supabase/migrations/008_public_content_expansion.sql`

O seed opcional foi separado em `supabase/seed.development.sql`. Ele usa apenas dados FIC ficticios e deve ser executado manualmente somente em desenvolvimento isolado; `db push` nao o aplica.

## Primeiro administrador

1. Crie o usuario no Supabase Auth.
2. Copie o UUID do usuario criado.
3. Rode o SQL abaixo substituindo somente o UUID e nome ficticios:

```sql
insert into public.admin_profiles (user_id, full_name, role, active)
values ('00000000-0000-0000-0000-000000000000', 'Primeiro Admin', 'super_admin', true);

insert into public.admin_app_access (user_id, app_code, access_role, active)
values ('00000000-0000-0000-0000-000000000000', 'cms', 'owner', true);
```

Roles suportadas:

- `super_admin`: gerencia administradores e configuracoes.
- `admin`: gerencia dados e conteudo.
- `operator`: atualiza status/notas operacionais.
- `viewer`: leitura administrativa.

## RLS

Todas as tabelas usam RLS.

- Dados privados (`donor_leads`, `patient_cases`, `support_leads`, `donation_intents`) nao possuem leitura publica.
- Conteudo publico permite `select` anonimo somente quando `published = true`.
- Escrita anonima para formularios publicos nao esta liberada nesta etapa.
- A funcao `public.is_active_admin()` valida que o usuario autenticado possui `admin_profiles.active = true`.
- O CMS tambem exige uma permissao ativa em `admin_app_access`; `owner` publica e exclui, `editor` publica e `viewer` apenas consulta.

## Cloudinary

O banco guarda apenas referencias:

- `image_url`
- `thumbnail_url`
- `cloudinary_public_id`
- textos alternativos e metadados

Upload administrativo usa a Edge Function `generate-cloudinary-signature`, que gera assinatura curta para upload direto no Cloudinary. Nao expor API secret no navegador.

Configure estes segredos somente no ambiente da Function:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET`
- `CLOUDINARY_ASSET_FOLDER=flamedula/site`
- `ALLOWED_ORIGINS`

## Cartao/pagamento

`donation_intents` nao possui campos de numero de cartao, CVV ou validade. Futuramente deve receber apenas referencia/token seguro do provedor de pagamento.

## Landing publica

O intake publico usa Edge Functions com:

- validacao de payload
- rate limit
- consentimento obrigatorio
- insert controlado no Supabase
- logs operacionais

As funcoes `submit-donor-lead`, `submit-patient-case` e
`submit-donation-intent` devem permanecer com verificacao JWT desativada, pois
recebem visitantes anonimos. A seguranca e feita por validacao, CORS, rate limit
e insercao com credencial somente no servidor.

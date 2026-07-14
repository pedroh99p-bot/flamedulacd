# Flamedula ADM

Dashboard administrativa do Flamedula em HTML, CSS e JavaScript puro.

## Stack

- HTML estatico: `index.html` e `login.html`
- CSS: `assets/css/styles.css`
- JavaScript ES Modules: `assets/js/*.js`
- Supabase Auth e Database
- Chart.js e Lucide via CDN

Nao ha React, Vite, Next.js ou build step obrigatorio nesta versao.

## Como rodar localmente

Por usar ES Modules, rode com um servidor estatico local:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000/login.html
```

Se Python nao estiver disponivel, use qualquer servidor estatico equivalente.

## Configuracao Supabase

O app le `window.FLAMEDULA_CONFIG` em `assets/js/config.js`.

Use `assets/js/config.example.js` como referencia:

```js
window.FLAMEDULA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_PROJECT_REF: "",
  SUPABASE_PUBLISHABLE_KEY: "",
  CLOUDINARY_CLOUD_NAME: ""
};
```

Tambem existe `.env.example` para ambientes que futuramente usem build tool:

```text
SUPABASE_URL=
SUPABASE_PROJECT_REF=
SUPABASE_PUBLISHABLE_KEY=
CLOUDINARY_CLOUD_NAME=
```

Nunca exponha `service_role` no frontend.

## Banco Supabase

As migrations versionadas ficam em `supabase/migrations` e incluem schema, RLS,
índices, auditoria, catálogo editorial, hardening, carga inicial, backup e
monitoramento operacional. Valide todas antes de publicar:

```bash
npm run test:migrations
```

Leia `supabase/README.md` antes de aplicar. O seed e opcional e somente para desenvolvimento.

## Primeiro administrador

1. Crie um usuario no Supabase Auth.
2. Copie o UUID.
3. Insira o perfil em `admin_profiles`:

```sql
insert into public.admin_profiles (user_id, full_name, role, active)
values ('00000000-0000-0000-0000-000000000000', 'Primeiro Admin', 'super_admin', true);

insert into public.admin_app_access (user_id, app_code, access_role, active)
values ('00000000-0000-0000-0000-000000000000', 'cms', 'owner', true);
```

O acesso exige `admin_profiles.active = true` e uma permissao ativa em
`admin_app_access` para o aplicativo `cms`.

## Services

A camada modular fica em `assets/js/services`:

- `authService.js`
- `dashboardService.js`
- `donorService.js`
- `patientService.js`
- `supportService.js`
- `contentService.js`
- `cloudinaryService.js`
- `operationalEventService.js`
- `supabaseService.js`

`assets/js/api.js` funciona como ponte de compatibilidade para a UI atual.

## Dados demo

`assets/js/demo-data.js` injeta dados FIC somente no front-end quando `Modo Demo/Teste` esta ativo.

Esses dados:

- nao sao salvos no Supabase
- nao podem ser editados/excluidos no banco
- servem para testar cards, graficos, filtros, ranking e mobilizacao operacional

## Landing pública

A landing consome o catálogo editorial do Supabase e mantém conteúdo local como
fallback. Os formulários usam Edge Functions com validação, CORS, rate limit e
inserção controlada. Falhas técnicas são encaminhadas para
`record-operational-event` sem incluir os dados enviados pelo usuário.

## Cloudinary

O upload administrativo usa a Edge Function:

```text
supabase/functions/generate-cloudinary-signature
```

Configure os segredos somente no ambiente da Function. Use `supabase/functions/.env.example` como referencia. Nunca exponha `CLOUDINARY_API_SECRET` no navegador ou no repositório.

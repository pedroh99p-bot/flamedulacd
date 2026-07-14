# FlaMedula — plataforma oficial

Este workspace reúne, sem modificar os arquivos ZIP originais, os dois projetos usados na modernização:

- `flamedulacd-main/`: site público e Edge Functions de captação.
- `admflamedula-main/`: dashboard administrativa e migrations do Supabase.

## Estado atual

O Supabase `gimugfooncsmyztjuull` é o ambiente oficial. O backend, as seis Edge
Functions, a landing e a dashboard estão integrados. O conteúdo inicial foi
migrado com backup, os CTAs apontam para o WhatsApp oficial e o painel registra
falhas operacionais sem armazenar dados sensíveis.

As migrations possuem validação automatizada, o acesso administrativo usa RLS e
RBAC e o Cloudinary mantém os segredos no servidor. Consulte
[`docs/staging-status.md`](docs/staging-status.md) para o estado de aceite e
[`docs/operations.md`](docs/operations.md) para a rotina de operação.

## Ambiente oficial

- Repositório: <https://github.com/pedroh99p-bot/flamedulacd>
- Site: <https://www.flamedula.org.br/>
- Dashboard: <https://www.flamedula.org.br/admin/login.html>

A branch `main` publica automaticamente o site e a dashboard no GitHub Pages.
O projeto também mantém a configuração de implantação da Vercel. Os dois
frontends usam o Supabase oficial.

## Validacao local

Landing:

```bash
cd flamedulacd-main
npm ci
npm run build
npm run dev
```

Dashboard e banco:

```bash
cd admflamedula-main
npm ci
npm run test:migrations
python -m http.server 8000
```

O script `npm run configure:admin:staging` promove um usuário Auth existente,
mas exige as variaveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_EMAIL` e `ADMIN_FULL_NAME`. A chave administrativa nunca deve ser salva
em arquivo ou enviada ao frontend.

Acesse `http://127.0.0.1:8000/login.html`. O arquivo
`assets/js/config.js` deste workspace aponta para o projeto oficial.

## Baseline preservado

| Origem | SHA-256 |
|---|---|
| `flamedulacd-main.zip` | `F6A499032F2CD9E64845A01EC4EF050758863DCD5E1D2AD8357E4DB479A78112` |
| `admflamedula-main (1).zip` | `C8A1DBA5172A4B252B97EDDB432828A89634B775F392A136270B9F431608BDD2` |
| `Anthropic-Cybersecurity-Skills-main (1).zip` | `CBB352D13F460D03106A9A87019291582870530B66C4129A1CAB6EE77955875B` |

## Regra de implantação

As migrations novas são deliberadamente idempotentes, mas **não devem ser aplicadas diretamente em produção**. O fluxo mínimo é:

1. exportar schema e dados do Supabase atual;
2. restaurar em um projeto local ou de staging;
3. executar todas as migrations em ordem;
4. validar a matriz de acesso e os formulários públicos;
5. registrar plano de rollback e somente então promover para produção.

Os documentos em `docs/security/` registram as decisões de segurança e privacidade desta fase.

## Segredos

- nunca versionar senha do banco, `service_role`, segredo do Cloudinary ou token
  do GitHub;
- chaves `sb_publishable_*` podem existir no frontend, pois sao publicas e a
  protecao de dados depende das politicas RLS;
- arquivos `.env`, artefatos do CLI, builds e dependencias locais sao ignorados
  pelo Git;
- os valores reais devem ser configurados no Supabase e na plataforma de deploy.

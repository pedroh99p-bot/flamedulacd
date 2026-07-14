# Status do ambiente oficial FlaMedula

Atualizado em 14 de julho de 2026.

## Ambiente oficial

- Supabase: projeto `gimugfooncsmyztjuull` (ambiente definitivo do produto);
- landing: `https://flamedula-platforms.vercel.app/`;
- dashboard: `https://flamedula-platforms.vercel.app/admin/login.html`;
- repositório: `https://github.com/luthguilherme-cyber/flamedula-platform`;
- pagamentos: Pix por QR Code e atendimento pelo WhatsApp, sem gateway externo.

## Banco e conteúdo

- migrations locais validadas em banco limpo;
- migrations oficiais registradas em `supabase_migrations.schema_migrations`;
- snapshot anterior à carga salvo em `private.content_migration_backups`;
- RLS e RBAC ativos;
- conteúdo inicial carregado sem apagar publicações existentes;
- CTAs editoriais direcionados ao WhatsApp oficial `https://wa.me/558599280682`;
- conteúdo oficial após a carga: 4 destaques, 7 ações, 5 mídias, 4 depoimentos,
  7 integrantes, 5 perguntas frequentes e 4 indicadores de transparência;
- a publicação preexistente com título `s` foi preservada.

## Operação e segurança

- Edge Function pública `record-operational-event` publicada com allowlist,
  limite de corpo, rate limit e sem armazenamento de dados sensíveis;
- painel administrativo exibe a saúde do sistema e falhas críticas não resolvidas;
- falhas técnicas dos formulários e do fluxo editorial são registradas em
  `public.operational_events`;
- eventos críticos podem ser enviados a um webhook por meio do segredo
  `ALERT_WEBHOOK_URL`;
- funções auxiliares do banco tiveram privilégios e `search_path` restringidos;
- teste automatizado da função de monitoramento retornou HTTP 202 e o evento de
  aceite foi marcado como resolvido;
- segredos do Cloudinary permanecem somente nas Edge Functions.

## Validações concluídas

- build de produção da landing e da dashboard;
- validação automatizada das 9 migrations;
- validação de sintaxe dos módulos JavaScript alterados;
- teste de escrita e resolução de evento operacional no Supabase oficial;
- contagem e integridade dos CTAs após a carga;
- modo de pagamento confirmado como `pix_qr_whatsapp`.

## Pendências externas

- apontar o domínio próprio para a Vercel;
- fornecer um destino de alertas (Slack, Teams, e-mail via webhook ou serviço
  equivalente) para configurar `ALERT_WEBHOOK_URL`;
- habilitar a proteção contra senhas vazadas no Supabase Auth caso o recurso
  esteja disponível no plano contratado;
- realizar um teste humano final com a pessoa que operará o painel.

Consulte [`operations.md`](operations.md) para o procedimento diário e resposta
a falhas.

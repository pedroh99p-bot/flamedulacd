# Checklist de implantacao das captacoes publicas

1. Aplicar `006_schema_reconciliation.sql` e `007_security_hardening.sql` somente em clone/staging.
2. Definir `RATE_LIMIT_SALT` com pelo menos 32 caracteres aleatorios nas Edge Functions.
3. Manter `RATE_LIMIT_FAIL_OPEN=false` (ou ausente) em producao.
4. Publicar as tres Edge Functions somente depois de a RPC `consume_intake_rate_limit` existir.
5. Confirmar que o frontend envia `amount` no modo `pre_pix` e nao envia CPF, e-mail tecnico ou dados de cartao.
6. Exercitar 5 envios de teste; o sexto deve retornar 429 com `Retry-After`.
7. Confirmar que `intake_rate_limits.key_hash` tem 64 caracteres e que nenhum IP bruto aparece no banco ou nos logs.
8. Confirmar que `v_public_media_assets` responde para `anon` e que `v_media_assets_library` continua restrita a usuários autenticados.
9. Executar um envio valido de cada formulario e revisar os campos de consentimento, origem e valor pretendido.
10. Agendar `prune_intake_rate_limits()` diariamente via mecanismo aprovado no projeto.

Rollback: manter a versão anterior das Edge Functions pronta para republicação. As migrations são aditivas; não remover colunas durante rollback. Revogar o acesso às funções novas somente se as Edge Functions antigas já estiverem restauradas.

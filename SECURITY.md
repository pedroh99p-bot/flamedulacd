# Seguranca

## Dados sensiveis

Nao abra uma issue publica com dados de pacientes, doadores, credenciais,
capturas do painel ou detalhes de vulnerabilidades exploraveis. Use um canal
privado definido pelos mantenedores do repositorio.

## Controles principais

- Supabase RLS em todas as tabelas;
- RBAC global e permissao separada para o CMS;
- Edge Functions para toda escrita publica;
- validacao, sanitizacao, consentimento, CORS e rate limit;
- segredos apenas no backend;
- auditoria automatica de operacoes editoriais.

O modelo de ameacas, a avaliacao de privacidade e a matriz de acesso estao em
[`docs/security`](docs/security).

## Producao

Alteracoes de schema devem passar por staging, backup verificavel e ensaio de
rollback. Testes destrutivos e tentativas de bypass nao devem ser executados no
ambiente de producao.

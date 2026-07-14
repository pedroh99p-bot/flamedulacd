# Avaliação de impacto à privacidade (PIA)

Documento técnico inicial; a base legal e os prazos finais precisam de validação jurídica/encarregado de dados.

## Inventário mínimo

| Processo | Dados | Finalidade declarada | Terceiros | Retenção proposta |
|---|---|---|---|---|
| Rede de doadores | nome, telefone, e-mail opcional, cidade/UF, interesses, consentimento | contato e mobilização | Supabase; canal de contato escolhido | 24 meses após último contato ou revogação |
| Caso de paciente | responsável, telefone/e-mail, relação, identificador do paciente, hospital e contexto | analisar e apoiar mobilização autorizada | Supabase | revisão a cada 90 dias; encerrar/anonimizar após a finalidade |
| Intenção de apoio | nome, telefone, valor pretendido, aceites | orientar PIX e confirmar contribuição | Supabase; WhatsApp por ação do usuário | 12 meses se não confirmada; regra fiscal própria após confirmação |
| Conteúdo/mídia | conteúdo editorial, autoria administrativa e URLs | publicação institucional | Supabase e Cloudinary | enquanto publicado + histórico definido |
| Auditoria | usuário, ação, entidade, antes/depois editorial | segurança e responsabilização | Supabase | 12 meses, salvo obrigação diferente |
| Rate limit | hash salgado de IP/cliente, endpoint e contagem | prevenção de abuso | Supabase | expiração automática curta; limpeza diária |

## Decisões aplicadas

- não criar CPF ou e-mail sintético;
- não receber dados de cartão, CVV, senha ou token de pagamento;
- gravar o valor pretendido separadamente de valor efetivamente pago;
- não incluir cadastros pessoais completos nos logs editoriais;
- armazenar somente hash salgado no rate limit, nunca o IP bruto;
- manter `consent_at` registrado pelo servidor;
- negar acesso por padrão e separar CMS de dados operacionais.

## Pendências obrigatórias antes de produção

1. confirmar controlador, operador, encarregado e canal de direitos do titular;
2. aprovar base legal por finalidade e textos de consentimento;
3. definir processo de acesso, correção, revogação, anonimização e exclusão;
4. documentar transferência e retenção no Supabase, Cloudinary e WhatsApp;
5. criar job de retenção com modo de simulação e relatório antes de apagar;
6. definir resposta a incidentes e prazo de notificação;
7. decidir como tratar registros legados com CPF/e-mail sintéticos sem confundi-los com dados reais.

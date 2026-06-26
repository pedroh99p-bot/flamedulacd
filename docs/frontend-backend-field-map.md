# Mapa de campos frontend/backend

Este mapa cobre apenas os formularios publicos. Fluxos administrativos nao foram alterados.

## Pagina principal - cadastro de doador

Endpoint: `submit-donor-lead`

Tabela: `donor_leads`

| Campo visual | `name`/origem no frontend | Campo no payload | Coluna Supabase |
| --- | --- | --- | --- |
| Nome | `nome` | `nome` | `nome` |
| Telefone/WhatsApp | `telefone` | `telefone` | `telefone` |
| E-mail | `email` | `email` | `email` |
| Cidade | `cidade` | `cidade` | `cidade` |
| Estado | `estado` | `estado` | `estado` |
| Doacao de sangue | `blood_donor_status` | `blood_donor_status` | `blood_donor_status` |
| Cadastro REDOME | `redome_status` | `redome_status` | `redome_status` |
| Interesse em medula | `medula_interest` | `medula_interest` | `medula_interest` |
| Preferencia de contato | `contact_preference` | `contact_preference` | `contact_preference` |
| Consentimento LGPD | `consent_lgpd` | `consent_lgpd` | `consent_lgpd` |
| Atualizacoes | `consent_updates` | `consent_updates` | `consent_updates` |
| Honeypot invisivel | `website` | `website` | nao grava quando preenchido |
| Origem publica | valor fixo no builder | `source` | `origem` |
| Secao publica | valor fixo no builder | `source_section` | `source_section` |
| Status | backend | nao enviado pelo frontend | `status = novo` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |

Campos como `idade`, `peso` e `tipo_sanguineo` nao entram no fluxo publico de doadores porque nao existem no schema real de `donor_leads`.

## Pagina principal - pedido/apoio a paciente

Endpoint: `submit-patient-case`

Tabela: `patient_cases`

| Campo visual | `name`/origem no frontend | Campo no payload | Coluna Supabase |
| --- | --- | --- | --- |
| Nome do responsavel | `requester_name` | `requester_name` | `requester_name` |
| Telefone/WhatsApp | `requester_phone` | `requester_phone` | `requester_phone` |
| E-mail | `requester_email` | `requester_email` | `requester_email` |
| Relacao com paciente | `relation_to_patient` | `relation_to_patient` | `relation_to_patient` |
| Identificacao do paciente | `patient_identifier` | `patient_identifier` | `patient_identifier` |
| Cidade | `cidade` | `cidade` | `cidade` |
| Estado | `estado` | `estado` | `estado` |
| Hospital | `hospital` | `hospital` | `hospital` |
| Tipo de necessidade | `need_type` | `need_type` | `need_type` |
| Urgencia | legado opcional | `urgency_level` | `urgency_level` |
| Contexto da campanha | `campaign_context` | `campaign_context` | `campaign_context` |
| Autorizacao de contato | `consent_authorized` | `consent_authorized` | `consent_authorized` |
| Honeypot invisivel | `website` | `website` | nao grava quando preenchido |
| Origem publica | valor fixo no builder | `source` | `origem` |
| Secao publica | valor fixo no builder | `source_section` | `source_section` |
| Status | backend | nao enviado pelo frontend | `status = novo` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |

O formulario publico de pacientes nao envia `urgency_level` por padrao. O endpoint ainda aceita esse campo apenas para compatibilidade legada, e nao existe suporte real para `tipo_sanguineo` no schema auditado.

## Pagina `/apoie/` - intencao de apoio financeiro

Endpoint: `submit-donation-intent`

Tabela: `donation_intents`

| Campo visual | `name`/origem no frontend | Campo no payload | Coluna Supabase |
| --- | --- | --- | --- |
| Modo de submissao | valor fixo no builder | `submission_mode = pre_pix` | nao grava |
| Tipo de doador | backend | nao enviado no modo `pre_pix` | `donor_type = pessoa_fisica` |
| Nome | `name` | `name` | `name` |
| Razao social | backend | nao enviado no modo `pre_pix` | `company_name = null` |
| Responsavel | backend | nao enviado no modo `pre_pix` | `responsible_name = null` |
| Tipo de documento | backend | nao enviado no modo `pre_pix` | `document_type = cpf` |
| CPF/CNPJ | backend | nao enviado no modo `pre_pix` | CPF sintetico valido |
| E-mail | backend | nao enviado no modo `pre_pix` | e-mail tecnico `prepix+...@flamedula.invalid` |
| Telefone/WhatsApp | `phone` | `phone` | `phone` |
| Data de nascimento | backend | nao enviado no modo `pre_pix` | `birth_date = null` |
| Preferencia de contato | backend | nao enviado no modo `pre_pix` | `contact_preference = whatsapp` |
| Forma de pagamento | backend | nao enviado no modo `pre_pix` | `payment_method = pix` |
| Tipo de doacao | backend | nao enviado no modo `pre_pix` | `donation_type = single` |
| Dia de vencimento | backend | nao enviado no modo `pre_pix` | `due_day = null` |
| Recorrencia | backend | nao enviado no modo `pre_pix` | `recurrence_period = null` |
| Valor pretendido | `amount_display` | nao enviado ao backend | fica apenas no estado da pagina |
| Valor schema | backend | nao enviado no modo `pre_pix` | `amount = 1` como placeholder tecnico |
| Valor personalizado | backend | nao enviado no modo `pre_pix` | `custom_amount = null` |
| Privacidade | `privacy_accepted` | `privacy_accepted` | `privacy_accepted` |
| Termos | `terms_accepted` | `terms_accepted` | `terms_accepted` |
| Honeypot invisivel | `website` | `website` | nao grava quando preenchido |
| Origem publica | valor fixo no builder | `source` | `source = apoie_page` |
| Secao publica | valor fixo no builder | `source_section` | registrada em `internal_notes` |
| Status | backend | nao enviado pelo frontend | `status = pending_payment_setup` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |
| Provedor de pagamento | backend | nao enviado pelo frontend | `provider_name = null` |
| Referencia do provedor | backend | nao enviado pelo frontend | `provider_reference = null` |

O modo publico `pre_pix` envia apenas cadastro minimo ao Supabase. O valor pretendido nao vai para o ADM; aparece somente como resumo local antes do usuario copiar o PIX e enviar o comprovante pelo WhatsApp oficial.

## Dados sensiveis de pagamento

O formulario publico nao possui campos de numero de cartao, CVV, validade ou senha. A Edge Function `submit-donation-intent` tambem rejeita qualquer payload que tente enviar esses campos.

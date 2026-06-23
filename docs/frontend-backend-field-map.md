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
| Origem publica | valor fixo no builder | `origem` | `origem` |
| Secao publica | valor fixo no builder | `source_section` | `source_section` |
| Status | backend | nao enviado pelo frontend | `status = novo` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |

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
| Urgencia | `urgency_level` | `urgency_level` | `urgency_level` |
| Contexto da campanha | `campaign_context` | `campaign_context` | `campaign_context` |
| Autorizacao de contato | `consent_authorized` | `consent_authorized` | `consent_authorized` |
| Honeypot invisivel | `website` | `website` | nao grava quando preenchido |
| Origem publica | valor fixo no builder | `origem` | `origem` |
| Secao publica | valor fixo no builder | `source_section` | `source_section` |
| Status | backend | nao enviado pelo frontend | `status = novo` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |

## Pagina `/apoie/` - intencao de apoio financeiro

Endpoint: `submit-donation-intent`

Tabela: `donation_intents`

| Campo visual | `name`/origem no frontend | Campo no payload | Coluna Supabase |
| --- | --- | --- | --- |
| Tipo de doador | `donor_type` | `donor_type` | `donor_type` |
| Nome | `name` | `name` | `name` |
| Razao social | `company_name` | `company_name` | `company_name` |
| Responsavel | `responsible_name` | `responsible_name` | `responsible_name` |
| Tipo de documento | derivado de `donor_type` | `document_type` | `document_type` |
| CPF/CNPJ | `cpf` ou `cnpj` | `document` | `document` |
| E-mail | `email` | `email` | `email` |
| Telefone/WhatsApp | `phone` | `phone` | `phone` |
| Data de nascimento | `birth_date` | `birth_date` | `birth_date` |
| Preferencia de contato | `contact_preference` | `contact_preference` | `contact_preference` |
| Forma de pagamento | `payment_method` | `payment_method` | `payment_method` |
| Tipo de doacao | `donation_type` | `donation_type` | `donation_type` |
| Dia de vencimento | `due_day` | `due_day` | `due_day` |
| Recorrencia | `recurrence_period` | `recurrence_period` | `recurrence_period` |
| Valor escolhido | `amount` | `amount` | `amount` |
| Valor personalizado | `custom_amount` | `custom_amount` | `custom_amount` |
| Privacidade | `privacy_accepted` | `privacy_accepted` | `privacy_accepted` |
| Termos | `terms_accepted` | `terms_accepted` | `terms_accepted` |
| Honeypot invisivel | `website` | `website` | nao grava quando preenchido |
| Origem publica | valor fixo no builder | `source` | `source = apoie_page` |
| Status | backend | nao enviado pelo frontend | `status = pending_payment_setup` |
| Data de consentimento | backend | nao enviado pelo frontend | `consent_at` |
| Marcador de teste | backend | nao enviado pelo frontend | `is_test = false` |
| Provedor de pagamento | backend | nao enviado pelo frontend | `provider_name = null` |
| Referencia do provedor | backend | nao enviado pelo frontend | `provider_reference = null` |

## Dados sensiveis de pagamento

O formulario publico nao possui campos de numero de cartao, CVV, validade ou senha. A Edge Function `submit-donation-intent` tambem rejeita qualquer payload que tente enviar esses campos.

# Contrato dos formularios publicos FlaMedula

Este documento descreve os endpoints publicos usados pelos formularios da landing page e da pagina `/apoie/`.

## Configuracao publica do frontend

- `SUPABASE_URL`: `https://dkaajnppslypktcgfeow.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY`: chave publica `sb_publishable_*`
- `FUNCTIONS_BASE_URL`: `https://dkaajnppslypktcgfeow.supabase.co/functions/v1`

As chaves administrativas ficam exclusivamente no ambiente hospedado das Edge Functions. O helper usa `SUPABASE_SECRET_KEYS.default` e aceita `SUPABASE_SERVICE_ROLE_KEY` apenas como fallback legado. Nenhuma chave segura deve ser exposta no frontend, em `.env` publico, no repositorio ou em logs.

## Regras comuns

- Metodo: `POST`.
- Content-Type: `application/json`.
- Header publico: `apikey: SUPABASE_PUBLISHABLE_KEY`.
- Resposta de sucesso: `201` com `{ "success": true, "message": "...", "data": { "submissionId": "...", "submittedAt": "..." } }`.
- Erro de validacao: `400` com `{ "success": false, "code": "VALIDATION_ERROR", "message": "...", "fieldErrors": {} }`.
- Consentimento ausente: `400` com `code: "CONSENT_REQUIRED"`.
- JSON invalido ou payload nao objeto: `400` com `code: "INVALID_JSON"`.
- Payload acima de 20 KB: `413` com `code: "PAYLOAD_TOO_LARGE"`.
- Origem nao permitida por CORS: `403` com `code: "ORIGIN_NOT_ALLOWED"`.
- Falha de banco: `500` com `code: "DATABASE_ERROR"`.
- Honeypot preenchido (`website`) retorna sucesso generico e nao grava registro.
- Duplicidade em janela curta de 45 segundos retorna sucesso com o registro existente.
- Campos administrativos (`status`, `id`, `created_at`, `updated_at`, `internal_notes`, `is_test`, etc.) sao recusados quando enviados pelo cliente.

## CORS

As functions usam allowlist exata. O ambiente deve definir `ALLOWED_ORIGINS` com a lista separada por virgula.

Origens padrao para desenvolvimento e publicacao atual:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `https://flamedulacd.vercel.app`

## `submit-donor-lead`

Endpoint: `/submit-donor-lead`

Tabela: `donor_leads`

Campos aceitos:

- `nome` obrigatorio, string.
- `telefone` obrigatorio, 10 ou 11 digitos.
- `email` opcional, email valido quando preenchido.
- `cidade` opcional.
- `estado` opcional, UF com 2 letras.
- `blood_donor_status`: `ja_doador`, `quero_comecar`, `quero_entender`.
- `redome_status`: `sim`, `nao`, `nao_tenho_certeza`.
- `medula_interest`: `ja_cadastrado_redome`, `sim_tenho_interesse`, `quero_entender_melhor`, `nao_neste_momento` ou `null`.
- `contact_preference`: `email`, `whatsapp`, `telefone`.
- `consent_lgpd` obrigatorio como `true`.
- `consent_updates` opcional booleano.
- `origem`, `source_section` e `website`.

Campos forcados no backend:

- `origem`: `pagina_principal`
- `source_section`: `hub_cadastro_doador`
- `status`: `novo`
- `consent_at`: data/hora do servidor
- `is_test`: `false`

## `submit-patient-case`

Endpoint: `/submit-patient-case`

Tabela: `patient_cases`

Campos aceitos:

- `requester_name` obrigatorio.
- `requester_phone` obrigatorio, 10 ou 11 digitos.
- `requester_email` opcional, email valido quando preenchido.
- `relation_to_patient` opcional.
- `patient_identifier` opcional.
- `cidade` opcional.
- `estado` opcional, UF com 2 letras.
- `hospital` opcional.
- `need_type`: `doacao_sangue`, `cadastro_medula`, `divulgacao`, `orientacao`, `outro`.
- `urgency_level`: `baixa`, `media`, `alta`, `urgente`.
- `campaign_context` opcional, ate 1200 caracteres.
- `consent_authorized` obrigatorio como `true`.
- `origem`, `source_section` e `website`.

Campos forcados no backend:

- `origem`: `pagina_principal`
- `source_section`: `hub_cadastro_paciente`
- `status`: `novo`
- `consent_at`: data/hora do servidor
- `is_test`: `false`

## `submit-donation-intent`

Endpoint: `/submit-donation-intent`

Tabela: `donation_intents`

Campos aceitos:

- `donor_type`: `pessoa_fisica` ou `pessoa_juridica`.
- `name`: obrigatorio para pessoa fisica.
- `company_name`: obrigatorio para pessoa juridica.
- `responsible_name`: obrigatorio para pessoa juridica.
- `document_type`: `cpf` ou `cnpj`.
- `document`: CPF/CNPJ valido, somente digitos apos normalizacao.
- `email` obrigatorio e valido.
- `phone` obrigatorio, 10 ou 11 digitos.
- `birth_date` opcional em `YYYY-MM-DD`.
- `contact_preference`: `email`, `whatsapp`, `telefone`.
- `payment_method`: `pix` ou `credit_card`.
- `donation_type`: `monthly` ou `single`.
- `due_day`: inteiro de 1 a 28 quando `monthly`.
- `recurrence_period`: `6_months`, `12_months`, `indefinite` quando `monthly`.
- `amount`: numero maior que zero.
- `custom_amount`: numero ou `null`.
- `privacy_accepted` obrigatorio como `true`.
- `terms_accepted` obrigatorio como `true`.
- `source` e `website`.

Campos forcados no backend:

- `source`: `apoie_page`
- `status`: `pending_payment_setup`
- `consent_at`: data/hora do servidor
- `is_test`: `false`
- `provider_name`: `null`
- `provider_reference`: `null`

Campos explicitamente proibidos:

- Numero de cartao, CVV, validade, senha, token, segredo e campos equivalentes.
- Qualquer campo administrativo ou de provedor de pagamento.

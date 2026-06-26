import { handleCors } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/responses.ts";
import { cleanEmail, cleanState, cleanString, hasForbiddenKeys, hasUnknownKeys, onlyDigits } from "../_shared/sanitize.ts";
import { ADMIN_FIELDS, isValidEmail, isValidPhone, logResult, readJsonPayload } from "../_shared/validation.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const FUNCTION_NAME = "submit-donor-lead";
const ALLOWED_FIELDS = [
  "nome",
  "telefone",
  "email",
  "cidade",
  "estado",
  "blood_donor_status",
  "redome_status",
  "medula_interest",
  "contact_preference",
  "consent_lgpd",
  "consent_updates",
  "source",
  "origem",
  "source_section",
  "website",
];

const DONOR_STATUS = ["ja_doador", "quero_comecar", "quero_entender"];
const REDOME_STATUS = ["sim", "nao", "nao_tenho_certeza"];
const MEDULA_INTEREST = ["ja_cadastrado_redome", "sim_tenho_interesse", "quero_entender_melhor", "nao_neste_momento", null];
const CONTACT = ["email", "whatsapp", "telefone"];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors.response) return cors.response;
  const headers = cors.headers;

  const { payload, response } = await readJsonPayload(req, headers);
  if (response) return response;

  const forbidden = hasForbiddenKeys(payload, ADMIN_FIELDS);
  if (forbidden) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, { [forbidden]: "Campo não permitido." }, headers);

  const unknown = hasUnknownKeys(payload, ALLOWED_FIELDS);
  if (unknown.length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, Object.fromEntries(unknown.map((key) => [key, "Campo não permitido."])), headers);

  if (cleanString(payload.website, 100)) {
    return successResponse({ submissionId: crypto.randomUUID(), submittedAt: new Date().toISOString() }, headers);
  }

  const row = {
    nome: cleanString(payload.nome, 160),
    telefone: onlyDigits(payload.telefone),
    email: cleanEmail(payload.email),
    cidade: cleanString(payload.cidade, 120),
    estado: cleanState(payload.estado),
    blood_donor_status: cleanString(payload.blood_donor_status, 60),
    redome_status: cleanString(payload.redome_status, 60),
    medula_interest: cleanString(payload.medula_interest, 80),
    contact_preference: cleanString(payload.contact_preference, 30),
    consent_lgpd: payload.consent_lgpd === true,
    consent_updates: payload.consent_updates === true,
    origem: cleanString(payload.source, 80) || cleanString(payload.origem, 80) || "pagina_principal",
    source_section: cleanString(payload.source_section, 80) || "hub_cadastro_doador",
    status: "novo",
    consent_at: new Date().toISOString(),
    is_test: false,
  };

  const fieldErrors: Record<string, string> = {};
  if (!row.nome) fieldErrors.nome = "Informe o nome.";
  if (!isValidPhone(row.telefone)) fieldErrors.telefone = "Informe um telefone válido.";
  if (row.email && !isValidEmail(row.email)) fieldErrors.email = "Informe um e-mail válido.";
  if (row.blood_donor_status && !DONOR_STATUS.includes(row.blood_donor_status)) fieldErrors.blood_donor_status = "Valor inválido.";
  if (row.redome_status && !REDOME_STATUS.includes(row.redome_status)) fieldErrors.redome_status = "Valor inválido.";
  if (!MEDULA_INTEREST.includes(row.medula_interest)) fieldErrors.medula_interest = "Valor inválido.";
  if (row.contact_preference && !CONTACT.includes(row.contact_preference)) fieldErrors.contact_preference = "Valor inválido.";

  if (payload.consent_lgpd !== true) {
    return errorResponse("CONSENT_REQUIRED", "É necessário autorizar o contato.", 400, { consent_lgpd: "Consentimento obrigatório." }, headers);
  }

  if (Object.keys(fieldErrors).length) {
    return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, fieldErrors, headers);
  }

  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - 45_000).toISOString();
  const duplicate = await supabase
    .from("donor_leads")
    .select("id, created_at")
    .or(`telefone.eq.${row.telefone}${row.email ? `,email.eq.${row.email}` : ""}`)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (duplicate.data?.id) {
    logResult(FUNCTION_NAME, 201, "DUPLICATE_SUBMISSION", duplicate.data.id);
    return successResponse({ submissionId: duplicate.data.id, submittedAt: duplicate.data.created_at }, headers);
  }

  const { data, error } = await supabase
    .from("donor_leads")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    logResult(FUNCTION_NAME, 500, "DATABASE_ERROR");
    return errorResponse("DATABASE_ERROR", "Não foi possível salvar o cadastro agora.", 500, {}, headers);
  }

  logResult(FUNCTION_NAME, 201, "OK", data.id);
  return successResponse({ submissionId: data.id, submittedAt: data.created_at }, headers);
});

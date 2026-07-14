import { handleCors } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/responses.ts";
import { cleanEmail, cleanState, cleanString, hasForbiddenKeys, hasUnknownKeys, onlyDigits } from "../_shared/sanitize.ts";
import { ADMIN_FIELDS, isValidEmail, isValidPhone, logResult, readJsonPayload } from "../_shared/validation.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const FUNCTION_NAME = "submit-patient-case";
const ALLOWED_FIELDS = [
  "requester_name",
  "requester_phone",
  "requester_email",
  "relation_to_patient",
  "patient_identifier",
  "cidade",
  "estado",
  "hospital",
  "need_type",
  "urgency_level",
  "campaign_context",
  "consent_authorized",
  "source",
  "origem",
  "source_section",
  "website",
];
const NEED_TYPES = ["doacao_sangue", "cadastro_medula", "divulgacao", "orientacao", "outro"];
const URGENCY = ["baixa", "media", "alta", "urgente"];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors.response) return cors.response;
  let headers = cors.headers;
  const supabase = createSupabaseAdmin();
  const rateLimit = await enforceRateLimit(req, supabase, {
    endpoint: FUNCTION_NAME,
    limit: 5,
    windowSeconds: 600,
  }, headers);
  headers = rateLimit.headers;
  if (rateLimit.response) return rateLimit.response;

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
    requester_name: cleanString(payload.requester_name, 160),
    requester_phone: onlyDigits(payload.requester_phone),
    requester_email: cleanEmail(payload.requester_email),
    relation_to_patient: cleanString(payload.relation_to_patient, 100),
    patient_identifier: cleanString(payload.patient_identifier, 120),
    cidade: cleanString(payload.cidade, 120),
    estado: cleanState(payload.estado),
    hospital: cleanString(payload.hospital, 160),
    need_type: cleanString(payload.need_type, 60),
    urgency_level: cleanString(payload.urgency_level, 40),
    campaign_context: cleanString(payload.campaign_context, 1200),
    consent_authorized: payload.consent_authorized === true,
    origem: cleanString(payload.source, 80) || cleanString(payload.origem, 80) || "pagina_principal",
    source_section: cleanString(payload.source_section, 80) || "hub_cadastro_paciente",
    status: "novo",
    consent_at: new Date().toISOString(),
    is_test: false,
  };

  const fieldErrors: Record<string, string> = {};
  if (!row.requester_name) fieldErrors.requester_name = "Informe o nome do responsável.";
  if (!isValidPhone(row.requester_phone)) fieldErrors.requester_phone = "Informe um telefone válido.";
  if (row.requester_email && !isValidEmail(row.requester_email)) fieldErrors.requester_email = "Informe um e-mail válido.";
  if (row.need_type && !NEED_TYPES.includes(row.need_type)) fieldErrors.need_type = "Valor inválido.";
  if (row.urgency_level && !URGENCY.includes(row.urgency_level)) fieldErrors.urgency_level = "Valor inválido.";
  if (row.campaign_context && row.campaign_context.length > 1200) fieldErrors.campaign_context = "Texto acima do limite.";

  if (payload.consent_authorized !== true) {
    return errorResponse("CONSENT_REQUIRED", "É necessário autorizar o contato.", 400, { consent_authorized: "Consentimento obrigatório." }, headers);
  }
  if (Object.keys(fieldErrors).length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, fieldErrors, headers);

  const since = new Date(Date.now() - 45_000).toISOString();
  const duplicate = await supabase
    .from("patient_cases")
    .select("id, created_at")
    .or(`requester_phone.eq.${row.requester_phone}${row.requester_email ? `,requester_email.eq.${row.requester_email}` : ""}`)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (duplicate.data?.id) {
    logResult(FUNCTION_NAME, 201, "DUPLICATE_SUBMISSION", duplicate.data.id);
    return successResponse({ submissionId: duplicate.data.id, submittedAt: duplicate.data.created_at }, headers);
  }

  const { data, error } = await supabase
    .from("patient_cases")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    logResult(FUNCTION_NAME, 500, "DATABASE_ERROR");
    return errorResponse("DATABASE_ERROR", "Não foi possível salvar as informações agora.", 500, {}, headers);
  }
  logResult(FUNCTION_NAME, 201, "OK", data.id);
  return successResponse({ submissionId: data.id, submittedAt: data.created_at }, headers);
});

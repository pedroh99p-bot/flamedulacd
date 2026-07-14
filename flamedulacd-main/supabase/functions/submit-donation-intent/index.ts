import { handleCors } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/responses.ts";
import { cleanEmail, cleanString, hasForbiddenKeys, hasUnknownKeys, onlyDigits } from "../_shared/sanitize.ts";
import { ADMIN_FIELDS, isValidCnpj, isValidCpf, isValidEmail, isValidPhone, logResult, readJsonPayload, SENSITIVE_PAYMENT_FIELDS } from "../_shared/validation.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const FUNCTION_NAME = "submit-donation-intent";
const PRE_PIX_MODE = "pre_pix";
const PRE_PIX_STATUS = "pending_payment_setup";
const PRE_PIX_SOURCE_SECTION = "support_page";
const ALLOWED_FIELDS = [
  "submission_mode",
  "donor_type",
  "name",
  "company_name",
  "responsible_name",
  "document_type",
  "document",
  "email",
  "phone",
  "birth_date",
  "contact_preference",
  "payment_method",
  "donation_type",
  "due_day",
  "recurrence_period",
  "amount",
  "custom_amount",
  "privacy_accepted",
  "terms_accepted",
  "source",
  "source_section",
  "website",
];
const DONOR_TYPES = ["pessoa_fisica", "pessoa_juridica"];
const DOCUMENT_TYPES = ["cpf", "cnpj"];
const CONTACT = ["email", "whatsapp", "telefone"];
const PAYMENT = ["pix", "credit_card"];
const DONATION = ["monthly", "single"];
const RECURRENCE = ["6_months", "12_months", "indefinite"];

function buildSuccessPayload(data: { id: string; created_at: string }, isPrePix: boolean) {
  if (!isPrePix) {
    return { submissionId: data.id, submittedAt: data.created_at };
  }

  return {
    submissionId: data.id,
    submittedAt: data.created_at,
    status: PRE_PIX_STATUS,
    nextStep: "pix",
  };
}

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

  const sensitive = hasForbiddenKeys(payload, SENSITIVE_PAYMENT_FIELDS);
  if (sensitive) return errorResponse("SENSITIVE_PAYMENT_DATA", "Dados sensiveis de pagamento nao devem ser enviados.", 400, { [sensitive]: "Campo proibido." }, headers);
  const forbidden = hasForbiddenKeys(payload, [...ADMIN_FIELDS, "provider_name", "provider_reference"]);
  if (forbidden) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, { [forbidden]: "Campo nao permitido." }, headers);
  const unknown = hasUnknownKeys(payload, ALLOWED_FIELDS);
  if (unknown.length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, Object.fromEntries(unknown.map((key) => [key, "Campo nao permitido."])), headers);
  if (cleanString(payload.website, 100)) {
    return successResponse({ submissionId: crypto.randomUUID(), submittedAt: new Date().toISOString() }, headers);
  }

  const submissionMode = cleanString(payload.submission_mode, 30);
  const isPrePix = submissionMode === PRE_PIX_MODE;
  const row = isPrePix
    ? {
      submission_mode: PRE_PIX_MODE,
      donor_type: "pessoa_fisica",
      name: cleanString(payload.name, 160),
      company_name: null,
      responsible_name: null,
      document_type: null,
      document: null,
      email: null,
      phone: onlyDigits(payload.phone),
      birth_date: null,
      contact_preference: "whatsapp",
      payment_method: "pix",
      donation_type: "single",
      due_day: null,
      recurrence_period: null,
      amount: null,
      intended_amount: Number(payload.amount),
      custom_amount: null,
      privacy_accepted: payload.privacy_accepted === true,
      terms_accepted: payload.terms_accepted === true,
      source: "apoie_page",
      source_section: cleanString(payload.source_section, 80) || PRE_PIX_SOURCE_SECTION,
      status: PRE_PIX_STATUS,
      consent_at: new Date().toISOString(),
      is_test: false,
      provider_name: null,
      provider_reference: null,
      internal_notes: null,
    }
    : {
      submission_mode: "full",
      donor_type: cleanString(payload.donor_type, 30),
      name: cleanString(payload.name, 160),
      company_name: cleanString(payload.company_name, 180),
      responsible_name: cleanString(payload.responsible_name, 160),
      document_type: cleanString(payload.document_type, 10),
      document: onlyDigits(payload.document),
      email: cleanEmail(payload.email),
      phone: onlyDigits(payload.phone),
      birth_date: cleanString(payload.birth_date, 10),
      contact_preference: cleanString(payload.contact_preference, 30),
      payment_method: cleanString(payload.payment_method, 40),
      donation_type: cleanString(payload.donation_type, 30),
      due_day: payload.due_day === null || payload.due_day === undefined ? null : Number(payload.due_day),
      recurrence_period: cleanString(payload.recurrence_period, 40),
      amount: Number(payload.amount),
      intended_amount: Number(payload.amount),
      custom_amount: payload.custom_amount === null || payload.custom_amount === undefined ? null : Number(payload.custom_amount),
      privacy_accepted: payload.privacy_accepted === true,
      terms_accepted: payload.terms_accepted === true,
      source: "apoie_page",
      source_section: cleanString(payload.source_section, 80) || PRE_PIX_SOURCE_SECTION,
      status: PRE_PIX_STATUS,
      consent_at: new Date().toISOString(),
      is_test: false,
      provider_name: null,
      provider_reference: null,
      internal_notes: null,
    };

  const fieldErrors: Record<string, string> = {};
  if (payload.submission_mode !== undefined && !isPrePix) fieldErrors.submission_mode = "Valor invalido.";

  if (payload.privacy_accepted !== true || payload.terms_accepted !== true) {
    return errorResponse("CONSENT_REQUIRED", "E necessario aceitar os termos para continuar.", 400, {
      privacy_accepted: payload.privacy_accepted === true ? "" : "Aceite obrigatorio.",
      terms_accepted: payload.terms_accepted === true ? "" : "Aceite obrigatorio.",
    }, headers);
  }

  if (isPrePix) {
    if (!row.name) fieldErrors.name = "Informe o nome.";
    if (!isValidPhone(row.phone)) fieldErrors.phone = "Informe um telefone valido.";
    if (!Number.isFinite(row.intended_amount) || row.intended_amount <= 0 || row.intended_amount > 1_000_000) {
      fieldErrors.amount = "Informe um valor valido.";
    }
  } else {
    if (!DONOR_TYPES.includes(row.donor_type || "")) fieldErrors.donor_type = "Valor invalido.";
    if (!DOCUMENT_TYPES.includes(row.document_type || "")) fieldErrors.document_type = "Valor invalido.";
    if (!row.email || !isValidEmail(row.email)) fieldErrors.email = "Informe um e-mail valido.";
    if (!isValidPhone(row.phone)) fieldErrors.phone = "Informe um telefone valido.";
    if (row.contact_preference && !CONTACT.includes(row.contact_preference)) fieldErrors.contact_preference = "Valor invalido.";
    if (!PAYMENT.includes(row.payment_method || "")) fieldErrors.payment_method = "Valor invalido.";
    if (!DONATION.includes(row.donation_type || "")) fieldErrors.donation_type = "Valor invalido.";
    if (!Number.isFinite(row.amount) || row.amount <= 0) fieldErrors.amount = "Informe um valor maior que zero.";

    if (row.donor_type === "pessoa_fisica") {
      if (!row.name) fieldErrors.name = "Informe o nome.";
      if (row.document_type !== "cpf" || !isValidCpf(row.document)) fieldErrors.document = "Informe um CPF valido.";
      row.company_name = null;
      row.responsible_name = null;
    }

    if (row.donor_type === "pessoa_juridica") {
      if (!row.company_name) fieldErrors.company_name = "Informe a razao social.";
      if (!row.responsible_name) fieldErrors.responsible_name = "Informe o responsavel.";
      if (row.document_type !== "cnpj" || !isValidCnpj(row.document)) fieldErrors.document = "Informe um CNPJ valido.";
      row.birth_date = null;
      row.name = null;
    }

    if (row.donation_type === "monthly") {
      if (!Number.isInteger(row.due_day) || row.due_day < 1 || row.due_day > 28) fieldErrors.due_day = "Escolha um dia entre 1 e 28.";
      if (!row.recurrence_period || !RECURRENCE.includes(row.recurrence_period)) fieldErrors.recurrence_period = "Escolha a recorrencia.";
    }

    if (row.donation_type === "single") {
      row.due_day = null;
      row.recurrence_period = null;
    }
  }

  if (Object.keys(fieldErrors).length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, fieldErrors, headers);

  const since = new Date(Date.now() - 45_000).toISOString();
  const duplicate = await supabase
    .from("donation_intents")
    .select("id, created_at")
    .eq("phone", row.phone)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (duplicate.data?.id) {
    logResult(FUNCTION_NAME, 201, "DUPLICATE_SUBMISSION", duplicate.data.id);
    return successResponse(buildSuccessPayload(duplicate.data, isPrePix), headers);
  }

  const { data, error } = await supabase
    .from("donation_intents")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    logResult(FUNCTION_NAME, 500, "DATABASE_ERROR");
    return errorResponse("DATABASE_ERROR", "Nao foi possivel registrar a intencao de apoio agora.", 500, {}, headers);
  }

  logResult(FUNCTION_NAME, 201, "OK", data.id);
  return successResponse(buildSuccessPayload(data, isPrePix), headers);
});

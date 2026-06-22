import { handleCors } from "../_shared/cors.ts";
import { errorResponse, successResponse } from "../_shared/responses.ts";
import { cleanEmail, cleanString, hasForbiddenKeys, hasUnknownKeys, onlyDigits } from "../_shared/sanitize.ts";
import { ADMIN_FIELDS, isValidCnpj, isValidCpf, isValidEmail, isValidPhone, logResult, readJsonPayload, SENSITIVE_PAYMENT_FIELDS } from "../_shared/validation.ts";
import { createSupabaseAdmin } from "../_shared/supabaseAdmin.ts";

const FUNCTION_NAME = "submit-donation-intent";
const ALLOWED_FIELDS = [
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
  "website",
];
const DONOR_TYPES = ["pessoa_fisica", "pessoa_juridica"];
const DOCUMENT_TYPES = ["cpf", "cnpj"];
const CONTACT = ["email", "whatsapp", "telefone"];
const PAYMENT = ["pix", "credit_card"];
const DONATION = ["monthly", "single"];
const RECURRENCE = ["6_months", "12_months", "indefinite"];

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors.response) return cors.response;
  const headers = cors.headers;
  const { payload, response } = await readJsonPayload(req, headers);
  if (response) return response;

  const sensitive = hasForbiddenKeys(payload, SENSITIVE_PAYMENT_FIELDS);
  if (sensitive) return errorResponse("SENSITIVE_PAYMENT_DATA", "Dados sensíveis de pagamento não devem ser enviados.", 400, { [sensitive]: "Campo proibido." }, headers);
  const forbidden = hasForbiddenKeys(payload, [...ADMIN_FIELDS, "provider_name", "provider_reference"]);
  if (forbidden) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, { [forbidden]: "Campo não permitido." }, headers);
  const unknown = hasUnknownKeys(payload, ALLOWED_FIELDS);
  if (unknown.length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, Object.fromEntries(unknown.map((key) => [key, "Campo não permitido."])), headers);
  if (cleanString(payload.website, 100)) {
    return successResponse({ submissionId: crypto.randomUUID(), submittedAt: new Date().toISOString() }, headers);
  }

  const donorType = cleanString(payload.donor_type, 30);
  const documentType = cleanString(payload.document_type, 10);
  const donationType = cleanString(payload.donation_type, 30);
  const amount = Number(payload.amount);
  const row = {
    donor_type: donorType,
    name: cleanString(payload.name, 160),
    company_name: cleanString(payload.company_name, 180),
    responsible_name: cleanString(payload.responsible_name, 160),
    document_type: documentType,
    document: onlyDigits(payload.document),
    email: cleanEmail(payload.email),
    phone: onlyDigits(payload.phone),
    birth_date: cleanString(payload.birth_date, 10),
    contact_preference: cleanString(payload.contact_preference, 30),
    payment_method: cleanString(payload.payment_method, 40),
    donation_type: donationType,
    due_day: payload.due_day === null || payload.due_day === undefined ? null : Number(payload.due_day),
    recurrence_period: cleanString(payload.recurrence_period, 40),
    amount,
    custom_amount: payload.custom_amount === null || payload.custom_amount === undefined ? null : Number(payload.custom_amount),
    privacy_accepted: payload.privacy_accepted === true,
    terms_accepted: payload.terms_accepted === true,
    source: "apoie_page",
    status: "pending_payment_setup",
    consent_at: new Date().toISOString(),
    is_test: false,
    provider_name: null,
    provider_reference: null,
  };

  const fieldErrors: Record<string, string> = {};
  if (!DONOR_TYPES.includes(row.donor_type || "")) fieldErrors.donor_type = "Valor inválido.";
  if (!DOCUMENT_TYPES.includes(row.document_type || "")) fieldErrors.document_type = "Valor inválido.";
  if (!row.email || !isValidEmail(row.email)) fieldErrors.email = "Informe um e-mail válido.";
  if (!isValidPhone(row.phone)) fieldErrors.phone = "Informe um telefone válido.";
  if (row.contact_preference && !CONTACT.includes(row.contact_preference)) fieldErrors.contact_preference = "Valor inválido.";
  if (!PAYMENT.includes(row.payment_method || "")) fieldErrors.payment_method = "Valor inválido.";
  if (!DONATION.includes(row.donation_type || "")) fieldErrors.donation_type = "Valor inválido.";
  if (!Number.isFinite(row.amount) || row.amount <= 0) fieldErrors.amount = "Informe um valor maior que zero.";

  if (row.donor_type === "pessoa_fisica") {
    if (!row.name) fieldErrors.name = "Informe o nome.";
    if (row.document_type !== "cpf" || !isValidCpf(row.document)) fieldErrors.document = "Informe um CPF válido.";
    row.company_name = null;
    row.responsible_name = null;
  }

  if (row.donor_type === "pessoa_juridica") {
    if (!row.company_name) fieldErrors.company_name = "Informe a razão social.";
    if (!row.responsible_name) fieldErrors.responsible_name = "Informe o responsável.";
    if (row.document_type !== "cnpj" || !isValidCnpj(row.document)) fieldErrors.document = "Informe um CNPJ válido.";
    row.birth_date = null;
    row.name = null;
  }

  if (row.donation_type === "monthly") {
    if (!Number.isInteger(row.due_day) || row.due_day < 1 || row.due_day > 28) fieldErrors.due_day = "Escolha um dia entre 1 e 28.";
    if (!row.recurrence_period || !RECURRENCE.includes(row.recurrence_period)) fieldErrors.recurrence_period = "Escolha a recorrência.";
  }

  if (row.donation_type === "single") {
    row.due_day = null;
    row.recurrence_period = null;
  }

  if (payload.privacy_accepted !== true || payload.terms_accepted !== true) {
    return errorResponse("CONSENT_REQUIRED", "É necessário aceitar os termos para continuar.", 400, {
      privacy_accepted: payload.privacy_accepted === true ? "" : "Aceite obrigatório.",
      terms_accepted: payload.terms_accepted === true ? "" : "Aceite obrigatório.",
    }, headers);
  }
  if (Object.keys(fieldErrors).length) return errorResponse("VALIDATION_ERROR", "Revise os campos informados.", 400, fieldErrors, headers);

  const supabase = createSupabaseAdmin();
  const since = new Date(Date.now() - 45_000).toISOString();
  const duplicate = await supabase
    .from("donation_intents")
    .select("id, created_at")
    .or(`phone.eq.${row.phone},email.eq.${row.email}`)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  if (duplicate.data?.id) {
    logResult(FUNCTION_NAME, 201, "DUPLICATE_SUBMISSION", duplicate.data.id);
    return successResponse({ submissionId: duplicate.data.id, submittedAt: duplicate.data.created_at }, headers);
  }

  const { data, error } = await supabase
    .from("donation_intents")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error) {
    logResult(FUNCTION_NAME, 500, "DATABASE_ERROR");
    return errorResponse("DATABASE_ERROR", "Não foi possível registrar a intenção de apoio agora.", 500, {}, headers);
  }

  logResult(FUNCTION_NAME, 201, "OK", data.id);
  return successResponse({ submissionId: data.id, submittedAt: data.created_at }, headers);
});

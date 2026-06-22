import { errorResponse } from "./responses.ts";
import { isPlainObject, onlyDigits } from "./sanitize.ts";

export const ADMIN_FIELDS = [
  "id",
  "status",
  "internal_notes",
  "private_notes",
  "contacted_at",
  "created_at",
  "updated_at",
  "is_test",
  "user_id",
  "role",
  "provider_name",
  "provider_reference",
];

export const SENSITIVE_PAYMENT_FIELDS = [
  "card_number",
  "cardNumber",
  "numero_cartao",
  "card_number_visual",
  "cvv",
  "card_cvv",
  "card_cvv_visual",
  "security_code",
  "expiry",
  "card_expiry",
  "card_expiry_visual",
  "validade",
  "password",
  "senha",
  "payment_token",
  "secret",
];

export async function readJsonPayload(req: Request, headers: HeadersInit) {
  if (req.method !== "POST") {
    return { payload: null, response: errorResponse("METHOD_NOT_ALLOWED", "Método não permitido.", 405, {}, headers) };
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { payload: null, response: errorResponse("INVALID_CONTENT_TYPE", "Envie os dados em JSON.", 415, {}, headers) };
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > 20 * 1024) {
    return { payload: null, response: errorResponse("PAYLOAD_TOO_LARGE", "Dados acima do limite permitido.", 413, {}, headers) };
  }

  try {
    const payload = JSON.parse(rawBody);
    if (!isPlainObject(payload)) {
      return { payload: null, response: errorResponse("INVALID_JSON", "O corpo deve ser um objeto JSON.", 400, {}, headers) };
    }
    return { payload, response: null };
  } catch {
    return { payload: null, response: errorResponse("INVALID_JSON", "JSON inválido.", 400, {}, headers) };
  }
}

export function isValidEmail(value: string | null) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string | null) {
  return Boolean(value && onlyDigits(value).length >= 10 && onlyDigits(value).length <= 13);
}

function hasRepeatedDigits(value: string) {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: unknown) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || hasRepeatedDigits(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === Number(cpf[10]);
}

export function isValidCnpj(value: unknown) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || hasRepeatedDigits(cnpj)) return false;
  const calc = (factors: number[]) => {
    const sum = factors.reduce((total, factor, index) => total + Number(cnpj[index]) * factor, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12])
    && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13]);
}

export function logResult(functionName: string, status: number, code: string, submissionId?: string) {
  console.log(JSON.stringify({
    functionName,
    status,
    code,
    submissionId: submissionId || null,
    at: new Date().toISOString(),
  }));
}

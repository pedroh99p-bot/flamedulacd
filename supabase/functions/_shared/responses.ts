export type ErrorCode =
  | "VALIDATION_ERROR"
  | "CONSENT_REQUIRED"
  | "INVALID_JSON"
  | "INVALID_CONTENT_TYPE"
  | "METHOD_NOT_ALLOWED"
  | "PAYLOAD_TOO_LARGE"
  | "ORIGIN_NOT_ALLOWED"
  | "SENSITIVE_PAYMENT_DATA"
  | "DUPLICATE_SUBMISSION"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

export function jsonResponse(body: unknown, status: number, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function successResponse(data: Record<string, unknown>, headers: HeadersInit = {}) {
  return jsonResponse({
    success: true,
    message: "Cadastro recebido com sucesso.",
    data,
  }, 201, headers);
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  fieldErrors: Record<string, string> = {},
  headers: HeadersInit = {},
) {
  return jsonResponse({
    success: false,
    code,
    message,
    fieldErrors,
  }, status, headers);
}

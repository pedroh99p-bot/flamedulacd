const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "https://flamedula.org.br",
  "https://www.flamedula.org.br",
  "https://flamedula-platform.vercel.app",
  "https://flamedula-platforms.vercel.app",
  "https://flamedulacd.vercel.app",
];

const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type";

export function getAllowedOrigins() {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
}

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (origin && getAllowedOrigins().includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

export function handleCorsPreflight(request: Request) {
  if (request.method !== "OPTIONS") return null;

  const origin = request.headers.get("Origin");
  const headers = getCorsHeaders(request);
  if (origin && !headers["Access-Control-Allow-Origin"]) {
    return new Response(JSON.stringify({
      success: false,
      code: "ORIGIN_NOT_ALLOWED",
      message: "Origem não autorizada.",
    }), {
      status: 403,
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  }

  return new Response(null, { status: 204, headers });
}

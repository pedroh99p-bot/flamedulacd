import { errorResponse } from "./responses.ts";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://flamedulacd.vercel.app",
];

export const allowedHeaders = "content-type, apikey, authorization, x-client-info";

export function getAllowedOrigins() {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  const configuredOrigins = configured
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])];
}

export function corsHeadersFor(origin: string | null) {
  const headers: Record<string, string> = {
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": allowedHeaders,
    "vary": "Origin",
  };

  if (origin) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
}

export function handleCors(req: Request) {
  const origin = req.headers.get("origin");
  const headers = corsHeadersFor(origin);

  if (!origin) {
    return { ok: true, headers, response: null };
  }

  if (!getAllowedOrigins().includes(origin)) {
    return {
      ok: false,
      headers,
      response: errorResponse("ORIGIN_NOT_ALLOWED", "Origem não autorizada.", 403, {}, headers),
    };
  }

  if (req.method === "OPTIONS") {
    return { ok: true, headers, response: new Response(null, { status: 204, headers }) };
  }

  return { ok: true, headers, response: null };
}

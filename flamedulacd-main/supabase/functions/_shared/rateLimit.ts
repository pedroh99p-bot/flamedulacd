import { errorResponse } from "./responses.ts";

type RateLimitClient = {
  rpc: (
    functionName: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

type RateLimitConfig = {
  endpoint: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after: number;
  reset_at: string;
};

function getClientIdentifier(req: Request) {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  const address = candidates.find((value) => value && value.length <= 64);
  if (address) return `ip:${address}`;

  const userAgent = req.headers.get("user-agent")?.slice(0, 160) || "unknown";
  return `unresolved:${userAgent}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeRow(data: unknown): RateLimitRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const candidate = row as Partial<RateLimitRow>;
  if (typeof candidate.allowed !== "boolean") return null;
  return {
    allowed: candidate.allowed,
    remaining: Number(candidate.remaining || 0),
    retry_after: Number(candidate.retry_after || 0),
    reset_at: String(candidate.reset_at || ""),
  };
}

function buildHeaders(
  baseHeaders: Record<string, string>,
  config: RateLimitConfig,
  row?: RateLimitRow,
): Record<string, string> {
  const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : NaN;
  return {
    ...baseHeaders,
    "x-ratelimit-limit": String(config.limit),
    "x-ratelimit-remaining": String(Math.max(row?.remaining ?? config.limit, 0)),
    ...(Number.isFinite(resetAt)
      ? { "x-ratelimit-reset": String(Math.ceil(resetAt / 1000)) }
      : {}),
  };
}

export async function enforceRateLimit(
  req: Request,
  supabase: RateLimitClient,
  config: RateLimitConfig,
  baseHeaders: Record<string, string>,
) {
  const salt = Deno.env.get("RATE_LIMIT_SALT");
  const failOpen = Deno.env.get("RATE_LIMIT_FAIL_OPEN") === "true";

  if (!salt || salt.length < 32) {
    console.error(JSON.stringify({
      functionName: config.endpoint,
      code: "RATE_LIMIT_CONFIGURATION_ERROR",
      at: new Date().toISOString(),
    }));

    if (failOpen) {
      return { headers: buildHeaders(baseHeaders, config), response: null };
    }

    const headers = buildHeaders(baseHeaders, config);
    return {
      headers,
      response: errorResponse(
        "SERVICE_UNAVAILABLE",
        "O envio está temporariamente indisponível. Tente novamente em instantes.",
        503,
        {},
        headers,
      ),
    };
  }

  try {
    const identifier = getClientIdentifier(req);
    const keyHash = await sha256(`${config.endpoint}:${identifier}:${salt}`);
    const { data, error } = await supabase.rpc("consume_intake_rate_limit", {
      p_endpoint: config.endpoint,
      p_key_hash: keyHash,
      p_limit: config.limit,
      p_window_seconds: config.windowSeconds,
    });

    const row = normalizeRow(data);
    if (error || !row) throw new Error(error?.message || "invalid limiter response");

    const headers = buildHeaders(baseHeaders, config, row);
    if (!row.allowed) {
      headers["retry-after"] = String(Math.max(row.retry_after, 1));
      return {
        headers,
        response: errorResponse(
          "RATE_LIMIT_EXCEEDED",
          "Muitas tentativas em pouco tempo. Aguarde e tente novamente.",
          429,
          {},
          headers,
        ),
      };
    }

    return { headers, response: null };
  } catch (error) {
    console.error(JSON.stringify({
      functionName: config.endpoint,
      code: "RATE_LIMIT_BACKEND_ERROR",
      message: error instanceof Error ? error.message : "unknown",
      at: new Date().toISOString(),
    }));

    const headers = buildHeaders(baseHeaders, config);
    if (failOpen) return { headers, response: null };

    return {
      headers,
      response: errorResponse(
        "SERVICE_UNAVAILABLE",
        "O envio está temporariamente indisponível. Tente novamente em instantes.",
        503,
        {},
        headers,
      ),
    };
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const ALLOWED_SOURCES = new Set([
  "landing_form",
  "admin_editor",
  "cloudinary",
  "public_content",
]);
const ALLOWED_EVENTS = new Set([
  "form_submission_failed",
  "upload_failed",
  "publication_failed",
  "content_load_failed",
]);
const ALLOWED_SEVERITIES = new Set(["warning", "error", "critical"]);
const ALLOWED_METADATA = new Set(["endpoint", "content_type", "step", "online", "page"]);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = configuredOrigins.length === 0 || configuredOrigins.includes("*")
    ? "*"
    : configuredOrigins.includes(origin)
      ? origin
      : configuredOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(request), "Content-Type": "application/json" },
  });
}

function readAdminKey() {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let adminKey = legacyServiceRole || null;

  if (secretKeysRaw) {
    try {
      const secretKeys = JSON.parse(secretKeysRaw) as Record<string, unknown>;
      if (typeof secretKeys.default === "string" && secretKeys.default) adminKey = secretKeys.default;
    } catch {
      return null;
    }
  }
  return adminKey;
}

function cleanToken(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, maxLength);
  return /^[a-zA-Z0-9_.:/-]+$/.test(cleaned) ? cleaned : null;
}

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, string | boolean> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_METADATA.has(key)) continue;
    if (typeof item === "boolean") result[key] = item;
    if (typeof item === "string") result[key] = item.slice(0, 100);
  }
  return result;
}

function getClientIdentifier(request: Request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("user-agent")?.slice(0, 120)
    || "unknown";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sendOptionalAlert(event: Record<string, unknown>) {
  const webhook = Deno.env.get("ALERT_WEBHOOK_URL");
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: "FlaMedula", ...event }),
    });
  } catch {
    console.error(JSON.stringify({ functionName: "record-operational-event", code: "ALERT_WEBHOOK_FAILED" }));
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, { success: false }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = readAdminKey();
  const rateLimitSalt = Deno.env.get("RATE_LIMIT_SALT");
  if (!supabaseUrl || !adminKey || !rateLimitSalt || rateLimitSalt.length < 32) {
    return jsonResponse(request, { success: false }, 503);
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 4 * 1024) {
      return jsonResponse(request, { success: false }, 413);
    }
    body = JSON.parse(rawBody);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return jsonResponse(request, { success: false }, 400);
  }

  const source = cleanToken(body.source, 60);
  const eventType = cleanToken(body.event_type, 80);
  const severity = cleanToken(body.severity, 20) || "error";
  const errorCode = cleanToken(body.error_code, 80);
  const requestId = cleanToken(body.request_id, 120) || crypto.randomUUID();
  const statusCode = Number.isInteger(body.status_code) && Number(body.status_code) >= 100 && Number(body.status_code) <= 599
    ? Number(body.status_code)
    : null;

  if (!source || !ALLOWED_SOURCES.has(source) || !eventType || !ALLOWED_EVENTS.has(eventType) || !ALLOWED_SEVERITIES.has(severity)) {
    return jsonResponse(request, { success: false }, 400);
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const keyHash = await sha256(`record-operational-event:${getClientIdentifier(request)}:${rateLimitSalt}`);
  const { data: limiterData, error: limiterError } = await supabase.rpc("consume_intake_rate_limit", {
    p_endpoint: "record-operational-event",
    p_key_hash: keyHash,
    p_limit: 20,
    p_window_seconds: 600,
  });
  const limiter = Array.isArray(limiterData) ? limiterData[0] : limiterData;
  if (limiterError || !limiter?.allowed) {
    return jsonResponse(request, { success: false }, limiterError ? 503 : 429);
  }

  const event = {
    severity,
    source,
    event_type: eventType,
    request_id: requestId,
    status_code: statusCode,
    error_code: errorCode || "UNKNOWN_ERROR",
    metadata: cleanMetadata(body.metadata),
  };
  const { error } = await supabase.from("operational_events").insert(event);
  if (error) {
    console.error(JSON.stringify({ functionName: "record-operational-event", code: "EVENT_INSERT_FAILED" }));
    return jsonResponse(request, { success: false }, 503);
  }

  console.log(JSON.stringify({
    functionName: "record-operational-event",
    status: 202,
    code: "EVENT_RECORDED",
    source,
    eventType,
    requestId,
    at: new Date().toISOString(),
  }));
  if (severity === "critical") await sendOptionalAlert(event);
  return jsonResponse(request, { success: true, requestId }, 202);
});

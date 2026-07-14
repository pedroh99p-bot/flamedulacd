import { supabaseClient } from "../supabaseClient.js";

function normalizeErrorCode(value) {
  return String(value || "UNKNOWN_ERROR")
    .replace(/[^a-zA-Z0-9_.:/-]/g, "_")
    .slice(0, 80);
}

export function reportOperationalFailure({
  source = "admin_editor",
  eventType = "publication_failed",
  severity = "error",
  error,
  statusCode,
  metadata = {}
} = {}) {
  const payload = {
    source,
    event_type: eventType,
    severity,
    error_code: normalizeErrorCode(error?.code || error?.name || "UNKNOWN_ERROR"),
    status_code: Number.isInteger(statusCode || error?.status) ? Number(statusCode || error?.status) : undefined,
    request_id: crypto.randomUUID(),
    metadata: {
      content_type: String(metadata.content_type || "").slice(0, 100),
      step: String(metadata.step || "").slice(0, 100),
      online: navigator.onLine,
      page: window.location.pathname,
    }
  };

  supabaseClient.functions.invoke("record-operational-event", { body: payload })
    .catch(() => {
      // Monitoring cannot interrupt the editor or replace its original error.
    });
}

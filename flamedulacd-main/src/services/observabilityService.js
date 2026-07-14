import { FUNCTIONS_BASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../config/supabase.js';

const ALLOWED_ERROR_CODE = /[^a-zA-Z0-9_.:/-]/g;
const USER_CORRECTABLE_CODES = new Set([
  'VALIDATION_ERROR',
  'CONSENT_REQUIRED',
  'SENSITIVE_PAYMENT_DATA',
]);

function normalizeErrorCode(value) {
  return String(value || 'UNKNOWN_ERROR')
    .replace(ALLOWED_ERROR_CODE, '_')
    .slice(0, 80);
}

export function reportFormFailure(endpoint, error) {
  if (USER_CORRECTABLE_CODES.has(error?.code)) return;
  const payload = {
    source: 'landing_form',
    event_type: 'form_submission_failed',
    severity: error?.code === 'RATE_LIMIT_EXCEEDED'
      ? 'warning'
      : error?.code === 'INTERNAL_ERROR' || error?.code === 'DATABASE_ERROR'
        ? 'critical'
        : 'error',
    error_code: normalizeErrorCode(error?.code),
    status_code: Number.isInteger(error?.status) ? error.status : undefined,
    request_id: crypto.randomUUID(),
    metadata: {
      endpoint,
      online: navigator.onLine,
      page: window.location.pathname,
    },
  };

  fetch(`${FUNCTIONS_BASE_URL}/record-operational-event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Monitoring must never block or replace the original form error.
  });
}

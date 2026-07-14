export function onlyDigits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function cleanString(value: unknown, max = 500) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).normalize("NFC").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

export function cleanEmail(value: unknown) {
  const email = cleanString(value, 254);
  return email ? email.toLowerCase() : null;
}

export function cleanState(value: unknown) {
  const state = cleanString(value, 2);
  return state ? state.toUpperCase() : null;
}

export function hasForbiddenKeys(payload: Record<string, unknown>, forbidden: string[]) {
  const lowerKeys = new Set(Object.keys(payload).map((key) => key.toLowerCase()));
  return forbidden.find((key) => lowerKeys.has(key.toLowerCase())) || null;
}

export function hasUnknownKeys(payload: Record<string, unknown>, allowed: string[]) {
  const allowedSet = new Set(allowed);
  return Object.keys(payload).filter((key) => !allowedSet.has(key));
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

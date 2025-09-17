// Simple validators and sanitizers for API inputs

// Validate UUID v4-ish (accepts general UUID format)
export function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// Base ID: allow letters, digits, dash, underscore; length 1..64
export function isBaseId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

// Device ID: allow letters, digits, dash, underscore; length 0..128
export function cleanDeviceId(value: unknown): string | null {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const ok = s.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128);
  return ok || null;
}

// Free note text with basic trimming and length cap, strips control chars
export function cleanNote(value: unknown, max = 256): string | null {
  const s = String(value ?? '').replace(/[\x00-\x1F\x7F]/g, '').trim();
  if (!s) return null;
  return s.slice(0, max);
}


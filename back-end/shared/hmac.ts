// HMAC helpers (hex digest)
import { createHmac, timingSafeEqual } from 'crypto';

// sign(payload, secret) -> hex(HMAC-SHA256)
export function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

// verify(payload, sig, secret)
export function verify(payload: string, sig: string, secret: string): boolean {
  try {
    const expected = sign(payload, secret);
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(sig), 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

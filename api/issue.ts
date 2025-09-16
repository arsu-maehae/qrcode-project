import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handlePreflight } from './_utils/cors.js';

// Placeholder endpoint to keep /api/issue reachable during refactor.
// Replace with real implementation when ready.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(501).json({ ok: false, error: 'Not implemented' });
}


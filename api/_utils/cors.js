// CORS helpers for Node runtime (GET + OPTIONS only)
// Note: Keep small and dependency-free for serverless cold starts.

export function applyCors(req, res) {
  try {
    const origin = (req && req.headers && req.headers.origin) || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  } catch {}
}

// Handle OPTIONS preflight quickly; returns true if handled
export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    try { res.status(204).end(); } catch {}
    return true;
  }
  return false;
}


// Simple CORS utilities compatible with Vercel Node runtime
export function applyCors(req, res) {
  try {
    const origin = req.headers?.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } catch {}
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    try { res.status(204).end(); } catch {}
    return true;
  }
  return false;
}

export function withCORS(handler) {
  return async (req, res) => {
    applyCors(req, res);
    if (handlePreflight(req, res)) return;
    return handler(req, res);
  };
}

// Default export: allowCors(handler)
export default function allowCors(handler) {
  return withCORS(handler);
}

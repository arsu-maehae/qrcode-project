// Simple CORS helper for Vercel serverless (Node runtime)
const ALLOW_METHODS = 'GET,POST,OPTIONS';
export function withCORS(handler) {
  return async (req, res) => {
    try {
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
      if (req.method === 'OPTIONS') return res.status(204).end();
      return handler(req, res);
    } catch (e) {
      res.status(500).json({ error: 'CORS handler failed' });
    }
  };
}


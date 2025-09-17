// Minimal fetch-style helpers for Vercel Edge/Node runtimes

// Safe header accessor that works with Fetch Request and Node/Express
export function header(req: any, name: string): string | null {
  try {
    if (typeof Headers !== 'undefined' && req?.headers instanceof Headers) {
      return req.headers.get(name) || null;
    }
    const h = (req as any)?.headers;
    if (!h) return null;
    if (typeof h.get === 'function') {
      // Some frameworks provide a headers-like object with get()
      return h.get(name) || null;
    }
    // Plain object (Node/Express): header names are lowercase
    const key = String(name).toLowerCase();
    const val = h[key] ?? h[name as any];
    if (Array.isArray(val)) return (val[0] ?? null) as any;
    return (val ?? null) as any;
  } catch {
    return null;
  }
}

export function corsHeaders(req: Request) {
  const origin = header(req, 'origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  } as Record<string, string>;
}

export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

export function json(body: any, req: Request, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(req) }
  });
}

export function badRequest(message: string, req: Request): Response {
  return json({ error: message }, req, 400);
}

export function serverError(message: string, req: Request): Response {
  return json({ error: message }, req, 500);
}

export function notFound(message: string, req: Request): Response {
  return json({ error: message }, req, 404);
}

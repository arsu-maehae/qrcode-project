// Minimal fetch-style helpers for Vercel Edge/Node runtimes
export function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*';
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

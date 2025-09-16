export const config = { runtime: 'nodejs' };

export default function handler(req, res) {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL || null,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE
      ? 'SET (length ' + process.env.SUPABASE_SERVICE_ROLE.length + ')'
      : null,
  });
}

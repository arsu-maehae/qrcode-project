import allowCors from '../_utils/cors.js';
import supabaseAdmin from '../_lib/supa.js';

async function handler(req, res) {
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

  const { data, error } = await supabaseAdmin
    .from('qr_generations')
    .select('uuid, generated_at')
    .order('generated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return res.status(400).json({ error: error.message });
  res.status(200).json({ data, limit, offset });
}
export default allowCors(handler);


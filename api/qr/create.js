import { withCORS } from '../_utils/cors';
import { supaAdmin } from '../_lib/supa.js';
import { v4 as uuidv4 } from 'uuid';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const id = uuidv4();
  const { error } = await supaAdmin.from('qr_generations').insert({ uuid: id });
  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({ uuid: id, generated_at: new Date().toISOString() });
}
export default withCORS(handler);

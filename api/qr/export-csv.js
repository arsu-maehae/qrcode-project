import allowCors from '../_utils/cors.js';
import supabaseAdmin from '../_lib/supa.js';
import { stringify } from 'csv-stringify/sync';

async function handler(req, res) {
  const { data, error } = await supabaseAdmin
    .from('qr_generations')
    .select('uuid, generated_at')
    .order('generated_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const csv = stringify(data || [], { header: true, columns: ['uuid', 'generated_at'] });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="qr_generations.csv"');
  res.status(200).send(csv);
}
export default allowCors(handler);


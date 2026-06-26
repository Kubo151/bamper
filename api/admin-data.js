const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAuthed(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  return token === ADMIN_PASSWORD;
}

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { type, id } = req.query;

  try {
    if (req.method === 'GET') {
      if (type === 'reservations') return res.json(await sb('/reservations?order=created_at.desc&limit=200'));
      if (type === 'testimonials') return res.json(await sb('/testimonials?order=display_order.asc,created_at.desc'));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates?order=date_from.asc'));
    }

    if (req.method === 'POST') {
      if (type === 'testimonials') return res.json(await sb('/testimonials', 'POST', req.body));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates', 'POST', req.body));
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });
      if (type === 'testimonials') return res.json(await sb(`/testimonials?id=eq.${id}`, 'PATCH', req.body));
      if (type === 'reservations') return res.json(await sb(`/reservations?id=eq.${id}`, 'PATCH', req.body));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });
      if (type === 'testimonials') { await sb(`/testimonials?id=eq.${id}`, 'DELETE'); return res.status(204).end(); }
      if (type === 'blocked_dates') { await sb(`/blocked_dates?id=eq.${id}`, 'DELETE'); return res.status(204).end(); }
    }

    return res.status(400).json({ error: 'Neznámy typ alebo metóda' });
  } catch (e) {
    console.error('admin-data error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

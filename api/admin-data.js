const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const RESEND_KEY = process.env.RESEND_API_KEY;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ORIGINS = ['https://www.bamper.sk', 'https://bamper.sk'];

const MEDIA_BUCKET = 'testimonials';
const MEDIA_MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

function mediaPathFromUrl(url) {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const i = String(url ?? '').indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

async function deleteMediaObject(path) {
  if (!path) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  }).catch(() => {});
}

function isAuthed(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!ADMIN_PASSWORD || !token) return false;
  try { return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ADMIN_PASSWORD)); }
  catch (_) { return false; }
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
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

function h(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function sendStatusEmail(status, r) {
  if (!RESEND_KEY || !r.email) return;
  const firstName = h(r.name.split(' ')[0]);
  const dateStr = r.date ? `${r.date}${r.date_end && r.date_end !== r.date ? ' — ' + r.date_end : ''}` : null;

  const isConfirmed = status === 'confirmed';

  const html = isConfirmed ? `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ececee;border-radius:12px;overflow:hidden">
  <div style="background:#E8141B;padding:24px 28px"><div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BAMPER</div></div>
  <div style="padding:32px 28px">
    <h2 style="margin:0 0 12px;font-size:20px;color:#15171c;font-weight:700">Rezervácia potvrdená!</h2>
    <p style="margin:0 0 20px;color:#3a3d44;font-size:15px;line-height:1.7">
      Ahoj ${firstName}! Tvoja rezervácia bola <strong>potvrdená</strong>. Tešíme sa na teba!
    </p>
    ${dateStr ? `<div style="background:#f6f6f7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#3a3d44"><strong>Dátum:</strong> ${h(dateStr)}</div>` : ''}
    ${r.package ? `<div style="background:#f6f6f7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#3a3d44"><strong>Balík:</strong> ${h(r.package)}</div>` : ''}
    ${r.tier ? `<div style="background:#f6f6f7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#3a3d44"><strong>Balíček:</strong> ${h(r.tier)}</div>` : ''}
    <p style="margin:0 0 24px;color:#3a3d44;font-size:14px;line-height:1.7">
      V prípade otázok nás kontaktuj na tento email alebo cez WhatsApp.
    </p>
    <a href="https://wa.me/421940984954" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">Napísať na WhatsApp</a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #ececee;font-size:13px;color:#7b8089">
      <strong style="color:#15171c">Bamper</strong> — Prvá nafukovacia pretekárska trať na Slovensku<br>
      +421 940 984 954 | info@bamper.sk | bamper.sk
    </div>
  </div>
</div>` : `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ececee;border-radius:12px;overflow:hidden">
  <div style="background:#E8141B;padding:24px 28px"><div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BAMPER</div></div>
  <div style="padding:32px 28px">
    <h2 style="margin:0 0 12px;font-size:20px;color:#15171c;font-weight:700">Termín nie je dostupný</h2>
    <p style="margin:0 0 20px;color:#3a3d44;font-size:15px;line-height:1.7">
      Ahoj ${firstName}, ospravedlňujeme sa, ale požadovaný termín nie je dostupný.
      Kontaktuj nás a radi nájdeme náhradný termín.
    </p>
    <a href="https://wa.me/421940984954" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">Napísať na WhatsApp</a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #ececee;font-size:13px;color:#7b8089">
      <strong style="color:#15171c">Bamper</strong> — Prvá nafukovacia pretekárska trať na Slovensku<br>
      +421 940 984 954 | info@bamper.sk | bamper.sk
    </div>
  </div>
</div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Bamper <info@bamper.sk>',
      to: [r.email],
      reply_to: 'info@bamper.sk',
      subject: isConfirmed ? 'Rezervácia potvrdená — Bamper' : 'Termín nie je dostupný — Bamper',
      html,
    }),
  }).catch(e => console.error('Status email error:', e.message));
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { type, id } = req.query;
  if (id && !UUID_RE.test(id)) return res.status(400).json({ error: 'Neplatné id' });

  try {
    if (req.method === 'GET') {
      if (type === 'reservations') return res.json(await sb('/reservations?order=created_at.desc&limit=200'));
      if (type === 'testimonials') return res.json(await sb('/testimonials?order=display_order.asc,created_at.desc'));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates?order=date_from.asc'));
    }

    if (req.method === 'POST') {
      if (type === 'testimonials') return res.json(await sb('/testimonials', 'POST', req.body));
      if (type === 'blocked_dates') return res.json(await sb('/blocked_dates', 'POST', req.body));

      if (type === 'upload-url') {
        const { contentType } = req.body || {};
        const ext = MEDIA_MIME_EXT[contentType];
        if (!ext) return res.status(400).json({ error: 'Nepodporovaný typ súboru' });

        const path = `${crypto.randomUUID()}.${ext}`;
        const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${MEDIA_BUCKET}/${path}`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (!signRes.ok) return res.status(502).json({ error: await signRes.text() });
        const { url } = await signRes.json();

        return res.json({
          signedUrl: `${SUPABASE_URL}/storage/v1${url}`,
          publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`,
        });
      }
    }

    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });

      if (type === 'testimonials') {
        if ('media_url' in req.body) {
          const rows = await sb(`/testimonials?id=eq.${id}&select=media_url`);
          const oldUrl = rows?.[0]?.media_url;
          if (oldUrl && oldUrl !== req.body.media_url) await deleteMediaObject(mediaPathFromUrl(oldUrl));
        }
        return res.json(await sb(`/testimonials?id=eq.${id}`, 'PATCH', req.body));
      }

      if (type === 'reservations') {
        const newStatus = req.body.status;

        // Fetch current reservation pre side-effects
        const rows = await sb(`/reservations?id=eq.${id}&select=name,email,date,date_end,package,tier,status`);
        const current = rows?.[0];

        // Update status
        const updated = await sb(`/reservations?id=eq.${id}`, 'PATCH', req.body);

        // Side-effects len keď sa status reálne mení
        if (newStatus && current && newStatus !== current.status) {
          // Vždy zmaž auto-blokovaný termín pre túto rezerváciu
          await sb(`/blocked_dates?reservation_id=eq.${id}`, 'DELETE').catch(() => {});

          if (newStatus === 'confirmed' && current.date) {
            // Auto-blokuj termín
            await sb('/blocked_dates', 'POST', {
              date_from: current.date,
              date_to: current.date_end || current.date,
              label: `Rezervácia — ${current.name}`,
              reservation_id: id,
            });
            // Email zákazníkovi
            await sendStatusEmail('confirmed', current);
          } else if (newStatus === 'declined') {
            // Email zákazníkovi
            await sendStatusEmail('declined', current);
          }
        }

        return res.json(updated);
      }
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Chýba id' });
      if (type === 'testimonials') {
        const rows = await sb(`/testimonials?id=eq.${id}&select=media_url`);
        await deleteMediaObject(mediaPathFromUrl(rows?.[0]?.media_url));
        await sb(`/testimonials?id=eq.${id}`, 'DELETE');
        return res.status(204).end();
      }
      if (type === 'blocked_dates') { await sb(`/blocked_dates?id=eq.${id}`, 'DELETE'); return res.status(204).end(); }
    }

    return res.status(400).json({ error: 'Neznámy typ alebo metóda' });
  } catch (e) {
    console.error('admin-data error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

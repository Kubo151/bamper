module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, date, date_end, time, type, package: pkg, prep, message } = req.body || {};

  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Chýbajú povinné polia' });
  }

  const resendKey   = process.env.RESEND_API_KEY;
  const toEmail     = process.env.CONTACT_EMAIL || 'info@bamper.sk';
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!resendKey) {
    console.error('RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Konfigurácia servera chýba' });
  }

  const fromSender = 'Bamper <info@bamper.sk>';

  // Notifikačný email Igorovi
  const notifyHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ececee;border-radius:12px;overflow:hidden">
  <div style="background:#E8141B;padding:24px 28px">
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">Nový dopyt — Bamper</h1>
  </div>
  <div style="padding:28px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr>
        <td style="padding:8px 0;color:#7b8089;width:130px;vertical-align:top">Meno</td>
        <td style="padding:8px 0;font-weight:600;color:#15171c">${h(name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#7b8089;vertical-align:top">Telefón</td>
        <td style="padding:8px 0;font-weight:600"><a href="tel:${h(phone)}" style="color:#E8141B;text-decoration:none">${h(phone)}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#7b8089;vertical-align:top">Email</td>
        <td style="padding:8px 0;font-weight:600"><a href="mailto:${h(email)}" style="color:#E8141B;text-decoration:none">${h(email)}</a></td>
      </tr>
      ${pkg ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Záujem o</td><td style="padding:8px 0;font-weight:600;color:#E8141B">${h(pkg)}</td></tr>` : ''}
      ${type ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Typ akcie</td><td style="padding:8px 0;color:#15171c">${h(type)}</td></tr>` : ''}
      ${date ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Dátum akcie</td><td style="padding:8px 0;color:#15171c">${h(date)}${date_end && date_end !== date ? ` — ${h(date_end)}` : ''}${time ? ` o ${h(time)}` : ''}</td></tr>` : ''}
      ${prep === 'yes' ? `<tr><td style="padding:8px 0;color:#7b8089;vertical-align:top">Príprava</td><td style="padding:8px 0;color:#15171c">Požaduje montáž deň vopred</td></tr>` : ''}
    </table>
    ${message ? `<div style="margin-top:16px;background:#f6f6f7;border-radius:8px;padding:16px"><p style="margin:0;color:#3a3d44;font-size:14px;line-height:1.7">${h(message)}</p></div>` : ''}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #ececee;font-size:12px;color:#7b8089">
      Odoslané z rezervačného formulára na bamper.sk
    </div>
  </div>
</div>`;

  // Potvrdzovací email zákazníkovi
  const confirmHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #ececee;border-radius:12px;overflow:hidden">
  <div style="background:#E8141B;padding:24px 28px">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">BAMPER</div>
  </div>
  <div style="padding:32px 28px">
    <h2 style="margin:0 0 12px;font-size:20px;color:#15171c;font-weight:700">Váš dopyt sme prijali!</h2>
    <p style="margin:0 0 20px;color:#3a3d44;font-size:15px;line-height:1.7">
      Ďakujeme, ${h(name.split(' ')[0])}! Váš dopyt sme dostali a ozveme sa vám do <strong>24 hodín</strong> s ponukou na mieru.
    </p>
    ${pkg ? `<div style="background:#f6f6f7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#3a3d44"><strong>Záujem o:</strong> ${h(pkg)}</div>` : ''}
    ${date ? `<div style="background:#f6f6f7;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;color:#3a3d44"><strong>Dátum:</strong> ${h(date)}${date_end && date_end !== date ? ` — ${h(date_end)}` : ''}</div>` : ''}
    <p style="margin:0 0 24px;color:#3a3d44;font-size:14px;line-height:1.7">
      Ak potrebujete niečo doplniť alebo máte otázku, napíšte nám priamo na tento email alebo zavolajte.
    </p>
    <a href="https://wa.me/421940984954" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">Napísať na WhatsApp</a>
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #ececee">
      <p style="margin:0;font-size:13px;color:#7b8089">
        <strong style="color:#15171c">Bamper</strong> — Prvá nafukovacia pretekárska trať na Slovensku<br>
        📞 +421 940 984 954 &nbsp;|&nbsp; ✉️ info@bamper.sk &nbsp;|&nbsp; 🌐 bamper.sk
      </p>
    </div>
  </div>
</div>`;

  const [, notifyRes, confirmRes] = await Promise.all([
    // Supabase — nekritické
    supabaseUrl && supabaseKey
      ? fetch(`${supabaseUrl}/rest/v1/reservations`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            name, phone, email,
            package: pkg || null,
            date: date || null,
            date_end: date_end || null,
            type: type || null,
            time: time || null,
            prep: prep === 'yes',
            message: message || null,
          }),
        }).then(r => { if (!r.ok) r.text().then(t => console.error('Supabase error:', r.status, t)); })
          .catch(e => console.error('Supabase fetch error:', e))
      : Promise.resolve(),

    // Notifikácia Igorovi
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromSender,
        to: [toEmail],
        reply_to: email,
        subject: `Nový dopyt — ${name}`,
        html: notifyHtml,
      }),
    }),

    // Potvrdenie zákazníkovi
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromSender,
        to: [email],
        subject: 'Váš dopyt sme prijali — Bamper',
        html: confirmHtml,
      }),
    }),
  ]);

  if (!notifyRes.ok) {
    const errText = await notifyRes.text();
    console.error('Resend notify error:', notifyRes.status, errText);
    return res.status(500).json({ error: 'Odosielanie zlyhalo' });
  }

  // Potvrdenie zákazníkovi je best-effort — nezastavuje odpoveď
  if (!confirmRes.ok) {
    confirmRes.text().then(t => console.error('Resend confirm error:', confirmRes.status, t));
  }

  return res.status(200).json({ ok: true });
};

function h(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

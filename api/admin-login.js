module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { password } = req.body || {};
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return res.status(500).json({ error: 'Admin nie je nakonfigurovaný' });
  if (password !== adminPassword) return res.status(401).json({ error: 'Nesprávne heslo' });
  return res.status(200).json({ ok: true });
};

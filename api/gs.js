// وسيط: يمرّر طلبات الصفحة إلى Google Apps Script من خادم Vercel
// (مفيد عندما تمنع شبكة المدرسة أجهزة الطالبات من الوصول إلى Google مباشرة)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const u = String((req.query && req.query.u) || '');
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u)) {
    return res.status(400).json({ ok: false, error: 'BAD_URL' });
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k !== 'u') qs.append(k, Array.isArray(v) ? v[0] : String(v));
  }
  const url = u + (qs.toString() ? '?' + qs.toString() : '');
  try {
    const opts = { method: 'GET', redirect: 'follow' };
    if (req.method === 'POST') {
      opts.method = 'POST';
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      opts.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }
    const r = await fetch(url, opts);
    const text = await r.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ ok: false, error: 'PROXY' });
  }
};

// وسيط: يمرّر طلبات الصفحة إلى Google Apps Script من خادم Vercel
// (مفيد عندما تمنع شبكة المدرسة أجهزة الطالبات من الوصول إلى Google مباشرة)
// ثلاث طرق: GET /api/gs?id=...  أو  POST /d بجسم JSON {_q,_m,_b}  أو  ملف سكربت /s.js?id=...&cb=... (JSONP)
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  let q = Object.assign({}, req.query || {});
  let method = req.method === 'POST' ? 'POST' : 'GET';
  let body = req.method === 'POST' ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})) : undefined;

  // طريقة "الظرف": كل البيانات داخل جسم الطلب
  if (req.method === 'POST') {
    let env = null;
    try { env = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch (e) {}
    if (env && typeof env._q === 'string') {
      q = Object.fromEntries(new URLSearchParams(env._q));
      method = env._m === 'POST' ? 'POST' : 'GET';
      body = method === 'POST' ? String(env._b || '{}') : undefined;
    }
  }

  // طريقة "ملف سكربت" (/s.js?...&cb=...): للشبكات التي تمنع طلبات البيانات وتسمح بملفات السكربت
  const cb = String(q.cb || '');
  const jsonp = /^[A-Za-z0-9_]{1,40}$/.test(cb);
  if (jsonp) {
    if (q.data) {
      try { body = Buffer.from(String(q.data).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); method = 'POST'; }
      catch (e) { body = '{}'; }
    } else { method = 'GET'; body = undefined; }
  }

  let base = '';
  const id = String(q.id || '');
  if (/^[A-Za-z0-9_-]{20,}$/.test(id)) base = 'https://script.google.com/macros/s/' + id + '/exec';
  else if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(String(q.u || ''))) base = String(q.u);
  if (!base) { if (jsonp) { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); return res.status(200).send(cb + '({"ok":false,"error":"BAD_URL"});'); } return res.status(400).json({ ok: false, error: 'BAD_URL' }); }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (k !== 'u' && k !== 'id' && k !== 'cb' && k !== 'data') qs.append(k, Array.isArray(v) ? v[0] : String(v));
  }
  const url = base + (qs.toString() ? '?' + qs.toString() : '');
  try {
    const opts = { method, redirect: 'follow' };
    if (method === 'POST') { opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; opts.body = body; }
    const r = await fetch(url, opts);
    const text = await r.text();
    if (jsonp) {
      let data; try { data = JSON.parse(text); } catch (e) { data = { ok: false, error: 'BAD_RESPONSE' }; }
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.status(200).send(cb + '(' + JSON.stringify(data) + ');');
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    if (jsonp) { res.setHeader('Content-Type', 'application/javascript; charset=utf-8'); return res.status(200).send(cb + '({"ok":false,"error":"PROXY"});'); }
    res.status(502).json({ ok: false, error: 'PROXY' });
  }
};

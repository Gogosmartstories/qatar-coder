/****************************************************
 * رحلة المبرمجة في قطر — خادم النتائج على Google Sheets
 * الصقي هذا الكود كاملًا في: الإضافات ← Apps Script
 ****************************************************/

// ✏️ غيّري هذا الرقم إلى رقمك السري للدخول إلى لوحة المعلمة
const TEACHER_KEY = '4729';

// أرقام السر (تظهر في لوحة المعلمة بعد الدخول فقط)
const CODES = [
  ['فتح المحطة 1: شاطئ فويرط', '1590'],
  ['التغذية الراجعة: غابة القرم', '1122'],
  ['فتح المحطة 2: غابة القرم', '2468'],
  ['التغذية الراجعة: واحة العلوم', '3344'],
  ['فتح المحطة 3: واحة قطر للعلوم', '1357'],
  ['فتح المحطة 4: مزرعة الشمال', '9024']
];

const SHEET_NAME = 'النتائج';
const HEAD = ['المعرّف', 'الاسم', 'النقاط', 'المحطات المنجزة', 'السؤال الإبداعي 1 (الخوارزمية)', 'السؤال الإبداعي 2 (المخطط الانسيابي)', 'آخر تحديث'];

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.appendRow(HEAD);
    s.setFrozenRows(1);
    s.setRightToLeft(true);
    s.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#0e5f76').setFontColor('#ffffff');
    s.setColumnWidth(5, 320); s.setColumnWidth(6, 320);
  }
  return s;
}
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
// يمنع تحويل النص إلى معادلة داخل الجدول
const txt_ = (v, n) => { let t = String(v == null ? '' : v).slice(0, n).trim(); if (/^[=+\-@]/.test(t)) t = "'" + t; return t; };
const num_ = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v) || 0));

// الطالبات يرسلن نتائجهن هنا
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const b = JSON.parse(e.postData.contents || '{}');
    const sid = String(b.sid || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
    const name = txt_(b.n, 40);
    if (!sid || !name) return out_({ ok: false, error: 'missing' });
    const row = [sid, name, Math.round(num_(b.p, 0, 100)), num_(b.d, 0, 4), txt_(b.a1, 800), txt_(b.a2, 800), new Date()];
    const s = sheet_();
    const last = s.getLastRow();
    const ids = last > 1 ? s.getRange(2, 1, last - 1, 1).getValues().map(r => r[0]) : [];
    const i = ids.indexOf(sid);
    if (i > -1) s.getRange(i + 2, 1, 1, row.length).setValues([row]);
    else s.appendRow(row);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// لوحة المعلمة تقرأ النتائج من هنا
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== TEACHER_KEY) return out_({ ok: false, error: 'WRONG_KEY' });
  const s = sheet_();
  const last = s.getLastRow();
  if (p.action === 'clear') {
    if (last > 1) s.deleteRows(2, last - 1);
    return out_({ ok: true });
  }
  const rows = last > 1 ? s.getRange(2, 1, last - 1, HEAD.length).getValues() : [];
  const clean = v => String(v).replace(/^'/, '');
  const results = rows.filter(r => r[0]).map(r => ({
    sid: r[0], n: clean(r[1]), p: Number(r[2]) || 0, d: Number(r[3]) || 0,
    a1: clean(r[4]), a2: clean(r[5]), t: r[6] instanceof Date ? r[6].getTime() : Date.now()
  }));
  return out_({ ok: true, results: results, codes: CODES });
}

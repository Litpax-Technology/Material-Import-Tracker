// ============================================
// Litpax Import Tracker — Shared helpers
// ============================================

// GET request to GAS
async function apiGet(params) {
  const url = GAS_URL + '?' + new URLSearchParams(params).toString();
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// POST request to GAS
// NOTE: Content-Type header set NAHI karna — text/plain jaata hai
// jisse CORS preflight avoid hota hai. GAS side JSON.parse se handle hai.
async function apiPost(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Toast notification
let toastTimer = null;
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

// Status -> badge class
const STATUS_CLASS = {
  'Order Created':     's-created',
  'Price Locked':      's-locked',
  'Advance Paid':      's-advance',
  'Payment Done':      's-payment',
  'In Transit':        's-transit',
  'Under Examination': 's-exam',
  'Cleared':           's-cleared',
  'Closed':            's-closed'
};

const STATUS_ORDER = [
  'Order Created', 'Price Locked', 'Advance Paid', 'Payment Done',
  'In Transit', 'Under Examination', 'Cleared', 'Closed'
];

function statusBadge(status) {
  const cls = STATUS_CLASS[status] || 's-created';
  return '<span class="badge ' + cls + '">' + esc(status || 'Order Created') + '</span>';
}

// Basic HTML escape
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// URL param helper
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

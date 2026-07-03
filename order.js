// ============================================
// Order Detail page — load, edit, save, BL upload
// ============================================

const ORDER_ID = getParam('id');
let currentOrder = null;

// input id -> sheet field name (data-field attributes se bhi milta hai,
// ye map load ke time populate karne ke liye hai)
const FIELD_INPUTS = [
  { id: 'f_Supplier',        field: 'Supplier' },
  { id: 'f_Qty',             field: 'Qty' },
  { id: 'f_ApprovedBy',      field: 'Approved By' },
  { id: 'f_Currency',        field: 'Currency' },
  { id: 'f_OrderValue',      field: 'Order Value' },
  { id: 'f_INRValue',        field: 'INR Value' },
  { id: 'f_NegotiationDone', field: 'Negotiation Done' },
  { id: 'f_PriceLocked',     field: 'Price Locked' },
  { id: 'f_AdvancePaid',     field: 'Advance Paid' },
  { id: 'f_AdvanceDate',     field: 'Advance Date', isDate: true },
  { id: 'f_FullPayment',     field: 'Full Payment' },
  { id: 'f_FullPaymentDate', field: 'Full Payment Date', isDate: true },
  { id: 'f_Mode',            field: 'Mode' },
  { id: 'f_AWBNo',           field: 'AWB No' },
  { id: 'f_BLReceived',      field: 'BL Received' },
  { id: 'f_FreightNo',       field: 'Freight Tracking No' },
  { id: 'f_VesselNo',        field: 'Vessel No' },
  { id: 'f_VesselDetails',   field: 'Vessel Details' },
  { id: 'f_VesselDate',      field: 'Vessel Date', isDate: true },
  { id: 'f_ContainerNo',     field: 'Container No' },
  { id: 'f_ContainerDate',   field: 'Container Date', isDate: true },
  { id: 'f_CustomsDocs',     field: 'Customs Docs Done' },
  { id: 'f_DutyPaid',        field: 'Duty Paid' },
  { id: 'f_UnderExam',       field: 'Under Examination' },
  { id: 'f_ExamDocs',        field: 'Exam Docs Provided' },
  { id: 'f_Delivered',       field: 'Delivered' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (!ORDER_ID) {
    window.location.href = 'index.html';
    return;
  }
  loadOrder();

  document.getElementById('saveBtn').addEventListener('click', saveChanges);
  document.getElementById('uploadBLBtn').addEventListener('click', uploadBL);
  document.getElementById('f_Mode').addEventListener('change', toggleModeFields);
  document.getElementById('f_UnderExam').addEventListener('change', toggleExamField);
});

async function loadOrder() {
  const loader = document.getElementById('loader');
  const view = document.getElementById('orderView');
  loader.classList.remove('hidden');
  view.classList.add('hidden');
  try {
    const data = await apiGet({ action: 'getOrder', id: ORDER_ID });
    currentOrder = data.order;
    populate(currentOrder);
    renderTracker(currentOrder);
    renderHistory(data.history || []);
    view.classList.remove('hidden');
  } catch (err) {
    showToast('Order load nahi hua: ' + err.message, true);
  } finally {
    loader.classList.add('hidden');
  }
}

function populate(o) {
  document.getElementById('orderTitle').textContent = o['Order ID'];
  document.getElementById('orderSub').textContent =
    (o['Item Type'] || '') + ' • ' + (o['Supplier'] || '') + ' • Created ' + (o['Created Date'] || '');
  document.getElementById('statusBadgeWrap').innerHTML = statusBadge(o['Current Status']);
  document.getElementById('f_ItemType').value = o['Item Type'] || '';

  FIELD_INPUTS.forEach(fi => {
    const el = document.getElementById(fi.id);
    if (!el) return;
    let val = o[fi.field];
    if (val === null || val === undefined) val = '';
    if (fi.isDate) val = toInputDate(String(val));
    el.value = String(val);
    // select mein value na ho toh default pe rehne do
    if (el.tagName === 'SELECT' && el.value !== String(val)) {
      // Yes/No selects: blank ko No treat karo
      if (!val) el.value = el.querySelector('option[value=""]') ? '' : 'No';
    }
  });

  // BL link
  const blWrap = document.getElementById('blLinkWrap');
  if (o['BL Link']) {
    blWrap.innerHTML = '<a class="bl-link" href="' + esc(o['BL Link']) +
      '" target="_blank" rel="noopener">&#128196; View uploaded BL</a>';
  } else {
    blWrap.innerHTML = '<span style="color:var(--muted);font-size:13px;">Abhi tak BL upload nahi hua</span>';
  }

  toggleModeFields();
  toggleExamField();
}

function toggleModeFields() {
  const mode = document.getElementById('f_Mode').value;
  document.querySelectorAll('.sea-only').forEach(el =>
    el.classList.toggle('hidden', mode === 'Air'));
  document.querySelectorAll('.air-only').forEach(el =>
    el.classList.toggle('hidden', mode === 'Sea'));
}

function toggleExamField() {
  const exam = document.getElementById('f_UnderExam').value;
  document.querySelectorAll('.exam-only').forEach(el =>
    el.classList.toggle('hidden', exam !== 'Yes'));
}

/* ---------- Progress tracker ---------- */
function renderTracker(o) {
  const status = o['Current Status'] || 'Order Created';
  const idx = STATUS_ORDER.indexOf(status);
  const examRelevant = status === 'Under Examination' ||
    String(o['Under Examination']).toLowerCase() === 'yes';

  // Har checkpoint ke neeche uski relevant date (jo bhari ho)
  const stageDates = {
    'Order Created':  o['Created Date'],
    'Advance Paid':   o['Advance Date'],
    'Payment Done':   o['Full Payment Date'],
    'In Transit':     o['Vessel Date'] || o['Container Date'],
    'Closed':         '' // Delivered pe Last Updated dikhate hain
  };
  if (status === 'Closed') stageDates['Closed'] = o['Last Updated'];

  const t = document.getElementById('tracker');
  t.innerHTML = STATUS_ORDER.map((s, i) => {
    let cls = 'tstep';
    if (i < idx) cls += ' done';
    if (i === idx) cls += ' current';
    if (s === 'Under Examination' && !examRelevant) cls += ' skip';
    const d = stageDates[s] || '';
    return '<div class="' + cls + '"><div class="dot">' +
      (i < idx ? '&#10003;' : '') + '</div><div class="tlabel">' + esc(s) + '</div>' +
      (d ? '<div class="tdate">' + esc(String(d).split(' ')[0]) + '</div>' : '') +
      '</div>';
  }).join('');
}

/* ---------- Save (sirf changed fields jaati hain) ---------- */
async function saveChanges() {
  if (!currentOrder) return;
  const updates = {};

  FIELD_INPUTS.forEach(fi => {
    const el = document.getElementById(fi.id);
    if (!el) return;
    let newVal = el.value;
    if (fi.isDate) newVal = toSheetDate(newVal);
    const oldVal = String(currentOrder[fi.field] == null ? '' : currentOrder[fi.field]);
    if (String(newVal) !== oldVal) updates[fi.field] = newVal;
  });

  if (Object.keys(updates).length === 0) {
    showToast('Koi change nahi hai');
    return;
  }

  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  try {
    const res = await apiPost({
      action: 'updateOrder',
      orderId: ORDER_ID,
      updates: updates,
      updatedBy: 'MIS'
    });
    showToast('Saved! Status: ' + res.status);
    await loadOrder(); // fresh data + history reload
  } catch (err) {
    showToast('Save nahi hua: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

/* ---------- BL Upload ---------- */
async function uploadBL() {
  const fileInput = document.getElementById('blFile');
  const file = fileInput.files[0];
  if (!file) {
    showToast('Pehle file select karo', true);
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    showToast('File 8MB se badi hai — chhoti file use karo', true);
    return;
  }

  const btn = document.getElementById('uploadBLBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading...';
  try {
    const base64 = await fileToBase64(file);
    await apiPost({
      action: 'uploadBL',
      orderId: ORDER_ID,
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      base64: base64,
      updatedBy: 'MIS'
    });
    showToast('BL upload ho gaya!');
    fileInput.value = '';
    await loadOrder();
  } catch (err) {
    showToast('Upload fail: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload BL';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = () => reject(new Error('File read fail'));
    r.readAsDataURL(file);
  });
}

/* ---------- History timeline ---------- */
function renderHistory(history) {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  if (!history.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = history.map(h =>
    '<li><div class="t-time">' + esc(h.timestamp) + ' • ' + esc(h.updatedBy) + '</div>' +
    '<span class="t-field">' + esc(h.field) + ':</span> ' +
    (h.oldValue ? '<span class="t-old">' + esc(h.oldValue) + '</span> &rarr; ' : '') +
    '<span class="t-new">' + esc(h.newValue) + '</span></li>'
  ).join('');
}

/* ---------- Date helpers ----------
   Sheet format: dd-MMM-yyyy (e.g. 02-Jul-2026)
   Input format: yyyy-mm-dd
*/
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toInputDate(s) {
  if (!s) return '';
  // Already yyyy-mm-dd?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (!m) return '';
  const mon = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase());
  if (mon === -1) return '';
  return m[3] + '-' + String(mon + 1).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}

function toSheetDate(inputVal) {
  if (!inputVal) return '';
  const m = inputVal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return inputVal;
  return m[3] + '-' + MONTHS[parseInt(m[2], 10) - 1] + '-' + m[1];
}

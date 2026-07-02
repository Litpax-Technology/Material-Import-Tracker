// ============================================
// Dashboard — orders list + pipeline + filters
// ============================================

let allOrders = [];
let selectedStatus = '';

document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  loadConfigDropdowns();

  document.getElementById('searchBox').addEventListener('input', render);
  document.getElementById('itemFilter').addEventListener('change', render);
  document.getElementById('modeFilter').addEventListener('change', render);
  document.getElementById('refreshBtn').addEventListener('click', loadOrders);
});

async function loadOrders() {
  const loader = document.getElementById('loader');
  const wrap = document.getElementById('tableWrap');
  loader.classList.remove('hidden');
  wrap.classList.add('hidden');
  try {
    const data = await apiGet({ action: 'getOrders' });
    allOrders = data.orders || [];
    render();
  } catch (err) {
    showToast('Orders load nahi hue: ' + err.message, true);
  } finally {
    loader.classList.add('hidden');
  }
}

async function loadConfigDropdowns() {
  try {
    const cfg = await apiGet({ action: 'getConfig' });
    const sel = document.getElementById('itemFilter');
    (cfg.itemTypes || []).forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      sel.appendChild(opt);
    });
  } catch (err) { /* dropdowns optional — fail silently */ }
}

function render() {
  renderPipeline();
  renderTable();
}

function renderPipeline() {
  const counts = {};
  STATUS_ORDER.forEach(s => counts[s] = 0);
  allOrders.forEach(o => {
    const s = o['Current Status'] || 'Order Created';
    counts[s] = (counts[s] || 0) + 1;
  });

  const pipe = document.getElementById('pipeline');
  let html = '<div class="pipe-card' + (selectedStatus === '' ? ' selected' : '') +
    '" data-status=""><div class="count">' + allOrders.length +
    '</div><div class="label">All Orders</div></div>';

  STATUS_ORDER.forEach(s => {
    html += '<div class="pipe-card' + (selectedStatus === s ? ' selected' : '') +
      '" data-status="' + esc(s) + '"><div class="count">' + counts[s] +
      '</div><div class="label">' + esc(s) + '</div></div>';
  });
  pipe.innerHTML = html;

  pipe.querySelectorAll('.pipe-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedStatus = card.dataset.status;
      render();
    });
  });
}

function renderTable() {
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const item = document.getElementById('itemFilter').value;
  const mode = document.getElementById('modeFilter').value;

  const filtered = allOrders.filter(o => {
    if (selectedStatus && (o['Current Status'] || 'Order Created') !== selectedStatus) return false;
    if (item && o['Item Type'] !== item) return false;
    if (mode && o['Mode'] !== mode) return false;
    if (q) {
      const hay = [o['Order ID'], o['Supplier'], o['Vessel No'], o['Container No'],
        o['AWB No'], o['Freight Tracking No']].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const wrap = document.getElementById('tableWrap');
  const empty = document.getElementById('emptyState');
  const body = document.getElementById('ordersBody');

  if (filtered.length === 0) {
    wrap.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  wrap.classList.remove('hidden');

  // Latest orders pehle
  const sorted = filtered.slice().reverse();

  body.innerHTML = sorted.map(o =>
    '<tr data-id="' + esc(o['Order ID']) + '">' +
      '<td class="order-id">' + esc(o['Order ID']) + '</td>' +
      '<td>' + esc(o['Created Date']) + '</td>' +
      '<td>' + esc(o['Item Type']) + '</td>' +
      '<td>' + esc(o['Supplier']) + '</td>' +
      '<td>' + esc(o['Qty']) + '</td>' +
      '<td>' + esc(o['Mode'] || '—') + '</td>' +
      '<td>' + statusBadge(o['Current Status']) + '</td>' +
      '<td>' + esc(o['Last Updated']) + '</td>' +
    '</tr>'
  ).join('');

  body.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('click', () => {
      window.location.href = 'order.html?id=' + encodeURIComponent(tr.dataset.id);
    });
  });
}

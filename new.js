// ============================================
// New Order form
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await apiGet({ action: 'getConfig' });
    fillSelect('itemType', cfg.itemTypes);
    fillSelect('supplier', cfg.suppliers);
    fillSelect('approvedBy', cfg.approvers);
    fillSelect('currency', cfg.currencies);
  } catch (err) {
    showToast('Config load nahi hua: ' + err.message, true);
  }

  document.getElementById('createBtn').addEventListener('click', createOrder);
});

function fillSelect(id, items) {
  const sel = document.getElementById(id);
  (items || []).forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

async function createOrder() {
  const itemType = document.getElementById('itemType').value;
  const supplier = document.getElementById('supplier').value;
  const qty = document.getElementById('qty').value.trim();
  const approvedBy = document.getElementById('approvedBy').value;

  if (!itemType || !supplier || !qty || !approvedBy) {
    showToast('Item, Supplier, Qty aur Approved By required hain', true);
    return;
  }

  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await apiPost({
      action: 'createOrder',
      data: {
        itemType: itemType,
        supplier: supplier,
        qty: qty,
        mode: document.getElementById('mode').value,
        currency: document.getElementById('currency').value,
        orderValue: document.getElementById('orderValue').value.trim(),
        inrValue: document.getElementById('inrValue').value.trim(),
        approvedBy: approvedBy,
        negotiationDone: document.getElementById('negotiationDone').value,
        priceLocked: document.getElementById('priceLocked').value,
        updatedBy: 'MIS'
      }
    });
    showToast('Order created: ' + res.orderId);
    setTimeout(() => {
      window.location.href = 'order.html?id=' + encodeURIComponent(res.orderId);
    }, 900);
  } catch (err) {
    showToast('Order create nahi hua: ' + err.message, true);
    btn.disabled = false;
    btn.textContent = 'Create Order';
  }
}

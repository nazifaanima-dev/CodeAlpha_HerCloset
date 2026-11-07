const $ = (s) => document.querySelector(s);
const money = (v) => '৳' + Number(v || 0).toLocaleString('en-BD', { maximumFractionDigits: 2 });
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imageUrl = (v) => {
  const p = String(v || '').trim().replace(/\\/g,'/').replace(/^\/+/, '');
  if (!p || p.split('/').some(x => x === '..' || x === '.')) return 'https://placehold.co/80x100/f0ede4/747c55?text=HC';
  if (/^https:\/\//i.test(p)) return p;
  return '/' + p.split('/').map(encodeURIComponent).join('/');
};
async function api(url, options = {}) {
  const response = await fetch(url, { credentials:'same-origin', ...options, headers:{ ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}
function alertMessage(message, success = false) {
  const box = $('#admin-alert'); box.textContent = message; box.hidden = false; box.classList.toggle('success', success);
  window.scrollTo({top:0,behavior:'smooth'});
}
async function checkAdmin() {
  const data = await api('/api/auth/me');
  if (!data.user) { window.location.href = '/?admin=login'; return; }
  if (data.user.role !== 'admin') { document.body.innerHTML = '<main style="max-width:650px;margin:12vh auto;padding:24px;font-family:Arial"><h1>Administrator access required</h1><p>This account does not have store administrator permissions.</p><a href="/">Return to HerCloset</a></main>'; return; }
  $('#admin-user').textContent = data.user.name;
  await Promise.all([loadSummary(), loadProducts(), loadOrders()]);
}
async function loadSummary() {
  const d = await api('/api/admin/summary');
  $('#stat-products').textContent = Number(d.products.count).toLocaleString();
  $('#stat-stock').textContent = `${Number(d.products.units).toLocaleString()} stock units`;
  $('#stat-orders').textContent = Number(d.orders.count).toLocaleString();
  $('#stat-pending').textContent = `${Number(d.orders.pending)} pending · ${Number(d.orders.delivered)} delivered`;
  $('#stat-customers').textContent = Number(d.customers.count).toLocaleString();
  $('#stat-sales').textContent = money(d.sales);
}
async function loadProducts() {
  const rows = await api('/api/admin/products');
  $('#products-table').innerHTML = rows.length ? rows.map(p => `<tr>
    <td><div class="admin-product"><img src="${esc(imageUrl(p.image))}" alt=""><div><strong>${esc(p.name)}</strong><small>#${p.id}</small></div></div></td>
    <td>${esc(p.category)}</td><td>${money(p.price)}</td><td class="${Number(p.stock) < 5 ? 'stock-low' : ''}">${Number(p.stock)}</td>
    <td><div class="table-actions"><button type="button" data-edit="${p.id}">Edit</button><button type="button" class="delete" data-delete="${p.id}">Delete</button></div></td></tr>`).join('') : '<tr><td colspan="5">No products yet. Add your first product.</td></tr>';
}
async function loadOrders() {
  const rows = await api('/api/admin/orders');
  $('#orders-table').innerHTML = rows.length ? rows.map(o => `<tr>
    <td><strong>#${o.id}</strong><span class="order-line">${esc(o.phone)}<br>${esc(o.shipping_address)}</span></td>
    <td>${esc(o.customer_name)}<span class="order-line">${esc(o.customer_email)}</span></td>
    <td>${o.items.map(i => `${esc(i.name)} × ${i.quantity}${i.size ? ` (${esc(i.size)})` : ''}`).join('<br>')}</td>
    <td>${money(o.total)}<span class="order-line">${esc(o.payment_method)}</span></td>
    <td>${new Date(o.created_at).toLocaleDateString()}</td>
    <td><select class="status-select" data-status-order="${o.id}" aria-label="Order ${o.id} status">${['pending','processing','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></td>
  </tr>`).join('') : '<tr><td colspan="6">No orders have been placed yet.</td></tr>';
}
function openEditor(product = null) {
  $('#product-form').reset(); $('#product-id').value = product?.id || '';
  $('#editor-title').innerHTML = product ? 'Edit a <em>product.</em>' : 'Add a <em>product.</em>';
  $('#product-name').value = product?.name || ''; $('#product-category').value = product?.category || '';
  $('#product-price').value = product?.price ?? ''; $('#product-stock').value = product?.stock ?? 0;
  $('#product-image').value = product?.image || ''; $('#product-description').value = product?.description || '';
  $('#product-message').textContent = ''; $('#product-editor').showModal();
}
$('#new-product').addEventListener('click', () => openEditor());
$('#editor-close').addEventListener('click', () => $('#product-editor').close());
$('#product-form').addEventListener('submit', async (e) => {
  e.preventDefault(); const id = $('#product-id').value;
  const payload = { name:$('#product-name').value, category:$('#product-category').value, price:$('#product-price').value, stock:$('#product-stock').value, image:$('#product-image').value, description:$('#product-description').value };
  const button = $('#save-product'); button.disabled = true;
  try { await api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method:id ? 'PUT' : 'POST', body:JSON.stringify(payload) }); $('#product-editor').close(); alertMessage(id ? 'Product updated.' : 'Product added.', true); await Promise.all([loadProducts(),loadSummary()]); }
  catch(err) { $('#product-message').textContent = err.message; }
  finally { button.disabled = false; }
});
$('#products-table').addEventListener('click', async (e) => {
  const edit = e.target.closest('[data-edit]'); const del = e.target.closest('[data-delete]');
  if (edit) { try { const rows = await api('/api/admin/products'); openEditor(rows.find(p => Number(p.id) === Number(edit.dataset.edit))); } catch(err) { alertMessage(err.message); } }
  if (del && confirm('Delete this product? Past order records are protected.')) { try { await api(`/api/admin/products/${del.dataset.delete}`,{method:'DELETE'}); alertMessage('Product deleted.',true); await Promise.all([loadProducts(),loadSummary()]); } catch(err) { alertMessage(err.message); } }
});
$('#orders-table').addEventListener('change', async (e) => {
  const select = e.target.closest('[data-status-order]'); if (!select) return;
  const previous = select.dataset.previous || '';
  try { await api(`/api/admin/orders/${select.dataset.statusOrder}/status`, { method:'PATCH', body:JSON.stringify({status:select.value}) }); alertMessage(`Order #${select.dataset.statusOrder} updated.`,true); await Promise.all([loadOrders(),loadSummary(),loadProducts()]); }
  catch(err) { alertMessage(err.message); await loadOrders(); }
});
$('#refresh-orders').addEventListener('click', async () => { try { await Promise.all([loadOrders(),loadSummary()]); alertMessage('Orders refreshed.',true); } catch(e) { alertMessage(e.message); } });
$('#admin-logout').addEventListener('click', async () => { await api('/api/auth/logout',{method:'POST'}); window.location.href='/'; });
checkAdmin().catch(err => alertMessage(err.message));

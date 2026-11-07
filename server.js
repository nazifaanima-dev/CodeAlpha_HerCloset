require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const pool = require('./config/db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || 'hercloset-local-dev-secret-change-before-deploy';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: 'hercloset.sid', secret: SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const requireAuth = (req, res, next) => req.session.user ? next() : res.status(401).json({ error: 'Please log in to continue.' });
const requireAdmin = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Please log in.' });
  if (req.session.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required.' });
  next();
};
const clean = (value, max = 255) => String(value ?? '').trim().slice(0, max);
const validEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const productInput = (body) => {
  const name = clean(body.name, 150);
  const category = clean(body.category, 100);
  const description = clean(body.description, 5000);
  const image = clean(body.image, 255);
  const price = Number(body.price);
  const stock = Math.floor(Number(body.stock));
  if (name.length < 2 || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    throw Object.assign(new Error('Enter a product name, category, valid price and non-negative stock.'), { status: 400 });
  }
  return { name, category, description, image, price, stock };
};

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', database: 'connected' });
}));

// Public product catalogue. Admins can still see sold-out items in the dashboard.
app.get('/api/products', asyncRoute(async (req, res) => {
  const category = clean(req.query.category, 100);
  const search = clean(req.query.search, 100);
  let sql = 'SELECT id, name, category, description, price, image, stock FROM products WHERE stock >= 0';
  const params = [];
  if (category && category !== 'All') { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND (name LIKE ? OR category LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  sql += ' ORDER BY id ASC';
  const [products] = await pool.execute(sql, params);
  res.json(products);
}));

app.get('/api/products/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name, category, description, price, image, stock FROM products WHERE id = ?', [Number(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
  res.json(rows[0]);
}));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const name = clean(req.body.name, 100);
  const email = clean(req.body.email, 150).toLowerCase();
  const password = String(req.body.password || '');
  if (name.length < 2 || !validEmail(email) || password.length < 8) return res.status(400).json({ error: 'Enter your name, a valid email, and a password with at least 8 characters.' });
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(409).json({ error: 'An account with this email already exists.' });
  const hash = await bcrypt.hash(password, 12);
  const role = ADMIN_EMAIL && email === ADMIN_EMAIL ? 'admin' : 'customer';
  const [result] = await pool.execute('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, hash, role]);
  req.session.user = { id: result.insertId, name, email, role };
  res.status(201).json({ user: req.session.user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 150).toLowerCase();
  const password = String(req.body.password || '');
  const [rows] = await pool.execute('SELECT id, name, email, password, role FROM users WHERE email = ?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  // ADMIN_EMAIL can bootstrap the configured owner account without exposing an admin signup route.
  let role = rows[0].role || 'customer';
  if (ADMIN_EMAIL && email === ADMIN_EMAIL && role !== 'admin') {
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [rows[0].id]);
    role = 'admin';
  }
  req.session.user = { id: rows[0].id, name: rows[0].name, email: rows[0].email, role };
  res.json({ user: req.session.user });
}));

app.get('/api/auth/me', (req, res) => res.json({ user: req.session.user || null }));
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => {
  res.clearCookie('hercloset.sid');
  res.json({ message: 'Logged out.' });
}));

app.post('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const address = clean(req.body.shippingAddress, 1000);
  const phone = clean(req.body.phone, 30);
  if (!items.length || items.length > 50 || address.length < 8 || phone.length < 7) return res.status(400).json({ error: 'Add items, a complete delivery address, and a valid phone number.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let total = 0;
    const verifiedItems = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw Object.assign(new Error('One of the cart quantities is invalid.'), { status: 400 });
      const [products] = await connection.execute('SELECT id, name, category, price, stock FROM products WHERE id = ? FOR UPDATE', [productId]);
      if (!products.length) throw Object.assign(new Error('A product in your bag is no longer available.'), { status: 409 });
      const product = products[0];
      if (product.stock < quantity) throw Object.assign(new Error(`${product.name} does not have enough stock.`), { status: 409 });
      const size = clean(item.size, 20) || null;
      if (['Clothing', 'Footwear'].includes(product.category) && !size) throw Object.assign(new Error(`Please select a size for ${product.name}.`), { status: 400 });
      total += Number(product.price) * quantity;
      verifiedItems.push({ product, quantity, size });
    }
    const [orderResult] = await connection.execute('INSERT INTO orders (user_id, total, status, shipping_address, phone, payment_method) VALUES (?, ?, ?, ?, ?, ?)', [req.session.user.id, total.toFixed(2), 'pending', address, phone, 'Cash on Delivery']);
    for (const item of verifiedItems) {
      await connection.execute('INSERT INTO order_items (order_id, product_id, quantity, price, size) VALUES (?, ?, ?, ?, ?)', [orderResult.insertId, item.product.id, item.quantity, item.product.price, item.size]);
      await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product.id]);
    }
    await connection.commit();
    res.status(201).json({ message: 'Order placed successfully.', orderId: orderResult.insertId, total: Number(total.toFixed(2)) });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

app.get('/api/orders', requireAuth, asyncRoute(async (req, res) => {
  const [orders] = await pool.execute('SELECT id, total, status, shipping_address, phone, payment_method, created_at FROM orders WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]);
  for (const order of orders) {
    const [items] = await pool.execute('SELECT oi.product_id, p.name, oi.quantity, oi.price, oi.size FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?', [order.id]);
    order.items = items;
  }
  res.json(orders);
}));

// Admin dashboard summary and management APIs.
app.get('/api/admin/summary', requireAdmin, asyncRoute(async (_req, res) => {
  const [[products]] = await pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(stock),0) AS units FROM products');
  const [[orders]] = await pool.query('SELECT COUNT(*) AS count, COALESCE(SUM(status = \'pending\'),0) AS pending, COALESCE(SUM(status = \'delivered\'),0) AS delivered, COALESCE(SUM(status <> \'cancelled\'),0) AS active FROM orders');
  const [[customers]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role <> 'admin'");
  const [[sales]] = await pool.query("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status <> 'cancelled'");
  res.json({ products, orders, customers, sales: Number(sales.total || 0) });
}));

app.get('/api/admin/products', requireAdmin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, category, description, price, image, stock, created_at FROM products ORDER BY id DESC');
  res.json(rows);
}));

app.post('/api/admin/products', requireAdmin, asyncRoute(async (req, res) => {
  const p = productInput(req.body);
  const [result] = await pool.execute('INSERT INTO products (name, category, description, price, image, stock) VALUES (?, ?, ?, ?, ?, ?)', [p.name, p.category, p.description, p.price, p.image, p.stock]);
  res.status(201).json({ id: result.insertId, message: 'Product created.' });
}));

app.put('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  const p = productInput(req.body);
  const [result] = await pool.execute('UPDATE products SET name = ?, category = ?, description = ?, price = ?, image = ?, stock = ? WHERE id = ?', [p.name, p.category, p.description, p.price, p.image, p.stock, Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
  res.json({ message: 'Product updated.' });
}));

app.delete('/api/admin/products/:id', requireAdmin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const [used] = await pool.execute('SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?', [id]);
  if (Number(used[0].count)) return res.status(409).json({ error: 'This product is linked to past orders. Set its stock to 0 instead of deleting it.' });
  const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Product not found.' });
  res.json({ message: 'Product deleted.' });
}));

app.get('/api/admin/orders', requireAdmin, asyncRoute(async (_req, res) => {
  const [orders] = await pool.query(`SELECT o.id, o.total, o.status, o.shipping_address, o.phone, o.payment_method, o.created_at, u.name AS customer_name, u.email AS customer_email
    FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.id DESC`);
  for (const order of orders) {
    const [items] = await pool.execute('SELECT oi.product_id, p.name, oi.quantity, oi.price, oi.size FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?', [order.id]);
    order.items = items;
  }
  res.json(orders);
}));

app.patch('/api/admin/orders/:id/status', requireAdmin, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const status = clean(req.body.status, 30).toLowerCase();
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid order status.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [found] = await connection.execute('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (!found.length) throw Object.assign(new Error('Order not found.'), { status: 404 });
    const oldStatus = found[0].status;
    if (oldStatus !== status && status === 'cancelled') {
      const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    } else if (oldStatus === 'cancelled' && status !== 'cancelled') {
      const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        const [p] = await connection.execute('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
        if (!p.length || p[0].stock < item.quantity) throw Object.assign(new Error(`Not enough stock to reactivate order item ${p[0]?.name || item.product_id}.`), { status: 409 });
      }
      for (const item of items) await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    await connection.commit();
    res.json({ message: 'Order status updated.', status });
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}));

app.post('/api/newsletter', asyncRoute(async (req, res) => {
  const email = clean(req.body.email, 150).toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  await pool.execute('INSERT INTO newsletter_subscribers (email) VALUES (?) ON DUPLICATE KEY UPDATE email = VALUES(email)', [email]);
  res.status(201).json({ message: 'You are on the list. Thank you!' });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error.message);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Something went wrong. Please try again.' });
});

app.listen(PORT, () => console.log(`HerCloset is running at http://localhost:${PORT}`));

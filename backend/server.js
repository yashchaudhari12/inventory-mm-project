const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- PRODUCTS ----------
app.get('/api/products', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*, v.name AS default_vendor_name
    FROM products p
    LEFT JOIN vendors v ON v.id = p.default_vendor_id
    ORDER BY p.id
  `);
  res.json(rows);
});

app.post('/api/products', async (req, res) => {
  const { sku, name, category, unit, unit_price, reorder_level, default_vendor_id } = req.body;
  const [result] = await pool.query(
    `INSERT INTO products (sku, name, category, unit, unit_price, reorder_level, default_vendor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [sku, name, category, unit, unit_price, reorder_level, default_vendor_id || null]
  );
  res.json({ id: result.insertId, ...req.body });
});

app.put('/api/products/:id', async (req, res) => {
  const { name, category, unit, unit_price, reorder_level, default_vendor_id } = req.body;
  await pool.query(
    `UPDATE products SET name=?, category=?, unit=?, unit_price=?, reorder_level=?, default_vendor_id=? WHERE id=?`,
    [name, category, unit, unit_price, reorder_level, default_vendor_id || null, req.params.id]
  );
  res.json({ updated: true });
});

app.delete('/api/products/:id', async (req, res) => {
  await pool.query(`DELETE FROM products WHERE id=?`, [req.params.id]);
  res.json({ deleted: true });
});

// ---------- STOCK ----------
app.get('/api/stock', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT s.*, p.sku, p.name, p.category, p.reorder_level
    FROM stock s
    JOIN products p ON p.id = s.product_id
    ORDER BY s.id
  `);
  res.json(rows);
});

app.get('/api/stock/low', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT
      p.id AS product_id, p.sku, p.name, p.category,
      s.quantity_on_hand, p.reorder_level,
      (p.reorder_level - s.quantity_on_hand) AS shortfall,
      v.name AS default_vendor, v.lead_time_days
    FROM products p
    JOIN stock s ON s.product_id = p.id
    LEFT JOIN vendors v ON v.id = p.default_vendor_id
    WHERE s.quantity_on_hand < p.reorder_level
  `);
  res.json(rows);
});

app.put('/api/stock/:productId', async (req, res) => {
  const { quantity_on_hand, movement_type, notes } = req.body;
  await pool.query(
    `UPDATE stock SET quantity_on_hand=? WHERE product_id=?`,
    [quantity_on_hand, req.params.productId]
  );
  await pool.query(
    `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, notes)
     VALUES (?, ?, ?, 'MANUAL_ADJUSTMENT', ?)`,
    [req.params.productId, movement_type || 'ADJUSTMENT', quantity_on_hand, notes || 'Manual stock update']
  );
  res.json({ updated: true });
});

// ---------- VENDORS ----------
app.get('/api/vendors', async (req, res) => {
  const [rows] = await pool.query(`SELECT * FROM vendors ORDER BY id`);
  res.json(rows);
});

app.post('/api/vendors', async (req, res) => {
  const { name, contact_email, contact_phone, lead_time_days, rating } = req.body;
  const [result] = await pool.query(
    `INSERT INTO vendors (name, contact_email, contact_phone, lead_time_days, rating) VALUES (?, ?, ?, ?, ?)`,
    [name, contact_email, contact_phone, lead_time_days, rating || 4.0]
  );
  res.json({ id: result.insertId, ...req.body });
});

app.get('/api/vendors/:id/purchase-orders', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT po.*, p.name AS product_name FROM purchase_orders po
     JOIN products p ON p.id = po.product_id
     WHERE po.vendor_id = ? ORDER BY po.order_date DESC`,
    [req.params.id]
  );
  res.json(rows);
});

// ---------- PURCHASE ORDERS ----------
app.get('/api/purchase-orders', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT po.*, p.name AS product_name, p.sku, v.name AS vendor_name
    FROM purchase_orders po
    JOIN products p ON p.id = po.product_id
    JOIN vendors v ON v.id = po.vendor_id
    ORDER BY po.order_date DESC
  `);
  res.json(rows);
});

app.post('/api/purchase-orders', async (req, res) => {
  const { vendor_id, product_id, quantity, unit_price, order_date, expected_date } = req.body;
  const po_number = 'PO-' + Date.now();
  const [result] = await pool.query(
    `INSERT INTO purchase_orders (po_number, vendor_id, product_id, quantity, unit_price, status, order_date, expected_date)
     VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)`,
    [po_number, vendor_id, product_id, quantity, unit_price, order_date, expected_date]
  );
  res.json({ id: result.insertId, po_number });
});

app.put('/api/purchase-orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const received_date = status === 'Received' ? new Date().toISOString().slice(0, 10) : null;

  await pool.query(
    `UPDATE purchase_orders SET status=?, received_date=? WHERE id=?`,
    [status, received_date, req.params.id]
  );

  // If received, bump stock and log movement automatically
  if (status === 'Received') {
    const [[po]] = await pool.query(`SELECT * FROM purchase_orders WHERE id=?`, [req.params.id]);
    await pool.query(
      `UPDATE stock SET quantity_on_hand = quantity_on_hand + ? WHERE product_id=?`,
      [po.quantity, po.product_id]
    );
    await pool.query(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_type, reference_id, notes)
       VALUES (?, 'IN', ?, 'PURCHASE_ORDER', ?, ?)`,
      [po.product_id, po.quantity, po.id, `Received against ${po.po_number}`]
    );
  }

  res.json({ updated: true });
});

// ---------- DASHBOARD SUMMARY ----------
app.get('/api/dashboard', async (req, res) => {
  const [[{ total_value }]] = await pool.query(`
    SELECT SUM(s.quantity_on_hand * p.unit_price) AS total_value
    FROM stock s JOIN products p ON p.id = s.product_id
  `);
  const [[{ low_stock_count }]] = await pool.query(`
    SELECT COUNT(*) AS low_stock_count
    FROM products p
    JOIN stock s ON s.product_id = p.id
    WHERE s.quantity_on_hand < p.reorder_level
`);
  const [[{ pending_po_count }]] = await pool.query(
    `SELECT COUNT(*) AS pending_po_count FROM purchase_orders WHERE status IN ('Pending','Ordered','Shipped')`
  );
  const [poByStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM purchase_orders GROUP BY status`
  );
  res.json({ total_value, low_stock_count, pending_po_count, poByStatus });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`API running on http://localhost:${PORT}`));

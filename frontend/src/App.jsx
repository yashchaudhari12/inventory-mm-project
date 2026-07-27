import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const API = 'https://inventory-mm-project.onrender.com/api';
const COLORS = ['#ef6c00', '#1565c0', '#5e35b1', '#2e7d32', '#c62828'];

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    fetch(`${API}/dashboard`).then(r => r.json()).then(setStats);
    fetch(`${API}/stock/low`).then(r => r.json()).then(setLowStock);
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="cards">
        <div className="card">
          <div className="label">Total Inventory Value</div>
          <div className="value">₹{Number(stats.total_value).toLocaleString('en-IN')}</div>
        </div>
        <div className="card warn">
          <div className="label">Low Stock Items</div>
          <div className="value">{stats.low_stock_count}</div>
        </div>
        <div className="card">
          <div className="label">Open Purchase Orders</div>
          <div className="value">{stats.pending_po_count}</div>
        </div>
      </div>

      <div className="panel" style={{ display: 'flex', gap: 30, alignItems: 'center' }}>
        <div style={{ width: 300, height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={stats.poByStatus} dataKey="count" nameKey="status" outerRadius={80} label>
                {stats.poByStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 10 }}>Low Stock Alerts</h3>
          <table>
            <thead><tr><th>SKU</th><th>Product</th><th>On Hand</th><th>Reorder Level</th><th>Vendor</th></tr></thead>
            <tbody>
              {lowStock.map(item => (
                <tr key={item.product_id}>
                  <td>{item.sku}</td>
                  <td>{item.name}</td>
                  <td><span className="badge low">{item.quantity_on_hand}</span></td>
                  <td>{item.reorder_level}</td>
                  <td>{item.default_vendor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', category: 'Raw Material', unit: 'pcs', unit_price: '', reorder_level: '', default_vendor_id: '' });

  const load = () => fetch(`${API}/products`).then(r => r.json()).then(setProducts);
  useEffect(() => { load(); fetch(`${API}/vendors`).then(r => r.json()).then(setVendors); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ sku: '', name: '', category: 'Raw Material', unit: 'pcs', unit_price: '', reorder_level: '', default_vendor_id: '' });
    load();
  };

  return (
    <div>
      <h1>Products</h1>
      <form className="inline" onSubmit={submit}>
        <input placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} required />
        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          <option>Raw Material</option><option>Component</option><option>Finished Good</option>
        </select>
        <input placeholder="Unit (kg/pcs)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
        <input placeholder="Unit Price" type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} required />
        <input placeholder="Reorder Level" type="number" value={form.reorder_level} onChange={e => setForm({ ...form, reorder_level: e.target.value })} required />
        <select value={form.default_vendor_id} onChange={e => setForm({ ...form, default_vendor_id: e.target.value })}>
          <option value="">Default Vendor</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <button type="submit">Add Product</button>
      </form>

      <table>
        <thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Unit Price</th><th>Reorder Lvl</th><th>Vendor</th></tr></thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.sku}</td><td>{p.name}</td><td>{p.category}</td>
              <td>₹{Number(p.unit_price).toFixed(2)}</td><td>{p.reorder_level}</td>
              <td>{p.default_vendor_name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ name: '', contact_email: '', contact_phone: '', lead_time_days: '', rating: '' });

  const load = () => fetch(`${API}/vendors`).then(r => r.json()).then(setVendors);
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/vendors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ name: '', contact_email: '', contact_phone: '', lead_time_days: '', rating: '' });
    load();
  };

  return (
    <div>
      <h1>Vendors</h1>
      <form className="inline" onSubmit={submit}>
        <input placeholder="Vendor Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
        <input placeholder="Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
        <input placeholder="Lead Time (days)" type="number" value={form.lead_time_days} onChange={e => setForm({ ...form, lead_time_days: e.target.value })} required />
        <button type="submit">Add Vendor</button>
      </form>

      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Lead Time</th><th>Rating</th></tr></thead>
        <tbody>
          {vendors.map(v => (
            <tr key={v.id}>
              <td>{v.name}</td><td>{v.contact_email}</td><td>{v.contact_phone}</td>
              <td>{v.lead_time_days} days</td><td>⭐ {v.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ vendor_id: '', product_id: '', quantity: '', unit_price: '', order_date: '', expected_date: '' });

  const load = () => fetch(`${API}/purchase-orders`).then(r => r.json()).then(setPos);
  useEffect(() => {
    load();
    fetch(`${API}/products`).then(r => r.json()).then(setProducts);
    fetch(`${API}/vendors`).then(r => r.json()).then(setVendors);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await fetch(`${API}/purchase-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ vendor_id: '', product_id: '', quantity: '', unit_price: '', order_date: '', expected_date: '' });
    load();
  };

  const updateStatus = async (id, status) => {
    await fetch(`${API}/purchase-orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  };

  return (
    <div>
      <h1>Purchase Orders</h1>
      <form className="inline" onSubmit={submit}>
        <select value={form.vendor_id} onChange={e => setForm({ ...form, vendor_id: e.target.value })} required>
          <option value="">Vendor</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
          <option value="">Product</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input placeholder="Quantity" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
        <input placeholder="Unit Price" type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} required />
        <input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} required />
        <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} />
        <button type="submit">Create PO</button>
      </form>

      <table>
        <thead><tr><th>PO Number</th><th>Vendor</th><th>Product</th><th>Qty</th><th>Status</th><th>Order Date</th><th>Expected</th></tr></thead>
        <tbody>
          {pos.map(po => (
            <tr key={po.id}>
              <td>{po.po_number}</td><td>{po.vendor_name}</td><td>{po.product_name}</td><td>{po.quantity}</td>
              <td><span className={`badge ${po.status}`}>{po.status}</span></td>
              <td>{po.order_date?.slice(0,10)}</td><td>{po.expected_date?.slice(0,10) || '—'}</td>
              <td>
                <select className="status-select" value={po.status} onChange={e => updateStatus(po.id, e.target.value)}>
                  {['Pending','Ordered','Shipped','Received','Cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const tabs = { dashboard: Dashboard, products: Products, vendors: Vendors, orders: PurchaseOrders };
  const Active = tabs[tab];

  return (
    <div className="app">
      <div className="sidebar">
        <h2>⚙ Inventory MM</h2>
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>Dashboard</button>
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Products</button>
        <button className={tab === 'vendors' ? 'active' : ''} onClick={() => setTab('vendors')}>Vendors</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Purchase Orders</button>
      </div>
      <div className="main"><Active /></div>
    </div>
  );
}

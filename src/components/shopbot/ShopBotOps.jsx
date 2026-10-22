import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MessageCircle, RefreshCw, Search, Truck, CheckCircle2, Package, MapPin, Plus,
  Save, AlertTriangle, DollarSign, Boxes, ClipboardList, ShieldCheck, Image as ImageIcon, Upload
} from 'lucide-react';
import axios from 'axios';
import { supabase } from '../../supabase';

// Base URL of the isolated shopbot service (separate Render service from imageke-api).
const BASE = (import.meta.env.VITE_SHOPBOT_API_URL || '').replace(/\/$/, '');
const FALLBACK = (import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com').replace(/\/$/, '') + '/api/shopbot';
const SHOPBOT_URL = BASE || FALLBACK;
const ACCENT = '#8b5cf6';
const ACCENT_SOFT = 'rgba(139, 92, 246, 0.15)';

// ── shared style tokens (same card / tab / table language as Digital Asset Vault) ──
const card = { backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px' };
const label = { fontSize: '12px', color: '#a1a1aa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' };
const input = {
  padding: '8px 10px', borderRadius: '8px', border: '1px solid #27272a', backgroundColor: '#0a0a0c',
  color: '#fff', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box'
};
const btn = (primary, disabled) => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px',
  fontSize: '13px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
  border: primary ? 'none' : '1px solid #27272a',
  backgroundColor: primary ? ACCENT : '#18181b', color: primary ? '#fff' : '#e4e4e7'
});
const th = { textAlign: 'left', padding: '12px 16px', fontSize: '11px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #27272a' };
const td = { padding: '12px 16px', fontSize: '13px', color: '#e4e4e7', borderBottom: '1px solid #1c1c1f', verticalAlign: 'top' };

const PAY_BADGE = {
  paid: ['#10b981', 'Paid'], unpaid: ['#f59e0b', 'Awaiting payment'], expired: ['#71717a', 'Expired'],
  cancelled: ['#71717a', 'Cancelled'], failed: ['#ef4444', 'Failed'], refund_due: ['#ef4444', 'Refund due'], mismatch: ['#ef4444', 'Review amount']
};
const FUL_BADGE = {
  pending: ['#f59e0b', 'Pending'], dispatched: ['#3b82f6', 'Dispatched'], delivered: ['#10b981', 'Delivered'], cancelled: ['#71717a', 'Cancelled']
};

const Badge = ({ map, k }) => {
  const [c, t] = map[k] || ['#71717a', k];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: c, backgroundColor: `${c}22`, border: `1px solid ${c}55`, whiteSpace: 'nowrap' }}>
      {t}
    </span>
  );
};

const kes = (n) => `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' }) : '-');

export function ShopBotOps() {
  const [data, setData] = useState({ metrics: {}, orders: [], products: [], zones: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('orders'); // 'orders' | 'catalog' | 'zones'
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState({});
  const [edits, setEdits] = useState({}); // variantId -> {price_kes,on_hand} | zoneId -> {name,fee_kes}
  const [newProduct, setNewProduct] = useState({ name: '', description: '', category: 'General', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newVariant, setNewVariant] = useState({}); // productId -> {label,sku,price_kes,stock}
  const [newZone, setNewZone] = useState({ name: '', fee_kes: '' });

  const say = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const uploadProductImage = async (file, onUploaded) => {
    if (!file) return;
    if (file.size > 1048576) {
      say('File exceeds 1 MB cap. Please pick an image under 1 MB to protect Supabase free tier.', false);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      say('Only JPG, PNG, and WebP images are allowed.', false);
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('shop-products').upload(filename, file, {
        cacheControl: '3600',
        upsert: false
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('shop-products').getPublicUrl(filename);
      onUploaded(publicUrl);
      say('Image uploaded successfully (capped under 1 MB).');
    } catch (err) {
      say(`Upload failed: ${err.message}`, false);
    } finally {
      setUploadingImage(false);
    }
  };

  const api = useCallback(async (method, path, body) => {
    if (!SHOPBOT_URL) throw new Error('VITE_SHOPBOT_API_URL is not set.');
    const { data: s } = await supabase.auth.getSession();
    const token = s?.session?.access_token;
    if (!token) throw new Error('Please sign in again.');
    try {
      const res = await axios({ method, url: `${SHOPBOT_URL}/admin${path}`, data: body, headers: { Authorization: `Bearer ${token}` }, timeout: 20000 });
      return res.data;
    } catch (e) {
      throw new Error(e.response?.data?.error || e.message);
    }
  }, []);

  const load = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);
    try {
      setData(await api('get', '/overview'));
      setError('');
    } catch (e) { setError(e.message); }
    setLoading(false); setRefreshing(false);
  }, [api]);

  useEffect(() => {
    load();
    const t = setInterval(() => load(), 30000); // live order feed
    return () => clearInterval(t);
  }, [load]);

  const run = async (key, fn, okMsg) => {
    setBusy((b) => ({ ...b, [key]: true }));
    try { await fn(); say(okMsg); await load(true); }
    catch (e) { say(e.message, false); }
    setBusy((b) => ({ ...b, [key]: false }));
  };

  const setStatus = (o, status) =>
    run(`o${o.id}`, () => api('patch', `/orders/${o.id}/status`, { status }), `${o.order_no} marked ${status}. Customer notified.`);

  const saveVariant = (v) => {
    const e = edits[v.id] || {};
    return run(`v${v.id}`, async () => {
      if (e.price_kes !== undefined) await api('patch', `/variants/${v.id}`, { price_kes: Number(e.price_kes) });
      if (e.on_hand !== undefined) await api('put', `/inventory/${v.id}`, { on_hand: Number(e.on_hand) });
      setEdits((x) => { const n = { ...x }; delete n[v.id]; return n; });
    }, 'Variant saved.');
  };

  const saveZone = (z) => {
    const e = edits[z.id] || {};
    return run(`z${z.id}`, async () => {
      await api('patch', `/zones/${z.id}`, { name: e.name, fee_kes: e.fee_kes !== undefined ? Number(e.fee_kes) : undefined });
      setEdits((x) => { const n = { ...x }; delete n[z.id]; return n; });
    }, 'Delivery zone saved.');
  };

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return !q ? data.orders : data.orders.filter((o) =>
      [o.order_no, o.wa_id, o.customer_name, o.zone_name, o.items, o.mpesa_receipt].some((f) => String(f || '').toLowerCase().includes(q)));
  }, [data.orders, search]);

  const m = data.metrics || {};
  const metricCards = [
    { t: 'Paid Orders', v: m.paid_orders ?? 0, s: 'Confirmed via M-PESA', icon: <ShieldCheck size={16} color="#3b82f6" />, c: '#fff' },
    { t: 'Revenue', v: kes(m.revenue_kes), s: 'Gross, paid orders only', icon: <DollarSign size={16} color={ACCENT} />, c: ACCENT },
    { t: 'To Fulfil', v: m.open_orders ?? 0, s: 'Pending or dispatched', icon: <Truck size={16} color="#f59e0b" />, c: '#f59e0b' },
    { t: 'Stock Alerts', v: m.low_stock ?? 0, s: `${m.needs_attention ?? 0} order(s) need attention`, icon: <AlertTriangle size={16} color="#ef4444" />, c: (m.low_stock || m.needs_attention) ? '#ef4444' : '#fff' },
  ];

  const tabBtn = (id, text, icon) => (
    <button key={id} onClick={() => setTab(id)} style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      fontSize: '13px', fontWeight: 700, backgroundColor: tab === id ? '#18181b' : 'transparent', color: tab === id ? ACCENT : '#a1a1aa',
      borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent'
    }}>{icon}{text}</button>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #27272a' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', backgroundColor: ACCENT_SOFT, color: ACCENT }}>
              <MessageCircle size={18} />
            </span>
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
              WhatsApp Commerce Bot
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
            Catalog, live stock, delivery zones and order fulfilment. Customers see every status change in chat.
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} style={btn(false, refreshing)}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing...' : 'Sync Orders'}
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {metricCards.map((c) => (
          <div key={c.t} style={{ ...card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={label}>{c.t}</span>{c.icon}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: c.c }}>{loading ? '...' : c.v}</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #27272a', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {tabBtn('orders', `Orders & Fulfilment (${data.orders.length})`, <ClipboardList size={14} />)}
        {tabBtn('catalog', 'Catalog & Stock', <Boxes size={14} />)}
        {tabBtn('zones', 'Delivery Zones', <MapPin size={14} />)}
      </div>

      {/* ORDERS */}
      {tab === 'orders' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #27272a', position: 'relative' }}>
            <Search size={14} color="#71717a" style={{ position: 'absolute', left: '32px', top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order no, phone, item, zone, M-PESA ref..." style={{ ...input, paddingLeft: '34px' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead><tr>
                <th style={th}>Order</th><th style={th}>Customer</th><th style={th}>Items & Zone</th>
                <th style={th}>Total</th><th style={th}>Payment</th><th style={th}>Fulfilment</th><th style={th}>Action</th>
              </tr></thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#71717a', padding: '40px' }}>{loading ? 'Loading...' : 'No orders yet. Message your bot "Hi" to place a test order.'}</td></tr>
                )}
                {orders.map((o) => {
                  const paid = o.payment_status === 'paid';
                  return (
                    <tr key={o.id}>
                      <td style={td}><div style={{ fontWeight: 700 }}>{o.order_no}</div><div style={{ fontSize: '11px', color: '#71717a' }}>{fmtDate(o.created_at)}</div></td>
                      <td style={td}><div>{o.customer_name || 'Customer'}</div><div style={{ fontSize: '11px', color: '#71717a' }}>+{o.wa_id}</div></td>
                      <td style={td}><div>{o.items}</div><div style={{ fontSize: '11px', color: '#71717a' }}><MapPin size={10} /> {o.zone_name}</div></td>
                      <td style={td}><div style={{ fontWeight: 700 }}>{kes(o.total_kes)}</div>{o.mpesa_receipt && <div style={{ fontSize: '11px', color: '#71717a' }}>{o.mpesa_receipt}</div>}</td>
                      <td style={td}><Badge map={PAY_BADGE} k={o.payment_status} /></td>
                      <td style={td}>{paid || o.fulfillment_status !== 'pending' ? <Badge map={FUL_BADGE} k={o.fulfillment_status} /> : <span style={{ color: '#52525b' }}>-</span>}</td>
                      <td style={td}>
                        {paid && o.fulfillment_status === 'pending' && (
                          <button disabled={busy[`o${o.id}`]} onClick={() => setStatus(o, 'dispatched')} style={btn(true, busy[`o${o.id}`])}><Truck size={13} /> Dispatch</button>
                        )}
                        {paid && o.fulfillment_status === 'dispatched' && (
                          <button disabled={busy[`o${o.id}`]} onClick={() => setStatus(o, 'delivered')} style={{ ...btn(false, busy[`o${o.id}`]), color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}><CheckCircle2 size={13} /> Delivered</button>
                        )}
                        {o.payment_status === 'refund_due' && <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 700 }}>Refund via Paystack</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CATALOG & STOCK */}
      {tab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <form style={{ ...card, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            onSubmit={(e) => {
              e.preventDefault();
              run('np', async () => {
                await api('post', '/products', newProduct);
                setNewProduct({ name: '', description: '', category: 'General', image_url: '' });
              }, 'Product added. Now add its variants.');
            }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 2fr', gap: '12px' }}>
              <div>
                <div style={{ ...label, marginBottom: '6px' }}>Product Name *</div>
                <input required value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="e.g. Running Shoes" style={input} />
              </div>
              <div>
                <div style={{ ...label, marginBottom: '6px' }}>Category</div>
                <input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="e.g. Shoes, Electronics" style={input} />
              </div>
              <div>
                <div style={{ ...label, marginBottom: '6px' }}>Description</div>
                <input value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} placeholder="Short description seen by WhatsApp shoppers" style={input} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '6px', borderTop: '1px solid #1f1f23' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ ...btn(false, uploadingImage), cursor: uploadingImage ? 'wait' : 'pointer' }}>
                  <Upload size={14} /> {uploadingImage ? 'Uploading (1MB cap)...' : 'Upload Image (Max 1MB)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadProductImage(file, (url) => setNewProduct(prev => ({ ...prev, image_url: url })));
                    }}
                  />
                </label>
                {newProduct.image_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={newProduct.image_url} alt="Preview" style={{ width: '34px', height: '34px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${ACCENT}` }} />
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Image Ready (Bot sends in chat)</span>
                    <button type="button" onClick={() => setNewProduct(prev => ({ ...prev, image_url: '' }))} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                  </div>
                ) : (
                  <span style={{ fontSize: '11px', color: '#71717a' }}>Optional image shown in WhatsApp when user browses variants (Capped 1MB)</span>
                )}
              </div>
              <button type="submit" disabled={busy.np || uploadingImage} style={btn(true, busy.np || uploadingImage)}>
                <Plus size={14} /> Add Product
              </button>
            </div>
          </form>

          {data.products.length === 0 && !loading && <div style={{ ...card, padding: '40px', textAlign: 'center', color: '#71717a', fontSize: '13px' }}>No products yet.</div>}

          {data.products.map((p) => {
            const nv = newVariant[p.id] || { label: '', sku: '', price_kes: '', stock: '' };
            return (
              <div key={p.id} style={{ ...card, overflow: 'hidden', opacity: p.active ? 1 : 0.6 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #27272a' }} />
                    ) : (
                      <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#18181b', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={18} color={ACCENT} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{p.name}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: ACCENT, border: `1px solid rgba(139, 92, 246, 0.3)` }}>
                          {p.category || 'General'}
                        </span>
                      </div>
                      {p.description && <div style={{ fontSize: '12px', color: '#71717a' }}>{p.description}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ ...btn(false, busy[`img${p.id}`]), fontSize: '11px', padding: '6px 10px', cursor: 'pointer' }}>
                      <ImageIcon size={12} /> {p.image_url ? 'Change Image' : 'Add Image'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadProductImage(file, (url) => {
                              run(`img${p.id}`, () => api('patch', `/products/${p.id}`, { image_url: url }), 'Product image updated.');
                            });
                          }
                        }}
                      />
                    </label>
                    <button disabled={busy[`p${p.id}`]} onClick={() => run(`p${p.id}`, () => api('patch', `/products/${p.id}`, { active: !p.active }), p.active ? 'Hidden from bot.' : 'Visible in bot.')} style={btn(false, busy[`p${p.id}`])}>
                      {p.active ? 'Hide from bot' : 'Show in bot'}
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px' }}>
                    <thead><tr><th style={th}>Variant</th><th style={th}>SKU</th><th style={th}>Price (KES)</th><th style={th}>On hand</th><th style={th}>Reserved</th><th style={th}>Available</th><th style={th}></th></tr></thead>
                    <tbody>
                      {p.variants.map((v) => {
                        const e = edits[v.id] || {};
                        const dirty = e.price_kes !== undefined || e.on_hand !== undefined;
                        const avail = (e.on_hand !== undefined ? Number(e.on_hand) : v.on_hand) - v.reserved;
                        return (
                          <tr key={v.id} style={{ opacity: v.active ? 1 : 0.5 }}>
                            <td style={td}>{v.label}</td>
                            <td style={{ ...td, color: '#71717a' }}>{v.sku || '-'}</td>
                            <td style={td}><input type="number" min="0" value={e.price_kes ?? v.price_kes} onChange={(ev) => setEdits({ ...edits, [v.id]: { ...e, price_kes: ev.target.value } })} style={{ ...input, width: '110px' }} /></td>
                            <td style={td}><input type="number" min="0" value={e.on_hand ?? v.on_hand} onChange={(ev) => setEdits({ ...edits, [v.id]: { ...e, on_hand: ev.target.value } })} style={{ ...input, width: '90px' }} /></td>
                            <td style={{ ...td, color: v.reserved ? '#f59e0b' : '#71717a' }}>{v.reserved}</td>
                            <td style={{ ...td, fontWeight: 800, color: avail <= 0 ? '#ef4444' : avail <= 3 ? '#f59e0b' : '#10b981' }}>{avail <= 0 ? 'Sold out' : avail}</td>
                            <td style={td}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button disabled={!dirty || busy[`v${v.id}`]} onClick={() => saveVariant(v)} style={btn(true, !dirty || busy[`v${v.id}`])}><Save size={13} /> Save</button>
                                <button onClick={() => run(`va${v.id}`, () => api('patch', `/variants/${v.id}`, { active: !v.active }), v.active ? 'Variant hidden.' : 'Variant visible.')} style={btn(false)}>{v.active ? 'Hide' : 'Show'}</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <form style={{ padding: '14px 20px', borderTop: '1px solid #27272a', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}
                  onSubmit={(e) => { e.preventDefault(); run(`nv${p.id}`, async () => { await api('post', '/variants', { product_id: p.id, ...nv }); setNewVariant({ ...newVariant, [p.id]: undefined }); }, 'Variant added.'); }}>
                  {[['label', 'Variant (e.g. Size 42)', 'text', true], ['sku', 'SKU', 'text', false], ['price_kes', 'Price KES', 'number', true], ['stock', 'Stock', 'number', true]].map(([k, ph, type, req]) => (
                    <input key={k} type={type} min={type === 'number' ? 0 : undefined} required={req} placeholder={ph} value={nv[k]} onChange={(ev) => setNewVariant({ ...newVariant, [p.id]: { ...nv, [k]: ev.target.value } })} style={input} />
                  ))}
                  <button type="submit" disabled={busy[`nv${p.id}`]} style={btn(false, busy[`nv${p.id}`])}><Plus size={13} /> Add variant</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {/* DELIVERY ZONES */}
      {tab === 'zones' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '560px' }}>
              <thead><tr><th style={th}>Area name</th><th style={th}>Delivery fee (KES)</th><th style={th}>Status</th><th style={th}></th></tr></thead>
              <tbody>
                {data.zones.map((z) => {
                  const e = edits[z.id] || {};
                  const dirty = e.name !== undefined || e.fee_kes !== undefined;
                  return (
                    <tr key={z.id} style={{ opacity: z.active ? 1 : 0.5 }}>
                      <td style={td}><input value={e.name ?? z.name} onChange={(ev) => setEdits({ ...edits, [z.id]: { ...e, name: ev.target.value } })} style={{ ...input, maxWidth: '260px' }} /></td>
                      <td style={td}><input type="number" min="0" value={e.fee_kes ?? z.fee_kes} onChange={(ev) => setEdits({ ...edits, [z.id]: { ...e, fee_kes: ev.target.value } })} style={{ ...input, width: '120px' }} /></td>
                      <td style={td}><span style={{ color: z.active ? '#10b981' : '#71717a', fontWeight: 700 }}>{z.active ? 'Active' : 'Hidden'}</span></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button disabled={!dirty || busy[`z${z.id}`]} onClick={() => saveZone(z)} style={btn(true, !dirty || busy[`z${z.id}`])}><Save size={13} /> Save</button>
                          <button onClick={() => run(`za${z.id}`, () => api('patch', `/zones/${z.id}`, { active: !z.active }), z.active ? 'Zone hidden.' : 'Zone active.')} style={btn(false)}>{z.active ? 'Hide' : 'Show'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <form style={{ padding: '14px 20px', borderTop: '1px solid #27272a', display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'end' }}
            onSubmit={(e) => { e.preventDefault(); run('nz', async () => { await api('post', '/zones', newZone); setNewZone({ name: '', fee_kes: '' }); }, 'Delivery zone added.'); }}>
            <input required placeholder="New area (e.g. Nyamataro)" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} style={input} />
            <input required type="number" min="0" placeholder="Fee KES" value={newZone.fee_kes} onChange={(e) => setNewZone({ ...newZone, fee_kes: e.target.value })} style={input} />
            <button type="submit" disabled={busy.nz} style={btn(true, busy.nz)}><Plus size={14} /> Add zone</button>
          </form>
          <div style={{ padding: '0 20px 16px', fontSize: '11px', color: '#71717a' }}>WhatsApp lists show at most 10 areas. The first 10 active zones are offered to customers.</div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 100, padding: '12px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, backgroundColor: toast.ok ? '#052e1c' : '#3f0d0d', border: `1px solid ${toast.ok ? '#10b98166' : '#ef444466'}`, color: toast.ok ? '#6ee7b7' : '#fca5a5', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

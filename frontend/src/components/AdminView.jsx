import { useState, useEffect } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Card, Modal, Input, ErrorBanner, Divider } from "./Common.jsx";

const TABS = [
  { id: "dashboard", label: " Dashboard" },
  { id: "orders", label: " Mesas" },
  { id: "menu", label: " Menú" },
  { id: "promos", label: " Promociones" },
  { id: "inventory", label: " Inventario" },
  { id: "users", label: " Usuarios" },
];

export default function AdminView({ user, products, promos, orders, onOrdersChanged, onProductsChanged, onPromosChanged, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (tab === "dashboard") {
      api.getDashboard().then(setDashboard).catch(() => {});
    }
  }, [tab, orders]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>ADMIN</div>
          </div>
        </div>
        <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
      </div>

      {/* Tabs */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 16px", border: "none", borderBottom: `2px solid ${tab === t.id ? C.neon : "transparent"}`,
            background: "transparent", color: tab === t.id ? C.neon : C.muted,
            fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit", fontWeight: 500,
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        {tab === "dashboard" && <DashboardTab data={dashboard} orders={orders} />}
        {tab === "orders" && <OrdersTab orders={orders} onChanged={onOrdersChanged} />}
        {tab === "menu" && <MenuTab products={products} onChanged={onProductsChanged} />}
        {tab === "promos" && <PromosTab promos={promos} onChanged={onPromosChanged} />}
        {tab === "inventory" && <InventoryTab products={products} onChanged={onProductsChanged} />}
        {tab === "users" && <UsersTab businessId={user.businessId} />}
      </div>
    </div>
  );
}

/* ─── Dashboard ─── */
function DashboardTab({ data, orders }) {
  if (!data) return <div style={{ textAlign: "center", color: C.muted, marginTop: 40 }}>Cargando...</div>;
  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Ventas hoy", value: fmt(data.totalToday || 0), color: C.neon },
          { label: "Pagos cobrados", value: data.ordersToday || 0, color: C.blue },
          { label: "Mesas activas", value: data.activeOrders ?? orders.filter(o => !o.is_closed).length, color: C.amber },
          { label: "Ticket promedio", value: fmt(data.avgTicket || 0), color: C.neon2 },
        ].map(stat => (
          <Card key={stat.label}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </Card>
        ))}
      </div>
      {data.topProducts?.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Top productos</div>
          {data.topProducts.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted, fontSize: 11, minWidth: 16 }}>#{i + 1}</span>
              <span style={{ fontSize: 16 }}>{p.emoji}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
              <Badge color={C.neon}>{p.qty} vendidos</Badge>
              <span style={{ color: C.neon, fontSize: 13 }}>{fmt(p.total)}</span>
            </div>
          ))}
        </>
      )}
      {data.byPayMethod?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Por método de pago</div>
          {data.byPayMethod.map(m => (
            <div key={m.pay} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
              <span>{m.pay === "ef" ? "💵 Efectivo" : m.pay === "ta" ? "💳 Tarjeta" : "📱 QR/Trans."}</span>
              <span style={{ color: C.neon }}>{fmt(m.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Mesas / cuentas activas ─── */
function OrdersTab({ orders, onChanged }) {
  const STATUS_COLOR = { pendiente: C.red, preparando: C.amber, listo: C.neon };
  const STATUS_LABEL = { pendiente: "Pendiente", preparando: "Preparando", listo: "Listo" };
  const [payModal, setPayModal] = useState(null);

  const active = orders.filter(o => !o.is_closed);
  const closed = orders.filter(o => o.is_closed);

  return (
    <div className="fade-in">
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
        Mesas activas ({active.length})
      </div>
      {!active.length && <div style={{ textAlign: "center", color: C.muted, marginTop: 20, marginBottom: 20 }}>Sin mesas abiertas</div>}
      {active.map(order => {
        const pending = order.items.filter(it => !it.paid);
        const paidCount = order.items.length - pending.length;
        return (
          <Card key={order.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>
                {/^B\d+$/.test(String(order.mesa)) ? `Barra ${order.mesa}` : `Mesa ${order.mesa}`}
              </span>
              <span style={{ fontSize: 11, color: C.muted }}>
                {order.created_by_name ? `Atiende: ${order.created_by_name}` : ""}
              </span>
            </div>
            <div style={{ marginBottom: 6 }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 12, opacity: item.paid ? 0.45 : 1 }}>
                  <span>{item.qty}× {item.name} {item.paid && "✓"}</span>
                  <Badge color={STATUS_COLOR[item.status] || C.muted}>{STATUS_LABEL[item.status] || item.status}</Badge>
                </div>
              ))}
            </div>
            {order.note && <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>📝 {order.note}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: C.neon }}>{fmt(order.total)}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {paidCount > 0 && <Badge color={C.neon}>{paidCount} pagado{paidCount > 1 ? "s" : ""}</Badge>}
                <Btn size="sm" variant="amber" onClick={() => setPayModal(order)}>💳 Cobrar</Btn>
              </div>
            </div>
          </Card>
        );
      })}

      {closed.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: C.muted, margin: "18px 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
            Cerradas hoy ({closed.length})
          </div>
          {closed.map(order => (
            <Card key={order.id} style={{ marginBottom: 8, opacity: 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12 }}>
                  {/^B\d+$/.test(String(order.mesa)) ? `Barra ${order.mesa}` : `Mesa ${order.mesa}`}
                </span>
                <span style={{ color: C.neon, fontSize: 12 }}>{fmt(order.total)}</span>
              </div>
            </Card>
          ))}
        </>
      )}

      {payModal && (
        <AdminPayModal order={payModal} onClose={() => setPayModal(null)} onPaid={() => { setPayModal(null); onChanged(); }} />
      )}
    </div>
  );
}

const PAY_METHODS = [
  { id: "ef", label: "Efectivo" },
  { id: "ta", label: "Tarjeta" },
  { id: "qr", label: "QR/Trans." },
];

// Mismo flujo de cobro parcial que tiene el mesero: el admin puede cobrar
// cualquier mesa desde aquí (ej. si el mesero está ocupado), eligiendo qué
// items se pagan y con qué método.
function AdminPayModal({ order, onClose, onPaid }) {
  const pendingIdx = order.items.map((it, i) => ({ it, i })).filter(x => !x.it.paid).map(x => x.i);
  const [selected, setSelected] = useState(new Set(pendingIdx));
  const [pay, setPay] = useState("ef");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (idx) => {
    setSelected(s => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };
  const selectedTotal = [...selected].reduce((s, idx) => s + order.items[idx].price * order.items[idx].qty, 0);

  const confirmPay = async () => {
    if (!selected.size) { setError("Selecciona al menos un producto a cobrar"); return; }
    setSaving(true); setError("");
    try {
      await api.payOrderItems(order.id, pay, [...selected]);
      onPaid();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Cobrar ${/^B\d+$/.test(String(order.mesa)) ? "Barra" : "Mesa"} ${order.mesa}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
        {order.items.map((item, idx) => (
          <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, opacity: item.paid ? 0.4 : 1, cursor: item.paid ? "default" : "pointer" }}>
            <input type="checkbox" checked={item.paid || selected.has(idx)} disabled={item.paid} onChange={() => toggle(idx)} />
            <span style={{ flex: 1, fontSize: 12 }}>{item.qty}× {item.name} {item.paid && <span style={{ color: C.neon, fontSize: 10 }}>(pagado)</span>}</span>
            <span style={{ fontSize: 12, color: C.neon }}>{fmt(item.price * item.qty)}</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {PAY_METHODS.map(m => (
          <button key={m.id} onClick={() => setPay(m.id)} style={{
            flex: 1, padding: "6px 2px", borderRadius: 6, fontSize: 11,
            background: pay === m.id ? C.neon2 + "22" : "transparent",
            border: `1px solid ${pay === m.id ? C.neon2 : C.border}`,
            color: pay === m.id ? C.neon2 : C.muted, cursor: "pointer",
          }}>{m.label}</button>
        ))}
      </div>
      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
        <span>A cobrar ahora</span><span style={{ color: C.neon }}>{fmt(selectedTotal)}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={confirmPay} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Cobrando..." : "Confirmar pago"}
        </Btn>
      </div>
    </Modal>
  );
}

/* ─── Menú ─── */
function MenuTab({ products, onChanged }) {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({
    name: "", cat: "", price: "", stock: "",
    imageFile: null, previewUrl: null, remove_image: false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const open = (p = null) => {
    setForm(p ? {
      name: p.name, cat: p.cat, price: p.price, stock: p.stock,
      imageFile: null, previewUrl: p.image_url ? `${API_URL}${p.image_url}` : null,
      remove_image: false,
    } : {
      name: "", cat: "", price: "", stock: "",
      imageFile: null, previewUrl: null, remove_image: false,
    });
    setModal(p || "new");
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({
      ...f,
      imageFile: file,
      previewUrl: URL.createObjectURL(file),
      remove_image: false,
    }));
  };

  const removeImage = () => {
    setForm(f => ({ ...f, imageFile: null, previewUrl: null, remove_image: true }));
  };

  const save = async () => {
    if (!form.name || !form.cat || !form.price) {
      setError("Nombre, categoría y precio son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        cat: form.cat,
        price: form.price,
        stock: form.stock || 0,
        ...(form.imageFile ? { image: form.imageFile } : {}),
        ...(form.remove_image ? { remove_image: "true" } : {}),
      };
      if (modal === "new") {
        await api.createProduct(payload);
      } else {
        await api.updateProduct(modal.id, payload);
      }
      onChanged();
      setModal(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    try { await api.deleteProduct(id); onChanged(); } catch (e) { alert(e.message); }
  };

  const cats = [...new Set(products.map(p => p.cat))];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{products.length} productos</div>
        <Btn variant="primary" size="sm" onClick={() => open()}>+ Nuevo</Btn>
      </div>

      {cats.map(cat => (
        <div key={cat} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{cat}</div>
          {products.filter(p => p.cat === cat).map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              {/* Imagen o emoji */}
              {p.image_url ? (
                <img
                  src={`${API_URL}${p.image_url}`}
                  alt={p.name}
                  style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <span style={{ fontSize: 24, width: 36, textAlign: "center" }}></span>
              )}
              <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
              <span style={{ color: C.neon, fontSize: 13 }}>${Number(p.price).toFixed(2)}</span>
              <Badge color={p.stock < 5 ? C.red : C.muted}>{p.stock} uds</Badge>
              <Btn size="sm" variant="ghost" onClick={() => open(p)}>✏️</Btn>
              <Btn size="sm" variant="ghost" onClick={() => del(p.id)}>🗑️</Btn>
            </div>
          ))}
        </div>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "Nuevo producto" : "Editar producto"} onClose={() => setModal(null)}>
          <ErrorBanner message={error} />

          {/* Preview de imagen */}
          <div style={{ marginBottom: 14 }}>
            {form.previewUrl ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={form.previewUrl}
                  alt="preview"
                  style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border2}` }}
                />
                <button
                  onClick={removeImage}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    background: "#000a", border: "none", color: "#fff",
                    borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 12,
                  }}
                >✕</button>
              </div>
            ) : (
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                height: 100, border: `2px dashed ${C.border2}`, borderRadius: 10,
                color: C.muted, cursor: "pointer", fontSize: 12, gap: 6,
              }}>
                <span style={{ fontSize: 24 }}>📷</span>
                <span>Toca para subir imagen</span>
                <span style={{ fontSize: 10 }}>JPG, PNG o WebP · máx 3 MB</span>
                <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
              </label>
            )}
          </div>

          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Categoría" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))} placeholder="ej. Cócteles" />
          <Input label="Precio" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
          <Input label="Stock inicial" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Promos ─── */
function PromosTab({ promos, onChanged }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", desc: "", type: "percent", discount: "", emoji: "🏷️" });
  const [error, setError] = useState("");

  const open = (p = null) => {
    setForm(p ? { name: p.name, desc: p.desc || "", type: p.type, discount: p.discount, emoji: p.emoji } : { name: "", desc: "", type: "percent", discount: "", emoji: "🏷️" });
    setModal(p || "new");
    setError("");
  };

  const save = async () => {
    if (!form.name) { setError("El nombre es obligatorio"); return; }
    try {
      if (modal === "new") {
        await api.createPromo({ ...form, discount: +form.discount || 0 });
      } else {
        await api.updatePromo(modal.id, { ...form, discount: +form.discount || 0 });
      }
      onChanged(); setModal(null);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{promos.length} promociones</div>
        <Btn variant="primary" size="sm" onClick={() => open()}>+ Nueva</Btn>
      </div>
      {promos.map(p => (
        <Card key={p.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{p.desc}</div>
              <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>
                {p.type === "2x1" ? "2×1" : `${p.discount}% descuento`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Badge color={p.active ? C.neon : C.muted}>{p.active ? "Activa" : "Inactiva"}</Badge>
              <Btn size="sm" variant="ghost" onClick={async () => { await api.togglePromo(p.id); onChanged(); }}>
                {p.active ? "⏸" : "▶️"}
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => open(p)}>✏️</Btn>
            </div>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "Nueva promo" : "Editar promo"} onClose={() => setModal(null)}>
          <ErrorBanner message={error} />
          <Input label="Emoji" value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} />
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Descripción (opcional)" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Tipo</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["percent", "2x1"].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${form.type === t ? C.neon : C.border}`,
                  background: form.type === t ? C.neon + "22" : "transparent", color: form.type === t ? C.neon : C.muted,
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                }}>{t === "percent" ? "% Descuento" : "2×1"}</button>
              ))}
            </div>
          </div>
          {form.type === "percent" && (
            <Input label="Descuento %" type="number" min="0" max="100" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} />
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={save} style={{ flex: 1 }}>Guardar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── Inventario ─── */
function InventoryTab({ products, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [val, setVal] = useState("");

  const adjust = async (id, delta) => {
    try { await api.adjustStock(id, delta); onChanged(); } catch (e) { alert(e.message); }
  };

  const setStock = async (id) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    try { await api.setStock(id, n); onChanged(); setEditing(null); } catch (e) { alert(e.message); }
  };

  return (
    <div className="fade-in">
      {products.map(p => (
        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 18 }}>{p.emoji}</span>
          <span style={{ flex: 1, fontSize: 13 }}>{p.name}</span>
          {editing === p.id ? (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input type="number" value={val} onChange={e => setVal(e.target.value)} autoFocus
                style={{ width: 60, background: C.bg4, border: `1px solid ${C.neon}`, borderRadius: 6, color: C.text, padding: "3px 6px", fontSize: 12 }} />
              <Btn size="sm" variant="primary" onClick={() => setStock(p.id)}>✓</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setEditing(null)}>✕</Btn>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Badge color={p.stock === 0 ? C.red : p.stock < 5 ? C.amber : C.muted}>{p.stock}</Badge>
              <Btn size="sm" variant="ghost" onClick={() => adjust(p.id, -1)}>−</Btn>
              <Btn size="sm" variant="ghost" onClick={() => adjust(p.id, +1)}>+</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setEditing(p.id); setVal(p.stock); }}>✏️</Btn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
/* ─── Usuarios (meseros, barman, otros admins del negocio) ─── */
const ROLE_LABEL = { mesero: "Mesero", barman: "Barman", admin: "Admin" };
const ROLE_COLOR = { mesero: C.blue, barman: C.neon2, admin: C.amber };

function UsersTab({ businessId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", role: "mesero", pin: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getBusinessUsers(businessId).then(u => { setUsers(u); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, [businessId]);

  const openNew = () => {
    setForm({ name: "", role: "mesero", pin: "" });
    setError(""); setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setError("El nombre es obligatorio"); return; }
    if (!/^\d{4,6}$/.test(form.pin)) { setError("El PIN debe ser numérico, de 4 a 6 dígitos"); return; }
    setSaving(true); setError("");
    try {
      await api.createBusinessUser(businessId, form);
      setModal(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(`¿Eliminar a ${u.name}? Ya no podrá iniciar sesión.`)) return;
    try {
      await api.deleteBusinessUser(businessId, u.id);
      load();
    } catch (e) { alert(e.message); }
  };

  if (loading) return <div style={{ textAlign: "center", color: C.muted, marginTop: 40 }}>Cargando...</div>;

  return (
    <div className="fade-in">
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{users.length} usuarios</div>
        <Btn variant="primary" size="sm" onClick={openNew}>+ Nuevo usuario</Btn>
      </div>

      {users.map(u => (
        <Card key={u.id} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>PIN: {u.pin}</div>
            </div>
            <Badge color={ROLE_COLOR[u.role] || C.muted}>{ROLE_LABEL[u.role] || u.role}</Badge>
            <Btn size="sm" variant="ghost" onClick={() => remove(u)}>🗑</Btn>
          </div>
        </Card>
      ))}

      {modal && (
        <Modal title="Nuevo usuario" onClose={() => setModal(false)}>
          <ErrorBanner message={error} />
          <Input label="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ej. Karla" />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Rol</div>
            <div style={{ display: "flex", gap: 8 }}>
              {["mesero", "barman", "admin"].map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))} style={{
                  flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${form.role === r ? C.neon : C.border}`,
                  background: form.role === r ? C.neon + "22" : "transparent", color: form.role === r ? C.neon : C.muted,
                  cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                }}>{ROLE_LABEL[r]}</button>
              ))}
            </div>
          </div>
          <Input
            label="PIN (4-6 dígitos)"
            value={form.pin}
            onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
            placeholder="ej. 4521"
            maxLength={6}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn variant="ghost" onClick={() => setModal(false)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

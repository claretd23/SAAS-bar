import { useState } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Modal, Icon, SearchInput } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const STATUS_FLOW  = ["pendiente", "preparando", "listo"];
const STATUS_LABEL = { pendiente: "Pendiente", preparando: "Preparando", listo: "Listo" };
const STATUS_COLOR = { pendiente: C.red, preparando: C.amber, listo: C.neon };
const BARRAS = ["B1", "B2", "B3", "B4"];
const PAY_METHODS = [
  { id: "ef", label: "Efectivo", icon: "cash" },
  { id: "ta", label: "Tarjeta",  icon: "card" },
  { id: "qr", label: "QR/Trans.",icon: "qr"   },
];

function isBarra(mesa) { return BARRAS.includes(String(mesa)); }

function flattenItems(orders) {
  const rows = [];
  for (const order of orders) {
    if (order.is_closed) continue;
    order.items.forEach((item, idx) => {
      if (item.paid) return;
      rows.push({ orderId: order.id, mesa: order.mesa, note: order.note, itemIndex: idx, item });
    });
  }
  return rows.sort((a, b) => STATUS_FLOW.indexOf(a.item.status) - STATUS_FLOW.indexOf(b.item.status));
}

export default function BarmanView({ user, products, orders, onOrdersChanged, onLogout }) {
  const [filter, setFilter] = useState("todas");
  const [barraModal, setBarraModal] = useState(false);
  const [payModal, setPayModal] = useState(null);

  const rows = flattenItems(orders);
  const filtered = filter === "todas" ? rows : rows.filter(r => r.item.status === filter);
  const counts = {
    pendiente: rows.filter(r => r.item.status === "pendiente").length,
    preparando: rows.filter(r => r.item.status === "preparando").length,
    listo: rows.filter(r => r.item.status === "listo").length,
  };
  const barraOrders = orders.filter(o => !o.is_closed && isBarra(o.mesa));

  const advance = async (row) => {
    const next = STATUS_FLOW[STATUS_FLOW.indexOf(row.item.status) + 1];
    if (!next) return;
    try { await api.updateItemStatus(row.orderId, row.itemIndex, next); onOrdersChanged(); }
    catch (e) { alert("Error: " + e.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="drink" size={20} color={C.neon2} />
          <div>
            <div style={{ fontWeight: 600, color: C.neon2, fontSize: 13 }}>{user.name?.toUpperCase() || "BARMAN"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant="purple" onClick={() => setBarraModal(true)}>
            <Icon name="plus" size={13} /> Consumo en barra
          </Btn>
          {barraOrders.length > 0 && (
            <Btn size="sm" variant="amber" onClick={() => setPayModal(barraOrders[0])}>
              <Icon name="cash" size={13} color="#000" /> Cobrar barra
            </Btn>
          )}
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {barraOrders.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "6px 12px", background: C.bg3, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
          {barraOrders.map(o => (
            <button key={o.id} onClick={() => setPayModal(o)} style={{
              padding: "4px 12px", borderRadius: 16, fontSize: 11, cursor: "pointer",
              background: C.amber + "22", border: `1px solid ${C.amber}`, color: C.amber,
            }}>{o.mesa} — {fmt(o.total)}</button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, padding: "8px 12px", background: C.bg3, borderBottom: `1px solid ${C.border}` }}>
        {["todas", "pendiente", "preparando", "listo"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
            background: filter === f ? (STATUS_COLOR[f] || C.neon2) + "22" : "transparent",
            border: `1px solid ${filter === f ? (STATUS_COLOR[f] || C.neon2) : C.border}`,
            color: filter === f ? (STATUS_COLOR[f] || C.neon2) : C.muted,
          }}>
            {f === "todas" ? "Todas" : STATUS_LABEL[f]}
            {f !== "todas" && counts[f] > 0 && ` (${counts[f]})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!filtered.length && (
          <div style={{ textAlign: "center", color: C.muted, marginTop: 60, fontSize: 13 }}>
            <Icon name="check" size={32} color={C.neon} /><div style={{ marginTop: 8 }}>Sin productos pendientes</div>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {filtered.map(row => (
            <div key={`${row.orderId}-${row.itemIndex}`} style={{ background: C.bg2, border: `1px solid ${STATUS_COLOR[row.item.status]}55`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge color={isBarra(row.mesa) ? C.neon2 : C.blue}>{isBarra(row.mesa) ? `Barra ${row.mesa}` : `Mesa ${row.mesa}`}</Badge>
                <Badge color={STATUS_COLOR[row.item.status]}>{STATUS_LABEL[row.item.status]}</Badge>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {row.item.image_url
                  ? <img src={`${API_URL}${row.item.image_url}`} alt={row.item.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  : <div style={{ width: 40, height: 40, borderRadius: 8, background: C.bg4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="drink" size={20} color={C.muted} />
                    </div>
                }
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{row.item.qty}× {row.item.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{fmt(row.item.price * row.item.qty)}</div>
                </div>
              </div>
              {row.note && (
                <div style={{ background: C.amber + "15", border: `1px solid ${C.amber}44`, borderRadius: 6, padding: "5px 8px", fontSize: 11, color: C.amber, marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
                  <Icon name="warning" size={12} color={C.amber} /> {row.note}
                </div>
              )}
              {row.item.status !== "listo"
                ? <Btn variant={row.item.status === "pendiente" ? "amber" : "primary"} onClick={() => advance(row)} style={{ width: "100%" }} size="sm">
                    {row.item.status === "pendiente" ? "Empezar a preparar" : "Marcar listo"}
                  </Btn>
                : <div style={{ textAlign: "center", fontSize: 11, color: C.neon, display: "flex", gap: 4, justifyContent: "center", alignItems: "center" }}>
                    <Icon name="check" size={12} color={C.neon} /> Listo — pendiente de cobro
                  </div>
              }
            </div>
          ))}
        </div>
      </div>

      {barraModal && <BarraOrderModal products={products} orders={orders} onClose={() => setBarraModal(false)} onSent={() => { setBarraModal(false); onOrdersChanged(); }} />}
      {payModal && <PayModal order={payModal} allBarraOrders={barraOrders} onSelectOrder={setPayModal} onClose={() => setPayModal(null)} onPaid={() => { setPayModal(null); onOrdersChanged(); }} />}
    </div>
  );
}

function BarraOrderModal({ products, orders, onClose, onSent }) {
  const [barra, setBarra] = useState(BARRAS[0]);
  const [cart, setCart] = useState({});
  const [search, setSearch] = useState("");
  const cats = [...new Set(products.map(p => p.cat))];
  const [cat, setCat] = useState(cats[0] || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const barraOrder = orders.find(o => o.mesa === barra && !o.is_closed);
  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, x) => s + x.price * x.qty, 0);
  const filtered = products.filter(p => search ? p.name.toLowerCase().includes(search.toLowerCase()) : p.cat === cat);

  const addItem = (p) => {
    if (p.stock === 0 && !p.unlimited_stock) return;
    setCart(c => ({ ...c, [p.id]: c[p.id] ? { ...c[p.id], qty: c[p.id].qty + 1 } : { ...p, qty: 1 } }));
  };
  const removeItem = (id) => setCart(c => {
    if (!c[id]) return c;
    if (c[id].qty <= 1) { const n = { ...c }; delete n[id]; return n; }
    return { ...c, [id]: { ...c[id], qty: c[id].qty - 1 } };
  });
  const send = async () => {
    if (!cartItems.length) { setError("Agrega al menos un producto"); return; }
    setSending(true); setError("");
    try { await api.createOrder({ mesa: barra, items: cartItems, note: "" }); onSent(); }
    catch (e) { setError(e.message); } finally { setSending(false); }
  };

  return (
    <Modal title={`Consumo — ${barra}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {BARRAS.map(b => {
          const hasOrder = orders.some(o => o.mesa === b && !o.is_closed);
          return (
            <button key={b} onClick={() => setBarra(b)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: barra === b ? C.neon2 + "22" : "transparent",
              border: `1px solid ${barra === b ? C.neon2 : hasOrder ? C.amber : C.border}`,
              color: barra === b ? C.neon2 : hasOrder ? C.amber : C.muted,
            }}>{b}{hasOrder ? " •" : ""}</button>
          );
        })}
      </div>
      {barraOrder && <div style={{ background: C.amber + "15", border: `1px solid ${C.amber}44`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: C.amber, marginBottom: 8 }}>Cuenta activa: {fmt(barraOrder.total)} — lo que agregues se suma</div>}
      <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." />
      {!search && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: "4px 12px", borderRadius: 16, whiteSpace: "nowrap", fontSize: 11, cursor: "pointer",
              background: cat === c ? C.neon2 + "22" : "transparent",
              border: `1px solid ${cat === c ? C.neon2 : C.border}`,
              color: cat === c ? C.neon2 : C.muted,
            }}>{c}</button>
          ))}
        </div>
      )}
      <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 10 }}>
        {filtered.map(p => {
          const agotado = p.stock === 0 && !p.unlimited_stock;
          return (
            <div key={p.id} onClick={() => addItem(p)} style={{ background: C.bg3, border: `1px solid ${cart[p.id] ? C.neon : agotado ? C.red + "44" : C.border}`, borderRadius: 8, overflow: "hidden", cursor: agotado ? "not-allowed" : "pointer", opacity: agotado ? 0.4 : 1, position: "relative" }}>
              {p.image_url
                ? <img src={`${API_URL}${p.image_url}`} alt={p.name} style={{ width: "100%", height: 60, objectFit: "cover", display: "block" }} />
                : <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg4 }}><Icon name="drink" size={22} color={C.muted} /></div>
              }
              {cart[p.id] && <div style={{ position: "absolute", top: 4, right: 4, background: C.neon, color: "#000", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{cart[p.id].qty}</div>}
              <div style={{ padding: "5px 6px" }}>
                <div style={{ fontSize: 10, lineHeight: 1.3, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {cartItems.length > 0 && (
        <div style={{ background: C.bg3, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "2px 0" }}>
              <span>{item.name}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => removeItem(item.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="minus" size={10} /></button>
                <span style={{ minWidth: 14, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => addItem(item)} style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="plus" size={10} /></button>
                <span style={{ color: C.neon, minWidth: 44, textAlign: "right" }}>{fmt(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
            <span>Total</span><span style={{ color: C.neon }}>{fmt(total)}</span>
          </div>
        </div>
      )}
      {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={send} disabled={sending || !cartItems.length} style={{ flex: 1 }}>{sending ? "Enviando..." : "Enviar"}</Btn>
      </div>
    </Modal>
  );
}

function PayModal({ order, allBarraOrders, onSelectOrder, onClose, onPaid }) {
  const pendingIdx = order.items.map((it, i) => ({ it, i })).filter(x => !x.it.paid).map(x => x.i);
  const [selected, setSelected] = useState(new Set(pendingIdx));
  const [pay, setPay] = useState("ef");
  const [cash, setCash] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (idx) => setSelected(s => { const n = new Set(s); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  const selectedTotal = [...selected].reduce((s, idx) => s + order.items[idx].price * order.items[idx].qty, 0);
  const cashNum = parseFloat(cash) || 0;
  const change = cashNum > 0 ? cashNum - selectedTotal : null;

  const confirmPay = async () => {
    if (!selected.size) { setError("Selecciona al menos un producto"); return; }
    if (pay === "ef" && cashNum > 0 && cashNum < selectedTotal) { setError("El monto no alcanza"); return; }
    setSaving(true); setError("");
    try { await api.payOrderItems(order.id, pay, [...selected]); onPaid(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return (
    <Modal title={`Cobrar barra ${order.mesa}`} onClose={onClose}>
      {allBarraOrders.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {allBarraOrders.map(o => (
            <button key={o.id} onClick={() => onSelectOrder(o)} style={{
              flex: 1, padding: "5px", borderRadius: 8, fontSize: 11, cursor: "pointer",
              background: o.id === order.id ? C.neon2 + "22" : "transparent",
              border: `1px solid ${o.id === order.id ? C.neon2 : C.border}`,
              color: o.id === order.id ? C.neon2 : C.muted,
            }}>{o.mesa}</button>
          ))}
        </div>
      )}
      {error && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 10 }}>
        {order.items.map((item, idx) => (
          <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}`, opacity: item.paid ? 0.4 : 1, cursor: item.paid ? "default" : "pointer" }}>
            <input type="checkbox" checked={item.paid || selected.has(idx)} disabled={item.paid} onChange={() => toggle(idx)} />
            <span style={{ flex: 1, fontSize: 12 }}>{item.qty}× {item.name}{item.paid && <span style={{ color: C.neon, fontSize: 10 }}> (pagado)</span>}</span>
            <span style={{ fontSize: 12, color: C.neon }}>{fmt(item.price * item.qty)}</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: pay === "ef" ? 8 : 12 }}>
        {PAY_METHODS.map(m => (
          <button key={m.id} onClick={() => { setPay(m.id); setCash(""); }} style={{
            flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 11, cursor: "pointer",
            background: pay === m.id ? C.neon2 + "22" : "transparent",
            border: `1px solid ${pay === m.id ? C.neon2 : C.border}`,
            color: pay === m.id ? C.neon2 : C.muted,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}><Icon name={m.icon} size={16} color={pay === m.id ? C.neon2 : C.muted} />{m.label}</button>
        ))}
      </div>
      {pay === "ef" && (
        <div style={{ background: C.bg3, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Monto recibido</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {[50, 100, 200, 500, 1000].map(d => (
              <button key={d} onClick={() => setCash(String(d))} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer", background: cash === String(d) ? C.neon + "22" : C.bg4, border: `1px solid ${cash === String(d) ? C.neon : C.border}`, color: cash === String(d) ? C.neon : C.muted }}>${d}</button>
            ))}
          </div>
          <input type="number" min="0" value={cash} onChange={e => setCash(e.target.value)} placeholder="Otro monto..."
            style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
          {change !== null && change >= 0 && (
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.muted }}>Cambio</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.neon }}>{fmt(change)}</span>
            </div>
          )}
          {change !== null && change < 0 && <div style={{ marginTop: 8, fontSize: 12, color: C.red }}>Faltan {fmt(Math.abs(change))}</div>}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: 14 }}>
        <span>Total a cobrar</span><span style={{ color: C.neon, fontSize: 16 }}>{fmt(selectedTotal)}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={confirmPay} disabled={saving} style={{ flex: 1 }}>{saving ? "Cobrando..." : "Confirmar"}</Btn>
      </div>
    </Modal>
  );
}

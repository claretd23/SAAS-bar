import { useState } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Modal, Divider } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const STATUS_FLOW  = ["pendiente", "preparando", "listo"];
const STATUS_LABEL = { pendiente: "Pendiente", preparando: "Preparando", listo: "Listo" };
const STATUS_COLOR = { pendiente: C.red, preparando: C.amber, listo: C.neon };
const PAY_METHODS  = [
  { id: "ef", label: "Efectivo" },
  { id: "ta", label: "Tarjeta" },
  { id: "qr", label: "QR/Trans." },
];

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

function isBarra(mesa) {
  return String(mesa).startsWith("B");
}

export default function BarmanView({ user, products, orders, business, tableCount, barCount, onOrdersChanged, onProductsChanged, onBusinessChanged, onLogout }) {
  const MESAS  = Array.from({ length: tableCount }, (_, i) => String(i + 1));
  const BARRAS = Array.from({ length: barCount },   (_, i) => `B${i + 1}`);

  const [filter, setFilter]           = useState("todas");
  const [ordenModal, setOrdenModal]   = useState(false);
  const [cobrarOrder, setCobrarOrder] = useState(null);
  const [layoutModal, setLayoutModal] = useState(false);

  const rows     = flattenItems(orders);
  const filtered = filter === "todas" ? rows : rows.filter(r => r.item.status === filter);
  const counts   = {
    pendiente:  rows.filter(r => r.item.status === "pendiente").length,
    preparando: rows.filter(r => r.item.status === "preparando").length,
    listo:      rows.filter(r => r.item.status === "listo").length,
  };

  const ordenesActivas = orders.filter(o => !o.is_closed && o.items.some(it => !it.paid));

  const advance = async (row) => {
    const idx  = STATUS_FLOW.indexOf(row.item.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    try {
      await api.updateItemStatus(row.orderId, row.itemIndex, next);
      onOrdersChanged();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, color: C.neon2, fontSize: 13 }}>{user.name?.toUpperCase() || "BARMAN"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant="purple" onClick={() => setOrdenModal(true)}>+ Nueva orden</Btn>
          <Btn size="sm" variant="ghost" onClick={() => business && setLayoutModal(true)}>Configurar</Btn>          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Cuentas por cobrar */}
      {ordenesActivas.length > 0 && (
        <div style={{ background: C.bg3, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", overflowX: "auto" }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Cuentas por cobrar</div>
          <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
            {ordenesActivas.map(o => {
              const pendiente = o.items.filter(it => !it.paid).reduce((s, it) => s + it.price * it.qty, 0);
              return (
                <button key={o.id} onClick={() => setCobrarOrder(o)} style={{
                  padding: "5px 12px", borderRadius: 16, fontSize: 12, cursor: "pointer",
                  background: C.neon2 + "22", border: `1px solid ${C.neon2}`, color: C.neon2,                }}>
                  {isBarra(o.mesa) ? o.mesa : `Mesa ${o.mesa}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", background: C.bg3, borderBottom: `1px solid ${C.border}` }}>
        {["todas", "pendiente", "preparando", "listo"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "5px 12px", borderRadius: 16, fontSize: 12,
            background: filter === f ? (STATUS_COLOR[f] || C.neon2) + "22" : "transparent",
            border: `1px solid ${filter === f ? (STATUS_COLOR[f] || C.neon2) : C.border}`,
            color: filter === f ? (STATUS_COLOR[f] || C.neon2) : C.muted, cursor: "pointer",
          }}>
            {f === "todas" ? "Todas" : STATUS_LABEL[f]}
            {f !== "todas" && counts[f] > 0 && ` (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Lista de productos */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!filtered.length && (
          <div style={{ textAlign: "center", color: C.muted, marginTop: 60, fontSize: 13 }}>
            Sin ordenes pendientes
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {filtered.map((row) => (
            <div key={`${row.orderId}-${row.itemIndex}`} style={{
              background: C.bg2, border: `1px solid ${STATUS_COLOR[row.item.status]}55`,
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge color={isBarra(row.mesa) ? C.neon2 : C.blue}>
                  {isBarra(row.mesa) ? row.mesa : `Mesa ${row.mesa}`}
                </Badge>
                <Badge color={STATUS_COLOR[row.item.status]}>{STATUS_LABEL[row.item.status]}</Badge>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {row.item.image_url ? (
                  <img src={`${API_URL}${row.item.image_url}`} alt={row.item.name}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                ) : null}
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{row.item.qty}x {row.item.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{fmt(row.item.price * row.item.qty)}</div>
                </div>
              </div>
              {row.note && (
              <div style={{ background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 8px 5px 10px", fontSize: 11, color: C.text, marginBottom: 8, fontStyle: "italic", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                Nota: {row.note}
              </div>
              )}

              {row.item.status !== "listo" ? (
                <Btn
                  variant={row.item.status === "pendiente" ? "amber" : "primary"}
                  onClick={() => advance(row)}
                  style={{ width: "100%" }}
                  size="sm"
                >
                  {row.item.status === "pendiente" ? "Empezar a preparar" : "Marcar listo"}
                </Btn>
              ) : (
                <div style={{ textAlign: "center", fontSize: 11, color: C.neon }}>
                  Pendiente de cobro
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {ordenModal && (
        <NuevaOrdenModal
          products={products}
          barras={BARRAS}
          onClose={() => setOrdenModal(false)}
          onSent={() => { setOrdenModal(false); onOrdersChanged(); }}
        />
      )}

      {cobrarOrder && (
        <CobrarModal
          order={cobrarOrder}
          onClose={() => setCobrarOrder(null)}
          onPaid={() => { setCobrarOrder(null); onOrdersChanged(); }}
        />
      )}

      {layoutModal && business && (
      <LayoutModal
        business={business}
        onClose={() => setLayoutModal(false)}
        onSaved={() => { setLayoutModal(false); onBusinessChanged(); }}
      />
    )}
    </div>
  );
}

function NuevaOrdenModal({ products, barras, onClose, onSent }) {
  const [lugar, setLugar]     = useState(barras[0]);
  const [cart, setCart]       = useState({});
  const [search, setSearch]   = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError]     = useState("");

  const cartItems = Object.values(cart);
  const total     = cartItems.reduce((s, x) => s + x.price * x.qty, 0);

  const productosFiltrados = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  const addItem = (p) => {
    if (p.stock === 0 && !p.unlimited_stock) return;
    setCart(c => ({ ...c, [p.id]: c[p.id] ? { ...c[p.id], qty: c[p.id].qty + 1 } : { ...p, qty: 1 } }));
  };

  const removeItem = (id) => {
    setCart(c => {
      const item = c[id];
      if (!item) return c;
      if (item.qty <= 1) { const n = { ...c }; delete n[id]; return n; }
      return { ...c, [id]: { ...item, qty: item.qty - 1 } };
    });
  };

  const send = async () => {
    if (!cartItems.length) { setError("Agrega al menos un producto"); return; }
    setSending(true); setError("");
    try {
      await api.createOrder({ mesa: lugar, items: cartItems, note: "" });
      onSent();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Nueva orden" onClose={onClose}>
      {error && (
        <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}

      {/* Selector de lugar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Lugar en barra</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {barras.map(b => (
            <button key={b} onClick={() => setLugar(b)} style={{
              padding: "4px 10px", borderRadius: 8, fontSize: 12,
              background: lugar === b ? C.neon2 + "22" : "transparent",
              border: `1px solid ${lugar === b ? C.neon2 : C.border}`,
              color: lugar === b ? C.neon2 : C.muted, cursor: "pointer",
            }}>{b}</button>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar producto..."
        style={{
          width: "100%", background: C.bg4, border: `1px solid ${search ? C.neon : C.border}`,
          borderRadius: 8, color: C.text, padding: "7px 10px", fontSize: 12, marginBottom: 10,
        }}
      />

      {/* Productos */}
      <div style={{ maxHeight: 200, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {productosFiltrados.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, fontSize: 12, padding: "20px 0" }}>
            Sin resultados
          </div>
        )}
        {productosFiltrados.map(p => {
          const agotado = p.stock === 0 && !p.unlimited_stock;
          return (
            <div key={p.id} onClick={() => addItem(p)} style={{
              background: C.bg3, border: `1px solid ${cart[p.id] ? C.neon + "66" : C.border}`, borderRadius: 8,
              padding: "8px 6px", textAlign: "center", cursor: agotado ? "not-allowed" : "pointer",
              opacity: agotado ? 0.4 : 1,
            }}>
              <div style={{ fontSize: 10, marginTop: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.neon }}>{fmt(p.price)}</div>
              {cart[p.id] && <div style={{ fontSize: 10, color: C.amber }}>x{cart[p.id].qty}</div>}
            </div>
          );
        })}
      </div>

      {/* Resumen carrito */}
      {cartItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
              <span>{item.qty}x {item.name}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => removeItem(item.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.border}`, background: C.bg4, color: C.text, fontSize: 12, cursor: "pointer" }}>−</button>
                <span>{fmt(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
          <Divider />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 13 }}>
            <span>Total</span><span style={{ color: C.neon }}>{fmt(total)}</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={send} disabled={sending || !cartItems.length} style={{ flex: 1 }}>
          {sending ? "Enviando..." : "Enviar"}
        </Btn>
      </div>
    </Modal>
  );
}

function CobrarModal({ order, onClose, onPaid }) {
  const pendingIdx = order.items.map((it, i) => ({ it, i })).filter(x => !x.it.paid).map(x => x.i);
  const [selected, setSelected] = useState(new Set(pendingIdx));
  const [pay, setPay]           = useState("ef");
  const [recibido, setRecibido] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const toggle = (idx) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const selectedTotal = [...selected].reduce((s, idx) => s + order.items[idx].price * order.items[idx].qty, 0);

  const recibidoNum = parseFloat(recibido) || 0;
  const cambio       = recibidoNum - selectedTotal;

  const confirmPay = async () => {
    if (!selected.size) { setError("Selecciona al menos un producto"); return; }
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

  const labelLugar = isBarra(order.mesa) ? order.mesa : `Mesa ${order.mesa}`;

  return (
    <Modal title={`Cobrar ${labelLugar}`} onClose={onClose}>
      {error && (
        <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
        Selecciona los productos a cobrar.
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
        {order.items.map((item, idx) => (
          <label key={idx} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
            borderBottom: `1px solid ${C.border}`, opacity: item.paid ? 0.4 : 1,
            cursor: item.paid ? "default" : "pointer",
          }}>
            <input
              type="checkbox"
              checked={item.paid || selected.has(idx)}
              disabled={item.paid}
              onChange={() => toggle(idx)}
            />
            <span style={{ flex: 1, fontSize: 12 }}>
              {item.qty}x {item.name} {item.paid && <span style={{ color: C.neon, fontSize: 10 }}>(ya pagado)</span>}
            </span>
            <span style={{ fontSize: 12, color: C.neon }}>{fmt(item.price * item.qty)}</span>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {PAY_METHODS.map(m => (
          <button key={m.id} onClick={() => { setPay(m.id); if (m.id !== "ef") setRecibido(""); }} style={{
            flex: 1, padding: "6px 2px", borderRadius: 6, fontSize: 11,
            background: pay === m.id ? C.neon2 + "22" : "transparent",
            border: `1px solid ${pay === m.id ? C.neon2 : C.border}`,
            color: pay === m.id ? C.neon2 : C.muted, cursor: "pointer",
          }}>{m.label}</button>
        ))}
      </div>

      <Divider />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 600, marginBottom: pay === "ef" ? 10 : 14 }}>
        <span>Total a cobrar</span>
        <span style={{ color: C.neon }}>{fmt(selectedTotal)}</span>
      </div>

{/* Calculadora de cambio (solo efectivo) */}
      {pay === "ef" && (
        <div style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>monto de pago</div>
          <input
            type="text"
            inputMode="decimal"
            value={recibido}
            onChange={e => setRecibido(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="0"
            style={{
              width: "100%", background: C.bg4, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.text, padding: "7px 10px", fontSize: 14, marginBottom: 8,
            }}
          />
          {recibido !== "" && (
            <div style={{
              display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600,
              color: cambio < 0 ? C.red : C.neon,
            }}>
              <span>{cambio < 0 ? "Falta" : "Cambio"}</span>
              <span>{fmt(Math.abs(cambio))}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={confirmPay} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Cobrando..." : "Confirmar pago"}
        </Btn>
      </div>
    </Modal>
  );
}

function LayoutModal({ business, onClose, onSaved }) {
  const [tables, setTables] = useState(business?.table_count || 10);
  const [bars,   setBars]   = useState(business?.bar_count   || 6);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.updateLayout(business.id, { table_count: tables, bar_count: bars });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Configurar mesas y barras" onClose={onClose}>
      {error && (
        <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Numero de mesas</div>
          <input type="number" min="1" max="100" value={tables} onChange={e => setTables(+e.target.value)}
            style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 16 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Lugares en barra</div>
          <input type="number" min="1" max="50" value={bars} onChange={e => setBars(+e.target.value)}
            style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 16 }} />
        </div>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
        Los cambios se reflejan en todos los paneles al instante.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Guardando..." : "Guardar"}
        </Btn>
      </div>
    </Modal>
  );
}
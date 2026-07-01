import { useState } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Modal } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const STATUS_FLOW = ["pendiente", "preparando", "listo"];
const STATUS_LABEL = { pendiente: "Pendiente", preparando: "Preparando", listo: "Listo" };
const STATUS_COLOR = { pendiente: C.red, preparando: C.amber, listo: C.neon };
const BARRAS = ["B1", "B2", "B3", "B4"];

// Aplana todas las órdenes activas en una lista de "tickets de producto"
// (un item = una fila), que es como un barman real trabaja: viendo qué
// falta preparar, no viendo "órdenes" completas como cajas cerradas.
function flattenItems(orders) {
  const rows = [];
  for (const order of orders) {
    if (order.is_closed) continue;
    order.items.forEach((item, idx) => {
      if (item.paid) return; // ya cobrado y servido, no debe seguir en cola
      rows.push({ orderId: order.id, mesa: order.mesa, note: order.note, itemIndex: idx, item });
    });
  }
  return rows.sort((a, b) => STATUS_FLOW.indexOf(a.item.status) - STATUS_FLOW.indexOf(b.item.status));
}

export default function BarmanView({ user, products, orders, onOrdersChanged, onProductsChanged, onLogout }) {
  const [filter, setFilter] = useState("todas"); // todas | pendiente | preparando | listo
  const [barraModal, setBarraModal] = useState(false);

  const rows = flattenItems(orders);
  const filtered = filter === "todas" ? rows : rows.filter(r => r.item.status === filter);

  const counts = {
    pendiente: rows.filter(r => r.item.status === "pendiente").length,
    preparando: rows.filter(r => r.item.status === "preparando").length,
    listo: rows.filter(r => r.item.status === "listo").length,
  };

  const advance = async (row) => {
    const idx = STATUS_FLOW.indexOf(row.item.status);
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

      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🍹</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon2, fontSize: 13 }}>{user.name?.toUpperCase() || "BARMAN"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant="purple" onClick={() => setBarraModal(true)}>+ Consumo en barra</Btn>
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Filtros por estado */}
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

      {/* Lista de productos por preparar, no de órdenes completas */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!filtered.length && (
          <div style={{ textAlign: "center", color: C.muted, marginTop: 60, fontSize: 13 }}>
            Sin ordenes pendientes
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {filtered.map((row, i) => (
            <div key={`${row.orderId}-${row.itemIndex}`} style={{
              background: C.bg2, border: `1px solid ${STATUS_COLOR[row.item.status]}55`,
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Badge color={isBarra(row.mesa) ? C.neon2 : C.blue}>
                  {isBarra(row.mesa) ? `Barra ${row.mesa}` : `Mesa ${row.mesa}`}
                </Badge>
                <Badge color={STATUS_COLOR[row.item.status]}>{STATUS_LABEL[row.item.status]}</Badge>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                {row.item.image_url ? (
                  <img src={`${API_URL}${row.item.image_url}`} alt={row.item.name}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                ) : null}
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{row.item.qty}× {row.item.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{fmt(row.item.price * row.item.qty)}</div>
                </div>
              </div>

              {row.note && (
                <div style={{ background: C.amber + "15", border: `1px solid ${C.amber}44`, borderRadius: 6, padding: "5px 8px", fontSize: 11, color: C.amber, marginBottom: 8 }}>
                  ⚠ {row.note}
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
                  Listo para servir — pendiente de cobro
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {barraModal && (
        <BarraOrderModal
          products={products}
          onClose={() => setBarraModal(false)}
          onSent={() => { setBarraModal(false); onOrdersChanged(); }}
        />
      )}
    </div>
  );
}

function isBarra(mesa) {
  return BARRAS.includes(String(mesa));
}

// El barman registra consumo de alguien sentado directamente en la barra,
// usando exactamente el mismo flujo que un mesero: elige "mesa" de barra,
// agrega productos, envía. Esa cuenta luego se cobra igual que cualquier
// otra (desde el propio panel del barman, ya que él la atendió).
function BarraOrderModal({ products, onClose, onSent }) {
  const [barra, setBarra] = useState(BARRAS[0]);
  const [cart, setCart] = useState({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const cartItems = Object.values(cart);
  const total = cartItems.reduce((s, x) => s + x.price * x.qty, 0);

  const addItem = (p) => {
    if (p.stock === 0 && !p.unlimited_stock) return;
    setCart(c => ({
      ...c,
      [p.id]: c[p.id] ? { ...c[p.id], qty: c[p.id].qty + 1 } : { ...p, qty: 1 },
    }));
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
      await api.createOrder({ mesa: barra, items: cartItems, note: "" });
      onSent();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title="Consumo en barra" onClose={onClose}>
      {error && (
        <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {BARRAS.map(b => (
          <button key={b} onClick={() => setBarra(b)} style={{
            flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12,
            background: barra === b ? C.neon2 + "22" : "transparent",
            border: `1px solid ${barra === b ? C.neon2 : C.border}`,
            color: barra === b ? C.neon2 : C.muted, cursor: "pointer",
          }}>{b}</button>
        ))}
      </div>

      <div style={{ maxHeight: 240, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {products.map(p => {
          const agotado = p.stock === 0 && !p.unlimited_stock;
          return (
            <div key={p.id} onClick={() => addItem(p)} style={{
              background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 6px", textAlign: "center", cursor: agotado ? "not-allowed" : "pointer",
              opacity: agotado ? 0.4 : 1,
            }}>
              <div style={{ fontSize: 10, marginTop: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.neon }}>{fmt(p.price)}</div>
              {cart[p.id] && <div style={{ fontSize: 10, color: C.amber }}>×{cart[p.id].qty}</div>}
            </div>
          );
        })}
      </div>

      {cartItems.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {cartItems.map(item => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
              <span>{item.qty}× {item.name}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button onClick={() => removeItem(item.id)} style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, fontSize: 12, cursor: "pointer" }}>−</button>
                <span>{fmt(item.price * item.qty)}</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginTop: 6, fontSize: 13 }}>
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

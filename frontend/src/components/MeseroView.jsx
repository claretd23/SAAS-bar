import { useState } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Divider } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const CATS_FALLBACK = ["Cervezas", "Licores", "Cócteles", "Botanas"];
const MESAS = Array.from({ length: 10 }, (_, i) => i + 1);
const PAY_METHODS = [
  { id: "ef", label: "Efectivo" },
  { id: "ta", label: "Tarjeta"},
  { id: "qr", label: "QR/Trans."},
];

export default function MeseroView({ user, products, promos, orders, onOrdersChanged, onLogout }) {
  const [mesa, setMesa] = useState(1);
  const cats = [...new Set(products.map(p => p.cat))].length
    ? [...new Set(products.map(p => p.cat))]
    : CATS_FALLBACK;
  const [cat, setCat] = useState(cats[0]);
  const [cart, setCart] = useState({});
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("ef");
  const [disc, setDisc] = useState(0);
  const [split, setSplit] = useState(1);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [activePromo, setActivePromo] = useState(null);

  const activePromos = promos.filter(p => p.active);
  const mesaOrder = orders.find(o => o.mesa === mesa && o.status !== "cobrado");
  const cartItems = Object.values(cart);
  const sub = cartItems.reduce((s, x) => s + x.price * x.qty, 0);
  const promoDisc = activePromo
    ? activePromo.type === "2x1"
      ? sub * 0.5
      : sub * activePromo.discount / 100
    : 0;
  const manualDisc = sub * disc / 100;
  const total = Math.max(0, sub - promoDisc - manualDisc);

  const addItem = (p) => {
    if (p.stock === 0) return;
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

  const sendOrder = async () => {
    if (!cartItems.length || sending) return;
    setSending(true);
    try {
      await api.createOrder({ mesa, items: cartItems, note, pay, disc, promoDisc, total });
      setCart({}); setNote(""); setDisc(0); setSplit(1); setActivePromo(null);
      setSent(true); setTimeout(() => setSent(false), 2000);
      onOrdersChanged();
    } catch (e) {
      alert("Error al enviar la orden: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

      {/* ── Header ── */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧑‍🍳</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>{user.name?.toUpperCase() || "MESERO"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mesaOrder && <Badge color={C.amber}>Mesa {mesa}: {mesaOrder.status}</Badge>}
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* ── Selector de mesas ── */}
      <div style={{ background: C.bg3, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
          {MESAS.map(m => {
            const hasOrder = orders.some(o => o.mesa === m && o.status !== "cobrado");
            return (
              <button key={m} onClick={() => setMesa(m)} style={{
                padding: "4px 12px", borderRadius: 16,
                background: mesa === m ? C.neon + "22" : C.bg4,
                border: `1px solid ${mesa === m ? C.neon : hasOrder ? C.amber : C.border}`,
                color: mesa === m ? C.neon : hasOrder ? C.amber : C.muted,
                fontSize: 12, cursor: "pointer",
              }}>
                Mesa {m}{hasOrder ? " •" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Cuerpo principal ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Menú ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Categorías + promos */}
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
            {cats.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: "4px 14px", borderRadius: 16, whiteSpace: "nowrap",
                background: cat === c ? C.neon2 + "22" : "transparent",
                border: `1px solid ${cat === c ? C.neon2 : C.border}`,
                color: cat === c ? C.neon2 : C.muted, fontSize: 12, cursor: "pointer",
              }}>{c}</button>
            ))}
            {activePromos.map(p => (
              <button key={p.id} onClick={() => setActivePromo(activePromo?.id === p.id ? null : p)} style={{
                padding: "4px 14px", borderRadius: 16, whiteSpace: "nowrap",
                background: activePromo?.id === p.id ? C.amber + "22" : "transparent",
                border: `1px solid ${activePromo?.id === p.id ? C.amber : C.border}`,
                color: activePromo?.id === p.id ? C.amber : C.muted, fontSize: 12, cursor: "pointer",
              }}>{p.emoji} {p.name}</button>
            ))}
          </div>

          {/* Grilla de productos */}
          <div style={{
            flex: 1, overflowY: "auto", padding: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
            gap: 10, alignContent: "start",
          }}>
            {products.filter(p => p.cat === cat).map(p => {
              const inCart = cart[p.id];
              const agotado = p.stock === 0;
              return (
                <div
                  key={p.id}
                  onClick={() => addItem(p)}
                  style={{
                    background: C.bg3,
                    border: `1px solid ${agotado ? C.red + "44" : inCart ? C.neon + "66" : C.border}`,
                    borderRadius: 12, overflow: "hidden",
                    cursor: agotado ? "not-allowed" : "pointer",
                    opacity: agotado ? 0.5 : 1,
                    userSelect: "none",
                    transition: "border-color .15s",
                    position: "relative",
                  }}
                >
                  {/* Imagen o emoji */}
                  {p.image_url ? (
                    <img
                      src={`${API_URL}${p.image_url}`}
                      alt={p.name}
                      style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{
                      height: 70, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: 30, background: C.bg4,
                    }}>
                      {p.emoji}
                    </div>
                  )}

                  {/* Badge cantidad en carrito */}
                  {inCart && (
                    <div style={{
                      position: "absolute", top: 6, right: 6,
                      background: C.neon, color: "#000",
                      borderRadius: "50%", width: 22, height: 22,
                      fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {inCart.qty}
                    </div>
                  )}

                  <div style={{ padding: "7px 8px 10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
                    {p.stock < 5 && p.stock > 0 && (
                      <div style={{ fontSize: 9, color: C.amber, marginTop: 2 }}>Últimas {p.stock}</div>
                    )}
                    {agotado && (
                      <div style={{ fontSize: 9, color: C.red, marginTop: 2 }}>Agotado</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Panel de orden ── */}
        <div style={{ width: 280, background: C.bg2, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>🧾 Orden — Mesa {mesa}</span>
            <Btn size="sm" variant="ghost" onClick={() => setCart({})}>Limpiar</Btn>
          </div>

          {/* Items del carrito */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {!cartItems.length && (
              <div style={{ textAlign: "center", color: C.muted, marginTop: 40, fontSize: 12, lineHeight: 2 }}>
                Sin productos<br /><span style={{ fontSize: 11 }}>Toca del menú</span>
              </div>
            )}
            {cartItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                {/* Miniatura o emoji */}
                {item.image_url ? (
                  <img
                    src={`${API_URL}${item.image_url}`}
                    alt={item.name}
                    style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.emoji}</span>
                )}
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.3 }}>{item.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>−</button>
                  <span style={{ minWidth: 16, textAlign: "center", fontSize: 12 }}>{item.qty}</span>
                  <button onClick={(e) => { e.stopPropagation(); addItem(item); }} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
                <div style={{ fontSize: 12, color: C.neon, minWidth: 50, textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          {/* Totales y envío */}
          <div style={{ padding: "10px 12px", background: C.bg3, borderTop: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: 8 }}>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Nota (sin hielo, bien cocido...)"
                style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "5px 8px", fontSize: 11 }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Desc. %</div>
                <input type="number" min="0" max="100" value={disc} onChange={e => setDisc(+e.target.value)}
                  style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 6px", fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Dividir</div>
                <input type="number" min="1" value={split} onChange={e => setSplit(+e.target.value)}
                  style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 6px", fontSize: 12 }} />
              </div>
            </div>

            {activePromo && (
              <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>✓ {activePromo.name} aplicada</div>
            )}

            <Divider />

            <div style={{ fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Subtotal</span><span>{fmt(sub)}</span>
            </div>
            {(promoDisc > 0 || manualDisc > 0) && (
              <div style={{ fontSize: 12, color: C.amber, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span>Descuento</span><span>−{fmt(promoDisc + manualDisc)}</span>
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", marginBottom: split > 1 ? 3 : 8 }}>
              <span>Total</span><span style={{ color: C.neon }}>{fmt(total)}</span>
            </div>
            {split > 1 && (
              <div style={{ fontSize: 12, color: C.neon2, display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Por persona ({split})</span><span>{fmt(total / split)}</span>
              </div>
            )}

            {/* Método de pago */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {PAY_METHODS.map(m => (
                <button key={m.id} onClick={() => setPay(m.id)} style={{
                  flex: 1, padding: "4px 2px", borderRadius: 6, fontSize: 10,
                  background: pay === m.id ? C.neon2 + "22" : "transparent",
                  border: `1px solid ${pay === m.id ? C.neon2 : C.border}`,
                  color: pay === m.id ? C.neon2 : C.muted, cursor: "pointer",
                }}>{m.icon} {m.label}</button>
              ))}
            </div>

            {sent ? (
              <div style={{ background: C.neon + "22", border: `1px solid ${C.neon}`, borderRadius: 8, padding: "9px", textAlign: "center", color: C.neon, fontSize: 13, fontWeight: 500 }}>
                ✓ Orden enviada a barra
              </div>
            ) : (
              <Btn variant="primary" onClick={sendOrder} disabled={!cartItems.length || sending} style={{ width: "100%", fontSize: 14 }}>
                {sending ? "Enviando..." : "Enviar a barra"}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
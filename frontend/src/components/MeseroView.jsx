import { useState } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Divider, Modal, Icon, SearchInput } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PAY_METHODS = [
  { id: "ef", label: "Efectivo", icon: "cash" },
  { id: "ta", label: "Tarjeta",  icon: "card" },
  { id: "qr", label: "QR/Trans.",icon: "qr"   },
];

export default function MeseroView({ user, products, promos, orders, onOrdersChanged, onLogout }) {
  const cats = [...new Set(products.map(p => p.cat))];
  const [mesa, setMesaState] = useState(() => parseInt(sessionStorage.getItem("lastMesa") || "1"));
  const setMesa = (m) => { setMesaState(m); sessionStorage.setItem("lastMesa", String(m)); };
  const [mesaCount, setMesaCount] = useState(() => parseInt(localStorage.getItem("mesaCount") || "10"));
  const [cat, setCat] = useState(cats[0] || "");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState({});
  const [note, setNote] = useState("");
  const [disc, setDisc] = useState(0);
  const [split, setSplit] = useState(1);
  const [activePromo, setActivePromo] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const MESAS = Array.from({ length: mesaCount }, (_, i) => i + 1);
  const activePromos = promos.filter(p => p.active);
  const mesaOrder = orders.find(o => String(o.mesa) === String(mesa) && !o.is_closed);
  const cartItems = Object.values(cart);
  const sub = cartItems.reduce((s, x) => s + x.price * x.qty, 0);
  const promoDisc = activePromo
    ? activePromo.type === "2x1" ? sub * 0.5 : sub * activePromo.discount / 100
    : 0;
  const manualDisc = sub * disc / 100;
  const total = Math.max(0, sub - promoDisc - manualDisc);

  const filteredProducts = products.filter(p =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : p.cat === cat
  );

  const addItem = (p) => {
    if (p.stock === 0 && !p.unlimited_stock) return;
    setCart(c => ({ ...c, [p.id]: c[p.id] ? { ...c[p.id], qty: c[p.id].qty + 1 } : { ...p, qty: 1 } }));
  };
  const removeItem = (id) => setCart(c => {
    if (!c[id]) return c;
    if (c[id].qty <= 1) { const n = { ...c }; delete n[id]; return n; }
    return { ...c, [id]: { ...c[id], qty: c[id].qty - 1 } };
  });

  const changeMesaCount = (delta) => {
    const v = Math.max(1, mesaCount + delta);
    setMesaCount(v);
    localStorage.setItem("mesaCount", String(v));
  };

  const sendOrder = async () => {
    if (!cartItems.length || sending) return;
    setSending(true);
    try {
      await api.createOrder({ mesa, items: cartItems, note });
      // FIX: esperamos a que orders se actualice ANTES de limpiar el carrito.
      // Así mesaOrder ya existe cuando el carrito queda vacío y el historial
      // de consumo aparece inmediatamente sin parpadeo ni pérdida de datos.
      await onOrdersChanged();
      setCart({});
      setNote("");
      setDisc(0);
      setSplit(1);
      setActivePromo(null);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="note" size={20} color={C.neon} />
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>{user.name?.toUpperCase() || "MESERO"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mesaOrder && <Badge color={C.amber}>Mesa {mesa}: cuenta activa</Badge>}
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Mesas */}
      <div style={{ background: C.bg3, borderBottom: `1px solid ${C.border}`, padding: "8px 12px" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
          {MESAS.map(m => {
            const hasOrder = orders.some(o => String(o.mesa) === String(m) && !o.is_closed);
            return (
              <button key={m} onClick={() => setMesa(m)} style={{
                padding: "4px 12px", borderRadius: 16, flexShrink: 0,
                background: mesa === m ? C.neon + "22" : C.bg4,
                border: `1px solid ${mesa === m ? C.neon : hasOrder ? C.amber : C.border}`,
                color: mesa === m ? C.neon : hasOrder ? C.amber : C.muted,
                fontSize: 12, cursor: "pointer",
              }}>{m}{hasOrder ? " •" : ""}</button>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
            <span style={{ fontSize: 10, color: C.muted }}>Mesas:</span>
            <button onClick={() => changeMesaCount(-1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="minus" size={10} />
            </button>
            <span style={{ fontSize: 11, color: C.muted, minWidth: 16, textAlign: "center" }}>{mesaCount}</span>
            <button onClick={() => changeMesaCount(1)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="plus" size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Menú */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." />
            {!search && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
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
                  }}>{p.name}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, alignContent: "start" }}>
            {filteredProducts.map(p => {
              const inCart = cart[p.id];
              const agotado = p.stock === 0 && !p.unlimited_stock;
              return (
                <div key={p.id} onClick={() => addItem(p)} style={{
                  background: C.bg3, border: `1px solid ${agotado ? C.red + "44" : inCart ? C.neon + "66" : C.border}`,
                  borderRadius: 12, overflow: "hidden", cursor: agotado ? "not-allowed" : "pointer",
                  opacity: agotado ? 0.5 : 1, userSelect: "none", position: "relative",
                }}>
                  {p.image_url
                    ? <img src={`${API_URL}${p.image_url}`} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                    : <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center", background: C.bg4 }}>
                        <Icon name="drink" size={30} color={C.muted} />
                      </div>
                  }
                  {inCart && (
                    <div style={{ position: "absolute", top: 6, right: 6, background: C.neon, color: "#000", borderRadius: "50%", width: 22, height: 22, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {inCart.qty}
                    </div>
                  )}
                  <div style={{ padding: "7px 8px 10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
                    {!p.unlimited_stock && p.stock > 0 && p.stock < 5 && <div style={{ fontSize: 9, color: C.amber }}>Últimas {p.stock}</div>}
                    {agotado && <div style={{ fontSize: 9, color: C.red }}>Agotado</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel orden */}
        <div style={{ width: 280, background: C.bg2, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500 }}>
              <Icon name="receipt" size={14} color={C.neon} /> Mesa {mesa}
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setCart({})}>Limpiar</Btn>
          </div>

          {mesaOrder && (
            <div style={{ background: C.amber + "15", borderBottom: `1px solid ${C.border}`, padding: "7px 12px", fontSize: 11, color: C.amber }}>
              Cuenta activa: {fmt(mesaOrder.total)} — lo nuevo se suma
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>

            {/* Items ya enviados a la mesa — historial acumulado */}
            {mesaOrder && mesaOrder.items.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="check" size={10} color={C.muted} /> Ya en cuenta
                </div>
                {mesaOrder.items.filter(it => !it.paid).map((item, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", borderBottom: `1px solid ${C.border}`, opacity: 0.7 }}>
                    <div style={{ flex: 1, fontSize: 11, color: C.muted }}>{item.qty}× {item.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{fmt(item.price * item.qty)}</div>
                    <div style={{ width: 12 }}>
                      {item.status === "listo" && <Icon name="check" size={10} color={C.neon} />}
                      {item.status === "preparando" && <Icon name="minus" size={10} color={C.amber} />}
                    </div>
                  </div>
                ))}
                {cartItems.length > 0 && (
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1, margin: "10px 0 6px", display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="plus" size={10} color={C.muted} /> Nueva ronda
                  </div>
                )}
              </div>
            )}

            {!cartItems.length && !mesaOrder && <div style={{ textAlign: "center", color: C.muted, marginTop: 40, fontSize: 12 }}>Sin productos en la ronda</div>}
            {!cartItems.length && mesaOrder && <div style={{ textAlign: "center", color: C.muted, marginTop: 12, fontSize: 11 }}>Agrega más productos o cobra la cuenta</div>}
            {cartItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                {item.image_url
                  ? <img src={`${API_URL}${item.image_url}`} alt={item.name} style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 28, borderRadius: 6, background: C.bg4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="drink" size={14} color={C.muted} />
                    </div>
                }
                <div style={{ flex: 1, fontSize: 12 }}>{item.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => removeItem(item.id)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="minus" size={10} />
                  </button>
                  <span style={{ minWidth: 16, textAlign: "center", fontSize: 12 }}>{item.qty}</span>
                  <button onClick={() => addItem(item)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="plus" size={10} />
                  </button>
                </div>
                <div style={{ fontSize: 12, color: C.neon, minWidth: 50, textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 12px", background: C.bg3, borderTop: `1px solid ${C.border}` }}>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota (sin hielo, etc.)"
              style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "5px 8px", fontSize: 11, marginBottom: 8, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Desc. %</div>
                <input type="number" min="0" max="100" value={disc} onChange={e => setDisc(+e.target.value)}
                  style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 6px", fontSize: 12, boxSizing: "border-box" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>Dividir</div>
                <input type="number" min="1" value={split} onChange={e => setSplit(+e.target.value)}
                  style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "4px 6px", fontSize: 12, boxSizing: "border-box" }} />
              </div>
            </div>

            {activePromo && <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>Promo activa: {activePromo.name}</div>}

            <Divider />
            <div style={{ fontSize: 12, color: C.muted, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span>Subtotal</span><span>{fmt(sub)}</span>
            </div>
            {(promoDisc + manualDisc) > 0 && (
              <div style={{ fontSize: 12, color: C.amber, display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span>Descuento</span><span>-{fmt(promoDisc + manualDisc)}</span>
              </div>
            )}
            <div style={{ fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", marginBottom: split > 1 ? 3 : 8 }}>
              <span>Total ronda</span><span style={{ color: C.neon }}>{fmt(total)}</span>
            </div>
            {split > 1 && (
              <div style={{ fontSize: 12, color: C.neon2, display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>x persona ({split})</span><span>{fmt(total / split)}</span>
              </div>
            )}

            {sent ? (
  <div
    style={{
      background: C.neon + "22",
      border: `1px solid ${C.neon}`,
      borderRadius: 8,
      padding: 9,
      textAlign: "center",
      color: C.neon,
      fontSize: 13,
      fontWeight: 500,
      marginBottom: 8,
      display: "flex",
      gap: 6,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Icon name="check" size={14} color={C.neon} />
    {cartItems.length
      ? "Orden enviada"
      : "Cuenta enviada a barra"}
  </div>
) : cartItems.length ? (
  <Btn
    variant="primary"
    onClick={sendOrder}
    disabled={sending}
    style={{ width: "100%", fontSize: 14, marginBottom: 8 }}
  >
    {sending ? "Enviando..." : "Enviar orden"}
  </Btn>
) : mesaOrder ? (
  <Btn
    variant="amber"
    disabled={mesaOrder.payment_requested}
    onClick={async () => {
      try {
        await api.requestPayment(mesaOrder.id);
        await onOrdersChanged();
        setSent(true);
        setTimeout(() => setSent(false), 2000);
      } catch (e) {
        alert(e.message);
      }
    }}
    style={{ width: "100%", fontSize: 14, marginBottom: 8 }}
  >
    {mesaOrder.payment_requested
      ? "Cuenta enviada"
      : "Enviar cuenta a barra"}
  </Btn>
) : (
  <Btn disabled style={{ width: "100%", fontSize: 14, marginBottom: 8 }}>
    Sin productos
  </Btn>
)}
          </div>
        </div>
      </div>
    </div>
  );
}

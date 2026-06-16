import { useState, useEffect, useCallback } from "react";

// ─── Paleta oscura bar ────────────────────────────────────────────────────────
const C = {
  bg: "#0a0a0f",
  bg2: "#12121a",
  bg3: "#1a1a26",
  bg4: "#222233",
  neon: "#00e5a0",
  neon2: "#a78bfa",
  neon3: "#f472b6",
  amber: "#fbbf24",
  red: "#f87171",
  blue: "#60a5fa",
  text: "#f0f0f8",
  muted: "#7a7a9a",
  border: "#2a2a3f",
  border2: "#3a3a55",
};

// ─── Estilos globales ─────────────────────────────────────────────────────────
const gs = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:${C.bg};color:${C.text};font-family:'Inter',sans-serif;font-size:14px}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${C.bg2}}
::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px}
button{cursor:pointer;font-family:inherit}
input,select,textarea{font-family:inherit}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.fade-in{animation:fadeIn .2s ease}
.pulse{animation:pulse 1.5s infinite}
@media(max-width:640px){.hide-mobile{display:none!important}}
@media(min-width:641px){.hide-desktop{display:none!important}}
`;

// ─── Datos iniciales ──────────────────────────────────────────────────────────
const INITIAL_PRODUCTS = [
  { id: 1, name: "Corona", cat: "Cervezas", price: 45, stock: 24, emoji: "🍺" },
  { id: 2, name: "Modelo Especial", cat: "Cervezas", price: 48, stock: 18, emoji: "🍺" },
  { id: 3, name: "Heineken", cat: "Cervezas", price: 52, stock: 12, emoji: "🍺" },
  { id: 4, name: "Pacífico", cat: "Cervezas", price: 45, stock: 20, emoji: "🍺" },
  { id: 5, name: "Whisky Jack Daniel's", cat: "Licores", price: 90, stock: 8, emoji: "🥃" },
  { id: 6, name: "Ron Bacardí", cat: "Licores", price: 75, stock: 10, emoji: "🥃" },
  { id: 7, name: "Tequila 1800", cat: "Licores", price: 85, stock: 6, emoji: "🥃" },
  { id: 8, name: "Vodka Smirnoff", cat: "Licores", price: 70, stock: 9, emoji: "🥃" },
  { id: 9, name: "Margarita", cat: "Cócteles", price: 110, stock: 999, emoji: "🍹" },
  { id: 10, name: "Mojito", cat: "Cócteles", price: 120, stock: 999, emoji: "🍹" },
  { id: 11, name: "Paloma", cat: "Cócteles", price: 95, stock: 999, emoji: "🍹" },
  { id: 12, name: "Piña Colada", cat: "Cócteles", price: 130, stock: 999, emoji: "🍹" },
  { id: 13, name: "Nachos", cat: "Botanas", price: 95, stock: 15, emoji: "🧀" },
  { id: 14, name: "Alitas x10", cat: "Botanas", price: 145, stock: 10, emoji: "🍗" },
  { id: 15, name: "Papas fritas", cat: "Botanas", price: 65, stock: 20, emoji: "🍟" },
  { id: 16, name: "Orden de tacos", cat: "Botanas", price: 120, stock: 12, emoji: "🌮" },
];

const INITIAL_PROMOS = [
  { id: 1, name: "2x1 Cervezas", desc: "Lunes y martes toda la noche", discount: 50, type: "2x1", active: true, emoji: "🍺" },
  { id: 2, name: "Hora feliz", desc: "Cócteles 30% desc. 6-8 PM", discount: 30, type: "percent", active: false, emoji: "⏰" },
];

const CATS = ["Cervezas", "Licores", "Cócteles", "Botanas"];
const MESAS = Array.from({ length: 10 }, (_, i) => i + 1);
const PAY_METHODS = [
  { id: "ef", label: "Efectivo", icon: "💵" },
  { id: "ta", label: "Tarjeta", icon: "💳" },
  { id: "qr", label: "QR/Trans.", icon: "📱" },
];

let nextOrderId = 1;
const mkOrderId = () => `ORD-${String(nextOrderId++).padStart(3, "0")}`;

// ─── Utilidades ───────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const now = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

// ─── Componentes base ─────────────────────────────────────────────────────────
const Btn = ({ children, onClick, variant = "default", size = "md", disabled, style = {} }) => {
  const base = {
    border: "none", borderRadius: 8, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, transition: "all .15s", display: "inline-flex",
    alignItems: "center", gap: 6, justifyContent: "center", fontFamily: "inherit",
  };
  const sizes = { sm: { padding: "5px 10px", fontSize: 12 }, md: { padding: "8px 14px", fontSize: 13 }, lg: { padding: "11px 20px", fontSize: 14 } };
  const variants = {
    default: { background: C.bg4, color: C.text, border: `1px solid ${C.border2}` },
    primary: { background: C.neon, color: "#000" },
    purple: { background: C.neon2, color: "#fff" },
    danger: { background: C.red, color: "#fff" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    amber: { background: C.amber, color: "#000" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Badge = ({ children, color = C.neon }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
    {children}
  </span>
);

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "12px 14px", cursor: onClick ? "pointer" : "default",
    transition: onClick ? "border-color .15s" : undefined, ...style
  }}
    onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = C.border2 }}
    onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = C.border }}
  >
    {children}
  </div>
);

const Modal = ({ children, onClose, title }) => (
  <div style={{
    position: "fixed", inset: 0, background: "#000b", zIndex: 100,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16
  }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className="fade-in" style={{
      background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 16,
      padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto"
    }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.neon }}>{title}</span>
          <Btn size="sm" variant="ghost" onClick={onClose}>✕</Btn>
        </div>
      )}
      {children}
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>}
    <input style={{
      width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8,
      color: C.text, padding: "8px 10px", fontSize: 13, outline: "none"
    }} {...props} />
  </div>
);

const Divider = () => <div style={{ height: 1, background: C.border, margin: "10px 0" }} />;

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const ROLES = [
  { id: "mesero", label: "Mesero", icon: "🧑‍🍳", desc: "Tomar órdenes en mesa", pin: "1234" },
  { id: "barman", label: "Barman", icon: "🍸", desc: "Ver y preparar órdenes", pin: "5678" },
  { id: "admin", label: "Administrador", icon: "📊", desc: "Panel completo", pin: "0000" },
];

function Login({ onLogin }) {
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const role = ROLES.find(r => r.id === selected);
    if (role && pin === role.pin) {
      onLogin(selected);
    } else {
      setError("PIN incorrecto");
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🍹</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: C.neon, letterSpacing: 2 }}>BAR POS</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Sistema de punto de venta</div>
      </div>

      {!selected ? (
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Selecciona tu rol
          </div>
          {ROLES.map(r => (
            <Card key={r.id} onClick={() => { setSelected(r.id); setPin(""); setError(""); }} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28 }}>{r.icon}</div>
              <div>
                <div style={{ fontWeight: 500, color: C.text }}>{r.label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.desc}</div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 300 }} className="fade-in">
          <div style={{ textAlign: "center", fontSize: 32, marginBottom: 8 }}>
            {ROLES.find(r => r.id === selected)?.icon}
          </div>
          <div style={{ textAlign: "center", fontWeight: 500, marginBottom: 20, color: C.neon }}>
            {ROLES.find(r => r.id === selected)?.label}
          </div>
          <Input label="PIN de acceso" type="password" maxLength={4} value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••" />
          {error && <div style={{ color: C.red, fontSize: 12, textAlign: "center", marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setSelected(null)} style={{ flex: 1 }}>Atrás</Btn>
            <Btn variant="primary" onClick={handleLogin} style={{ flex: 1 }}>Entrar</Btn>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 12 }}>
            Demo: PIN = {ROLES.find(r => r.id === selected)?.pin}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VISTA MESERO ─────────────────────────────────────────────────────────────
function MeseroView({ products, promos, orders, onAddOrder, onLogout }) {
  const [mesa, setMesa] = useState(1);
  const [cat, setCat] = useState("Cervezas");
  const [cart, setCart] = useState({});
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("ef");
  const [disc, setDisc] = useState(0);
  const [split, setSplit] = useState(1);
  const [sent, setSent] = useState(false);
  const [activePromo, setActivePromo] = useState(null);

  const activePromos = promos.filter(p => p.active);
  const mesaOrder = orders.find(o => o.mesa === mesa && o.status !== "cobrado");
  const cartItems = Object.values(cart);
  const sub = cartItems.reduce((s, x) => s + x.price * x.qty, 0);
  const promoDisc = activePromo ? (activePromo.type === "2x1" ? sub * 0.5 : sub * activePromo.discount / 100) : 0;
  const manualDisc = sub * disc / 100;
  const total = Math.max(0, sub - promoDisc - manualDisc);

  const addItem = (p) => {
    if (p.stock === 0) return;
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
  const sendOrder = () => {
    if (!cartItems.length) return;
    onAddOrder({ id: mkOrderId(), mesa, items: cartItems, note, pay, disc, promoDisc, total, status: "pendiente", time: now() });
    setCart({}); setNote(""); setDisc(0); setSplit(1); setActivePromo(null);
    setSent(true); setTimeout(() => setSent(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      {/* Top bar */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🧑‍🍳</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>MESERO</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {mesaOrder && <Badge color={C.amber}>Mesa {mesa}: {mesaOrder.status}</Badge>}
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Selector de mesa */}
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
                fontSize: 12, cursor: "pointer", position: "relative"
              }}>
                Mesa {m}{hasOrder ? " •" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "row" }}>
        {/* Menú */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Categorías */}
          <div style={{ display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
            {CATS.map(c => (
              <button key={c} onClick={() => setCat(c)} style={{
                padding: "4px 14px", borderRadius: 16, whiteSpace: "nowrap",
                background: cat === c ? C.neon2 + "22" : "transparent",
                border: `1px solid ${cat === c ? C.neon2 : C.border}`,
                color: cat === c ? C.neon2 : C.muted, fontSize: 12, cursor: "pointer"
              }}>{c}</button>
            ))}
            {/* Promos */}
            {activePromos.map(p => (
              <button key={p.id} onClick={() => setActivePromo(activePromo?.id === p.id ? null : p)} style={{
                padding: "4px 14px", borderRadius: 16, whiteSpace: "nowrap",
                background: activePromo?.id === p.id ? C.amber + "22" : "transparent",
                border: `1px solid ${activePromo?.id === p.id ? C.amber : C.border}`,
                color: activePromo?.id === p.id ? C.amber : C.muted, fontSize: 12, cursor: "pointer"
              }}>{p.emoji} {p.name}</button>
            ))}
          </div>

          {/* Productos */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, alignContent: "start" }}>
            {products.filter(p => p.cat === cat).map(p => (
              <div key={p.id} onClick={() => addItem(p)} style={{
                background: C.bg3, border: `1px solid ${p.stock === 0 ? C.red + "44" : C.border}`,
                borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: p.stock === 0 ? "not-allowed" : "pointer",
                opacity: p.stock === 0 ? 0.5 : 1, transition: ".15s", userSelect: "none"
              }}
                onMouseEnter={e => { if (p.stock > 0) e.currentTarget.style.borderColor = C.neon }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = p.stock === 0 ? C.red + "44" : C.border }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{p.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: C.text, lineHeight: 1.3, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
                {cart[p.id] && (
                  <div style={{ marginTop: 4, background: C.neon, color: "#000", borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px", display: "inline-block" }}>
                    {cart[p.id].qty}
                  </div>
                )}
                {p.stock < 5 && p.stock > 0 && <div style={{ fontSize: 9, color: C.amber, marginTop: 2 }}>Últimas {p.stock}</div>}
                {p.stock === 0 && <div style={{ fontSize: 9, color: C.red, marginTop: 2 }}>Agotado</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Ticket */}
        <div style={{ width: 280, background: C.bg2, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 500, color: C.text, fontSize: 13 }}>🧾 Orden — Mesa {mesa}</span>
            <Btn size="sm" variant="ghost" onClick={() => setCart({})}>Limpiar</Btn>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
            {!cartItems.length && (
              <div style={{ textAlign: "center", color: C.muted, marginTop: 40, fontSize: 12, lineHeight: 2 }}>
                Sin productos<br /><span style={{ fontSize: 11 }}>Toca del menú</span>
              </div>
            )}
            {cartItems.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 16 }}>{item.emoji}</span>
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.3 }}>{item.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => removeItem(item.id)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>−</button>
                  <span style={{ minWidth: 16, textAlign: "center", fontSize: 12 }}>{item.qty}</span>
                  <button onClick={() => addItem(item)} style={{ width: 20, height: 20, borderRadius: "50%", border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>+</button>
                </div>
                <div style={{ fontSize: 12, color: C.neon, minWidth: 50, textAlign: "right" }}>{fmt(item.price * item.qty)}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "10px 12px", background: C.bg3, borderTop: `1px solid ${C.border}` }}>
            {/* Nota */}
            <div style={{ marginBottom: 8 }}>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nota (sin hielo, bien cocido...)"
                style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "5px 8px", fontSize: 11 }} />
            </div>
            {/* Descuento y split */}
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
            {activePromo && <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>✓ {activePromo.name} aplicada</div>}
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
            {/* Pago */}
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              {PAY_METHODS.map(m => (
                <button key={m.id} onClick={() => setPay(m.id)} style={{
                  flex: 1, padding: "4px 2px", borderRadius: 6, fontSize: 10,
                  background: pay === m.id ? C.neon2 + "22" : "transparent",
                  border: `1px solid ${pay === m.id ? C.neon2 : C.border}`,
                  color: pay === m.id ? C.neon2 : C.muted, cursor: "pointer"
                }}>{m.icon} {m.label}</button>
              ))}
            </div>
            {sent ? (
              <div style={{ background: C.neon + "22", border: `1px solid ${C.neon}`, borderRadius: 8, padding: "9px", textAlign: "center", color: C.neon, fontSize: 13, fontWeight: 500 }}>
                ✓ Orden enviada a barra
              </div>
            ) : (
              <Btn variant="primary" onClick={sendOrder} disabled={!cartItems.length} style={{ width: "100%", fontSize: 14 }}>
                Enviar a barra
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VISTA BARMAN ─────────────────────────────────────────────────────────────
function BarmanView({ orders, onUpdateStatus, onLogout }) {
  const active = orders.filter(o => o.status !== "cobrado");
  const statusColor = { pendiente: C.amber, preparando: C.blue, listo: C.neon, cobrado: C.muted };
  const nextStatus = { pendiente: "preparando", preparando: "listo", listo: "cobrado" };
  const nextLabel = { pendiente: "Preparar", preparando: "Listo", listo: "Cobrar" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🍸</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon2, fontSize: 13 }}>BARMAN — Pantalla de órdenes</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color={C.amber}>{active.filter(o => o.status === "pendiente").length} pendientes</Badge>
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {!active.length ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 48 }}>✨</div>
          <div>Sin órdenes pendientes</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, alignContent: "start" }}>
          {active.map(o => (
            <Card key={o.id} style={{ borderColor: statusColor[o.status] + "55" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>Mesa {o.mesa}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge color={statusColor[o.status]}>{o.status}</Badge>
                  <span style={{ fontSize: 11, color: C.muted }}>{o.time}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{o.id}</div>
              {o.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span>{item.emoji} {item.name}</span>
                  <span style={{ color: C.muted }}>x{item.qty}</span>
                </div>
              ))}
              {o.note && (
                <div style={{ marginTop: 6, background: C.amber + "11", border: `1px solid ${C.amber}44`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.amber }}>
                  📝 {o.note}
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.neon }}>{fmt(o.total)}</span>
                {nextStatus[o.status] && (
                  <Btn size="sm"
                    variant={o.status === "pendiente" ? "amber" : o.status === "preparando" ? "purple" : "primary"}
                    onClick={() => onUpdateStatus(o.id, nextStatus[o.status])}>
                    {nextLabel[o.status]}
                  </Btn>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminView({ products, setProducts, promos, setPromos, orders, onUpdateStatus, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const [editProd, setEditProd] = useState(null);
  const [editPromo, setEditPromo] = useState(null);
  const [newProd, setNewProd] = useState(false);
  const [newPromo, setNewPromo] = useState(false);

  const cobradas = orders.filter(o => o.status === "cobrado");
  const pendientes = orders.filter(o => o.status !== "cobrado");
  const totalDia = cobradas.reduce((s, o) => s + o.total, 0);
  const byPay = PAY_METHODS.map(m => ({ ...m, total: cobradas.filter(o => o.pay === m.id).reduce((s, o) => s + o.total, 0) }));
  const topProds = products.map(p => ({ ...p, sold: cobradas.reduce((s, o) => s + (o.items.find(x => x.id === p.id)?.qty || 0), 0) })).sort((a, b) => b.sold - a.sold).slice(0, 5);
  const byMesa = MESAS.map(m => ({ mesa: m, total: cobradas.filter(o => o.mesa === m).reduce((s, o) => s + o.total, 0) })).filter(x => x.total > 0);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "ordenes", label: "Órdenes", icon: "📋" },
    { id: "menu", label: "Menú", icon: "🍹" },
    { id: "promos", label: "Promos", icon: "🏷️" },
    { id: "inventario", label: "Inventario", icon: "📦" },
    { id: "ventas", label: "Historial", icon: "🕓" },
  ];

  const saveProd = (p) => {
    if (p.id) {
      setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    } else {
      const maxId = Math.max(...products.map(x => x.id), 0);
      setProducts(prev => [...prev, { ...p, id: maxId + 1, stock: +p.stock || 0 }]);
    }
    setEditProd(null); setNewProd(false);
  };
  const deleteProd = (id) => setProducts(prev => prev.filter(x => x.id !== id));

  const savePromo = (p) => {
    if (p.id) setPromos(prev => prev.map(x => x.id === p.id ? p : x));
    else { const maxId = Math.max(...promos.map(x => x.id), 0); setPromos(prev => [...prev, { ...p, id: maxId + 1 }]); }
    setEditPromo(null); setNewPromo(false);
  };
  const deletePromo = (id) => setPromos(prev => prev.filter(x => x.id !== id));
  const togglePromo = (id) => setPromos(prev => prev.map(x => x.id === id ? { ...x, active: !x.active } : x));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📊</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon3, fontSize: 13 }}>ADMINISTRADOR</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Badge color={C.neon}>{fmt(totalDia)} hoy</Badge>
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.bg3, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
        <div style={{ display: "flex", minWidth: "max-content" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 16px", border: "none", background: "transparent", cursor: "pointer",
              color: tab === t.id ? C.neon3 : C.muted, fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
              borderBottom: `2px solid ${tab === t.id ? C.neon3 : "transparent"}`, whiteSpace: "nowrap"
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Ventas hoy", val: fmt(totalDia), color: C.neon },
                { label: "Órdenes cobradas", val: cobradas.length, color: C.blue },
                { label: "Mesas activas", val: pendientes.filter(o => o.mesa).length, color: C.amber },
                { label: "Pendientes barra", val: pendientes.filter(o => o.status === "pendiente").length, color: C.red },
              ].map(m => (
                <Card key={m.label} style={{ background: C.bg3 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.val}</div>
                </Card>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <div style={{ fontWeight: 500, marginBottom: 10, color: C.text }}>🏆 Top productos vendidos</div>
                {topProds.length === 0 && <div style={{ color: C.muted, fontSize: 12 }}>Sin ventas aún</div>}
                {topProds.filter(p => p.sold > 0).map((p, i) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted }}>{["🥇", "🥈", "🥉", "4.", "5."][i]} {p.name}</span>
                    <span style={{ color: C.neon }}>{p.sold} uds</span>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontWeight: 500, marginBottom: 10, color: C.text }}>💳 Por método de pago</div>
                {byPay.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted }}>{m.icon} {m.label}</span>
                    <span style={{ color: C.neon2 }}>{fmt(m.total)}</span>
                  </div>
                ))}
              </Card>
            </div>

            {byMesa.length > 0 && (
              <Card style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 500, marginBottom: 10, color: C.text }}>🪑 Ventas por mesa</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {byMesa.map(m => (
                    <div key={m.mesa} style={{ background: C.bg3, borderRadius: 8, padding: "6px 12px", fontSize: 12 }}>
                      <span style={{ color: C.muted }}>Mesa {m.mesa}</span>
                      <span style={{ color: C.neon, marginLeft: 8, fontWeight: 500 }}>{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ÓRDENES */}
        {tab === "ordenes" && (
          <div className="fade-in">
            <div style={{ fontWeight: 500, marginBottom: 12, color: C.text }}>Órdenes activas ({pendientes.length})</div>
            {!pendientes.length && <div style={{ color: C.muted, fontSize: 13 }}>Sin órdenes activas</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {pendientes.map(o => {
                const sc = { pendiente: C.amber, preparando: C.blue, listo: C.neon };
                const ns = { pendiente: "preparando", preparando: "listo", listo: "cobrado" };
                const nl = { pendiente: "Preparar", preparando: "Listo", listo: "Cobrado" };
                return (
                  <Card key={o.id} style={{ borderColor: sc[o.status] + "55" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 500 }}>Mesa {o.mesa} — {o.id}</span>
                      <Badge color={sc[o.status]}>{o.status}</Badge>
                    </div>
                    {o.items.map((x, i) => <div key={i} style={{ fontSize: 12, color: C.muted, padding: "2px 0" }}>{x.emoji} {x.name} x{x.qty}</div>)}
                    {o.note && <div style={{ fontSize: 11, color: C.amber, marginTop: 4 }}>📝 {o.note}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ color: C.neon, fontWeight: 600 }}>{fmt(o.total)}</span>
                      <Btn size="sm" variant="primary" onClick={() => onUpdateStatus(o.id, ns[o.status])}>{nl[o.status]}</Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* MENÚ */}
        {tab === "menu" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 500, color: C.text }}>Productos del menú ({products.length})</span>
              <Btn variant="primary" size="sm" onClick={() => setNewProd(true)}>+ Agregar producto</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {products.map(p => (
                <Card key={p.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 20 }}>{p.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{p.cat}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
                      <div style={{ fontSize: 11, color: p.stock < 5 ? C.red : C.muted }}>Stock: {p.stock === 999 ? "∞" : p.stock}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <Btn size="sm" variant="ghost" onClick={() => setEditProd({ ...p })} style={{ flex: 1 }}>Editar</Btn>
                    <Btn size="sm" variant="danger" onClick={() => deleteProd(p.id)} style={{ flex: 1 }}>Eliminar</Btn>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PROMOS */}
        {tab === "promos" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 500, color: C.text }}>Promociones ({promos.length})</span>
              <Btn variant="amber" size="sm" onClick={() => setNewPromo(true)}>+ Nueva promo</Btn>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {promos.map(p => (
                <Card key={p.id} style={{ borderColor: p.active ? C.amber + "55" : C.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 22 }}>{p.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{p.desc}</div>
                      </div>
                    </div>
                    <Badge color={p.active ? C.amber : C.muted}>{p.active ? "Activa" : "Inactiva"}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: C.amber, marginBottom: 8 }}>
                    {p.type === "2x1" ? "2x1" : `${p.discount}% descuento`}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" variant={p.active ? "ghost" : "amber"} onClick={() => togglePromo(p.id)} style={{ flex: 1 }}>
                      {p.active ? "Desactivar" : "Activar"}
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setEditPromo({ ...p })} style={{ flex: 1 }}>Editar</Btn>
                    <Btn size="sm" variant="danger" onClick={() => deletePromo(p.id)}>✕</Btn>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* INVENTARIO */}
        {tab === "inventario" && (
          <div className="fade-in">
            <div style={{ fontWeight: 500, marginBottom: 12, color: C.text }}>Control de inventario</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Producto", "Categoría", "Precio", "Stock", "Estado", "Ajustar"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 400, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg3}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "8px 12px" }}>{p.emoji} {p.name}</td>
                      <td style={{ padding: "8px 12px", color: C.muted }}>{p.cat}</td>
                      <td style={{ padding: "8px 12px", color: C.neon }}>{fmt(p.price)}</td>
                      <td style={{ padding: "8px 12px", color: p.stock < 5 && p.stock !== 999 ? C.red : C.text }}>{p.stock === 999 ? "∞" : p.stock}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {p.stock === 999 ? <Badge color={C.neon}>Ilimitado</Badge> :
                          p.stock === 0 ? <Badge color={C.red}>Agotado</Badge> :
                            p.stock < 5 ? <Badge color={C.amber}>Bajo</Badge> :
                              <Badge color={C.neon}>OK</Badge>}
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        {p.stock !== 999 && (
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: Math.max(0, x.stock - 1) } : x))}
                              style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer" }}>−</button>
                            <button onClick={() => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: x.stock + 1 } : x))}
                              style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${C.border2}`, background: C.bg4, color: C.text, cursor: "pointer" }}>+</button>
                            <button onClick={() => { const v = prompt("Nuevo stock:", p.stock); if (v !== null && !isNaN(+v)) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: +v } : x)); }}
                              style={{ padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.bg4, color: C.muted, cursor: "pointer", fontSize: 11 }}>Fijar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HISTORIAL */}
        {tab === "ventas" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 500, color: C.text }}>Historial del día ({cobradas.length} ventas)</span>
              <Badge color={C.neon}>Total: {fmt(totalDia)}</Badge>
            </div>
            {!cobradas.length && <div style={{ color: C.muted, fontSize: 13 }}>Sin ventas cobradas aún</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cobradas.slice().reverse().map(o => {
                const pm = PAY_METHODS.find(m => m.id === o.pay);
                return (
                  <Card key={o.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>Mesa {o.mesa} — {o.id}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{o.items.map(x => `${x.name} x${x.qty}`).join(", ")}</div>
                        {o.note && <div style={{ fontSize: 11, color: C.amber, marginTop: 2 }}>📝 {o.note}</div>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: C.neon, fontWeight: 600, fontSize: 14 }}>{fmt(o.total)}</div>
                        <Badge color={C.neon2}>{pm?.icon} {pm?.label}</Badge>
                        <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{o.time}</div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal editar/crear producto */}
      {(editProd || newProd) && (
        <ProdForm prod={editProd || { name: "", cat: "Cervezas", price: "", stock: "", emoji: "🍹" }}
          onSave={saveProd} onClose={() => { setEditProd(null); setNewProd(false); }} />
      )}

      {/* Modal editar/crear promo */}
      {(editPromo || newPromo) && (
        <PromoForm promo={editPromo || { name: "", desc: "", discount: 10, type: "percent", active: true, emoji: "🏷️" }}
          onSave={savePromo} onClose={() => { setEditPromo(null); setNewPromo(false); }} />
      )}
    </div>
  );
}

function ProdForm({ prod, onSave, onClose }) {
  const [form, setForm] = useState({ ...prod });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={form.id ? "Editar producto" : "Nuevo producto"} onClose={onClose}>
      <Input label="Nombre" value={form.name} onChange={e => set("name", e.target.value)} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Categoría</div>
        <select value={form.cat} onChange={e => set("cat", e.target.value)}
          style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 13 }}>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="Precio ($)" type="number" value={form.price} onChange={e => set("price", +e.target.value)} />
        <Input label="Stock (999 = ∞)" type="number" value={form.stock} onChange={e => set("stock", +e.target.value)} />
      </div>
      <Input label="Emoji" value={form.emoji} onChange={e => set("emoji", e.target.value)} />
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="primary" onClick={() => onSave(form)} style={{ flex: 1 }} disabled={!form.name || !form.price}>Guardar</Btn>
      </div>
    </Modal>
  );
}

function PromoForm({ promo, onSave, onClose }) {
  const [form, setForm] = useState({ ...promo });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={form.id ? "Editar promoción" : "Nueva promoción"} onClose={onClose}>
      <Input label="Nombre" value={form.name} onChange={e => set("name", e.target.value)} />
      <Input label="Descripción" value={form.desc} onChange={e => set("desc", e.target.value)} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: .5 }}>Tipo</div>
        <select value={form.type} onChange={e => set("type", e.target.value)}
          style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 13 }}>
          <option value="percent">Porcentaje de descuento</option>
          <option value="2x1">2x1</option>
        </select>
      </div>
      {form.type === "percent" && <Input label="Descuento %" type="number" min="1" max="100" value={form.discount} onChange={e => set("discount", +e.target.value)} />}
      <Input label="Emoji" value={form.emoji} onChange={e => set("emoji", e.target.value)} />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Btn>
        <Btn variant="amber" onClick={() => onSave(form)} style={{ flex: 1 }} disabled={!form.name}>Guardar</Btn>
      </div>
    </Modal>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState(null);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [promos, setPromos] = useState(INITIAL_PROMOS);
  const [orders, setOrders] = useState([]);

  const addOrder = useCallback((order) => {
    setOrders(prev => [...prev, order]);
    // Descontar inventario
    setProducts(prev => prev.map(p => {
      const item = order.items.find(x => x.id === p.id);
      if (!item || p.stock === 999) return p;
      return { ...p, stock: Math.max(0, p.stock - item.qty) };
    }));
  }, []);

  const updateStatus = useCallback((id, status) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  }, []);

  return (
    <>
      <style>{gs}</style>
      {!role && <Login onLogin={setRole} />}
      {role === "mesero" && <MeseroView products={products} promos={promos} orders={orders} onAddOrder={addOrder} onLogout={() => setRole(null)} />}
      {role === "barman" && <BarmanView orders={orders} onUpdateStatus={updateStatus} onLogout={() => setRole(null)} />}
      {role === "admin" && <AdminView products={products} setProducts={setProducts} promos={promos} setPromos={setPromos} orders={orders} onUpdateStatus={updateStatus} onLogout={() => setRole(null)} />}
    </>
  );
}

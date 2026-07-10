import { useState, useEffect, useRef } from "react";
import { C, fmt, today } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Divider, Modal } from "./Common.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const CATS_FALLBACK = ["Cervezas", "Licores", "Cócteles", "Botanas"];
const PAY_METHODS = [
  { id: "ef", label: "Efectivo" },
  { id: "ta", label: "Tarjeta" },
  { id: "qr", label: "QR/Trans." },
];

const STATUS_LABEL = { pendiente: "Pendiente", preparando: "Preparando...", listo: "Listo" };
const STATUS_COLOR = { pendiente: C.red, preparando: C.amber, listo: C.neon };

export default function MeseroView({ user, products, orders, business, tableCount, barCount, onOrdersChanged, onBusinessChanged, onLogout }) {
  const MESAS  = Array.from({ length: tableCount }, (_, i) => i + 1);
  const BARRAS = Array.from({ length: barCount },   (_, i) => `B${i + 1}`);

  const [lugar, setLugar]             = useState(String(MESAS[0]));
  const [tab, setTab]                 = useState("menu");
  const cats = [...new Set(products.map(p => p.cat))].length
    ? [...new Set(products.map(p => p.cat))]
    : CATS_FALLBACK;
  const [cat, setCat]                 = useState(cats[0]);
  const [cart, setCart]               = useState({});
  const [note, setNote]               = useState("");
  const [sending, setSending]         = useState(false);
  const [sent, setSent]               = useState(false);
  const [search, setSearch]           = useState("");
  const [layoutModal, setLayoutModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const prevOrdersRef = useRef(orders);
  const [requestingPay, setRequestingPay] = useState(false);

  // ============ NUEVO — notificaciones por MESERO, no por mesa seleccionada ============
  // Se recorren TODAS las órdenes abiertas creadas por este mesero (created_by_id),
  // sin importar qué mesa/barra tenga abierta en pantalla en este momento (`lugar`).
  // Así, si cambia de mesa, sigue recibiendo el aviso cuando cambie el estado de sus items.
  useEffect(() => {
    const prev = prevOrdersRef.current;

    const misOrdenesActuales = orders.filter(o => o.created_by_id === user.id && !o.is_closed);

    misOrdenesActuales.forEach(currOrder => {
      const prevOrder = prev.find(o => o.id === currOrder.id);
      if (!prevOrder) return; // orden nueva, todavía no hay estado previo que comparar

      const esBarraNotif = BARRAS.includes(String(currOrder.mesa));
      const labelLugarNotif = esBarraNotif ? `Barra ${currOrder.mesa}` : `Mesa ${currOrder.mesa}`;

      currOrder.items.forEach((item, idx) => {
        const prevItem = prevOrder.items[idx];
        if (prevItem && prevItem.status !== item.status) {
          const notif = {
            id: `${currOrder.id}-${idx}-${Date.now()}`,
            text: `${labelLugarNotif} — ${item.name}: ${STATUS_LABEL[item.status]}`,
            color: STATUS_COLOR[item.status],
            status: item.status,
          };
          setNotifications(n => [...n, notif]);
        }
      });
    });

    prevOrdersRef.current = orders;
  }, [orders, user.id]);
  // ============ FIN NUEVO ============
  // NOTA: las notificaciones ya NO se auto-cierran; permanecen visibles
  // hasta que el mesero las cierre manualmente con el botón "×".

  const esBarra       = BARRAS.includes(lugar);
  const labelLugar    = esBarra ? `Barra ${lugar}` : `Mesa ${lugar}`;
  const lugarOrder    = orders.find(o => String(o.mesa) === lugar && !o.is_closed);
  const cartItems     = Object.values(cart);
  const sub           = cartItems.reduce((s, x) => s + x.price * x.qty, 0);
  const total          = sub;

  const lugarResumen = (() => {
    if (!lugarOrder) return [];
    const map = {};
    lugarOrder.items.forEach(item => {
      const key = item.product_id || item.name;
      if (!map[key]) map[key] = { ...item, qty: 0 };
      map[key].qty += item.qty;
    });
    return Object.values(map);
  })();

  const lugarTotal     = lugarOrder?.items.reduce((s, it) => s + it.price * it.qty, 0) || 0;
  const lugarPagado    = lugarOrder?.items.filter(it => it.paid).reduce((s, it) => s + it.price * it.qty, 0) || 0;
  const lugarPendiente = lugarTotal - lugarPagado;
  const productosFiltrados = search.trim()
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : products.filter(p => p.cat === cat);


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

  const sendOrder = async () => {
    if (!cartItems.length || sending) return;
    setSending(true);
    try {
      await api.createOrder({ mesa: lugar, items: cartItems, note });
      setCart({}); setNote("");
      setSent(true); setTimeout(() => setSent(false), 2000);
      onOrdersChanged();
    } catch (e) {
      alert("Error al enviar la orden: " + e.message);
    } finally {
      setSending(false);
    }
  };


  const requestPayment = async () => {
  if (!lugarOrder || requestingPay || lugarOrder.payment_requested) return;
  setRequestingPay(true);
  try {
    await api.requestPayment(lugarOrder.id);
    onOrdersChanged();
  } catch (e) {
    alert("Error al solicitar el cobro: " + e.message);
  } finally {
    setRequestingPay(false);
  }
};

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

      {/* ============ NUEVO — animación de entrada para las notificaciones ============ */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      {/* ============ FIN NUEVO ============ */}

      {/* Notificaciones flotantes */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000, display: "flex", flexDirection: "column", gap: 10 }}>
        {notifications.map(n => {
          // ============ NUEVO — diseño tipo tarjeta sólida (sin transparencias):
          // fondo gris oscuro opaco, texto blanco legible, y el color de estado
          // solo como acento (barra lateral + punto), sin emojis. No se auto-cierra. ============
          return (
            <div key={n.id} style={{
              background: "#1f2125",
              border: `1px solid #33363b`,
              borderLeft: `4px solid ${n.color}`,
              borderRadius: 8,
              padding: "12px 14px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              display: "flex", alignItems: "flex-start", gap: 10,
              minWidth: 240,
              maxWidth: 300,
              animation: "slideIn .25s ease-out",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: n.color, marginTop: 5, flexShrink: 0,
              }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#f2f2f3", lineHeight: 1.4 }}>
                {n.text}
              </span>
              <button
                onClick={() => setNotifications(ns => ns.filter(x => x.id !== n.id))}
                style={{
                  background: "none", border: "none", color: "#9a9ca1", cursor: "pointer",
                  fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
                aria-label="Cerrar aviso"
                >
                  ×
                </button>
            </div>
          );
          // ============ FIN NUEVO ============
        })}
      </div>

      {/* Header */}
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>{user.name?.toUpperCase() || "MESERO"}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{today()}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {lugarOrder && <Badge color={C.amber}>{labelLugar}: {fmt(lugarPendiente)} pendiente</Badge>}
          <Btn size="sm" variant="ghost" onClick={() => business && setLayoutModal(true)}>Configurar</Btn>          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      {/* Selector de lugares */}
      <div style={{ background: C.bg3, borderBottom: `1px solid ${C.border}`, padding: "8px 12px", overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 6, minWidth: "max-content" }}>
          {MESAS.map(m => {
            const key         = String(m);
            const mOrder      = orders.find(o => String(o.mesa) === key && !o.is_closed);
            const hasOrder    = !!mOrder;
            const unpaidItems = mOrder?.items.filter(it => !it.paid) || [];
            const hasListo    = unpaidItems.length > 0 && unpaidItems.every(it => it.status === "listo");
            return (
              <button key={key} onClick={() => { setLugar(key); setTab("menu"); }} style={{
                padding: "4px 12px", borderRadius: 16,
                background: lugar === key ? C.neon + "22" : C.bg4,
                border: `1px solid ${lugar === key ? C.neon : hasListo ? C.neon : hasOrder ? C.amber : C.border}`,
                color: lugar === key ? C.neon : hasListo ? C.neon : hasOrder ? C.amber : C.muted,
                fontSize: 12, cursor: "pointer",
              }}>
                Mesa {m}{hasListo ? " ✓" : hasOrder ? " •" : ""}
              </button>
            );
          })}
          <div style={{ width: 1, background: C.border, margin: "0 4px" }} />
          {BARRAS.map(b => {
            const bOrder      = orders.find(o => String(o.mesa) === b && !o.is_closed);
            const hasOrder    = !!bOrder;
            const unpaidItems = bOrder?.items.filter(it => !it.paid) || [];
            const hasListo    = unpaidItems.length > 0 && unpaidItems.every(it => it.status === "listo");
            return (
              <button key={b} onClick={() => { setLugar(b); setTab("menu"); }} style={{
                padding: "4px 12px", borderRadius: 16,
                background: lugar === b ? C.neon2 + "22" : C.bg4,
                border: `1px solid ${lugar === b ? C.neon2 : hasListo ? C.neon2 : hasOrder ? C.amber : C.border}`,
                color: lugar === b ? C.neon2 : hasListo ? C.neon2 : hasOrder ? C.amber : C.muted,
                fontSize: 12, cursor: "pointer",
              }}>
                {b}{hasListo ? " ✓" : hasOrder ? " •" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: "menu",   label: "Menu" },
          { id: "cuenta", label: `Cuenta ${labelLugar}${lugarOrder ? ` (${fmt(lugarPendiente)})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 0", fontSize: 12, fontWeight: tab === t.id ? 600 : 400,
            background: "transparent", border: "none",
            borderBottom: `2px solid ${tab === t.id ? C.neon : "transparent"}`,
            color: tab === t.id ? C.neon : C.muted, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {tab === "menu" ? (
          <>
            {/* Menu */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

{/* Buscador */}
<div style={{ padding: "8px 12px", background: C.bg2, borderBottom: `1px solid ${C.border}` }}>
  <div style={{
    display: "flex", alignItems: "center",
    width: 600, maxWidth: "100%", margin: "0 auto",
    background: C.bg4, border: `1px solid ${search ? C.neon : C.border}`,
    borderRadius: 8, padding: "0 8px",
  }}>
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Buscar producto..."
      style={{
        flex: 1, background: "transparent", border: "none", outline: "none",
        color: C.text, padding: "6px 4px", fontSize: 12,
      }}
    />
    {search && (
      <button
        onClick={() => setSearch("")}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", color: C.muted,
          fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 4,
        }}
      >✕</button>
    )}
  </div>
  {search.trim() && (
    <div style={{ fontSize: 11, color: C.muted, marginTop: 6, textAlign: "center" }}>
      {productosFiltrados.length} resultado{productosFiltrados.length !== 1 ? "s" : ""} para "{search}"
    </div>
  )}
</div>

{/* Categorias */}
<div style={{
  display: "flex", gap: 6, padding: "8px 12px", overflowX: "auto",
  background: C.bg2, borderBottom: `1px solid ${C.border}`,
  opacity: search.trim() ? 0.4 : 1,
  pointerEvents: search.trim() ? "none" : "auto",
  transition: "opacity .15s",
}}>
  {cats.map(c => (
    <button key={c} onClick={() => setCat(c)} style={{
      padding: "4px 14px", borderRadius: 16, whiteSpace: "nowrap",
      background: cat === c ? C.neon2 + "22" : "transparent",
      border: `1px solid ${cat === c ? C.neon2 : C.border}`,
      color: cat === c ? C.neon2 : C.muted, fontSize: 12, cursor: "pointer",
    }}>{c}</button>
  ))}
</div>

              {/* Grilla de productos */}
              <div style={{
                flex: 1, overflowY: "auto", padding: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 10, alignContent: "start",
              }}>
                {productosFiltrados.map(p => {
                  const inCart  = cart[p.id];
                  const agotado = p.stock === 0 && !p.unlimited_stock;
                  return (
                    <div key={p.id} onClick={() => addItem(p)} style={{
                      background: C.bg3,
                      border: `1px solid ${agotado ? C.red + "44" : inCart ? C.neon + "66" : C.border}`,
                      borderRadius: 12, overflow: "hidden",
                      cursor: agotado ? "not-allowed" : "pointer",
                      opacity: agotado ? 0.5 : 1,
                      userSelect: "none",
                      transition: "border-color .15s",
                      position: "relative",
                    }}>
                      {p.image_url ? (
                        <img src={`${API_URL}${p.image_url}`} alt={p.name}
                          style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ height: 70, background: C.bg4 }} />
                      )}
                      {inCart && (
                        <div style={{
                          position: "absolute", top: 6, right: 6,
                          background: C.neon, color: "#000",
                          borderRadius: "50%", width: 22, height: 22,
                          fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>{inCart.qty}</div>
                      )}
                      <div style={{ padding: "7px 8px 10px" }}>
                        <div style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.3, marginBottom: 3 }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: C.neon, fontWeight: 600 }}>{fmt(p.price)}</div>
                        {!p.unlimited_stock && p.stock < 5 && p.stock > 0 && (
                          <div style={{ fontSize: 9, color: C.amber, marginTop: 2 }}>Ultimas {p.stock}</div>
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

            {/* Panel de nueva ronda */}
            <div style={{ width: 280, background: C.bg2, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{labelLugar}</span>
                <Btn size="sm" variant="ghost" onClick={() => setCart({})}>Limpiar</Btn>
              </div>

              {lugarOrder && (
                <div style={{ background: C.amber + "15", borderBottom: `1px solid ${C.border}`, padding: "8px 12px", fontSize: 11, color: C.amber }}>
                  Cuenta acumulada: {fmt(lugarTotal)}.
                </div>
              )}

              <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
                {!cartItems.length && (
                  <div style={{ textAlign: "center", color: C.muted, marginTop: 40, fontSize: 12, lineHeight: 2 }}>
                    Sin productos<br /><span style={{ fontSize: 11 }}>Toca del menu</span>
                  </div>
                )}
                {cartItems.map(item => (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                    {item.image_url ? (
                      <img src={`${API_URL}${item.image_url}`} alt={item.name}
                        style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    ) : null}
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

              <div style={{ padding: "10px 12px", background: C.bg3, borderTop: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 8 }}>
                  <input value={note} onChange={e => setNote(e.target.value)}
                    placeholder="Nota (sin hielo, bien cocido...)"
                    style={{ width: "100%", background: C.bg4, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, padding: "5px 8px", fontSize: 11 }} />
                </div>

                <Divider />

                <div style={{ fontSize: 14, fontWeight: 600, display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span>Total ronda</span><span style={{ color: C.neon }}>{fmt(total)}</span>
                </div>

                {sent ? (
                  <div style={{ background: C.neon + "22", border: `1px solid ${C.neon}`, borderRadius: 8, padding: "9px", textAlign: "center", color: C.neon, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                    Enviado a barra
                  </div>
                ) : (
                  <Btn variant="primary" onClick={sendOrder} disabled={!cartItems.length || sending} style={{ width: "100%", fontSize: 14, marginBottom: 8 }}>
                    {sending ? "Enviando..." : "Enviar a barra"}
                  </Btn>
                )}

                {lugarOrder && (
                  <Btn
                  variant="amber"
                  onClick={requestPayment}
                  disabled={requestingPay || lugarOrder.payment_requested}
                  style={{ width: "100%", fontSize: 13 }}
                >
                  {lugarOrder.payment_requested
                    ? "Cobro solicitado — esperando al barman"
                    : requestingPay ? "Enviando..." : "Solicitar cobro al barman"}
                </Btn>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Tab: Cuenta acumulada */
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {!lugarOrder ? (
              <div style={{ textAlign: "center", color: C.muted, marginTop: 60, fontSize: 13, lineHeight: 2 }}>
                {labelLugar} sin cuenta activa.<br />
                <span style={{ fontSize: 11 }}>Envia una orden desde el menu para abrir una cuenta.</span>
              </div>
            ) : (
              <>
                {/* Resumen general */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Total consumido", value: fmt(lugarTotal),     color: C.text },
                    { label: "Ya pagado",        value: fmt(lugarPagado),    color: C.neon },
                    { label: "Por cobrar",       value: fmt(lugarPendiente), color: lugarPendiente > 0 ? C.amber : C.neon },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Detalle item por item */}
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                    Actualizados en tiempo real
                  </div>
                  {lugarOrder.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      borderBottom: `1px solid ${C.border}`,
                      opacity: item.paid ? 0.5 : 1,
                      background: item.status === "listo" && !item.paid ? C.neon + "08" : "transparent",
                    }}>
                      {item.image_url ? (
                        <img src={`${API_URL}${item.image_url}`} alt={item.name}
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: C.bg3, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{item.qty}x {item.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{fmt(item.price * item.qty)}</div>
                      </div>
                      {item.paid ? (
                        <Badge color={C.neon}>Pagado</Badge>
                      ) : (
                        <Badge color={STATUS_COLOR[item.status] || C.muted}>
                          {STATUS_LABEL[item.status] || item.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Resumen agrupado */}
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                    Resumen total consumido
                  </div>
                  {lugarResumen.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                      <span>{item.qty}x {item.name}</span>
                      <span style={{ color: C.neon, fontWeight: 500 }}>{fmt(item.price * item.qty)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", fontWeight: 700, fontSize: 14 }}>
                    <span>Total</span>
                    <span style={{ color: C.neon }}>{fmt(lugarTotal)}</span>
                  </div>
                </div>

                <Btn
                variant="amber"
                onClick={requestPayment}
                disabled={requestingPay || lugarOrder.payment_requested}
                style={{ width: "100%", fontSize: 13 }}
              >
                {lugarOrder.payment_requested
                  ? "Cobro solicitado — esperando al barman"
                  : requestingPay ? "Enviando..." : "Solicitar cobro al barman"}
              </Btn>
              </>
            )}
          </div>
        )}
      </div>

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
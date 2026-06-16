import { useState, useEffect } from "react";
import { C, fmt, now } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Card } from "./Common.jsx";

const STATUS_FLOW = ["pendiente", "preparando", "listo", "cobrado"];
const STATUS_COLOR = {
  pendiente: C.amber,
  preparando: C.blue,
  listo: C.neon,
  cobrado: C.muted,
};

export default function BarmanView({ user, orders, onOrdersChanged, onLogout }) {
  const [filter, setFilter] = useState("activas");

  const visible = orders.filter(o =>
    filter === "activas" ? o.status !== "cobrado" : o.status === "cobrado"
  );

  const advance = async (order) => {
    const idx = STATUS_FLOW.indexOf(order.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    try {
      await api.updateOrderStatus(order.id, next);
      onOrdersChanged();
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🍸</span>
          <div>
            <div style={{ fontWeight: 600, color: C.neon, fontSize: 13 }}>BARRA</div>
            <div style={{ fontSize: 11, color: C.muted }}>{user.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="sm" variant={filter === "activas" ? "primary" : "ghost"} onClick={() => setFilter("activas")}>
            Activas {orders.filter(o => o.status !== "cobrado").length > 0 && `(${orders.filter(o => o.status !== "cobrado").length})`}
          </Btn>
          <Btn size="sm" variant={filter === "cobradas" ? "primary" : "ghost"} onClick={() => setFilter("cobradas")}>Historial</Btn>
          <Btn size="sm" variant="ghost" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, alignContent: "start" }}>
        {!visible.length && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, marginTop: 60, fontSize: 14 }}>
            {filter === "activas" ? "Sin órdenes activas 🎉" : "Sin historial hoy"}
          </div>
        )}
        {visible.map(order => {
          const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
          const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
          return (
            <Card key={order.id} style={{ borderColor: STATUS_COLOR[order.status] + "55" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Mesa {order.mesa}</div>
                <Badge color={STATUS_COLOR[order.status]}>{order.status.toUpperCase()}</Badge>
              </div>
              <div style={{ marginBottom: 8 }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span>{item.emoji} {item.qty}× {item.name}</span>
                    <span style={{ color: C.neon }}>{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
              {order.note && (
                <div style={{ background: C.amber + "22", border: `1px solid ${C.amber}44`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.amber, marginBottom: 8 }}>
                  📝 {order.note}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.neon }}>{fmt(order.total)}</div>
                {nextStatus && (
                  <Btn
                    size="sm"
                    variant={nextStatus === "listo" ? "primary" : nextStatus === "cobrado" ? "amber" : "purple"}
                    onClick={() => advance(order)}
                  >
                    → {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                  </Btn>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { C, globalStyles } from "./styles.js";
import { api, getSession, clearSession } from "./api.js";
import { connectSocket, disconnectSocket } from "./socket.js";
import Login from "./components/Login.jsx";
import MeseroView from "./components/MeseroView.jsx";
import BarmanView from "./components/BarmanView.jsx";
import AdminView from "./components/AdminView.jsx";
import SuperAdminView from "./superadmin/SuperAdminView.jsx";

// Inyecta estilos globales una sola vez
const style = document.createElement("style");
style.textContent = globalStyles;
document.head.appendChild(style);

export default function App() {
const [user, setUser] = useState(() => getSession()?.user || null);  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ready, setReady] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [p, pr, o] = await Promise.all([api.getProducts(), api.getPromos(), api.getOrders()]);
      setProducts(p);
      setPromos(pr);
      setOrders(o);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role === "superadmin") { setReady(true); return; }
    loadData();

    const socket = connectSocket(user.businessId);
    // El backend emite "orders_updated" cuando cambia algo
    socket.on("orders_updated", () => {
      api.getOrders().then(setOrders).catch(() => {});
    });
    socket.on("products_updated", () => {
      api.getProducts().then(setProducts).catch(() => {});
    });

    return () => disconnectSocket();
  }, [user, loadData]);

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    clearSession();
    disconnectSocket();
    setUser(null);
    setProducts([]);
    setPromos([]);
    setOrders([]);
  };

  // Pantalla de superadmin (login separado en /superadmin)
  const isSuperAdmin = user?.role === "superadmin";

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;
  if (isSuperAdmin) return <SuperAdminView onLogout={handleLogout} />;

  const commonProps = {
    user,
    products,
    promos,
    orders,
    onOrdersChanged: () => api.getOrders().then(setOrders),
    onProductsChanged: () => api.getProducts().then(setProducts),
    onPromosChanged: () => api.getPromos().then(setPromos),
    onLogout: handleLogout,
  };

console.log("USER COMPLETO:", user);
console.log("ROLE:", user?.role);

if (user.role === "mesero") return <MeseroView {...commonProps} />;
if (user.role === "barman") return <BarmanView {...commonProps} />;
if (user.role === "admin") return <AdminView {...commonProps} />;

return (
  <div style={{ color: C.text, padding: 40 }}>
    <h2>Rol desconocido</h2>
    <pre>{JSON.stringify(user, null, 2)}</pre>
  </div>
);
}   
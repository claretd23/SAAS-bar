import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { C, globalStyles } from "./styles.js";
import { api, getSession, clearSession, setOnUnauthorized } from "./api.js";
import { connectSocket, disconnectSocket } from "./socket.js";
import Login from "./components/Login.jsx";
import MeseroView from "./components/MeseroView.jsx";
import BarmanView from "./components/BarmanView.jsx";
import AdminView from "./components/AdminView.jsx";
import SuperAdminView from "./superadmin/SuperAdminView.jsx";
import SuperAdminLogin from "./superadmin/SuperAdminLogin.jsx";

const style = document.createElement("style");
style.textContent = globalStyles;
document.head.appendChild(style);

export default function App() {
  const [user, setUser] = useState(() => getSession()?.user || null);
  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
  const [orders, setOrders] = useState([]);
  const [business, setBusiness] = useState(null);
  const [ready, setReady] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const session = getSession();
      const [p, pr, o, b] = await Promise.all([
        api.getProducts(),
        api.getPromos(),
        api.getOrders(),
        session?.user?.businessId ? api.getBusiness(session.user.businessId) : Promise.resolve(null),
      ]);
      setProducts(p);
      setPromos(pr);
      setOrders(o);
      if (b) setBusiness(b);
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setReady(true);
    }
  }, []);

  const handleLogin = (u) => setUser(u);

  const handleLogout = useCallback(() => {
    clearSession();
    disconnectSocket();
    setUser(null);
    setProducts([]);
    setPromos([]);
    setOrders([]);
    setBusiness(null);
  }, []);

  // Se registra UNA sola vez: si cualquier petición al backend responde 401
  // (token inválido, o el admin cerró la sesión de este usuario vía
  // session_version), api.js llama a este callback y forzamos el logout
  // del lado de React — sin esto, la pantalla se queda como si la sesión
  // siguiera activa hasta que el usuario intente algo manualmente.
  useEffect(() => {
    setOnUnauthorized(() => {
      handleLogout();
      alert("Tu sesión fue cerrada. Inicia sesión de nuevo.");
    });
  }, [handleLogout]);

  useEffect(() => {
    if (!user || user.role === "superadmin") { setReady(true); return; }
    loadData();

    const socket = connectSocket(user.businessId);
    socket.on("connect", () => { loadData(); });
    socket.on("orders_updated", () => { api.getOrders().then(setOrders).catch(() => {}); });
    socket.on("products_updated", () => { api.getProducts().then(setProducts).catch(() => {}); });
    socket.on("business_updated", () => {
      const session = getSession();
      if (session?.user?.businessId) {
        api.getBusiness(session.user.businessId).then(setBusiness).catch(() => {});
      }
    });

    return () => disconnectSocket();
  }, [user, loadData]);

  const isSuperAdmin = user?.role === "superadmin";

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  );

  return (
    <Routes>
      <Route
        path="/superadmin"
        element={
          isSuperAdmin
            ? <SuperAdminView onLogout={handleLogout} />
            : (!user
                ? <SuperAdminLogin onLogin={handleLogin} />
                : <Navigate to="/" replace />)
        }
      />
      <Route path="/*" element={<BusinessApp
        user={user}
        isSuperAdmin={isSuperAdmin}
        products={products}
        promos={promos}
        orders={orders}
        business={business}
        setProducts={setProducts}
        setPromos={setPromos}
        setOrders={setOrders}
        setBusiness={setBusiness}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />} />
    </Routes>
  );
}

function BusinessApp({ user, isSuperAdmin, products, promos, orders, business, setProducts, setPromos, setOrders, setBusiness, handleLogin, handleLogout }) {
  if (!user) return <Login onLogin={handleLogin} />;
  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

  const tableCount = business?.table_count || 10;
  const barCount   = business?.bar_count   || 6;

  const commonProps = {
    user,
    products,
    promos,
    orders,
    business,
    tableCount,
    barCount,
    onOrdersChanged:   () => api.getOrders().then(setOrders),
    onProductsChanged: () => api.getProducts().then(setProducts),
    onPromosChanged:   () => api.getPromos().then(setPromos),
    onBusinessChanged: () => business && api.getBusiness(business.id).then(setBusiness),
    onLogout: handleLogout,
  };

  if (user.role === "mesero") return <MeseroView {...commonProps} />;
  if (user.role === "barman") return <BarmanView {...commonProps} />;
  if (user.role === "admin")  return <AdminView  {...commonProps} />;

  return (
    <div style={{ color: C.text, padding: 40 }}>
      <h2>Rol desconocido</h2>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
}
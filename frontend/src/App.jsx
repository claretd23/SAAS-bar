import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { C, globalStyles } from "./styles.js";
import { api, getSession, clearSession } from "./api.js";
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
  const [ready, setReady] = useState(false);
  const businessIdRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [p, pr, o] = await Promise.all([
        api.getProducts(),
        api.getPromos(),
        api.getOrders(),
      ]);
      setProducts(p);
      setPromos(pr);
      setOrders(o);
    } catch (e) {
      if (e.message?.includes("Token inválido") || e.message?.includes("Sin token")) {
        clearSession();
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role === "superadmin") {
      setReady(true);
      return;
    }

    const socket = connectSocket(user.businessId);
    businessIdRef.current = user.businessId;

    loadData();

    socket.off("connect");
    socket.off("orders_updated");
    socket.off("products_updated");

    socket.on("connect", () => {
      if (businessIdRef.current) loadData();
    });

    socket.on("orders_updated", () => {
      api.getOrders().then(setOrders).catch(() => {});
    });

    socket.on("products_updated", () => {
      api.getProducts().then(setProducts).catch(() => {});
    });
  }, [user, loadData]);

  const handleLogin = (u) => setUser(u);

  const handleLogout = () => {
    clearSession();
    disconnectSocket();
    businessIdRef.current = null;
    setUser(null);
    setProducts([]);
    setPromos([]);
    setOrders([]);
  };

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
        setProducts={setProducts}
        setPromos={setPromos}
        setOrders={setOrders}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />} />
    </Routes>
  );
}

function BusinessApp({ user, isSuperAdmin, products, promos, orders, setProducts, setPromos, setOrders, handleLogin, handleLogout }) {
  if (!user) return <Login onLogin={handleLogin} />;
  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

  const commonProps = {
    user,
    products,
    promos,
    orders,
    // FIX: todas las callbacks de "changed" retornan la Promise de la API.
    // Esto permite que MeseroView haga `await onOrdersChanged()` antes de
    // limpiar el carrito, garantizando que el historial de consumo aparece
    // inmediatamente después de enviar la orden, sin parpadeo ni pérdida.
    onOrdersChanged:   () => api.getOrders().then(setOrders),
    onProductsChanged: () => api.getProducts().then(setProducts),
    onPromosChanged:   () => api.getPromos().then(setPromos),
    onLogout: handleLogout,
  };

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

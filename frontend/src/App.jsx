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
import SuperAdminLogin from "./superadmin/SuperAdminLogin.jsx";

// Inyecta estilos globales una sola vez
const style = document.createElement("style");
style.textContent = globalStyles;
document.head.appendChild(style);

export default function App() {
  const [user, setUser] = useState(() => getSession()?.user || null);
  const [products, setProducts] = useState([]);
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
      // Si el token expiró o es inválido, el backend responde 401 ("Token
      // inválido" / "Sin token"). En ese caso limpiamos la sesión para que
      // la persona vuelva al login en vez de quedarse en una pantalla en
      // blanco o con datos viejos sin poder hacer nada.
      if (e.message?.includes("Token inválido") || e.message?.includes("Sin token")) {
        clearSession();
        setUser(null);
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role === "superadmin") { setReady(true); return; }
    loadData();

    const socket = connectSocket(user.businessId);

    // Se dispara en la primera conexión Y en cada reconexión (ej. el iPad
    // se quedó en reposo, se cortó el WiFi un momento, etc.). Volvemos a
    // pedir el estado completo para no quedar desincronizados con eventos
    // que se hayan perdido mientras el socket estuvo caído.
    socket.on("connect", () => {
      loadData();
    });

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

  const isSuperAdmin = user?.role === "superadmin";

  if (!ready) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  );

  return (
    <Routes>
      {/* Ruta dedicada para el superadmin: /superadmin
          - Sin sesión de superadmin -> pantalla de login propia
          - Con sesión de superadmin -> panel de superadmin
          Si alguien con sesión de negocio (mesero/barman/admin) visita esta
          URL, lo regresamos a "/" para no mezclar los dos mundos. */}
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

      {/* Todo lo demás: flujo normal de negocio (mesero/barman/admin) */}
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

// Flujo de negocio normal (lo que antes vivía directo en App). Separado para
// no mezclar su lógica de socket/carga de datos con la ruta de superadmin.
function BusinessApp({ user, isSuperAdmin, products, promos, orders, setProducts, setPromos, setOrders, handleLogin, handleLogout }) {
  if (!user) return <Login onLogin={handleLogin} />;

  // Alguien con sesión de superadmin cayó en una ruta de negocio (ej. refrescó
  // estando en "/" después de loguearse como superadmin en otra pestaña).
  if (isSuperAdmin) return <Navigate to="/superadmin" replace />;

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
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return sessionStorage.getItem("token");
}

// Callback que App.jsx registra al montar, para forzar el logout del
// lado de React cuando el backend responde 401 (token inválido o sesión
// cerrada por el admin). Sin esto, el frontend nunca se entera y la
// pantalla se queda como si la sesión siguiera activa.
let onUnauthorized = null;
export function setOnUnauthorized(fn) {
  onUnauthorized = fn;
}

function handleUnauthorized(status) {
  if (status === 401) {
    clearSession();
    if (onUnauthorized) onUnauthorized();
  }
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(err.error || "Error desconocido");
  }
  return res.json();
}

// Petición con FormData (para subir imágenes — NO pone Content-Type, el browser lo hace solo)
async function requestForm(path, { method = "POST", data } = {}) {
  const token = getToken();
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v != null) form.append(k, v);
  });

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(err.error || "Error desconocido");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (businessId, pin) => request("/auth/login", { method: "POST", body: { businessId, pin } }),
  superadminLogin: (password) => request("/auth/superadmin-login", { method: "POST", body: { password } }),

  // Negocios (super-admin)
  getBusinesses: () => request("/businesses"),
  createBusiness: (data) => request("/businesses", { method: "POST", body: data }),
  updateBusinessStatus: (id, status) => request(`/businesses/${id}/status`, { method: "PATCH", body: { status } }),
  updateBusinessPlan: (id, plan) => request(`/businesses/${id}/plan`, { method: "PATCH", body: { plan } }),
  deleteBusiness: (id) => request(`/businesses/${id}`, { method: "DELETE" }),
  getBusinessUsers: (id) => request(`/businesses/${id}/users`),
  createBusinessUser: (id, data) => request(`/businesses/${id}/users`, { method: "POST", body: data }),
  deleteBusinessUser: (id, userId) => request(`/businesses/${id}/users/${userId}`, { method: "DELETE" }),
  forceLogoutUser: (id, userId) => request(`/businesses/${id}/users/${userId}/logout`, { method: "POST" }),
  getBusiness: (id) => request(`/businesses/${id}`),
  updateLayout: (id, data) => request(`/businesses/${id}/layout`, { method: "PATCH", body: data }),
  // Productos — usan FormData porque llevan imagen opcional
  getProducts: () => request("/products"),
  createProduct: (data) => requestForm("/products", { method: "POST", data }),
  updateProduct: (id, data) => requestForm(`/products/${id}`, { method: "PUT", data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  adjustStock: (id, delta) => request(`/products/${id}/stock`, { method: "PATCH", body: { delta } }),
  setStock: (id, stock) => request(`/products/${id}/stock`, { method: "PATCH", body: { set: stock } }),

  // Promos
  getPromos: () => request("/promos"),
  createPromo: (data) => request("/promos", { method: "POST", body: data }),
  updatePromo: (id, data) => request(`/promos/${id}`, { method: "PUT", body: data }),
  deletePromo: (id) => request(`/promos/${id}`, { method: "DELETE" }),
  togglePromo: (id) => request(`/promos/${id}/toggle`, { method: "PATCH" }),

  // Órdenes
  getOrders: () => request("/orders"),
  createOrder: (data) => request("/orders", { method: "POST", body: data }),
  updateItemStatus: (orderId, itemIndex, status) =>
    request(`/orders/${orderId}/items/${itemIndex}/status`, { method: "PATCH", body: { status } }),
  payOrderItems: (orderId, pay, itemIndexes) =>
    request(`/orders/${orderId}/payments`, { method: "POST", body: { pay, itemIndexes } }),

  // Reportes
  getDashboard: () => request("/reports/dashboard"),
};

export function saveSession(token, user) {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));
}
export function getSession() {
  const token = getToken();
  const user = sessionStorage.getItem("user");
  return token && user ? { token, user: JSON.parse(user) } : null;
}
export function clearSession() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}
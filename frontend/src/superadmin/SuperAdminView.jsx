import { useState, useEffect } from "react";
import { C, fmt } from "../styles.js";
import { api } from "../api.js";
import { Btn, Badge, Card, Modal, Input, ErrorBanner } from "../components/Common.jsx";
import { IconBuilding, IconPause, IconPlay, IconUser, IconTrash, IconCheckCircle } from "../components/Icons.jsx";

export default function SuperAdminView({ onLogout }) {
  const [businesses, setBusinesses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", ownerEmail: "", plan: "trial" });
  const [userForm, setUserForm] = useState({ name: "", role: "mesero", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setBusinesses(await api.getBusinesses()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadUsers = async (id) => {
    const u = await api.getBusinessUsers(id);
    setUsers(u);
  };

  useEffect(() => { load(); }, []);

  const createBusiness = async () => {
    if (!form.name) { setError("El nombre es obligatorio"); return; }
    try {
      const result = await api.createBusiness(form);
      await load();
      setModal({ type: "created", result });
      setForm({ name: "", ownerEmail: "", plan: "trial" });
    } catch (e) { setError(e.message); }
  };

  const toggleStatus = async (b) => {
    const next = b.status === "active" ? "suspended" : "active";
    await api.updateBusinessStatus(b.id, next);
    load();
  };

  const changePlan = async (b, plan) => {
    await api.updateBusinessPlan(b.id, plan);
    load();
  };

  const deleteBusiness = async (id) => {
    if (!confirm("¿Eliminar este negocio y todos sus datos?")) return;
    await api.deleteBusiness(id);
    load();
  };

  const addUser = async () => {
    if (!userForm.name || !userForm.pin) { setError("Nombre y PIN requeridos"); return; }
    try {
      await api.createBusinessUser(selected.id, userForm);
      await loadUsers(selected.id);
      setUserForm({ name: "", role: "mesero", pin: "" });
    } catch (e) { setError(e.message); }
  };

  if (loading) return <div style={{ textAlign: "center", color: C.muted, marginTop: 80 }}>Cargando...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.bg2, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBuilding size={22} color={C.neon2} />
          <div style={{ fontWeight: 700, color: C.neon2, fontSize: 15, letterSpacing: 1 }}>SUPER ADMIN</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="purple" size="sm" onClick={() => { setError(""); setModal({ type: "new" }); }}>+ Nuevo negocio</Btn>
          <Btn variant="ghost" size="sm" onClick={onLogout}>Salir</Btn>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Resumen global */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Negocios totales", value: businesses.length, color: C.neon2 },
            { label: "Activos", value: businesses.filter(b => b.status === "active").length, color: C.neon },
            { label: "Suspendidos", value: businesses.filter(b => b.status === "suspended").length, color: C.red },
            { label: "Ventas hoy (global)", value: fmt(businesses.reduce((s, b) => s + (b.salesToday || 0), 0)), color: C.amber },
          ].map(s => (
            <Card key={s.label}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Lista de negocios */}
        {businesses.map(b => (
          <Card key={b.id} style={{ marginBottom: 12, borderColor: b.status !== "active" ? C.red + "44" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  ID: <span style={{ color: C.neon, fontFamily: "monospace" }}>{b.id}</span>
                </div>
                {b.ownerEmail && <div style={{ fontSize: 11, color: C.muted }}>{b.ownerEmail}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Badge color={b.status === "active" ? C.neon : C.red}>{b.status}</Badge>
                <Badge color={C.neon2}>{b.plan}</Badge>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "10px 0" }}>
              {[
                { label: "Ventas hoy", value: fmt(b.salesToday || 0), color: C.neon },
                { label: "Órdenes hoy", value: b.ordersToday || 0, color: C.blue },
                { label: "Usuarios", value: b.userCount || 0, color: C.neon2 },
              ].map(s => (
                <div key={s.label} style={{ background: C.bg3, borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Btn size="sm" variant={b.status === "active" ? "danger" : "primary"} onClick={() => toggleStatus(b)}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {b.status === "active" ? <IconPause size={13} /> : <IconPlay size={13} />}
                  {b.status === "active" ? "Suspender" : "Activar"}
                </span>
              </Btn>
              <Btn size="sm" variant="ghost" onClick={async () => { setSelected(b); await loadUsers(b.id); setModal({ type: "users" }); setError(""); }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><IconUser size={13} /> Usuarios / PINs</span>
              </Btn>
              <select value={b.plan} onChange={e => changePlan(b, e.target.value)}
                style={{ background: C.bg4, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 6, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" }}>
                {["trial", "mensual", "anual"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <Btn size="sm" variant="danger" onClick={() => deleteBusiness(b.id)}><IconTrash size={14} /></Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal nuevo negocio */}
      {modal?.type === "new" && (
        <Modal title="Nuevo negocio" onClose={() => setModal(null)}>
          <ErrorBanner message={error} />
          <Input label="Nombre del bar/restaurante" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email del dueño (opcional)" value={form.ownerEmail} onChange={e => setForm(f => ({ ...f, ownerEmail: e.target.value }))} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Plan</div>
            <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
              {["trial", "mensual", "anual"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancelar</Btn>
            <Btn variant="purple" onClick={createBusiness} style={{ flex: 1 }}>Crear negocio</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: negocio creado (muestra ID y PINs) */}
      {modal?.type === "created" && (
        <Modal title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><IconCheckCircle size={16} color={C.neon} /> Negocio creado</span>} onClose={() => setModal(null)}>
          <div style={{ background: C.bg3, borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>ID para login (dáselo al cliente)</div>
            <div style={{ fontFamily: "monospace", fontSize: 18, color: C.neon, fontWeight: 700, letterSpacing: 2 }}>{modal.result.id}</div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>PINs por defecto:</div>
          {modal.result.defaultPins?.map(u => (
            <div key={u.role} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span>{u.role.charAt(0).toUpperCase() + u.role.slice(1)} — {u.name}</span>
              <span style={{ color: C.neon, fontFamily: "monospace", fontWeight: 600 }}>PIN: {u.pin}</span>
            </div>
          ))}
          <Btn variant="primary" onClick={() => setModal(null)} style={{ width: "100%", marginTop: 14 }}>Entendido</Btn>
        </Modal>
      )}

      {/* Modal usuarios */}
      {modal?.type === "users" && selected && (
        <Modal title={`Usuarios — ${selected.name}`} onClose={() => setModal(null)}>
          <ErrorBanner message={error} />
          {users.map(u => (
            <div key={u.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span>{u.name} <span style={{ color: C.muted, fontSize: 11 }}>({u.role})</span></span>
            </div>
          ))}
          <div style={{ marginTop: 14, fontSize: 12, color: C.muted, marginBottom: 8 }}>Agregar usuario</div>
          <Input label="Nombre" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>Rol</div>
            <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, color: C.text, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
              {["mesero", "barman", "admin"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Input label="PIN" value={userForm.pin} onChange={e => setUserForm(f => ({ ...f, pin: e.target.value }))} placeholder="ej. 4567" />
          <Btn variant="primary" onClick={addUser} style={{ width: "100%" }}>Agregar</Btn>
        </Modal>
      )}
    </div>
  );
}
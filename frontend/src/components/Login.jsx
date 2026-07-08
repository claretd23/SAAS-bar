import { useState } from "react";
import { C } from "../styles.js";
import { api, saveSession } from "../api.js";
import { Btn, Card, Input, ErrorBanner } from "./Common.jsx";

const ROLES = [
  { id: "mesero", label: "Mesero", desc: "Tomar órdenes en mesa" },
  { id: "barman", label: "Barman", desc: "Ver y preparar órdenes" },
  { id: "admin", label: "Administrador", desc: "Panel completo" },
];

export default function Login({ onLogin }) {
  const [businessId, setBusinessId] = useState(localStorage.getItem("lastBusinessId") || "");
  const [step, setStep] = useState(businessId ? "role" : "business");
  const [selectedRole, setSelectedRole] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const confirmBusiness = () => {
    if (!businessId.trim()) return;
    localStorage.setItem("lastBusinessId", businessId.trim());
    setStep("role");
  };

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const { token, user } = await api.login(businessId.trim(), pin);
      if (user.role !== selectedRole) {
        setError("Este PIN no corresponde a ese rol");
        setLoading(false);
        return;
      }
      saveSession(token, user);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setPin("");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: C.bg }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}></div>
        <div style={{ fontSize: 24, fontWeight: 600, color: C.neon, letterSpacing: 2 }}>LA MICHELOTA</div>
      </div>

      {step === "business" && (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 16 }}>
            Ingresa el ID de tu negocio 
          </div>
          <ErrorBanner message={error} />
          <Input placeholder="ej. ax7k29dlmz" value={businessId} onChange={e => setBusinessId(e.target.value)} onKeyDown={e => e.key === "Enter" && confirmBusiness()} />
          <Btn variant="primary" onClick={confirmBusiness} style={{ width: "100%" }}>Continuar</Btn>
        </div>
      )}

      {step === "role" && !selectedRole && (
        <div style={{ width: "100%", maxWidth: 360 }} className="fade-in">
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            Selecciona tu rol
          </div>
          {ROLES.map(r => (
            <Card key={r.id} onClick={() => setSelectedRole(r.id)} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ fontSize: 28 }}>{r.icon}</div>
              <div>
                <div style={{ fontWeight: 500, color: C.text }}>{r.label}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{r.desc}</div>
              </div>
            </Card>
          ))}
          <Btn variant="ghost" onClick={() => { setStep("business"); setError(""); }} style={{ width: "100%", marginTop: 8 }}>Salir</Btn>
        </div>
      )}

      {step === "role" && selectedRole && (
        <div style={{ width: "100%", maxWidth: 300 }} className="fade-in">
          <div style={{ textAlign: "center", fontSize: 32, marginBottom: 8 }}>{ROLES.find(r => r.id === selectedRole)?.icon}</div>
          <div style={{ textAlign: "center", fontWeight: 500, marginBottom: 20, color: C.neon }}>{ROLES.find(r => r.id === selectedRole)?.label}</div>
          <ErrorBanner message={error} />
          <Input label="PIN de acceso" type="password" maxLength={6} value={pin}
            onChange={e => { setPin(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••" autoFocus />
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" onClick={() => { setSelectedRole(null); setPin(""); }} style={{ flex: 1 }}>Atrás</Btn>
            <Btn variant="primary" onClick={handleLogin} disabled={loading || !pin} style={{ flex: 1 }}>{loading ? "..." : "Entrar"}</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
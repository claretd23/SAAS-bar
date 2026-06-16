// frontend/src/superadmin/SuperAdminLogin.jsx
import { useState } from "react";
import { C } from "../styles.js";
import { api } from "../api.js";

export default function SuperAdminLogin({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!user || !pass) { setError("Ingresa usuario y contraseña"); return; }
    setLoading(true); setError("");
    try {
      const result = await api.superAdminLogin({ username: user, password: pass });
      onLogin(result.user);
    } catch (e) {
      setError(e.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: C.bg, padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: C.bg2,
        border: `1px solid ${C.border}`, borderRadius: 16, padding: 32,
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏢</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.neon2, letterSpacing: 1 }}>
            SUPER ADMIN
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Panel de administración global
          </div>
        </div>

        {error && (
          <div style={{
            background: C.red + "22", border: `1px solid ${C.red}`,
            borderRadius: 8, padding: "8px 12px", marginBottom: 16,
            fontSize: 13, color: C.red,
          }}>{error}</div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>
            Usuario
          </div>
          <input
            value={user}
            onChange={e => setUser(e.target.value)}
            placeholder="superadmin"
            autoComplete="username"
            style={{
              width: "100%", background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 8, color: C.text, padding: "9px 12px", fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase" }}>
            Contraseña
          </div>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="••••••••"
            autoComplete="current-password"
            style={{
              width: "100%", background: C.bg3, border: `1px solid ${C.border2}`,
              borderRadius: 8, color: C.text, padding: "9px 12px", fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "11px", borderRadius: 8, border: "none",
            background: loading ? C.bg4 : C.neon2,
            color: loading ? C.muted : "#000",
            fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s",
          }}
        >
          {loading ? "Verificando..." : "Entrar"}
        </button>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <a href="/" style={{ fontSize: 12, color: C.muted, textDecoration: "none" }}>
            ← Volver al login de negocio
          </a>
        </div>
      </div>
    </div>
  );
}
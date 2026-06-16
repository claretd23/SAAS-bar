import { C } from "../styles.js";

export const Btn = ({ children, onClick, variant = "default", size = "md", disabled, style = {} }) => {
  const base = {
    border: "none", borderRadius: 8, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1, transition: "all .15s", display: "inline-flex",
    alignItems: "center", gap: 6, justifyContent: "center", fontFamily: "inherit",
  };
  const sizes = { sm: { padding: "5px 10px", fontSize: 12 }, md: { padding: "8px 14px", fontSize: 13 }, lg: { padding: "11px 20px", fontSize: 14 } };
  const variants = {
    default: { background: C.bg4, color: C.text, border: `1px solid ${C.border2}` },
    primary: { background: C.neon, color: "#000" },
    purple: { background: C.neon2, color: "#fff" },
    danger: { background: C.red, color: "#fff" },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    amber: { background: C.amber, color: "#000" },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

export const Badge = ({ children, color = C.neon }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
    {children}
  </span>
);

export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "12px 14px", cursor: onClick ? "pointer" : "default", ...style
  }}>
    {children}
  </div>
);

export const Modal = ({ children, onClose, title }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.neon }}>{title}</span>
          <Btn size="sm" variant="ghost" onClick={onClose}>✕</Btn>
        </div>
      )}
      {children}
    </div>
  </div>
);

export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>}
    <input style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 13, outline: "none" }} {...props} />
  </div>
);

export const Divider = () => <div style={{ height: 1, background: C.border, margin: "10px 0" }} />;

export const ErrorBanner = ({ message }) => !message ? null : (
  <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
    {message}
  </div>
);
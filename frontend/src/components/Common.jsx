import { C } from "../styles.js";

// ── Iconos SVG inline ──────────────────────────────────────────────────────
const ICONS = {
  drink:    <path d="M5 3h14l-2 8.5a5 5 0 0 1-10 0L5 3Zm5 8.5V20m-3 0h6M3 3h18"/>,
  dashboard:<path d="M3 12h6V3H3v9Zm0 9h6v-6H3v6Zm12 0h6V12h-6v9Zm0-18v6h6V3h-6Z"/>,
  table:    <path d="M3 9h18M3 9v11M21 9v11M7 9V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/>,
  tag:      <path d="M20 10 12 2 2 12l8 8 10-10Zm-6-4 4 4M7 17l4-4"/>,
  box:      <path d="M21 8 12 3 3 8m18 0-9 5-9-5m18 0v8l-9 5-9-5V8"/>,
  users:    <path d="M16 11a4 4 0 1 0-4-4M6 21v-2a4 4 0 0 1 4-4h0M16 21v-2a4 4 0 0 0-3-3.87M2 21v-2a4 4 0 0 1 4-4"/>,
  check:    <path d="M20 6 9 17l-5-5"/>,
  close:    <path d="M18 6 6 18M6 6l12 12"/>,
  warning:  <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a1 1 0 0 0 .9 1.5h18.6a1 1 0 0 0 .9-1.5L13.7 3.9a1 1 0 0 0-1.7 0Z"/>,
  card:     <path d="M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7Zm0 4h20"/>,
  cash:     <path d="M3 7h18v10H3V7Zm9 2.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM5 7v0M19 17v0"/>,
  qr:       <path d="M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm14 0h1v1m-1 3h1v3m3-7h1v7h-4v-4"/>,
  note:     <path d="M14 3v5h5M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>,
  edit:     <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>,
  trash:    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"/>,
  search:   <path d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/>,
  plus:     <path d="M12 5v14M5 12h14"/>,
  minus:    <path d="M5 12h14"/>,
  receipt:  <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 2V2Zm3 5h10m-10 4h10m-10 4h6"/>,
  infinity: <path d="M18.2 8.2a4 4 0 1 0 0 7.6 4 4 0 0 0 1.8-7.6M5.8 8.2a4 4 0 1 0 0 7.6 4 4 0 0 0-1.8-7.6"/>,
};

export const Icon = ({ name, size = 16, color = "currentColor", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {ICONS[name] || ICONS.drink}
  </svg>
);

// ── Botón ──────────────────────────────────────────────────────────────────
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
    purple:  { background: C.neon2, color: "#fff" },
    danger:  { background: C.red, color: "#fff" },
    ghost:   { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
    amber:   { background: C.amber, color: "#000" },
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
  <div onClick={onClick} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", cursor: onClick ? "pointer" : "default", ...style }}>
    {children}
  </div>
);

export const Modal = ({ children, onClose, title }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} className="fade-in" style={{ background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 16, padding: 20, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.neon }}>{title}</span>
          <Btn size="sm" variant="ghost" onClick={onClose}><Icon name="close" size={14} /></Btn>
        </div>
      )}
      {children}
    </div>
  </div>
);

export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{label}</div>}
    <input style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }} {...props} />
  </div>
);

export const Divider = () => <div style={{ height: 1, background: C.border, margin: "10px 0" }} />;

export const ErrorBanner = ({ message }) => !message ? null : (
  <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, color: C.red, borderRadius: 8, padding: "8px 12px", fontSize: 12, marginBottom: 10 }}>
    {message}
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = "Buscar..." }) => (
  <div style={{ position: "relative", marginBottom: 8 }}>
    <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted }}>
      <Icon name="search" size={14} />
    </div>
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", background: C.bg3, border: `1px solid ${C.border2}`, borderRadius: 8, color: C.text, padding: "8px 10px 8px 32px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
  </div>
);

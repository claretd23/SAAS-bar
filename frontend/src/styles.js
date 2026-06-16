export const C = {
  bg: "#0a0a0f",
  bg2: "#12121a",
  bg3: "#1a1a26",
  bg4: "#222233",
  neon: "#00e5a0",
  neon2: "#a78bfa",
  neon3: "#f472b6",
  amber: "#fbbf24",
  red: "#f87171",
  blue: "#60a5fa",
  text: "#f0f0f8",
  muted: "#7a7a9a",
  border: "#2a2a3f",
  border2: "#3a3a55",
};

export const globalStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%;background:${C.bg};color:${C.text};font-family:'Inter',sans-serif;font-size:14px}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${C.bg2}}
::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px}
button{cursor:pointer;font-family:inherit}
input,select,textarea{font-family:inherit}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .2s ease}
`;

export const fmt = (n) => `$${Number(n).toFixed(2)}`;
export const now = () => new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
export const today = () => new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
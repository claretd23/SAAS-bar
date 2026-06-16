import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // importante: permite acceder desde el cel/iPad en la misma red
    port: 5173,
  },
});
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backendOrigin =
  process.env.VITE_DEV_BACKEND_ORIGIN ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/auth": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/ws": {
        target: backendOrigin,
        changeOrigin: true,
        ws: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["lucide-react", "framer-motion", "gsap"],
          "vendor-utils": ["axios", "zustand", "zod", "date-fns", "i18next"],
          "vendor-emoji": ["@emoji-mart/data", "@emoji-mart/react"],
        },
      },
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "https://sessionsflow-backend-production.up.railway.app",
        changeOrigin: true,
        secure: false,
      },
      "/hub": {
        target: "https://sessionsflow-backend-production.up.railway.app",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "https://sessionsflow-backend-production.up.railway.app",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

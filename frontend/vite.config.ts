import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/components": path.resolve(__dirname, "./src/components"),
      "@/pages": path.resolve(__dirname, "./src/pages"),
      "@/hooks": path.resolve(__dirname, "./src/hooks"),
      "@/store": path.resolve(__dirname, "./src/store"),
      "@/utils": path.resolve(__dirname, "./src/utils"),
      "@/types": path.resolve(__dirname, "./src/types"),
      "@/api": path.resolve(__dirname, "./src/api"),
    },
  },
  build: {
    // Production optimizations
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
      },
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["lucide-react", "framer-motion"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          qr: ["qr-scanner", "react-qr-code", "@yudiel/react-qr-scanner"],
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (optional, can be disabled)
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            if (process.env.NODE_ENV === "development") {
              console.log("proxy error", err);
            }
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "Sending Request to the Target:",
                req.method,
                req.url
              );
            }
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            if (process.env.NODE_ENV === "development") {
              console.log(
                "Received Response from the Target:",
                proxyRes.statusCode,
                req.url
              );
            }
          });
        },
      },
    },
  },
});

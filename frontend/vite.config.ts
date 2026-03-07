import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8082",
        changeOrigin: true,
      },
      // Proxy OpenAI API to avoid CORS — key never crosses origins.
      "/openai-api": {
        target: "https://api.openai.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/openai-api/, ""),
      },
      // Proxy Bright Data REST API to avoid CORS in the browser.
      // The API key stays server-side in the proxy request.
      "/brightdata-api": {
        target: "https://api.brightdata.com",
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/brightdata-api/, ""),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

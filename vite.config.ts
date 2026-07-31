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
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    // Sprint 17.2 — split ONLY heavy leaf vendors that are safe to isolate.
    // Do NOT split react / react-dom / react-router / radix / supabase / tanstack:
    // those share module-init state with the app entry and, when placed in
    // separate chunks, can execute before the vendor chunk finishes loading in
    // production, resulting in `undefined is not an object (evaluating 'React.…')`
    // and a blank page. Keeping them in the main chunk guarantees init order.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("canvg")) return "pdf";
          if (id.includes("xlsx") || id.includes("exceljs")) return "spreadsheet";
          if (id.includes("@capacitor")) return "capacitor";
        },
      },
    },
  },
}));

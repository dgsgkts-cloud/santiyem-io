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
    // Sprint 17.2 — split heavy vendors into their own chunks so the initial
    // dashboard doesn't ship PDF/chart/voice code the user may never open.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("canvg")) return "pdf";
          if (id.includes("xlsx") || id.includes("exceljs")) return "spreadsheet";
          if (id.includes("@elevenlabs")) return "voice";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@capacitor")) return "capacitor";
          if (id.includes("react-router") || id.includes("scheduler") || id.includes("react-dom") || id.includes("/react/")) return "react-vendor";
          if (id.includes("@radix-ui") || id.includes("lucide-react")) return "ui-vendor";
          if (id.includes("@tanstack")) return "query";
        },
      },
    },
  },
}));

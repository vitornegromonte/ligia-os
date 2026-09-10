import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react";
          }
          if (id.includes("node_modules/react-router")) {
            return "router";
          }
          if (id.includes("node_modules/@supabase")) {
            return "supabase";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (id.includes("node_modules/three")) {
            return "three";
          }
          if (id.includes("node_modules/marked")) {
            return "marked";
          }
        },
      },
    },
  },
});

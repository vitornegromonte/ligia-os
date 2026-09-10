import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

/** Herda plugins e aliases do vite.config.js para não duplicar resolução. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      include: ["test/**/*.test.{ts,tsx}"],
      exclude: ["e2e/**", "node_modules/**"],
    },
  }),
);

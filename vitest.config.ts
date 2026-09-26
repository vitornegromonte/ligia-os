import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

/** Herda plugins e aliases do vite.config.js para não duplicar resolução. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      maxWorkers: 4,
      environment: "jsdom",
      setupFiles: ["./test/setup.ts", "./tests/setup.js"],
      include: ["test/**/*.test.{ts,tsx}", "tests/**/*.test.{js,jsx}"],
      clearMocks: true,
      // test/_fase3 guarda testes cujos componentes só chegam na Fase 3.
      exclude: ["e2e/**", "node_modules/**", "test/_fase3/**"],
    },
  }),
);

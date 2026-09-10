import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "dist",
      "node_modules",
      "coverage",
      "playwright-report",
      "vendor",
      "src/content/generated",
      "supabase/functions/_shared/generated",
    ],
  },

  js.configs.recommended,

  // TypeScript: só parser + regras essenciais. As páginas .jsx do ligia-os
  // seguem no parser padrão e não são type-checked (ver tsconfig.json).
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ["**/*.{ts,tsx}"] })),

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // A versão TS-aware substitui a base, que não entende tipos/enums.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_" }],
    },
  },

  // Scripts de build, configs e o script ad-hoc da raiz rodam em Node.
  {
    files: ["scripts/**/*.{js,mjs,ts}", "*.config.{js,ts}", "e2e/**/*.ts", "test-supabase.js"],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ["test/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];

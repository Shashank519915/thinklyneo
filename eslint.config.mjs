import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Existing canvas patterns (fetch-on-mount, ref guards); tighten incrementally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "shared/dist/**",
    "next-env.d.ts",
    "coverage/**",
    "scripts/**",
    "e2e/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;

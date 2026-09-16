import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      ".agents/**", ".claude/**", ".venv/**", "node_modules/**", "dist/**", "coverage/**",
      "Generated/**", "Reports/**", "scratch/**", "storage/**", "artifacts/**", "test_dir/**"
    ]
  },
  {
    files: ["**/*.{js,mjs}"],
    ...js.configs.recommended,
    languageOptions: { globals: { console: "readonly", process: "readonly", Buffer: "readonly" } }
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@typescript-eslint": ts,
      "react": react,
    },
    languageOptions: {
      parser: tsParser,
      globals: {
        Buffer: "readonly",
        window: "readonly",
        document: "readonly",
        fetch: "readonly",
        console: "readonly",
        alert: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "max-lines": ["warn", {
        "max": 500, 
        "skipBlankLines": true, 
        "skipComments": true 
      }],
      "max-lines-per-function": ["warn", { 
        "max": 100, 
        "skipBlankLines": true, 
        "skipComments": true 
      }],
      "react/jsx-key": "error",
    },
  },
];

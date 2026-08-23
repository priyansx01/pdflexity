import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "next.config.ts",
    ],
  },
  {
    files: ["**/*.{js,mjs,jsx,ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
    rules: {
      ...js.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript's compiler covers unused/undefined symbols; avoid duplicates.
      "no-unused-vars": "off",
      "no-undef": "off",
      // This is a desktop app rendering local blob:/data: images; next/image
      // (which targets web asset optimization) doesn't apply here.
      "@next/next/no-img-element": "off",
    },
  },
);

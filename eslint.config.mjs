import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "supabase/**"],
  },
  {
    files: ["src/lib/**/*.js", "src/lib/**/*.mjs", "tests/**/*.mjs"],
    ...js.configs.recommended,
    rules: {
      ...js.configs.recommended.rules,
      "no-regex-spaces": "off",
      "no-useless-escape": "off",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];

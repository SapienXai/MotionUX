import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "public/r/**", "test-results/**", "playwright-report/**"] },
  ...tseslint.configs.recommended,
);

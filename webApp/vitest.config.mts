import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
      // Mismo destino que `paths["@/*"]` de tsconfig.json; un alias a mano evita sumar vite-tsconfig-paths.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    // T-098 ronda 1 (B-1): limpia las variables del sitio antes de cada archivo; `npm run test:netlify-env` lo prueba.
    setupFiles: ["./src/test/hermetic-env.ts"],
    passWithNoTests: false,
    reporters: ["default"],
    // T-050: el limitador por defecto es Postgres; en unidad no hay base. Solo acá se elige memoria.
    env: { RATE_LIMIT_BACKEND: "memory" },
  },
});

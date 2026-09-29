import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Los tests son de integración contra una única base Postgres compartida
    // (seed de roles/permisos, filas reales) — correr archivos en paralelo
    // produce condiciones de carrera entre ellos.
    fileParallelism: false,
  },
});

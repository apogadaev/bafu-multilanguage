import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  resolve: {
    // Vite/Vitest don't transform code resolved through node_modules by
    // default; @bafu/domain is workspace-linked TS source, not a prebuilt
    // package, so alias it straight to source rather than relying on the
    // node_modules symlink being picked up for transformation.
    alias: { "@bafu/domain": fileURLToPath(new URL("../domain/src/index.ts", import.meta.url)) },
  },
});

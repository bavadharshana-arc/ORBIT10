import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Separate from vite.config.ts (Phase 19 Frontend Integration follow-up
 * — Add Automated Tests) — deliberately skips the Tailwind plugin
 * (irrelevant to unit/component tests and only slows them down) while
 * keeping the same "@/*" alias real app imports rely on.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});

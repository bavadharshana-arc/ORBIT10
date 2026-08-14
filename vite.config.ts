import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Mirrors the "@/*" -> "./src/*" mapping already declared in
    // tsconfig.app.json and components.json — without this, those
    // configs only satisfy the type-checker/IDE, and any real "@/"
    // import fails to resolve at build/dev time.
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
});
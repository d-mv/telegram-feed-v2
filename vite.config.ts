import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import path from "node:path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("/node_modules/telegram/")) {
            return "telegram";
          }
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/jotai/") ||
            id.includes("/node_modules/clsx/") ||
            id.includes("/node_modules/ramda/") ||
            id.includes("/node_modules/embla-carousel-react/")
          ) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
  css: {
    modules: {
      generateScopedName: (localName, filename) => {
        const cleanName = path.basename(filename).split("?")[0];
        const base = cleanName
          .replace(/\.module\.css$/i, "")
          .replace(/\.css$/i, "")
          .replace(/\.module$/i, "");
        const hash = createHash("sha256")
          .update(localName)
          .update(base)
          .update(filename)
          .digest("base64")
          .replace(/[+/=]/g, "")
          .slice(0, 6);
        return `${base}__${localName}__${hash}`;
      },
    },
  },
});

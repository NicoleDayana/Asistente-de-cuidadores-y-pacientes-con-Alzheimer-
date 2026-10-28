import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub Pages supplies a path for project sites and an empty string for root sites.
// Vite's BASE_URL must end in a slash when it is used to construct asset URLs.
const pagesBasePath = process.env.PAGES_BASE_PATH || "/";
const base = pagesBasePath.endsWith("/") ? pagesBasePath : `${pagesBasePath}/`;

export default defineConfig({
  base,
  // The single-file plugin otherwise overrides the base with "./".
  plugins: [react(), tailwindcss(), viteSingleFile({ overrideConfig: { base } })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

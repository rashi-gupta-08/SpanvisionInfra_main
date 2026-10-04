import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { spanvisionCompanions } from "./companion-plugin.js";

export default defineConfig({
  plugins: [svelte(), spanvisionCompanions()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
});

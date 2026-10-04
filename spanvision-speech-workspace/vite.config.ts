import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  // Keep linked suite dependencies on one Solid runtime.
  resolve: { preserveSymlinks: true, dedupe: ["solid-js"] },
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port: 3025,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    minify: !process.env.TAURI_DEBUG ? true : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});

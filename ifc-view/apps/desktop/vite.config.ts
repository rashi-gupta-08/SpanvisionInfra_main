import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3005,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['web-ifc'],
  },
  publicDir: 'public',
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Prevent Vite from obscuring Rust errors
  clearScreen: false,
  server: {
    // Tauri expects a fixed port
    port: 4245,
    strictPort: true,
    host: '127.0.0.1',
    // Allow Tauri's custom protocol to connect
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})

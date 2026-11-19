import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs on :5000. Proxying keeps the browser on one origin, so the
    // HTTP-only auth cookie and the CSRF cookie are first-party cookies.
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    testTimeout: 15000,
  },
})

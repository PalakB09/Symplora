import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import os from 'node:os'

const cacheDir = process.env.VITE_CACHE_DIR || path.join(os.tmpdir(), 'vite-symplora-cache')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  cacheDir,
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    force: true,
  },
})

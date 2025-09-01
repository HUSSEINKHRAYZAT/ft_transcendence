import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    host: true,
    open: false,
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '@/components': fileURLToPath(new URL('../src/components', import.meta.url)),
      '@/services': fileURLToPath(new URL('../src/services', import.meta.url)),
      '@/utils': fileURLToPath(new URL('../src/utils', import.meta.url)),
      '@/types': fileURLToPath(new URL('../src/types', import.meta.url)),
      '@/game': fileURLToPath(new URL('../src/game', import.meta.url)),
      '@/styles': fileURLToPath(new URL('../src/styles', import.meta.url)),
      '@/assets': fileURLToPath(new URL('../src/assets', import.meta.url)),
      '@/langs': fileURLToPath(new URL('../src/langs', import.meta.url)),
      '@/auth': fileURLToPath(new URL('../src/auth', import.meta.url)),
    }
  },

  // PostCSS will automatically find postcss.config.js in root
})

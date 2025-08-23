import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'frontend'),
      '@/components': resolve(__dirname, 'frontend/components'),
      '@/services': resolve(__dirname, 'frontend/services'),
      '@/utils': resolve(__dirname, 'frontend/utils'),
      '@/types': resolve(__dirname, 'frontend/types'),
      '@/game': resolve(__dirname, 'src/game'),
    },
  },
  server: {
    port: 5173, // Change this to match your current port
    open: true,
    hmr: false, // Disable auto-refresh for testing
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
})

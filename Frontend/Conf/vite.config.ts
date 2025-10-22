import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

// Helper function to check if HTTPS certificates exist
function getHttpsConfig() {
  const certDir = path.resolve(fileURLToPath(new URL('../cert', import.meta.url)))
  const keyPath = path.join(certDir, 'key.pem')
  const certPath = path.join(certDir, 'cert.pem')

  // Only use HTTPS if certificates exist (local dev mode)
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    }
  }

  // No HTTPS config for production build (nginx handles SSL)
  return undefined
}

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
    
    // Conditionally enable HTTPS only when certificates exist
    https: getHttpsConfig(),
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
    },
  },
})

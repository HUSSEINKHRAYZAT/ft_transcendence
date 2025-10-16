import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

function getHttpsConfig(): Record<string, any> | undefined {
  try {
    const keyPath = path.resolve(__dirname, '../certs/services/frontend/server.key')
    const certPath = path.resolve(__dirname, '../certs/services/frontend/server.crt')

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      console.log('🔐 HTTPS certificates found — running with HTTPS.')
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }
    } else {
      console.warn('⚠️  No HTTPS certificates found — falling back to HTTP.')
      return undefined // ✅ Type-safe fallback
    }
  } catch (err) {
    console.warn('⚠️  Error reading HTTPS certificates — falling back to HTTP.', err)
    return undefined // ✅ also Type-safe
  }
}


export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  publicDir: 'public',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['three', '@babylonjs/core', '@babylonjs/loaders'],
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.')
          const ext = info?.[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`
          } else if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
  },

  server: {
    port: 5173,
    host: true,
    open: false,
    https: getHttpsConfig(), // 👈 Auto HTTPS or fallback to HTTP
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
      '@/tournament': fileURLToPath(new URL('../src/tournament', import.meta.url)),
      '@/menu': fileURLToPath(new URL('../src/menu', import.meta.url)),
    },
  },

  optimizeDeps: {
    include: ['three', '@babylonjs/core', '@babylonjs/loaders'],
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
})

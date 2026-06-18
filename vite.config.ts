/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/heatflow/',
  plugins: [
    react(),
    {
      name: 'copy-htaccess',
      closeBundle() {
        try {
          copyFileSync(
            resolve(__dirname, 'public/.htaccess'),
            resolve(__dirname, 'dist/.htaccess')
          )
        } catch {/* already copied */}
      },
    },
  ],
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

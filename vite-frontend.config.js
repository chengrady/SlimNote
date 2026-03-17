import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const rendererRoot = resolve(__dirname, 'src/renderer')

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue-i18n': resolve(rendererRoot, 'locales/vue-i18n-shim.js'),
    },
  },
  base: './',
  server: {
    port: 5173,
    open: true,
  },
  // Disable electron plugin for frontend-only dev
  optimizeDeps: {
    exclude: ['electron']
  }
})

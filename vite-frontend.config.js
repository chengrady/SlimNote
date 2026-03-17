import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
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

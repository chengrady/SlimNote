// 修复 VS Code 环境中 ELECTRON_RUN_AS_NODE 导致的问题
// 必须在导入任何模块之前删除这个环境变量
delete process.env.ELECTRON_RUN_AS_NODE

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

const rendererRoot = resolve(__dirname, 'src/renderer')

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  plugins: [
    vue(),
    electron([
      {
        entry: 'electron/main.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['electron', 'path', 'fs', 'iconv-lite', 'chokidar']
            }
          }
        },
      },
      {
        entry: 'electron/preload.js',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            rollupOptions: {
              external: ['electron']
            }
          }
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue-i18n': resolve(rendererRoot, 'locales/vue-i18n-shim.js'),
    },
  },
  base: './',
  server: {
    port: 5173,
  },
})

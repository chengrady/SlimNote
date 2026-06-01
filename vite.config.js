// 修复 VS Code 环境中 ELECTRON_RUN_AS_NODE 导致的问题
// 必须在导入任何模块之前删除这个环境变量
delete process.env.ELECTRON_RUN_AS_NODE

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'

const rendererRoot = resolve(__dirname, 'src/renderer')
const electronRoot = resolve(__dirname, 'electron')
const electronDistRoot = resolve(__dirname, 'dist-electron')
const electronMainHelperFiles = ['aiSettings.js', 'aiSettingsSchema.js', 'aiClient.js', 'aiSessions.js', 'updateManager.js']

function copyElectronMainHelpers() {
  return {
    name: 'copy-electron-main-helpers',
    closeBundle() {
      mkdirSync(electronDistRoot, { recursive: true })

      for (const fileName of electronMainHelperFiles) {
        const sourcePath = join(electronRoot, fileName)
        if (!existsSync(sourcePath)) continue
        copyFileSync(sourcePath, join(electronDistRoot, fileName))
      }
    }
  }
}

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
              external: ['electron', 'path', 'fs', 'iconv-lite', 'chokidar', 'electron-updater']
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
    copyElectronMainHelpers(),
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

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it, beforeEach } from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { useFileStore } from '../src/renderer/stores/file.js'

const workspaceSidebarSource = readFileSync(new URL('../src/renderer/components/WorkspaceSidebar.vue', import.meta.url), 'utf8')
const zhLocaleSource = readFileSync(new URL('../src/renderer/locales/zh-CN.json', import.meta.url), 'utf8')
const enLocaleSource = readFileSync(new URL('../src/renderer/locales/en-US.json', import.meta.url), 'utf8')

function createMemoryStorage() {
  const store = new Map()
  return {
    getItem: (key) => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  }
}

function setupFileStore(readDirMap) {
  globalThis.localStorage = createMemoryStorage()
  globalThis.window = {
    electronAPI: {
      readDir: async (dirPath) => readDirMap[dirPath] || []
    }
  }
  setActivePinia(createPinia())
  return useFileStore()
}

describe('workspace explorer search tree loading', () => {
  beforeEach(() => {
    delete globalThis.window
    delete globalThis.localStorage
  })

  it('loads unloaded descendant folders for explorer filtering without expanding them', async () => {
    const store = setupFileStore({
      'D:\\notes': [
        { name: '01 docs', path: 'D:\\notes\\01 docs', isDirectory: true }
      ],
      'D:\\notes\\01 docs': [
        { name: 'DeepTarget.md', path: 'D:\\notes\\01 docs\\DeepTarget.md', isDirectory: false }
      ]
    })

    await store.loadFolder('D:\\notes')

    const docsNode = store.fileTree[0]
    assert.equal(docsNode.childrenLoaded, false)
    assert.equal(docsNode.expanded, false)
    assert.deepEqual(docsNode.children, [])

    await store.loadWorkspaceTreeForSearch()

    assert.equal(docsNode.childrenLoaded, true)
    assert.equal(docsNode.expanded, false)
    assert.deepEqual(docsNode.children.map(child => child.name), ['DeepTarget.md'])
  })

  it('refreshes a collapsed folder when the user opens it after search preloading', async () => {
    const readDirMap = {
      'D:\\notes': [
        { name: '01 docs', path: 'D:\\notes\\01 docs', isDirectory: true }
      ],
      'D:\\notes\\01 docs': [
        { name: 'CachedTarget.md', path: 'D:\\notes\\01 docs\\CachedTarget.md', isDirectory: false }
      ]
    }
    const store = setupFileStore(readDirMap)

    await store.loadFolder('D:\\notes')
    const docsNode = store.fileTree[0]
    await store.loadWorkspaceTreeForSearch()

    readDirMap['D:\\notes\\01 docs'] = [
      { name: 'FreshTarget.md', path: 'D:\\notes\\01 docs\\FreshTarget.md', isDirectory: false }
    ]
    await store.expandFolder(docsNode)

    assert.equal(docsNode.expanded, true)
    assert.deepEqual(docsNode.children.map(child => child.name), ['FreshTarget.md'])
  })

  it('preloads the workspace tree while filtering and avoids premature no-match text', () => {
    assert.match(workspaceSidebarSource, /const workspaceFilterLoading = ref\(false\)/)
    assert.match(workspaceSidebarSource, /watch\(workspaceFilter,[\s\S]*fileStore\.loadWorkspaceTreeForSearch\(\)/)
    assert.match(workspaceSidebarSource, /workspaceFilter && workspaceFilterLoading && !hasFilteredWorkspaceNodes/)
    assert.match(workspaceSidebarSource, /workspaceFilter && !workspaceFilterLoading && !hasFilteredWorkspaceNodes/)
    assert.match(zhLocaleSource, /"filterLoading":\s*"正在加载目录"/)
    assert.match(enLocaleSource, /"filterLoading":\s*"Loading folders"/)
  })
})

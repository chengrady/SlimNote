import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/views/MainEditor.vue', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../src/renderer/App.vue', import.meta.url), 'utf8')

describe('left sidebar collapse animation', () => {
  it('lets the inline width transition animate collapse without an immediate max-width clamp', () => {
    assert.match(source, /\.main-editor:not\(\.resizing\) \.sidebar\s*{[\s\S]*transition:\s*width var\(--transition-smooth\)/)
    assert.match(source, /'--sidebar-pane-width': isSidebarCollapsed\.value \? '0px' : `\$\{Math\.max\(0, sidebarWidth\.value - SIDEBAR_COLLAPSED_WIDTH\)}px`/)
    assert.doesNotMatch(source, /<div v-if="!isSidebarCollapsed" class="sidebar-pane">/)
    assert.match(source, /<div class="sidebar-pane" :aria-hidden="isSidebarCollapsed \? 'true' : 'false'">/)
    assert.match(source, /<WorkspaceSidebar :mode="activeSidebarView" :collapsed="isSidebarCollapsed"/)
    assert.match(source, /\.sidebar-pane\s*{[\s\S]*flex:\s*0 0 var\(--sidebar-pane-width\);[\s\S]*width:\s*var\(--sidebar-pane-width\);[\s\S]*min-width:\s*var\(--sidebar-pane-width\);/)

    const collapsedRule = source.match(/\.sidebar\.collapsed\s*{(?<body>[\s\S]*?)}/)?.groups?.body || ''

    assert.match(collapsedRule, /min-width:\s*48px;/)
    assert.doesNotMatch(collapsedRule, /max-width:\s*48px;/)
    assert.match(source, /\.sidebar\.collapsed \.sidebar-pane\s*{[\s\S]*flex:\s*0 0 0;[\s\S]*width:\s*0;[\s\S]*min-width:\s*0;[\s\S]*pointer-events:\s*none;/)
  })

  it('loads saved settings before the editor layout mounts', () => {
    const loadSettingsIndex = appSource.indexOf('settingsStore.loadSettings()')
    const mountedIndex = appSource.indexOf('onMounted(')

    assert.ok(loadSettingsIndex >= 0)
    assert.ok(mountedIndex >= 0)
    assert.ok(loadSettingsIndex < mountedIndex)
  })

  it('keeps viewport constraint clamps from overwriting saved sidebar width', () => {
    const sidebarWidthWatcher = source.match(/watch\(sidebarWidth,\s*\(newWidth\)\s*=>\s*{(?<body>[\s\S]*?)\n}\)/)?.groups?.body || ''
    const rightSidebarWidthWatcher = source.match(/watch\(rightSidebarWidth,\s*\(newWidth\)\s*=>\s*{(?<body>[\s\S]*?)\n}\)/)?.groups?.body || ''

    assert.match(source, /let isApplyingWorkbenchConstraints = false/)
    assert.match(source, /function beginWorkbenchConstraintUpdate\(\)\s*{[\s\S]*nextTick\(\(\) =>/)
    assert.match(source, /function clampWorkbenchWidths\(\)\s*{[\s\S]*beginWorkbenchConstraintUpdate\(\)[\s\S]*clampSidebarWidth\(getPreferredSidebarWidth\(\)\)[\s\S]*clampRightSidebarWidth\(getPreferredRightSidebarWidth\(\)\)/)
    assert.match(sidebarWidthWatcher, /if \(isApplyingWorkbenchConstraints\) return/)
    assert.match(rightSidebarWidthWatcher, /if \(isApplyingWorkbenchConstraints\) return/)
  })
})

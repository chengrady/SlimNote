<template>
  <div ref="titleBarRef" class="title-bar">
    <div class="title-leading">
      <div class="app-title title-drag-area" aria-hidden="true">
        <img :src="logo" alt="SlimNote logo" class="app-logo" />
      </div>

      <div class="menu-bar">
        <button
          v-for="menu in menus"
          :key="menu.key"
          type="button"
          class="menu-trigger"
          :class="{ active: activeMenuKey === menu.key }"
          :aria-expanded="activeMenuKey === menu.key ? 'true' : 'false'"
          @click.stop="toggleMenu(menu.key, $event)"
          @mouseenter="handleTriggerHover(menu.key, $event)"
        >
          {{ menu.label }}
        </button>
      </div>
    </div>

    <div class="title-drag-spacer" aria-hidden="true"></div>

    <div class="window-controls">
      <button type="button" class="control-button minimize" :aria-label="t('window.minimize')" @click="minimize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 6h10" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>

      <button
        type="button"
        class="control-button maximize"
        :title="isMaximized ? t('titleBar.restore') : t('titleBar.maximize')"
        :aria-label="isMaximized ? t('titleBar.restore') : t('titleBar.maximize')"
        @click="maximize"
      >
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12">
          <rect width="10" height="10" x="1" y="1" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12">
          <rect width="8" height="8" x="3" y="1" stroke="currentColor" stroke-width="1" fill="none" />
          <path d="M1 3v8h8" stroke="currentColor" stroke-width="1" fill="none" />
        </svg>
      </button>

      <button type="button" class="control-button close" :aria-label="t('window.close')" @click="close">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M1 1l10 10M1 11L11 1" stroke="currentColor" stroke-width="1" />
        </svg>
      </button>
    </div>

    <div
      v-if="activeMenu"
      ref="menuPanelRef"
      class="title-menu-panel ui-context-menu"
      :style="menuPanelStyle"
      @click.stop
    >
      <template v-for="(section, sectionIndex) in activeMenu.sections" :key="`${activeMenu.key}-${sectionIndex}`">
        <div v-if="sectionIndex > 0" class="ui-menu-separator"></div>

        <button
          v-for="item in section"
          :key="item.action"
          type="button"
          class="ui-menu-item title-menu-item"
          :class="{ 'ui-menu-item--danger': item.danger }"
          @click="handleMenuItem(item.action)"
        >
          <span class="title-menu-item-label">{{ item.label }}</span>
          <span v-if="item.shortcut" class="title-menu-item-shortcut">{{ item.shortcut }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import logo from '../assets/logo.svg'

const emit = defineEmits(['open-settings', 'menu-action'])

const { t, locale } = useI18n()
const isMaximized = ref(false)
const titleBarRef = ref(null)
const menuPanelRef = ref(null)
const activeMenuKey = ref('')
const menuPanelStyle = ref({
  top: '0px',
  left: '0px'
})

const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform)
const isDev = import.meta.env.DEV

const shortcutMap = computed(() => ({
  newFile: isMac ? 'Cmd+N' : 'Ctrl+N',
  openFile: isMac ? 'Cmd+O' : 'Ctrl+O',
  openFolder: isMac ? 'Cmd+Shift+O' : 'Ctrl+Shift+O',
  save: isMac ? 'Cmd+S' : 'Ctrl+S',
  saveAs: isMac ? 'Cmd+Shift+S' : 'Ctrl+Shift+S',
  settings: isMac ? 'Cmd+,' : 'Ctrl+,',
  undo: isMac ? 'Cmd+Z' : 'Ctrl+Z',
  redo: isMac ? 'Cmd+Shift+Z' : 'Ctrl+Y',
  find: isMac ? 'Cmd+F' : 'Ctrl+F',
  replace: isMac ? 'Cmd+H' : 'Ctrl+H',
  globalSearch: isMac ? 'Cmd+Shift+F' : 'Ctrl+Shift+F',
  selectAll: isMac ? 'Cmd+A' : 'Ctrl+A',
  toggleSidebar: isMac ? 'Cmd+B' : 'Ctrl+B',
  toggleFullscreen: isMac ? 'Ctrl+Cmd+F' : 'F11',
  togglePresentationMode: isMac ? '⇧+⌘+P' : 'Shift+F5',
  reload: isMac ? 'Cmd+R' : 'Ctrl+R',
  forceReload: isMac ? 'Cmd+Shift+R' : 'Ctrl+Shift+R',
  toggleDevTools: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I'
}))

const menus = computed(() => {
  const shortcuts = shortcutMap.value

  return [
    {
      key: 'file',
      label: t('menu.file'),
      sections: [
        [
          { action: 'new-file', label: t('menu.newFile'), shortcut: shortcuts.newFile },
          { action: 'open-file', label: t('menu.openFile'), shortcut: shortcuts.openFile },
          { action: 'open-folder', label: t('menu.openFolder'), shortcut: shortcuts.openFolder }
        ],
        [
          { action: 'save', label: t('menu.save'), shortcut: shortcuts.save },
          { action: 'save-as', label: t('menu.saveAs'), shortcut: shortcuts.saveAs }
        ],
        [
          { action: 'open-settings', label: t('menu.settings'), shortcut: shortcuts.settings }
        ],
        [
          { action: 'exit', label: t('menu.exit'), danger: true }
        ]
      ]
    },
    {
      key: 'edit',
      label: t('menu.edit'),
      sections: [
        [
          { action: 'undo', label: t('menu.undo'), shortcut: shortcuts.undo },
          { action: 'redo', label: t('menu.redo'), shortcut: shortcuts.redo }
        ],
        [
          { action: 'find', label: t('menu.find'), shortcut: shortcuts.find },
          { action: 'replace', label: t('menu.replace'), shortcut: shortcuts.replace },
          { action: 'global-search', label: t('menu.globalSearch'), shortcut: shortcuts.globalSearch }
        ],
        [
          { action: 'select-all', label: t('menu.selectAll'), shortcut: shortcuts.selectAll }
        ]
      ]
    },
    {
      key: 'view',
      label: t('menu.view'),
      sections: [
        [
          { action: 'toggle-sidebar', label: menuLabel('menu.toggleSidebar', '切换侧边栏', 'Toggle Sidebar'), shortcut: shortcuts.toggleSidebar },
          { action: 'toggle-theme', label: menuLabel('menu.toggleTheme', '切换主题', 'Toggle Theme') },
          { action: 'toggle-fullscreen', label: menuLabel('menu.toggleFullscreen', '全屏模式', 'Toggle Fullscreen'), shortcut: shortcuts.toggleFullscreen },
          { action: 'toggle-presentation-mode', label: menuLabel('menu.togglePresentationMode', '演示模式', 'Presentation Mode'), shortcut: shortcuts.togglePresentationMode }
        ],
        ...(isDev
          ? [[
              { action: 'reload', label: t('menu.reload'), shortcut: shortcuts.reload },
              { action: 'force-reload', label: t('menu.forceReload'), shortcut: shortcuts.forceReload },
              { action: 'toggle-devtools', label: t('menu.toggleDevTools'), shortcut: shortcuts.toggleDevTools }
            ]]
          : [])
      ]
    },
    {
      key: 'help',
      label: menuLabel('menu.help', '\u5e2e\u52a9', 'Help'),
      sections: [
        [
          { action: 'check-for-updates', label: menuLabel('menu.checkUpdates', '\u68c0\u67e5\u66f4\u65b0', 'Check for Updates') },
          { action: 'open-about', label: menuLabel('menu.about', '\u5173\u4e8e SlimNote', 'About SlimNote') }
        ]
      ]
    }
  ]
})

const activeMenu = computed(() => menus.value.find(menu => menu.key === activeMenuKey.value) || null)

function menuLabel(key, zhFallback, enFallback) {
  const value = t(key)
  if (value !== key) return value
  return locale.value === 'zh-CN' ? zhFallback : enFallback
}

function minimize() {
  window.electronAPI.minimize()
}

function maximize() {
  window.electronAPI.maximize()
}

function close() {
  window.electronAPI.close()
}

function toggleMenu(menuKey, event) {
  if (activeMenuKey.value === menuKey) {
    closeMenu()
    return
  }

  openMenu(menuKey, event.currentTarget)
}

function handleTriggerHover(menuKey, event) {
  if (!activeMenuKey.value || activeMenuKey.value === menuKey) return
  openMenu(menuKey, event.currentTarget)
}

function openMenu(menuKey, target) {
  if (!target) return

  const rect = target.getBoundingClientRect()
  activeMenuKey.value = menuKey
  menuPanelStyle.value = {
    top: `${Math.round(rect.bottom + 6)}px`,
    left: `${Math.round(rect.left)}px`
  }

  nextTick(adjustMenuPosition)
}

function adjustMenuPosition() {
  const menuEl = menuPanelRef.value
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const margin = 8
  const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin)
  const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)

  menuPanelStyle.value = {
    top: `${Math.min(Math.max(margin, rect.top), maxTop)}px`,
    left: `${Math.min(Math.max(margin, rect.left), maxLeft)}px`
  }
}

function closeMenu() {
  activeMenuKey.value = ''
}

function handleMenuItem(action) {
  closeMenu()

  if (action === 'open-settings') {
    emit('open-settings')
    return
  }

  emit('menu-action', action)
}

function handleDocumentPointerDown(event) {
  if (titleBarRef.value?.contains(event.target)) return
  closeMenu()
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

onMounted(async () => {
  isMaximized.value = await window.electronAPI.isMaximized()

  window.electronAPI.onWindowMaximized(() => {
    isMaximized.value = true
  })

  window.electronAPI.onWindowUnmaximized(() => {
    isMaximized.value = false
  })

  document.addEventListener('pointerdown', handleDocumentPointerDown)
  window.addEventListener('resize', closeMenu)
  window.addEventListener('blur', closeMenu)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.removeEventListener('resize', closeMenu)
  window.removeEventListener('blur', closeMenu)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.title-bar {
  position: relative;
  height: var(--titlebar-height);
  background: var(--bg-primary); /* Flat background vs glass */
  /* Title bar spans across with a bottom line */
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  user-select: none;
  z-index: 1000;
  padding: 0 var(--space-2) 0 0;
  gap: var(--space-2);
  -webkit-app-region: no-drag;
}

.title-leading {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
  padding-left: 0; /* Remove padding to align with Activity Bar exactly */
  gap: 0; /* Let the menu start right after the logo box */
  -webkit-app-region: no-drag;
}

.title-drag-area,
.title-drag-spacer {
  -webkit-app-region: drag;
}

.title-drag-spacer {
  flex: 1 0 48px;
  min-width: 48px;
  align-self: stretch;
}

.app-title {
  color: var(--accent-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 48px; /* Force to exactly match Activity Bar width */
  min-width: 48px;
  padding: 0;
}

.app-logo {
  width: 24px;
  height: 24px;
}

.menu-bar,
.window-controls,
.title-menu-panel,
.menu-trigger,
.control-button,
.title-menu-item {
  -webkit-app-region: no-drag;
}

.menu-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: -6px;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  pointer-events: auto;
}

.menu-trigger,
.control-button {
  border: 0;
  background: transparent;
  font: inherit;
}

.menu-trigger {
  padding: 0 8px; /* 进一步压实距离 */
  height: 28px;
  margin: auto 0;
  display: inline-flex;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-interactive, var(--text-muted));
  cursor: pointer;
  border-radius: var(--icon-button-radius);
  transition: var(--transition-fast);
}

.menu-trigger:hover,
.menu-trigger.active {
  background-color: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  box-shadow: var(--interactive-hover-ring);
}

.menu-trigger.active {
  color: var(--text-interactive-active, var(--accent-primary));
  background-color: var(--interactive-selected-bg-strong, var(--interactive-selected-bg));
  box-shadow: var(--field-focus-ring);
}

.menu-trigger:focus-visible,
.control-button:focus-visible,
.title-menu-item:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring);
}

.window-controls {
  display: flex;
  height: 100%;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  pointer-events: auto;
}

.control-button {
  width: 34px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  border-radius: var(--icon-button-radius);
  transition: var(--transition-fast);
}

.control-button:hover {
  background-color: var(--window-control-hover-bg);
  color: var(--window-control-hover-color);
  box-shadow: var(--interactive-hover-ring);
}

.control-button.close:hover {
  background-color: var(--window-close-hover-bg);
  color: var(--window-close-hover-color);
  box-shadow: none;
}

.title-menu-panel {
  width: max-content;
  min-width: 188px;
  max-width: min(236px, calc(100vw - 16px));
  padding: var(--space-1);
  z-index: 6000;
}

.title-menu-item {
  width: 100%;
  border: 0;
  background: transparent;
  border-radius: var(--radius-sm);
  justify-content: space-between;
  gap: var(--space-3);
  text-align: left;
}

.title-menu-item-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.title-menu-item-shortcut {
  flex-shrink: 0;
  color: var(--text-shortcut, var(--text-dim));
  font-size: var(--ui-font-size-xs);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.title-menu-item:hover .title-menu-item-shortcut {
  color: inherit;
}

@media (max-width: 860px) {
  .title-leading {
    padding-left: var(--space-3);
    gap: var(--space-1);
  }

  .menu-trigger {
    padding: 0 var(--space-2);
  }
}
</style>

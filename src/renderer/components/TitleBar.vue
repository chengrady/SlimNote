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
      <button
        type="button"
        class="control-button settings-btn"
        :title="t('titleBar.settings')"
        :aria-label="t('titleBar.settings')"
        @click="$emit('open-settings')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <button
        type="button"
        class="control-button theme-toggle"
        :title="t('titleBar.toggleTheme')"
        :aria-label="t('titleBar.toggleTheme')"
        @click="toggleTheme"
      >
        <svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </button>

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
import { useSettingsStore } from '../stores/settings'
import logo from '../assets/logo.svg'

const emit = defineEmits(['open-settings', 'menu-action'])

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()

const isDark = computed(() => settingsStore.settings.theme === 'dark')
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
  newFile: isMac ? 'Cmd N' : 'Ctrl N',
  openFile: isMac ? 'Cmd O' : 'Ctrl O',
  openFolder: isMac ? 'Cmd Shift O' : 'Ctrl Shift O',
  save: isMac ? 'Cmd S' : 'Ctrl S',
  saveAs: isMac ? 'Cmd Shift S' : 'Ctrl Shift S',
  settings: isMac ? 'Cmd ,' : 'Ctrl ,',
  undo: isMac ? 'Cmd Z' : 'Ctrl Z',
  redo: isMac ? 'Cmd Shift Z' : 'Ctrl Y',
  find: isMac ? 'Cmd F' : 'Ctrl F',
  replace: isMac ? 'Cmd H' : 'Ctrl H',
  globalSearch: isMac ? 'Cmd Shift F' : 'Ctrl Shift F',
  selectAll: isMac ? 'Cmd A' : 'Ctrl A',
  toggleSidebar: isMac ? 'Cmd B' : 'Ctrl B',
  toggleFullscreen: isMac ? 'Ctrl Cmd F' : 'F11',
  reload: isMac ? 'Cmd R' : 'Ctrl R',
  forceReload: isMac ? 'Cmd Shift R' : 'Ctrl Shift R',
  toggleDevTools: isMac ? 'Alt Cmd I' : 'Ctrl Shift I'
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
          { action: 'toggle-sidebar', label: menuLabel('menu.toggleSidebar', '\u5207\u6362\u5de5\u4f5c\u533a', 'Toggle Sidebar'), shortcut: shortcuts.toggleSidebar },
          { action: 'toggle-theme', label: t('menu.toggleTheme') },
          { action: 'toggle-fullscreen', label: t('menu.toggleFullscreen'), shortcut: shortcuts.toggleFullscreen }
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

function toggleTheme() {
  settingsStore.toggleTheme()
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
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  user-select: none;
  z-index: 1000;
  padding: 0 var(--space-2) 0 0;
  gap: var(--space-2);
  backdrop-filter: blur(var(--backdrop-blur));
  -webkit-app-region: no-drag;
}

.title-leading {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
  height: 100%;
  padding-left: var(--space-4);
  gap: var(--space-2);
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
  padding-right: var(--space-1);
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
  gap: var(--space-1);
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
  padding: 0 var(--space-3);
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

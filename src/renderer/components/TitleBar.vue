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

    <div v-if="showLayoutControls" class="layout-controls" role="group" :aria-label="layoutLabel('\u5e03\u5c40\u63a7\u5236', 'Layout controls')">
      <button
        type="button"
        class="layout-control-button"
        :class="{ active: !leftSidebarCollapsed }"
        :title="layoutLabel('\u663e\u793a/\u9690\u85cf\u5de6\u4fa7\u680f', 'Show or hide left sidebar')"
        :aria-label="layoutLabel('\u663e\u793a/\u9690\u85cf\u5de6\u4fa7\u680f', 'Show or hide left sidebar')"
        @click="requestMenuAction('toggle-sidebar')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.6" />
          <path class="layout-pane" d="M4.5 5.5h4v9h-4z" fill="currentColor" />
          <path d="M9 4v12" stroke="currentColor" stroke-width="1.4" />
        </svg>
      </button>
      <button
        type="button"
        class="layout-control-button"
        :class="{ active: !rightSidebarCollapsed }"
        :title="layoutLabel('\u663e\u793a/\u9690\u85cf\u53f3\u4fa7 AI \u52a9\u624b', 'Show or hide right AI assistant')"
        :aria-label="layoutLabel('\u663e\u793a/\u9690\u85cf\u53f3\u4fa7 AI \u52a9\u624b', 'Show or hide right AI assistant')"
        @click="requestMenuAction('toggle-right-sidebar')"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.6" />
          <path class="layout-pane" d="M11.5 5.5h4v9h-4z" fill="currentColor" />
          <path d="M11 4v12" stroke="currentColor" stroke-width="1.4" />
        </svg>
      </button>
    </div>

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
import { useShortcutsStore } from '../stores/shortcuts'
import { shortcutDisplayByAction } from '../utils/shortcuts'

const emit = defineEmits(['open-settings', 'menu-action'])

defineProps({
  leftSidebarCollapsed: {
    type: Boolean,
    default: false
  },
  rightSidebarCollapsed: {
    type: Boolean,
    default: false
  },
  showLayoutControls: {
    type: Boolean,
    default: true
  }
})

const { t, locale } = useI18n()
const shortcutsStore = useShortcutsStore()
shortcutsStore.loadShortcuts()
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

const menus = computed(() => {
  return [
    {
      key: 'file',
      label: t('menu.file'),
      sections: [
        [
          { action: 'new-file', label: t('menu.newFile'), shortcut: shortcut('new-file') },
          { action: 'open-file', label: t('menu.openFile'), shortcut: shortcut('open-file') },
          { action: 'open-folder', label: t('menu.openFolder'), shortcut: shortcut('open-folder') }
        ],
        [
          { action: 'save', label: t('menu.save'), shortcut: shortcut('save') },
          { action: 'save-as', label: t('menu.saveAs'), shortcut: shortcut('save-as') }
        ],
        [
          { action: 'open-settings', label: t('menu.settings'), shortcut: shortcut('open-settings') }
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
          { action: 'undo', label: t('menu.undo'), shortcut: shortcut('undo') },
          { action: 'redo', label: t('menu.redo'), shortcut: shortcut('redo') }
        ],
        [
          { action: 'find', label: t('menu.find'), shortcut: shortcut('find') },
          { action: 'replace', label: t('menu.replace'), shortcut: shortcut('replace') },
          { action: 'global-search', label: t('menu.globalSearch'), shortcut: shortcut('global-search') }
        ],
        [
          { action: 'select-all', label: t('menu.selectAll'), shortcut: shortcut('select-all') }
        ]
      ]
    },
    {
      key: 'view',
      label: t('menu.view'),
      sections: [
        [
          { action: 'toggle-fullscreen', label: menuLabel('menu.toggleFullscreen', '全屏模式', 'Toggle Fullscreen'), shortcut: shortcut('toggle-fullscreen') },
          { action: 'toggle-presentation-mode', label: menuLabel('menu.togglePresentationMode', '演示模式', 'Presentation Mode'), shortcut: shortcut('toggle-presentation-mode') }
        ],
        ...(isDev
          ? [[
              { action: 'reload', label: t('menu.reload'), shortcut: shortcut('reload') },
              { action: 'force-reload', label: t('menu.forceReload'), shortcut: shortcut('force-reload') },
              { action: 'toggle-devtools', label: t('menu.toggleDevTools'), shortcut: shortcut('toggle-devtools') }
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

function shortcut(action) {
  return shortcutDisplayByAction(action, isMac, shortcutsStore.shortcutOverrides)
}

function menuLabel(key, zhFallback, enFallback) {
  const value = t(key)
  if (value !== key) return value
  return locale.value === 'zh-CN' ? zhFallback : enFallback
}

function layoutLabel(zhText, enText) {
  return locale.value === 'zh-CN' ? zhText : enText
}

function requestMenuAction(action) {
  emit('menu-action', action)
}

function minimize() {
  window.electronAPI?.minimize?.()
}

function maximize() {
  window.electronAPI?.maximize?.()
}

function close() {
  window.electronAPI?.close?.()
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
  const electronAPI = typeof window === 'undefined' ? null : window.electronAPI
  if (electronAPI?.isMaximized) {
    isMaximized.value = await electronAPI.isMaximized()
  }

  electronAPI?.onWindowMaximized?.(() => {
    isMaximized.value = true
  })

  electronAPI?.onWindowUnmaximized?.(() => {
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
  background: var(--surface-panel-strong);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--shadow-subtle);
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
.layout-controls,
.window-controls,
.title-menu-panel,
.menu-trigger,
.layout-control-button,
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
.layout-control-button,
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
  transition: var(--transition-interactive);
}

.menu-trigger:hover,
.menu-trigger.active {
  background-color: var(--surface-hover);
  color: var(--text-interactive-hover, var(--text-main));
  box-shadow: var(--interactive-hover-ring);
}

.menu-trigger.active {
  color: var(--text-interactive-active, var(--accent-primary));
  background-color: var(--surface-active);
  box-shadow: var(--field-focus-ring);
}

.menu-trigger:focus-visible,
.layout-control-button:focus-visible,
.control-button:focus-visible,
.title-menu-item:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring);
}

.layout-controls {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 100%;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  pointer-events: auto;
}

.layout-control-button {
  width: 32px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  border-radius: var(--icon-button-radius);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.layout-control-button:hover {
  color: var(--window-control-hover-color);
  background-color: var(--window-control-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.layout-control-button.active {
  color: var(--text-interactive-active, var(--accent-primary));
  background: var(--surface-active);
}

.layout-control-button:not(.active) .layout-pane {
  opacity: 0;
}

.layout-control-button svg {
  width: 18px;
  height: 18px;
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
  transition: var(--transition-interactive);
}

.control-button:hover {
  background-color: var(--window-control-hover-bg);
  color: var(--window-control-hover-color);
  box-shadow: var(--interactive-hover-ring);
  transform: translateY(-1px);
}

.control-button.close:hover {
  background-color: var(--window-close-hover-bg);
  color: var(--window-close-hover-color);
  box-shadow: none;
  transform: none;
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

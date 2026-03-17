<template>
  <div class="title-bar">
    <div class="title-drag-area">
      <div class="app-title">
        <img :src="logo" alt="Logo" class="app-logo" />
      </div>
      <div class="menu-bar">
        <div class="menu-item" @click="showMenu(t('menu.file'), $event)">{{ t('menu.file') }}</div>
        <div class="menu-item" @click="showMenu(t('menu.edit'), $event)">{{ t('menu.edit') }}</div>
        <div class="menu-item" @click="showMenu(t('menu.view'), $event)">{{ t('menu.view') }}</div>
      </div>
    </div>
    <div class="window-controls">
      <div class="control-button settings-btn" @click="$emit('open-settings')" :title="t('titleBar.settings')" :aria-label="t('titleBar.settings')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </div>
      <div class="control-button theme-toggle" @click="toggleTheme" :title="t('titleBar.toggleTheme')" :aria-label="t('titleBar.toggleTheme')">
        <svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
      </div>
      <div class="control-button minimize" @click="minimize" :aria-label="t('window.minimize')">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 6h10" stroke="currentColor" stroke-width="1"/></svg>
      </div>
      <div class="control-button maximize" @click="maximize" :title="isMaximized ? t('titleBar.restore') : t('titleBar.maximize')" :aria-label="isMaximized ? t('titleBar.restore') : t('titleBar.maximize')">
        <svg v-if="!isMaximized" width="12" height="12" viewBox="0 0 12 12"><rect width="10" height="10" x="1" y="1" stroke="currentColor" stroke-width="1" fill="none"/></svg>
        <svg v-else width="12" height="12" viewBox="0 0 12 12"><rect width="8" height="8" x="3" y="1" stroke="currentColor" stroke-width="1" fill="none"/><path d="M1 3v8h8" stroke="currentColor" stroke-width="1" fill="none"/></svg>
      </div>
      <div class="control-button close" @click="close" :aria-label="t('window.close')">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M1 11L11 1" stroke="currentColor" stroke-width="1"/></svg>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import logo from '../assets/logo.svg'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.settings.theme === 'dark')
const isMaximized = ref(false)

defineEmits(['open-settings'])

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

function showMenu(menuName, event) {
  const rect = event.target.getBoundingClientRect()
  const position = {
    x: Math.round(rect.left),
    y: Math.round(rect.bottom)
  }
  window.electronAPI.showContextMenu(menuName, position)
}

onMounted(async () => {
  isMaximized.value = await window.electronAPI.isMaximized()

  window.electronAPI.onWindowMaximized(() => {
    isMaximized.value = true
  })

  window.electronAPI.onWindowUnmaximized(() => {
    isMaximized.value = false
  })
})

</script>

<style scoped>
.title-bar {
  height: var(--titlebar-height);
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  z-index: 1000;
  padding: 0 var(--space-2) 0 0;
  backdrop-filter: blur(var(--backdrop-blur));
}

.title-drag-area {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  -webkit-app-region: drag;
  padding-left: var(--space-4);
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  margin-right: var(--space-2);
  color: var(--accent-primary);
  letter-spacing: 0.2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-logo {
  width: 24px;
  height: 24px;
}

.menu-bar {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
  gap: var(--space-1);
}

.menu-item {
  padding: 0 var(--space-3);
  height: 28px;
  margin: auto 0;
  display: flex;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--icon-button-radius);
  transition: var(--transition-fast);
}

.menu-item:hover {
  background-color: var(--interactive-hover-bg);
  color: var(--text-main);
  box-shadow: var(--interactive-hover-ring);
}

.menu-item:focus-visible {
  outline: none;
  background-color: var(--interactive-selected-bg);
  color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.window-controls {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
  align-items: center;
  gap: 2px;
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

.control-button:focus-visible {
  outline: none;
  background-color: var(--interactive-selected-bg);
  color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.control-button.close:hover {
  background-color: var(--window-close-hover-bg);
  color: var(--window-close-hover-color);
  box-shadow: none;
}

@media (max-width: 860px) {
  .app-title {
    margin-right: var(--space-1);
  }

  .menu-item {
    padding: 0 var(--space-2);
  }
}
</style>

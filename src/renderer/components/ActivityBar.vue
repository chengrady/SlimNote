<template>
  <aside class="activity-bar" :class="{ collapsed }" aria-label="Workspace activity bar">
    <div class="activity-bar-top">
      <button
        v-for="item in items"
        :key="item.id"
        class="activity-button"
        :class="{ active: activeView === item.id }"
        type="button"
        :title="item.label"
        :aria-label="item.label"
        @click="$emit('select-view', item.id)"
      >
        <span class="activity-indicator" aria-hidden="true"></span>
        <span class="activity-icon" aria-hidden="true" v-html="item.icon"></span>
      </button>
    </div>
    <div class="activity-bar-bottom">
      <button
        class="activity-button utility theme-toggle-btn"
        :class="{ 'is-dark': isDark }"
        type="button"
        :title="t('titleBar.toggleTheme')"
        :aria-label="t('titleBar.toggleTheme')"
        @click="toggleTheme"
      >
        <span class="activity-indicator" aria-hidden="true"></span>
        <span class="activity-icon theme-toggle-container" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="theme-icon moon-icon">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79"></path>
          </svg>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="theme-icon sun-icon">
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
        </span>
      </button>
      <button
        class="activity-button utility"
        type="button"
        :title="t('titleBar.settings')"
        :aria-label="t('titleBar.settings')"
        @click="$emit('open-settings')"
      >
        <span class="activity-indicator" aria-hidden="true"></span>
        <span class="activity-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  activeView: {
    type: String,
    default: 'explorer'
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['select-view', 'toggle-collapse', 'open-settings'])

const { t } = useI18n()
const settingsStore = useSettingsStore()
const isDark = computed(() => settingsStore.settings.theme === 'dark')

const items = computed(() => ([
  {
    id: 'explorer',
    label: t('workspaceSidebar.explorer'),
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5.5a2.5 2.5 0 0 1 2.5-2.5h5l2 2h6A2.5 2.5 0 0 1 21 7.5v11A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5z"/><path d="M3 9h18"/></svg>'
  },
  {
    id: 'recent',
    label: t('workspaceSidebar.recentView'),
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5l3 2"/><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 4v6h-6"/></svg>'
  }
]))

function toggleTheme() {
  settingsStore.toggleTheme()
}
</script>

<style scoped>
.activity-bar {
  width: 48px;
  min-width: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-right: 1px solid var(--glass-border);
  background: var(--bg-primary); /* Flatter background for the activity bar */
}

.activity-bar-top,
.activity-bar-bottom {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.activity-button {
  position: relative;
  width: calc(100% - 12px);
  height: 44px;
  margin: 6px auto;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.activity-button:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
}

.activity-button:not(:disabled):active {
  transform: scale(0.92);
}

.activity-button.active {
  color: var(--text-main);
  background: color-mix(in srgb, var(--interactive-selected-bg-strong) 82%, transparent);
}

.activity-button.utility {
  height: 40px;
}

.activity-indicator {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 999px;
  background: transparent;
  transition: var(--transition-fast);
}

.activity-button.active .activity-indicator {
  background: var(--accent-primary);
}

.activity-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 20px;
  height: 20px;
}

/* Theme toggle animation */
.theme-icon {
  position: absolute;
  top: 0;
  left: 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.moon-icon {
  opacity: 0;
  transform: rotate(-90deg) scale(0.3);
}

.sun-icon {
  opacity: 1;
  transform: rotate(0) scale(1);
}

.theme-toggle-btn.is-dark .moon-icon {
  opacity: 1;
  transform: rotate(0) scale(1);
}

.theme-toggle-btn.is-dark .sun-icon {
  opacity: 0;
  transform: rotate(90deg) scale(0.3);
}

.activity-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.activity-button:focus-visible {
  outline: none;
  color: var(--text-main);
  background: var(--interactive-hover-bg);
}
</style>
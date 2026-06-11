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
        @click="selectView(item.id)"
      >
        <span class="activity-indicator" aria-hidden="true"></span>
        <span class="activity-icon" aria-hidden="true" v-html="item.icon"></span>
      </button>
    </div>
    <div class="activity-bar-bottom">
      <button
        ref="themeButtonRef"
        class="activity-button utility theme-toggle-btn"
        :class="{ active: themeMenuOpen }"
        type="button"
        :title="themeButtonTitle"
        :aria-label="themeButtonTitle"
        aria-haspopup="dialog"
        :aria-expanded="themeMenuOpen ? 'true' : 'false'"
        @click.stop="toggleThemeMenu"
      >
        <span class="activity-indicator" aria-hidden="true"></span>
        <span class="activity-icon theme-toggle-container" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="theme-icon theme-palette-icon">
            <path d="M12 3a9 9 0 0 0 0 18h1.35a2.15 2.15 0 0 0 1.52-3.67 1.9 1.9 0 0 1 1.35-3.24H18a3 3 0 0 0 3-3A8.1 8.1 0 0 0 12 3Z"></path>
            <circle cx="8.2" cy="10.1" r="0.85" fill="currentColor" stroke="none"></circle>
            <circle cx="10.6" cy="6.9" r="0.85" fill="currentColor" stroke="none"></circle>
            <circle cx="15" cy="7.35" r="0.85" fill="currentColor" stroke="none"></circle>
            <circle cx="17.2" cy="10.7" r="0.85" fill="currentColor" stroke="none"></circle>
          </svg>
        </span>
      </button>
      <button
        class="activity-button utility"
        type="button"
        :title="t('titleBar.settings')"
        :aria-label="t('titleBar.settings')"
        @click="openSettings"
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

  <Teleport to="body">
    <div
      v-if="themeMenuOpen"
      ref="themeMenuRef"
      class="app-theme-menu"
      :style="themeMenuStyle"
      role="dialog"
      aria-label="主题"
      @click.stop
    >
      <header class="app-theme-menu-head">
        <div>
          <h3>主题</h3>
          <p>{{ selectedThemeDescription }}</p>
        </div>
        <span class="app-theme-current-chip">{{ effectiveTheme.mode === 'dark' ? '深色' : '浅色' }}</span>
      </header>

      <section class="app-theme-section">
        <div class="app-theme-section-title">固定主题</div>
        <button
          v-for="theme in fixedThemeOptions"
          :key="theme.id"
          class="app-theme-option"
          type="button"
          role="radio"
          :aria-checked="activeThemeRef === theme.id ? 'true' : 'false'"
          :class="{ active: activeThemeRef === theme.id }"
          @click="selectTheme(theme.id)"
        >
          <span class="app-theme-option-swatch" :style="getThemeSwatchStyle(theme)" aria-hidden="true"></span>
          <span class="app-theme-option-copy">
            <span class="app-theme-option-name">{{ theme.name }}</span>
            <span class="app-theme-option-description">{{ theme.description }}</span>
          </span>
          <svg v-if="activeThemeRef === theme.id" class="app-theme-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </section>

    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { DEFAULT_MARKDOWN_THEME_REF, getMarkdownThemeOptions, normalizeMarkdownThemeRef, resolveMarkdownTheme } from '../utils/markdownThemes'

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

const emit = defineEmits(['select-view', 'toggle-collapse', 'open-settings'])

const { t } = useI18n()
const settingsStore = useSettingsStore()
const themeOptions = getMarkdownThemeOptions()
const themeButtonRef = ref(null)
const themeMenuRef = ref(null)
const themeMenuOpen = ref(false)
const themeMenuPosition = ref({ top: 0, left: 0 })

const fixedThemeOptions = computed(() => themeOptions.fixed)
const activeThemeRef = computed(() => normalizeMarkdownThemeRef(settingsStore.settings.themeRef || DEFAULT_MARKDOWN_THEME_REF))
const effectiveTheme = computed(() => settingsStore.effectiveTheme || resolveMarkdownTheme(activeThemeRef.value, settingsStore.settings.theme))
const selectedThemeOption = computed(() => (
  fixedThemeOptions.value.find((theme) => theme.id === activeThemeRef.value)
  || effectiveTheme.value
))
const selectedThemeDescription = computed(() => selectedThemeOption.value?.description || effectiveTheme.value?.description || '')
const themeButtonTitle = computed(() => `主题：${selectedThemeOption.value?.name || effectiveTheme.value?.name || '清纸'}`)
const themeMenuStyle = computed(() => ({
  top: `${themeMenuPosition.value.top}px`,
  left: `${themeMenuPosition.value.left}px`
}))

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

function getThemeSwatchStyle(theme) {
  const colors = theme?.colors || effectiveTheme.value?.colors || {}
  return {
    '--app-theme-swatch-bg': colors.pageBg || '#ffffff',
    '--app-theme-swatch-text': colors.textMain || '#1f2937',
    '--app-theme-swatch-accent': colors.accent || '#2563eb',
    '--app-theme-swatch-border': colors.border || 'rgba(15, 23, 42, 0.14)'
  }
}

function updateThemeMenuPosition() {
  const rect = themeButtonRef.value?.getBoundingClientRect()
  if (!rect) return

  const margin = 8
  const width = 340
  const fallbackHeight = 580
  const menuHeight = themeMenuRef.value?.getBoundingClientRect().height || fallbackHeight
  const viewportWidth = window.innerWidth || width
  const viewportHeight = window.innerHeight || fallbackHeight

  themeMenuPosition.value = {
    top: Math.min(Math.max(margin, rect.bottom - menuHeight), Math.max(margin, viewportHeight - menuHeight - margin)),
    left: Math.min(rect.right + margin, Math.max(margin, viewportWidth - width - margin))
  }
}

function toggleThemeMenu() {
  themeMenuOpen.value = !themeMenuOpen.value
  if (themeMenuOpen.value) {
    nextTick(updateThemeMenuPosition)
  }
}

function closeThemeMenu() {
  themeMenuOpen.value = false
}

function selectTheme(themeRef) {
  settingsStore.setThemeRef(themeRef)
  closeThemeMenu()
}

function selectView(viewId) {
  if (props.activeView === viewId) {
    emit('toggle-collapse')
    return
  }

  emit('select-view', viewId)
}

function openSettings() {
  emit('open-settings')
}

function handleDocumentClick(event) {
  const target = event.target
  if (themeButtonRef.value?.contains(target) || themeMenuRef.value?.contains(target)) return
  closeThemeMenu()
}

function handleViewportChange() {
  if (themeMenuOpen.value) {
    updateThemeMenuPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('scroll', handleViewportChange, true)
})
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
  background: var(--surface-panel-strong);
  box-shadow: inset -1px 0 0 color-mix(in srgb, var(--glass-border) 62%, transparent);
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
  transition: var(--transition-interactive);
}

.activity-button:hover {
  color: var(--text-interactive-hover, var(--text-main));
  background: var(--surface-hover);
  box-shadow: var(--interactive-hover-ring);
  transform: translateY(-1px);
}

.activity-button:not(:disabled):active {
  box-shadow: var(--shadow-press);
  transform: translateY(0);
}

.theme-toggle-btn:hover,
.theme-toggle-btn:not(:disabled):active {
  transform: none;
}

.activity-button.active {
  color: var(--text-interactive-active, var(--accent-primary));
  background: var(--surface-active);
  box-shadow: inset 0 0 0 1px var(--interactive-selected-border);
}

.activity-button.utility {
  height: 40px;
}

.activity-indicator {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: transparent;
  transition: var(--transition-interactive);
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

.activity-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.activity-button:focus-visible {
  outline: none;
  color: var(--text-main);
  background: var(--surface-hover);
  box-shadow: var(--field-focus-ring);
}

.app-theme-menu {
  position: fixed;
  z-index: 5400;
  width: min(340px, calc(100vw - 16px));
  max-height: min(620px, calc(100vh - 16px));
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--surface-popover);
  color: var(--text-main);
  box-shadow: var(--menu-card-shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  animation: popoverIn var(--transition-popover);
}

.app-theme-menu-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 6px 10px;
}

.app-theme-menu-head h3 {
  margin: 0;
  color: var(--text-main);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.app-theme-menu-head p {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.app-theme-current-chip {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.16);
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.app-theme-section + .app-theme-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--glass-border);
}

.app-theme-section-title {
  padding: 4px 8px 6px;
  color: var(--text-shortcut, var(--text-muted));
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.app-theme-option {
  width: 100%;
  min-height: 50px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-interactive);
}

.app-theme-option:hover {
  background: var(--surface-hover);
  border-color: var(--interactive-hover-border);
}

.app-theme-option.active {
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.18));
}

.app-theme-option-swatch {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border: 1px solid var(--app-theme-swatch-border);
  border-radius: 50%;
  background: radial-gradient(circle at center, var(--app-theme-swatch-accent) 0 34%, transparent 36%), var(--app-theme-swatch-bg);
}

.app-theme-option-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.app-theme-option-name {
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-theme-option-description {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-theme-option-check {
  width: 16px;
  height: 16px;
  color: var(--text-interactive-active, var(--accent-primary));
}
</style>

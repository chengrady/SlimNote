<template>
  <div class="status-bar">
    <div class="status-left">
      <span v-if="activeTab && activeTab.filePath" class="status-item clickable status-path" @click="showInFolder" :title="t('statusBar.showInFolder')">
        <span class="status-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span class="status-path-text">{{ activeTab.filePath }}</span>
      </span>
      <span v-else class="status-item status-empty">
        <span class="status-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        <span class="status-path-text">{{ t('statusBar.noDocument') }}</span>
      </span>
    </div>
    <div class="status-right">
      <!-- Editor Properties -->
      <div class="status-group">
        <span class="status-item">
          {{ t('statusBar.line') }} {{ cursorPosition.line }}, {{ t('statusBar.column') }} {{ cursorPosition.column }}
        </span>
        <div class="status-item picker-container" ref="fontSizePickerContainer">
          <span class="clickable" @click="toggleFontSizePicker" :title="t('statusBar.fontSize')">
            {{ activeTab ? activeTab.fontSize : settingsStore.settings.fontSize }}px
          </span>
          <div v-if="showFontSizePicker" class="popup-menu font-size-popup">
            <div class="popup-header">{{ t('statusBar.fontSize') }}</div>
            <div class="popup-list">
              <div 
                v-for="size in fontSizes" 
                :key="size" 
                class="popup-option"
                :class="{ active: (activeTab ? activeTab.fontSize : settingsStore.settings.fontSize) === size }"
                @click="changeFontSize(size)"
              >
                {{ size }}px
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="status-separator"></div>

      <!-- File Properties -->
      <div class="status-group" v-if="activeTab">
        <span class="status-item status-compact-hide">
          {{ getFileSize() }}
        </span>
        <div class="status-item picker-container status-compact-hide" ref="fontFamilyPickerContainer">
          <span class="clickable" @click="toggleFontFamilyPicker" :title="t('statusBar.fontFamily')">
            {{ currentFontFamilyName }}
          </span>
          <div v-if="showFontFamilyPicker" class="popup-menu font-family-popup">
            <div class="popup-header">{{ t('statusBar.selectFont') }}</div>
            <div class="popup-list">
              <div 
                v-for="font in fontFamilies" 
                :key="font.value" 
                class="popup-option"
                :class="{ active: settingsStore.settings.fontFamily === font.value }"
                @click="changeFontFamily(font.value)"
                :style="getFontOptionStyle(font)"
              >
                {{ font.label }}
              </div>
            </div>
          </div>
        </div>
        <span class="status-item">
          {{ activeTab.encoding ? activeTab.encoding.toUpperCase() : 'UTF-8' }}
        </span>
        <div v-if="activeTab.language === 'sql'" class="status-item picker-container" ref="sqlDialectPickerContainer">
          <span class="clickable" @click="toggleSqlDialectPicker" :title="t('statusBar.sqlDialect')">
            {{ currentSqlDialectLabel }}
          </span>
          <div v-if="showSqlDialectPicker" class="popup-menu sql-dialect-popup">
            <div class="popup-header">{{ t('statusBar.sqlDialect') }}</div>
            <div class="popup-list">
              <div
                v-for="dialect in sqlDialects"
                :key="dialect.value"
                class="popup-option"
                :class="{ active: (activeTab.sqlDialect || 'mysql') === dialect.value }"
                @click="changeSqlDialect(dialect.value)"
              >
                {{ dialect.label }}
              </div>
            </div>
          </div>
        </div>
        <div class="status-item picker-container" ref="pickerContainer">
          <span class="clickable language-trigger" @click="toggleLanguagePicker">
            <FileIcon :filename="getLanguageIconFilename(activeTab.language)" :size="LANGUAGE_ICON_SIZE" class="language-option-icon" />
            <span>{{ getLanguageLabel(activeTab.language) }}</span>
          </span>
          <div v-if="showLanguagePicker" class="popup-menu language-popup">
            <div class="popup-header">{{ t('statusBar.selectLanguage') }}</div>
            <div class="popup-list">
              <div 
                v-for="lang in languages" 
                :key="lang.value" 
                class="popup-option"
                :class="{ active: activeTab.language === lang.value }"
                @click="changeLanguage(lang.value)"
              >
                <FileIcon :filename="lang.iconFilename" :size="LANGUAGE_ICON_SIZE" class="language-option-icon" />
                <span>{{ lang.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="status-group status-idle-group">
        <span class="status-item status-compact-hide">{{ t('statusBar.emptyWorkspace') }}</span>
        <span class="status-item">{{ t('statusBar.defaultFontSize', { size: settingsStore.settings.fontSize }) }}</span>
        <span class="status-item status-compact-hide">{{ t('statusBar.waitingForFile') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '../stores/editor'
import { useSettingsStore } from '../stores/settings'
import { FONT_FAMILIES, findFontFamilyOption, getFontOptionStyle } from '../utils/fontFamilies'
import FileIcon from './FileIcon.vue'

const { t, te } = useI18n()

const editorStore = useEditorStore()
const settingsStore = useSettingsStore()
const showLanguagePicker = ref(false)
const showFontSizePicker = ref(false)
const showFontFamilyPicker = ref(false)
const showSqlDialectPicker = ref(false)
const pickerContainer = ref(null)
const fontSizePickerContainer = ref(null)
const fontFamilyPickerContainer = ref(null)
const sqlDialectPickerContainer = ref(null)

const cursorPosition = computed(() => editorStore.cursorPosition)

const activeTab = computed(() => editorStore.getActiveTab())

const fontSizes = [8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 48, 72]
const LANGUAGE_ICON_SIZE = 21
const languageLabelSorter = new Intl.Collator('en', { sensitivity: 'base' })
const LANGUAGE_OPTIONS = [
  { label: 'C', value: 'c', iconFilename: 'source.c' },
  { label: 'C#', value: 'csharp', iconFilename: 'source.cs' },
  { label: 'C++', value: 'cpp', iconFilename: 'source.cpp' },
  { label: 'CSS', value: 'css', iconFilename: 'source.css' },
  { label: 'HTML', value: 'html', iconFilename: 'source.html' },
  { label: 'Java', value: 'java', iconFilename: 'source.java' },
  { label: 'JavaScript', value: 'javascript', iconFilename: 'source.js' },
  { label: 'JSON', value: 'json', iconFilename: 'data.json' },
  { label: 'Log', value: 'log', iconFilename: 'runtime.log' },
  { label: 'Markdown', value: 'markdown', iconFilename: 'document.md' },
  { label: 'Plain Text', value: 'plaintext', iconFilename: 'document.txt' },
  { label: 'Python', value: 'python', iconFilename: 'source.py' },
  { label: 'SCSS', value: 'scss', iconFilename: 'source.scss' },
  { label: 'SQL', value: 'sql', iconFilename: 'query.sql' },
  { label: 'TypeScript', value: 'typescript', iconFilename: 'source.ts' },
  { label: 'XML', value: 'xml', iconFilename: 'document.xml' }
].sort((left, right) => languageLabelSorter.compare(left.label, right.label))

const legacyFontFamilies = [
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: 'Consolas', value: 'Consolas' },
  { label: 'Courier New', value: '"Courier New"' },
  { label: 'Monaco', value: 'Monaco' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Times New Roman', value: '"Times New Roman"' },
  { label: 'Fira Code', value: '"Fira Code"' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono"' },
  { label: 'Source Code Pro', value: '"Source Code Pro"' }
]

const fontFamilies = FONT_FAMILIES

const sqlDialects = [
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'SQL Server', value: 'sqlserver' }
]

const currentFontFamilyName = computed(() => {
  const current = settingsStore.settings.fontFamily
  const found = findFontFamilyOption(current)
  return found ? found.label : current
})

const currentSqlDialectLabel = computed(() => {
  const current = activeTab.value?.sqlDialect || 'mysql'
  return sqlDialects.find(item => item.value === current)?.label || 'MySQL'
})

const languages = computed(() => LANGUAGE_OPTIONS)

function getLanguageOption(langValue) {
  return languages.value.find(language => language.value === langValue) || null
}

function getLanguageLabel(langValue) {
  const lang = getLanguageOption(langValue)
  if (lang) return lang.label
  const key = `languages.${langValue}`
  return te(key) ? t(key) : langValue
}

function getLanguageIconFilename(langValue) {
  return getLanguageOption(langValue)?.iconFilename || 'notes.txt'
}

function toggleLanguagePicker() {
  showLanguagePicker.value = !showLanguagePicker.value
  showFontSizePicker.value = false
  showFontFamilyPicker.value = false
  showSqlDialectPicker.value = false
}

function toggleFontSizePicker() {
  showFontSizePicker.value = !showFontSizePicker.value
  showLanguagePicker.value = false
  showFontFamilyPicker.value = false
  showSqlDialectPicker.value = false
}

function toggleFontFamilyPicker() {
  showFontFamilyPicker.value = !showFontFamilyPicker.value
  showLanguagePicker.value = false
  showFontSizePicker.value = false
  showSqlDialectPicker.value = false
}

function toggleSqlDialectPicker() {
  showSqlDialectPicker.value = !showSqlDialectPicker.value
  showLanguagePicker.value = false
  showFontSizePicker.value = false
  showFontFamilyPicker.value = false
}

function changeLanguage(newLang) {
  if (activeTab.value) {
    editorStore.updateTabLanguage(activeTab.value.id, newLang)
    showLanguagePicker.value = false
  }
}

function changeFontSize(size) {
  if (activeTab.value) {
    editorStore.updateTabFontSize(activeTab.value.id, size)
  } else {
    settingsStore.updateSettings({ fontSize: size })
  }
  showFontSizePicker.value = false
}

function changeFontFamily(font) {
  settingsStore.updateSettings({ fontFamily: font })
  showFontFamilyPicker.value = false
}

function changeSqlDialect(sqlDialect) {
  if (activeTab.value) {
    editorStore.updateTabSqlDialect(activeTab.value.id, sqlDialect)
    showSqlDialectPicker.value = false
  }
}

function handleClickOutside(event) {
  if (pickerContainer.value && !pickerContainer.value.contains(event.target)) {
    showLanguagePicker.value = false
  }
  if (fontSizePickerContainer.value && !fontSizePickerContainer.value.contains(event.target)) {
    showFontSizePicker.value = false
  }
  if (fontFamilyPickerContainer.value && !fontFamilyPickerContainer.value.contains(event.target)) {
    showFontFamilyPicker.value = false
  }
  if (sqlDialectPickerContainer.value && !sqlDialectPickerContainer.value.contains(event.target)) {
    showSqlDialectPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function getFileSize() {
  if (!activeTab.value) return '0 B'
  
  const bytes = new Blob([activeTab.value.content]).size
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

async function showInFolder() {
  if (activeTab.value?.filePath) {
    await window.electronAPI.showItemInFolder(activeTab.value.filePath)
  }
}
</script>

<style scoped>
.status-bar {
  --status-popup-item-min-height: 38px;
  --status-popup-item-padding-y: 8px;
  --status-popup-item-padding-x: 12px;
  --status-popup-max-height: min(50vh, calc(100vh - var(--statusbar-height) - 20px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: var(--statusbar-height);
  background: var(--bg-primary); /* Flat solid matching app background */
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  padding: 0 var(--space-4);
  user-select: none;
  width: 100%;
  z-index: 100;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.status-group {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.status-idle-group {
  color: var(--text-dim);
}

.status-separator {
  width: 1px;
  height: 14px;
  background-color: var(--glass-border);
  margin: 0 5px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: default;
  transition: var(--transition-fast);
  position: relative;
}

.status-empty {
  color: var(--text-dim);
}

.status-path {
  min-width: 0;
  max-width: min(38vw, 520px);
}

.status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-interactive-active, var(--accent-primary));
}

.status-path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-item.clickable:hover,
.status-item .clickable:hover {
  color: var(--text-interactive-active, var(--accent-primary));
  cursor: pointer;
  text-shadow: none;
}

.status-item.clickable:focus-visible,
.status-item .clickable:focus-visible {
  outline: none;
  color: var(--text-interactive-active, var(--accent-primary));
  box-shadow: var(--field-focus-ring);
  border-radius: var(--radius-sm);
}

.picker-container {
  position: relative;
}

.language-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.popup-menu {
  position: absolute;
  bottom: 100%;
  right: 0;
  width: 200px;
  max-height: var(--status-popup-max-height);
  background: color-mix(in srgb, var(--glass-bg) 92%, var(--bg-deep));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--menu-card-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin-bottom: 8px;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.font-size-popup {
  width: 100px;
}

.language-popup {
  width: max-content;
  min-width: 168px;
  max-width: min(220px, calc(100vw - 24px));
}

.sql-dialect-popup {
  width: 140px;
}

.popup-header {
  min-height: var(--status-popup-item-min-height);
  padding: var(--status-popup-item-padding-y) var(--status-popup-item-padding-x);
  display: flex;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold);
  border-bottom: 1px solid var(--glass-border);
  color: var(--text-main);
  background: color-mix(in srgb, var(--glass-bg) 88%, rgba(var(--accent-primary-rgb), 0.04));
}

.popup-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 4px;
}

.popup-option {
  min-height: var(--status-popup-item-min-height);
  padding: var(--status-popup-item-padding-y) var(--status-popup-item-padding-x);
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--text-interactive, var(--text-muted));
  transition: var(--transition-fast);
  line-height: 1.35;
}

.language-option-icon {
  flex-shrink: 0;
}

.popup-option:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
}

.popup-option.active {
  background: var(--interactive-selected-bg-strong, var(--interactive-selected-bg));
  box-shadow: inset 0 0 0 1px var(--interactive-selected-border-strong, var(--interactive-selected-border));
  color: var(--text-interactive-active, var(--accent-primary));
}

.popup-option:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring);
}

@media (max-width: 1180px) {
  .status-compact-hide {
    display: none;
  }

  .status-path {
    max-width: 28vw;
  }
}

@media (max-width: 860px) {
  .status-bar {
    padding: 0 var(--space-3);
  }

  .status-group,
  .status-right,
  .status-left {
    gap: var(--space-2);
  }

  .status-path {
    max-width: 24vw;
  }
}
</style>

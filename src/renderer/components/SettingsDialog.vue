<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper" @click.self="$emit('close')">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3>{{ t('settings.title') }}</h3>
              <p class="modal-subtitle">{{ t('settings.subtitle') }}</p>
            </div>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>

          <div class="modal-body">
            <div class="settings-sidebar">
              <div
                class="sidebar-item"
                :class="{ active: activeSection === 'appearance' }"
                @click="activeSection = 'appearance'"
              >
                <span class="sidebar-item-title">{{ t('settings.appearance') }}</span>
                <span class="sidebar-item-desc">{{ t('settings.appearanceDesc') }}</span>
              </div>
              <div
                class="sidebar-item"
                :class="{ active: activeSection === 'editor' }"
                @click="activeSection = 'editor'"
              >
                <span class="sidebar-item-title">{{ t('settings.editor') }}</span>
                <span class="sidebar-item-desc">{{ t('settings.editorDesc') }}</span>
              </div>
            </div>

            <div class="settings-content">
              <!-- Appearance Settings -->
              <div v-if="activeSection === 'appearance'" class="settings-section">
                <div class="section-header">
                  <h4>{{ t('settings.appearance') }}</h4>
                  <p>{{ t('settings.appearanceSection') }}</p>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.language') }}</label>
                  <select v-model="localSettings.locale" @change="handleLocaleChange">
                    <option v-for="loc in supportedLocales" :key="loc.value" :value="loc.value">
                      {{ loc.label }}
                    </option>
                  </select>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.theme') }}</label>
                  <div class="theme-preview-grid">
                    <button
                      class="theme-preview"
                      :class="{ active: localSettings.theme === 'light' }"
                      @click="localSettings.theme = 'light'"
                      type="button"
                    >
                      <span class="theme-preview-canvas light"></span>
                      <span class="theme-preview-label">{{ t('settings.light') }}</span>
                    </button>
                    <button
                      class="theme-preview"
                      :class="{ active: localSettings.theme === 'dark' }"
                      @click="localSettings.theme = 'dark'"
                      type="button"
                    >
                      <span class="theme-preview-canvas dark"></span>
                      <span class="theme-preview-label">{{ t('settings.dark') }}</span>
                    </button>
                  </div>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.fontSize', { size: localSettings.fontSize }) }}</label>
                  <input type="range" v-model.number="localSettings.fontSize" min="8" max="32" step="1">
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.fontFamily') }}</label>
                  <select v-model="localSettings.fontFamily">
                    <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
                      {{ font.label }}
                    </option>
                  </select>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.livePreview') }}</label>
                  <div class="live-preview" :class="localSettings.theme" :style="previewStyle">
                    <div class="live-preview-toolbar"></div>
                    <div class="live-preview-content">
                      <div class="live-preview-title">{{ t('settings.previewTitle') }}</div>
                      <div class="live-preview-text">{{ t('settings.previewSample') }}</div>
                      <div class="live-preview-line">- {{ t('settings.previewFont', { font: currentPreviewFont }) }}</div>
                      <div class="live-preview-line">- {{ t('settings.previewSize', { size: localSettings.fontSize }) }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Editor Settings -->
              <div v-if="activeSection === 'editor'" class="settings-section">
                <div class="section-header">
                  <h4>{{ t('settings.editor') }}</h4>
                  <p>{{ t('settings.editorDesc') }}</p>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.tabDensity') }}</label>
                  <select v-model="localSettings.tabDensity">
                    <option value="comfortable">{{ t('settings.comfortable') }}</option>
                    <option value="compact">{{ t('settings.compact') }}</option>
                  </select>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.wordWrap">
                    {{ t('settings.wordWrap') }}
                  </label>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.lineNumbers">
                    {{ t('settings.lineNumbers') }}
                  </label>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.minimap">
                    {{ t('settings.minimap') }}
                  </label>
                </div>
                <div class="setting-item card-like">
                  <label>{{ t('settings.tabSize') }}</label>
                  <select v-model.number="localSettings.tabSize">
                    <option value="2">{{ t('settings.spaces', { count: 2 }) }}</option>
                    <option value="4">{{ t('settings.spaces', { count: 4 }) }}</option>
                    <option value="8">{{ t('settings.spaces', { count: 8 }) }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-btn" @click="handleReset">{{ t('settings.restoreDefaults') }}</button>
            <button class="modal-btn primary" @click="$emit('close')">{{ t('settings.closeSettings') }}</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { setLocale, getSupportedLocales } from '../locales'

const { t } = useI18n()
const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])
const settingsStore = useSettingsStore()
const activeSection = ref('appearance')
const supportedLocales = getSupportedLocales()

const localSettings = ref({})
const previewStyle = computed(() => ({
  fontFamily: localSettings.value.fontFamily || 'Microsoft YaHei',
  fontSize: `${Math.max(12, (localSettings.value.fontSize || 14) - 1)}px`
}))
const currentPreviewFont = computed(() => {
  const current = fontFamilies.find(font => font.value === localSettings.value.fontFamily)
  return current?.label || localSettings.value.fontFamily || '默认字体'
})

const fontFamilies = [
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

watch(() => props.show, (newVal) => {
  if (newVal) {
    // Clone settings to local state
    localSettings.value = {
      ...settingsStore.settings,
      theme: settingsStore.settings.theme || 'light'
    }
  }
})

watch(() => localSettings.value.theme, (theme) => {
  if (props.show && theme) {
    settingsStore.updateSettings({ theme })
  }
})

watch(
  () => [localSettings.value.fontSize, localSettings.value.fontFamily, localSettings.value.tabDensity],
  ([fontSize, fontFamily, tabDensity]) => {
    if (props.show) {
      settingsStore.updateSettings({ fontSize, fontFamily, tabDensity })
    }
  }
)

watch(
  () => [
    localSettings.value.wordWrap,
    localSettings.value.lineNumbers,
    localSettings.value.minimap,
    localSettings.value.tabSize
  ],
  ([wordWrap, lineNumbers, minimap, tabSize]) => {
    if (props.show) {
      settingsStore.updateSettings({ wordWrap, lineNumbers, minimap, tabSize })
    }
  }
)

function handleReset() {
  settingsStore.resetSettings()
  localSettings.value = {
    ...settingsStore.settings,
    theme: settingsStore.settings.theme || 'light'
  }
}

function handleLocaleChange() {
  const newLocale = localSettings.value.locale
  if (newLocale) {
    settingsStore.updateLocale(newLocale)
  }
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(6px);
}

.modal-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-container {
  width: min(760px, calc(100vw - 40px));
  height: min(560px, calc(100vh - 48px));
  background: var(--glass-bg-active);
  border-radius: var(--radius-md);
  box-shadow: var(--menu-card-shadow);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--glass-border);
  color: var(--text-main);
}

.modal-header {
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: var(--panel-title-gap);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: var(--ui-font-weight-semibold);
}

.modal-subtitle {
  margin: 0;
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.close-btn {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  background: rgba(var(--accent-primary-rgb), 0.05);
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  font-size: 20px;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.close-btn:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.close-btn:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-sidebar {
  width: 180px;
  background: color-mix(in srgb, var(--btn-bg) 94%, rgba(var(--accent-primary-rgb), 0.04));
  border-right: 1px solid var(--glass-border);
  padding: var(--space-2);
}

.sidebar-item {
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  font-size: var(--field-font-size);
  color: var(--text-muted);
  transition: var(--transition-fast);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: var(--panel-title-gap);
  border: 1px solid transparent;
}

.sidebar-item:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  box-shadow: var(--interactive-hover-ring);
}

.sidebar-item.active {
  background: var(--interactive-selected-bg);
  color: var(--accent-primary);
  border-color: var(--interactive-selected-border);
  box-shadow: inset 2px 0 0 var(--accent-primary);
}

.sidebar-item:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.sidebar-item-title {
  font-weight: var(--ui-font-weight-semibold);
  line-height: var(--panel-title-line-height);
}

.sidebar-item-desc {
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.settings-content {
  flex: 1;
  padding: var(--space-5);
  overflow-y: auto;
  background: color-mix(in srgb, var(--glass-bg) 96%, transparent);
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.section-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: var(--ui-font-weight-semibold);
}

.section-header p {
  margin: 6px 0 0;
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.card-like {
  padding: var(--space-4);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.03));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.theme-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.theme-preview {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: transparent;
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.theme-preview:hover,
.theme-preview.active {
  border-color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.05);
  box-shadow: var(--interactive-hover-ring);
}

.theme-preview:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.theme-preview-canvas {
  display: block;
  width: 100%;
  height: 72px;
  border-radius: calc(var(--radius-sm) + 2px);
  border: 1px solid var(--glass-border);
  position: relative;
  overflow: hidden;
}

.theme-preview-canvas::before,
.theme-preview-canvas::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  border-radius: 999px;
}

.theme-preview-canvas::before {
  top: 14px;
  height: 10px;
  background: rgba(var(--accent-primary-rgb), 0.6);
}

.theme-preview-canvas::after {
  top: 34px;
  height: 26px;
  background: rgba(255, 255, 255, 0.75);
}

.theme-preview-canvas.light {
  background: linear-gradient(180deg, #fbfbfb 0%, #eeeeee 100%);
}

.theme-preview-canvas.dark {
  background: linear-gradient(180deg, #242424 0%, #1b1b1b 100%);
  border-color: #3b3b3b;
}

.theme-preview-canvas.dark::after {
  background: rgba(255, 255, 255, 0.1);
}

.theme-preview-label {
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold);
  line-height: var(--panel-title-line-height);
  color: var(--text-main);
  text-align: left;
}

.live-preview {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--glass-border);
}

.live-preview.light {
  background: #ffffff;
  color: #1e1e1e;
}

.live-preview.dark {
  background: #1f1f1f;
  color: #d4d4d4;
  border-color: #3b3b3b;
}

.live-preview-toolbar {
  height: 30px;
  background: rgba(var(--accent-primary-rgb), 0.14);
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.18);
}

.live-preview-content {
  padding: 16px;
  display: grid;
  gap: 8px;
}

.live-preview-title {
  font-weight: 700;
}

.live-preview-text {
  font-family: var(--font-family-mono);
  opacity: 0.92;
}

.live-preview-line {
  opacity: 0.76;
}

.setting-item label {
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-main);
}

.setting-item.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.setting-desc {
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
  margin: 0;
}

.path-input-group {
  display: flex;
  gap: 10px;
}

input[type="text"],
select {
  height: var(--field-height-md);
  padding: 0 var(--field-padding-x);
  border: 1px solid var(--glass-border);
  border-radius: var(--field-radius);
  background: var(--input-bg);
  color: var(--text-main);
  font-size: var(--field-font-size);
  width: 100%;
  transition: var(--transition-fast);
}

input[type="text"]:focus,
select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.path-input-group input {
  flex: 1;
}

.path-input-group button {
  height: var(--field-height-md);
  padding: 0 15px;
  background: var(--btn-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--field-radius);
  color: var(--text-main);
  cursor: pointer;
  transition: var(--transition-fast);
}

.path-input-group button:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.path-input-group button:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.modal-footer {
  padding: var(--modal-footer-padding-y) var(--modal-footer-padding-x);
  border-top: 1px solid var(--glass-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--modal-footer-gap);
}

.modal-btn {
  min-height: var(--btn-height-md);
  padding: 0 var(--btn-padding-x);
  border-radius: var(--field-radius);
  border: 1px solid var(--glass-border);
  background: var(--btn-bg);
  color: var(--text-main);
  cursor: pointer;
  font-size: var(--field-font-size);
  font-weight: var(--btn-font-weight);
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.modal-btn:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.modal-btn:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.modal-btn.primary {
  background: var(--accent-gradient);
  color: white;
  border-color: transparent;
  box-shadow: var(--btn-primary-shadow);
}

.modal-btn.primary:hover {
  opacity: 0.9;
}

@media (max-width: 820px) {
  .modal-body {
    flex-direction: column;
  }

  .settings-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }

  .theme-preview-grid {
    grid-template-columns: 1fr;
  }
}

</style>

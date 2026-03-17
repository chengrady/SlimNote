<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper" @click.self="$emit('close')">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-group">
              <h3>设置</h3>
              <p class="modal-subtitle">外观与编辑器选项会实时生效</p>
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
                <span class="sidebar-item-title">外观</span>
                <span class="sidebar-item-desc">主题、字体与基础显示</span>
              </div>
              <div 
                class="sidebar-item" 
                :class="{ active: activeSection === 'editor' }"
                @click="activeSection = 'editor'"
              >
                <span class="sidebar-item-title">编辑器</span>
                <span class="sidebar-item-desc">行号、缩略图与缩进</span>
              </div>
            </div>
            
            <div class="settings-content">
              <!-- Appearance Settings -->
              <div v-if="activeSection === 'appearance'" class="settings-section">
                <div class="section-header">
                  <h4>外观</h4>
                  <p>调整主题、字体与阅读密度。</p>
                </div>
                <div class="setting-item card-like">
                  <label>主题</label>
                  <div class="theme-preview-grid">
                    <button
                      class="theme-preview"
                      :class="{ active: localSettings.theme === 'light' }"
                      @click="localSettings.theme = 'light'"
                      type="button"
                    >
                      <span class="theme-preview-canvas light"></span>
                      <span class="theme-preview-label">浅色</span>
                    </button>
                    <button
                      class="theme-preview"
                      :class="{ active: localSettings.theme === 'dark' }"
                      @click="localSettings.theme = 'dark'"
                      type="button"
                    >
                      <span class="theme-preview-canvas dark"></span>
                      <span class="theme-preview-label">深色</span>
                    </button>
                  </div>
                </div>
                <div class="setting-item card-like">
                  <label>字体大小 ({{ localSettings.fontSize }}px)</label>
                  <input type="range" v-model.number="localSettings.fontSize" min="8" max="32" step="1">
                </div>
                <div class="setting-item card-like">
                  <label>字体</label>
                  <select v-model="localSettings.fontFamily">
                    <option v-for="font in fontFamilies" :key="font.value" :value="font.value">
                      {{ font.label }}
                    </option>
                  </select>
                </div>
                <div class="setting-item card-like">
                  <label>即时预览</label>
                  <div class="live-preview" :class="localSettings.theme" :style="previewStyle">
                    <div class="live-preview-toolbar"></div>
                    <div class="live-preview-content">
                      <div class="live-preview-title"># SlimNote Preview</div>
                      <div class="live-preview-text">const note = '界面调优进行中';</div>
                      <div class="live-preview-line">- 字体：{{ currentPreviewFont }}</div>
                      <div class="live-preview-line">- 大小：{{ localSettings.fontSize }}px</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Editor Settings -->
              <div v-if="activeSection === 'editor'" class="settings-section">
                <div class="section-header">
                  <h4>编辑器</h4>
                  <p>控制编码体验和代码视图辅助信息。</p>
                </div>
                <div class="setting-item card-like">
                  <label>标签栏密度</label>
                  <select v-model="localSettings.tabDensity">
                    <option value="comfortable">舒适</option>
                    <option value="compact">紧凑</option>
                  </select>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.wordWrap">
                    自动换行
                  </label>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.lineNumbers">
                    显示行号
                  </label>
                </div>
                <div class="setting-item checkbox card-like">
                  <label>
                    <input type="checkbox" v-model="localSettings.minimap">
                    显示缩略图 (Minimap)
                  </label>
                </div>
                <div class="setting-item card-like">
                  <label>Tab 缩进大小</label>
                  <select v-model.number="localSettings.tabSize">
                    <option value="2">2 个空格</option>
                    <option value="4">4 个空格</option>
                    <option value="8">8 个空格</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-btn" @click="handleReset">恢复默认</button>
            <button class="modal-btn primary" @click="$emit('close')">关闭设置</button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useSettingsStore } from '../stores/settings'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['close'])
const settingsStore = useSettingsStore()
const activeSection = ref('appearance')

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

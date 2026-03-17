<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="converter-modal">
      <div class="modal-header">
        <h3>{{ t('jsonConverter.title') }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="format-selector">
          <div class="format-group">
            <label>{{ t('jsonConverter.sourceFormat') }}</label>
            <select v-model="fromFormat">
              <option v-for="format in formatOptions" :key="`from-${format.value}`" :value="format.value">{{ format.label }}</option>
            </select>
          </div>

          <button class="swap-btn" @click="swapFormats" :title="t('jsonConverter.swap')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
            </svg>
          </button>

          <div class="format-group">
            <label>{{ t('jsonConverter.targetFormat') }}</label>
            <select v-model="toFormat">
              <option v-for="format in formatOptions" :key="`to-${format.value}`" :value="format.value">{{ format.label }}</option>
            </select>
          </div>
        </div>

        <div class="editor-row">
          <div class="editor-pane">
            <div class="pane-header">
              <span>{{ formatNames[fromFormat] }}</span>
              <button @click="formatInput" :title="t('jsonConverter.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea v-model="inputContent" :placeholder="t('jsonConverter.inputPlaceholder')"></textarea>
          </div>

          <div class="editor-pane">
            <div class="pane-header">
              <span>{{ formatNames[toFormat] }}</span>
              <button @click="copyOutput" :title="t('jsonConverter.copy')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
            <textarea v-model="outputContent" readonly :class="{ 'has-error': error }"></textarea>
          </div>
        </div>

        <div class="error-message" v-if="error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">{{ t('jsonConverter.close') }}</button>
        <button class="btn btn-primary" @click="doConvert">{{ t('jsonConverter.convert') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { convert, formats } from '../utils/jsonConverter'

const { t } = useI18n()

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'apply'])

const fromFormat = ref('json')
const toFormat = ref('yaml')
const inputContent = ref('')
const outputContent = ref('')
const error = ref('')

const formatOptions = computed(() => Object.entries(formats).map(([value, format]) => ({
  value,
  label: format.name
})))

const formatNames = computed(() => Object.fromEntries(
  Object.entries(formats).map(([value, format]) => [value, format.name])
))

// 初始化输入内容
watch(() => props.content, (newContent) => {
  inputContent.value = newContent
}, { immediate: true })

// 交换格式
function swapFormats() {
  const temp = fromFormat.value
  fromFormat.value = toFormat.value
  toFormat.value = temp
  // 同时交换内容
  const tempContent = inputContent.value
  inputContent.value = outputContent.value
  outputContent.value = tempContent
}

// 执行转换
function doConvert() {
  error.value = ''
  try {
    outputContent.value = convert(inputContent.value, fromFormat.value, toFormat.value)
  } catch (e) {
    error.value = e.message
    outputContent.value = ''
  }
}

// 格式化输入
function formatInput() {
  if (fromFormat.value === 'json') {
    try {
      const parsed = JSON.parse(inputContent.value)
      inputContent.value = JSON.stringify(parsed, null, 2)
    } catch (e) {
      error.value = e.message
    }
  }
}

// 复制输出
async function copyOutput() {
  try {
    await navigator.clipboard.writeText(outputContent.value)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

// 自动转换
watch([inputContent, fromFormat, toFormat], () => {
  if (inputContent.value.trim()) {
    doConvert()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(var(--backdrop-blur, 8px));
}

.converter-modal {
  background: var(--bg-primary, #1e1e1e);
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  width: 90%;
  max-width: 900px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-main, #d4d4d4);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--btn-hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-main, #d4d4d4);
}

.modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  gap: 16px;
  overflow: hidden;
}

.format-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.format-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.format-group label {
  font-size: 11px;
  color: var(--text-muted, #888);
}

.format-group select {
  padding: 6px 12px;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary, #252526);
  color: var(--text-main, #d4d4d4);
  font-size: 13px;
  min-width: 100px;
}

.swap-btn {
  background: transparent;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 18px;
}

.swap-btn:hover {
  background: var(--btn-hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-main, #d4d4d4);
}

.editor-row {
  flex: 1;
  display: flex;
  gap: 16px;
  min-height: 0;
}

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.pane-header button {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pane-header button:hover {
  background: var(--btn-hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-main, #d4d4d4);
}

.editor-pane textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary, #252526);
  color: var(--text-main, #d4d4d4);
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', monospace);
  font-size: 13px;
  padding: 12px;
  line-height: 1.5;
}

.editor-pane textarea:focus {
  outline: none;
  border-color: var(--accent-primary, #007acc);
}

.editor-pane textarea.has-error {
  border-color: #f44336;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: var(--radius-sm, 6px);
  color: #f44336;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--modal-footer-gap, 8px);
  padding: var(--modal-footer-padding-y, 16px) var(--modal-footer-padding-x, 20px);
  border-top: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm, 6px);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition-fast, 0.16s ease);
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  color: var(--text-main, #d4d4d4);
}

.btn-secondary:hover {
  background: var(--btn-hover-bg, rgba(255, 255, 255, 0.1));
}

.btn-primary {
  background: var(--accent-primary, #007acc);
  border: 1px solid var(--accent-primary, #007acc);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-primary-hover, #005a9e);
}
</style>

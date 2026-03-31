<template>
  <ModalDialog
    :show="true"
    :title="t('jsonConverter.title')"
    width="min(900px, calc(100vw - 40px))"
    max-width="min(900px, calc(100vw - 40px))"
    height="min(80vh, calc(100vh - 48px))"
    max-height="min(80vh, calc(100vh - 48px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="converter-layout">
        <div class="format-selector card-like">
          <div class="format-group">
            <label class="field-label">{{ t('jsonConverter.sourceFormat') }}</label>
            <select class="ui-select" v-model="fromFormat">
              <option v-for="format in formatOptions" :key="`from-${format.value}`" :value="format.value">{{ format.label }}</option>
            </select>
          </div>

          <button type="button" class="swap-btn ui-icon-btn" @click="swapFormats" :title="t('jsonConverter.swap')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
            </svg>
          </button>

          <div class="format-group">
            <label class="field-label">{{ t('jsonConverter.targetFormat') }}</label>
            <select class="ui-select" v-model="toFormat">
              <option v-for="format in formatOptions" :key="`to-${format.value}`" :value="format.value">{{ format.label }}</option>
            </select>
          </div>
        </div>

        <div class="editor-row">
          <div class="editor-pane ui-pane">
            <div class="pane-header ui-pane-header">
              <span>{{ formatNames[fromFormat] }}</span>
              <button type="button" class="ui-icon-btn ui-icon-btn--sm" @click="formatInput" :title="t('jsonConverter.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea class="ui-textarea" v-model="inputContent" :placeholder="t('jsonConverter.inputPlaceholder')"></textarea>
          </div>

          <div class="editor-pane ui-pane">
            <div class="pane-header ui-pane-header">
              <span>{{ formatNames[toFormat] }}</span>
              <button type="button" class="ui-icon-btn ui-icon-btn--sm" @click="copyOutput" :title="t('jsonConverter.copy')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
            <textarea class="ui-textarea" v-model="outputContent" readonly :class="{ 'has-error': error }"></textarea>
          </div>
        </div>

        <div class="error-message ui-card ui-card--compact" v-if="error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ error }}
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="modal-btn" @click="$emit('close')">{{ t('jsonConverter.close') }}</button>
      <button type="button" class="modal-btn primary" @click="doConvert">{{ t('jsonConverter.convert') }}</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { convert, formats } from '../utils/jsonConverter'
import ModalDialog from './ModalDialog.vue'

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
.converter-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-4);
  overflow: hidden;
}

.format-selector {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: var(--space-3);
}

.format-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.swap-btn {
  align-self: end;
}

.editor-row {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  min-height: 0;
}

.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-pane .ui-textarea {
  flex: 1;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.editor-pane .ui-textarea:focus {
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.18);
}

.editor-pane .ui-textarea.has-error {
  border-color: #f44336;
  box-shadow: inset 0 0 0 1px rgba(244, 67, 54, 0.28);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  color: #f44336;
  font-size: 13px;
}

@media (max-width: 900px) {
  .format-selector,
  .editor-row {
    grid-template-columns: 1fr;
  }

  .swap-btn {
    justify-self: start;
  }
}
</style>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="codegen-modal">
      <div class="modal-header">
        <h3>代码生成</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="options-row">
          <div class="option-group">
            <label>目标语言</label>
            <select v-model="selectedLanguage">
              <option v-for="lang in languages" :key="lang.id" :value="lang.id">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="option-group">
            <label>类型名称</label>
            <input v-model="typeName" type="text" placeholder="Root" />
          </div>
        </div>

        <div class="code-output">
          <div class="output-header">
            <span>{{ currentLanguage?.name }} {{ currentLanguage?.extension }}</span>
            <div class="output-actions">
              <button @click="copyCode" title="复制代码">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                复制
              </button>
            </div>
          </div>
          <pre class="code-content" :class="{ 'has-error': error }"><code>{{ error || generatedCode }}</code></pre>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { languages, generateCode } from '../utils/codeGenerator'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const selectedLanguage = ref('typescript')
const typeName = ref('Root')
const generatedCode = ref('')
const error = ref('')

const currentLanguage = computed(() => {
  return languages.find(l => l.id === selectedLanguage.value)
})

function generate() {
  error.value = ''
  if (!props.content.trim()) {
    generatedCode.value = ''
    return
  }

  try {
    generatedCode.value = generateCode(props.content, selectedLanguage.value, typeName.value || 'Root')
  } catch (e) {
    error.value = e.message
    generatedCode.value = ''
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(generatedCode.value)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

// 自动生成
watch([() => props.content, selectedLanguage, typeName], () => {
  generate()
}, { immediate: true })
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

.codegen-modal {
  background: var(--bg-primary, #1e1e1e);
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  width: 90%;
  max-width: 700px;
  height: 70vh;
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

.options-row {
  display: flex;
  gap: 16px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-group label {
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-medium);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted, #888);
}

.option-group select,
.option-group input {
  height: var(--field-height-md, 34px);
  padding: 0 var(--field-padding-x, 12px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--field-radius, 6px);
  background: var(--bg-secondary, #252526);
  color: var(--text-main, #d4d4d4);
  font-size: var(--field-font-size, 13px);
  transition: var(--transition-fast, 0.16s ease);
}

.option-group select:focus,
.option-group input:focus {
  outline: none;
  border-color: var(--accent-primary, #007acc);
  box-shadow: var(--field-focus-ring, 0 0 0 1px rgba(0, 122, 204, 0.14));
}

.option-group select {
  min-width: 150px;
}

.option-group input {
  width: 150px;
}

.code-output {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted, #888);
}

.output-actions {
  display: flex;
  gap: 8px;
}

.output-actions button {
  background: transparent;
  border: none;
  color: var(--text-muted, #888);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 6px);
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.output-actions button:hover {
  background: var(--btn-hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-main, #d4d4d4);
}

.code-content {
  flex: 1;
  margin: 0;
  padding: 16px;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary, #252526);
  overflow: auto;
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', monospace);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-main, #d4d4d4);
  white-space: pre-wrap;
  word-break: break-word;
}

.code-content.has-error {
  color: #f44336;
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
</style>

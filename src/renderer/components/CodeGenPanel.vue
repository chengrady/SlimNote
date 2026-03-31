<template>
  <ModalDialog
    :show="true"
    :title="t('codegen.title')"
    width="min(700px, calc(100vw - 40px))"
    max-width="min(700px, calc(100vw - 40px))"
    height="min(70vh, calc(100vh - 48px))"
    max-height="min(70vh, calc(100vh - 48px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="codegen-layout">
        <div class="options-row">
          <div class="option-group card-like">
            <label class="field-label">{{ t('codegen.targetLanguage') }}</label>
            <select class="ui-select" v-model="selectedLanguage">
              <option v-for="lang in languages" :key="lang.id" :value="lang.id">
                {{ lang.name }}
              </option>
            </select>
          </div>
          <div class="option-group card-like">
            <label class="field-label">{{ t('codegen.typeName') }}</label>
            <input class="ui-field" v-model="typeName" type="text" :placeholder="t('codegen.typeNamePlaceholder')" />
          </div>
        </div>

        <div class="code-output ui-pane">
          <div class="output-header ui-pane-header">
            <span>{{ currentLanguage?.name }} {{ currentLanguage?.extension }}</span>
            <div class="output-actions">
              <button type="button" class="btn output-action-btn" @click="copyCode" :title="t('codegen.copyCode')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {{ t('codegen.copy') }}
              </button>
            </div>
          </div>
          <pre class="code-content" :class="{ 'has-error': error }"><code>{{ error || generatedCode }}</code></pre>
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="modal-btn" @click="$emit('close')">{{ t('codegen.close') }}</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { languages, generateCode } from '../utils/codeGenerator'
import ModalDialog from './ModalDialog.vue'

const { t } = useI18n()

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
.codegen-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-4);
  overflow: hidden;
}

.options-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.code-output {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.output-actions {
  display: flex;
  gap: 8px;
}

.output-action-btn {
  min-width: 92px;
}

.code-content {
  flex: 1;
  margin: 0;
  padding: var(--space-4);
  border: none;
  background: transparent;
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

@media (max-width: 760px) {
  .options-row {
    grid-template-columns: 1fr;
  }
}
</style>

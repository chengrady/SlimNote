<template>
  <ModalDialog
    :show="true"
    :title="t('jsonDiff.title')"
    width="min(1100px, calc(100vw - 40px))"
    max-width="min(1100px, calc(100vw - 40px))"
    height="min(85vh, calc(100vh - 48px))"
    max-height="min(85vh, calc(100vh - 48px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="diff-layout">
        <div class="editor-row">
          <div class="editor-pane ui-pane">
            <div class="pane-header ui-pane-header">
              <span>{{ t('jsonDiff.source') }}</span>
              <button type="button" class="ui-icon-btn ui-icon-btn--sm" @click="formatLeft" :title="t('jsonDiff.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea class="ui-textarea" v-model="leftContent" :placeholder="t('jsonDiff.inputSourcePlaceholder')"></textarea>
          </div>

          <div class="editor-pane ui-pane">
            <div class="pane-header ui-pane-header">
              <span>{{ t('jsonDiff.target') }}</span>
              <button type="button" class="ui-icon-btn ui-icon-btn--sm" @click="formatRight" :title="t('jsonDiff.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea class="ui-textarea" v-model="rightContent" :placeholder="t('jsonDiff.inputTargetPlaceholder')"></textarea>
          </div>
        </div>

        <div class="stats-bar card-like ui-card--compact" v-if="diffStats">
          <span class="stat added" :title="t('jsonDiff.addedLines')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ diffStats.added }} {{ t('jsonDiff.added') }}
          </span>
          <span class="stat removed" :title="t('jsonDiff.removedLines')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {{ diffStats.removed }} {{ t('jsonDiff.removed') }}
          </span>
          <span class="stat modified" :title="t('jsonDiff.modifiedLines')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {{ diffStats.modified }} {{ t('jsonDiff.modified') }}
          </span>
        </div>

        <div class="diff-output ui-pane" v-if="diffResult">
          <div class="output-header ui-pane-header">
            <span>{{ t('jsonDiff.result') }}</span>
            <div class="output-actions">
              <button type="button" class="btn output-action-btn" @click="swapContents" :title="t('jsonDiff.swap')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
                </svg>
                {{ t('jsonDiff.swapShort') }}
              </button>
            </div>
          </div>
          <div class="diff-content">
            <div
              v-for="(line, index) in diffLines"
              :key="index"
              class="diff-line"
              :class="line.type"
            >
              <span class="line-num">{{ line.num || '' }}</span>
              <span class="line-sign">{{ line.sign }}</span>
              <span class="line-content">{{ line.content }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="modal-btn" @click="$emit('close')">{{ t('jsonDiff.close') }}</button>
      <button type="button" class="modal-btn primary" @click="doDiff">{{ t('jsonDiff.compare') }}</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalDialog from './ModalDialog.vue'

const { t } = useI18n()

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

const leftContent = ref('')
const rightContent = ref('')
const diffResult = ref(null)
const diffStats = ref(null)
const diffLines = ref([])

// 初始化
watch(() => props.content, (newContent) => {
  leftContent.value = newContent
  rightContent.value = ''
}, { immediate: true })

// 格式化
function formatLeft() {
  try {
    const parsed = JSON.parse(leftContent.value)
    leftContent.value = JSON.stringify(parsed, null, 2)
  } catch (e) {
    console.error('Invalid JSON:', e)
  }
}

function formatRight() {
  try {
    const parsed = JSON.parse(rightContent.value)
    rightContent.value = JSON.stringify(parsed, null, 2)
  } catch (e) {
    console.error('Invalid JSON:', e)
  }
}

// 交换内容
function swapContents() {
  const temp = leftContent.value
  leftContent.value = rightContent.value
  rightContent.value = temp
  doDiff()
}

// 执行对比
function doDiff() {
  if (!leftContent.value.trim() || !rightContent.value.trim()) {
    diffResult.value = null
    diffStats.value = null
    diffLines.value = []
    return
  }

  try {
    const leftLines = leftContent.value.split('\n')
    const rightLines = rightContent.value.split('\n')

    // 简单的行级 diff 算法
    const result = []
    let added = 0
    let removed = 0
    let modified = 0

    const maxLen = Math.max(leftLines.length, rightLines.length)

    for (let i = 0; i < maxLen; i++) {
      const leftLine = leftLines[i]
      const rightLine = rightLines[i]

      if (leftLine === undefined) {
        result.push({ type: 'added', num: i + 1, sign: '+', content: rightLine })
        added++
      } else if (rightLine === undefined) {
        result.push({ type: 'removed', num: i + 1, sign: '-', content: leftLine })
        removed++
      } else if (leftLine === rightLine) {
        result.push({ type: 'unchanged', num: i + 1, sign: ' ', content: leftLine })
      } else {
        result.push({ type: 'removed', num: i + 1, sign: '-', content: leftLine })
        result.push({ type: 'added', num: i + 1, sign: '+', content: rightLine })
        modified++
      }
    }

    diffLines.value = result
    diffStats.value = { added, removed, modified }
    diffResult.value = true
  } catch (e) {
    console.error('Diff error:', e)
  }
}

// 自动对比
watch([leftContent, rightContent], () => {
  if (leftContent.value.trim() && rightContent.value.trim()) {
    doDiff()
  }
})
</script>

<style scoped>
.diff-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: var(--space-4);
  overflow: hidden;
}

.editor-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
  height: 200px;
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

.stats-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
}

.stat.added {
  color: #4caf50;
}

.stat.removed {
  color: #f44336;
}

.stat.modified {
  color: #ff9800;
}

.diff-output {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.output-action-btn {
  min-width: 88px;
}

.diff-content {
  flex: 1;
  overflow: auto;
  background: transparent;
  font-family: var(--font-family-mono, 'Consolas', 'Monaco', monospace);
  font-size: 13px;
  line-height: 1.4;
}

.diff-line {
  display: flex;
  padding: 0 8px;
  min-height: 20px;
}

.diff-line.unchanged {
  color: var(--text-main, #d4d4d4);
}

.diff-line.added {
  background: rgba(76, 175, 80, 0.15);
  color: #4caf50;
}

.diff-line.removed {
  background: rgba(244, 67, 54, 0.15);
  color: #f44336;
}

.line-num {
  width: 40px;
  text-align: right;
  color: var(--text-muted, #888);
  user-select: none;
  padding-right: 8px;
}

.line-sign {
  width: 16px;
  text-align: center;
  font-weight: bold;
}

.line-content {
  flex: 1;
  white-space: pre;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .editor-row {
    grid-template-columns: 1fr;
    height: auto;
  }

  .editor-pane {
    min-height: 200px;
  }
}
</style>

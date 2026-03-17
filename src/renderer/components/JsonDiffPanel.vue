<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="diff-modal">
      <div class="modal-header">
        <h3>{{ t('jsonDiff.title') }}</h3>
        <button class="close-btn" @click="$emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="editor-row">
          <div class="editor-pane">
            <div class="pane-header">
              <span>{{ t('jsonDiff.source') }}</span>
              <button @click="formatLeft" :title="t('jsonDiff.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea v-model="leftContent" :placeholder="t('jsonDiff.inputSourcePlaceholder')"></textarea>
          </div>

          <div class="editor-pane">
            <div class="pane-header">
              <span>{{ t('jsonDiff.target') }}</span>
              <button @click="formatRight" :title="t('jsonDiff.format')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                </svg>
              </button>
            </div>
            <textarea v-model="rightContent" :placeholder="t('jsonDiff.inputTargetPlaceholder')"></textarea>
          </div>
        </div>

        <div class="stats-bar" v-if="diffStats">
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

        <div class="diff-output" v-if="diffResult">
          <div class="output-header">
            <span>{{ t('jsonDiff.result') }}</span>
            <div class="output-actions">
              <button @click="swapContents" :title="t('jsonDiff.swap')">
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

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">{{ t('jsonDiff.close') }}</button>
        <button class="btn btn-primary" @click="doDiff">{{ t('jsonDiff.compare') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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

.diff-modal {
  background: var(--bg-primary, #1e1e1e);
  border-radius: var(--radius-md, 10px);
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  width: 95%;
  max-width: 1100px;
  height: 85vh;
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
  gap: 12px;
  overflow: hidden;
}

.editor-row {
  display: flex;
  gap: 16px;
  height: 200px;
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

.stats-bar {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: var(--bg-secondary, #252526);
  border-radius: var(--radius-sm, 6px);
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

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted, #888);
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

.diff-content {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
  border-radius: var(--radius-sm, 6px);
  background: var(--bg-secondary, #252526);
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

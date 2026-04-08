<template>
  <div class="toolbar editor-actions-bar editor-view-toolbar">
    <div class="editor-view-toolbar-label">{{ t('editorView.view') }}</div>
    <div class="editor-view-toolbar-actions">
      <span class="editor-view-toolbar-pill">{{ localizedFileType }}</span>
      <button
        class="editor-view-toolbar-button"
        type="button"
        @click="$emit('pin')"
        :title="t('editorView.pinWindow')"
        :aria-label="t('editorView.pinWindow')"
      >
        <span class="editor-view-toolbar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6z"/>
            <path d="M12 15v6"/>
          </svg>
        </span>
        <span class="editor-view-toolbar-text">{{ t('editorView.pinWindow') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  fileType: {
    type: String,
    default: 'TEXT'
  }
})

const { t, te } = useI18n()

const localizedFileType = computed(() => {
  const normalized = String(props.fileType || 'TEXT').trim().toLowerCase()
  const key = `editorView.fileTypes.${normalized}`
  return te(key) ? t(key) : props.fileType
})

defineEmits(['pin'])
</script>

<style scoped>
.editor-view-toolbar {
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-bg) 88%, rgba(var(--accent-primary-rgb), 0.08));
  border-bottom-color: rgba(var(--accent-primary-rgb), 0.12);
}

.editor-view-toolbar-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-shortcut, var(--text-muted));
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.editor-view-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.editor-view-toolbar-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--text-interactive-active, var(--accent-primary));
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.editor-view-toolbar-button {
  background: rgba(var(--accent-primary-rgb), 0.05);
  border: 1px solid transparent;
  color: var(--text-interactive, var(--text-muted));
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 10px;
  min-width: auto;
  height: 28px;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
}

.editor-view-toolbar-button:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  color: var(--text-interactive-hover, var(--text-main));
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.editor-view-toolbar-button:active {
  transform: translateY(1px);
}

.editor-view-toolbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.editor-view-toolbar-icon svg {
  width: 16px;
  height: 16px;
}

.editor-view-toolbar-text {
  font-size: 12px;
  line-height: 1;
}

@media (max-width: 900px) {
  .editor-view-toolbar-text {
    display: none;
  }

  .editor-view-toolbar-button {
    padding: 4px 8px;
  }
}
</style>

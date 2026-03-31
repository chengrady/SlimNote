<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-mask">
        <div class="modal-wrapper" @click.self="handleBackdropClose">
          <div
            class="modal-container"
            :class="containerClass"
            :style="containerStyle"
          >
            <div class="modal-header">
              <div class="modal-title-group">
                <h3>{{ title }}</h3>
                <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
              </div>
              <button
                v-if="showCloseButton"
                type="button"
                class="close-btn ui-icon-btn"
                aria-label="Close dialog"
                @click="$emit('close')"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>

            <div class="modal-body" :class="bodyClass">
              <slot name="body">
                {{ message }}
              </slot>
            </div>

            <div v-if="showFooter" class="modal-footer" :class="footerClass">
              <slot name="footer">
                <button type="button" class="modal-btn primary" @click="$emit('confirm')">&#x786e;&#x5b9a;</button>
              </slot>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  title: {
    type: String,
    default: '\u63d0\u793a'
  },
  subtitle: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  width: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: ''
  },
  maxHeight: {
    type: String,
    default: ''
  },
  bodyClass: {
    type: String,
    default: ''
  },
  footerClass: {
    type: String,
    default: ''
  },
  containerClass: {
    type: String,
    default: ''
  },
  showFooter: {
    type: Boolean,
    default: true
  },
  showCloseButton: {
    type: Boolean,
    default: true
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'confirm'])

const containerStyle = computed(() => ({
  width: props.width || undefined,
  maxWidth: props.maxWidth || undefined,
  height: props.height || undefined,
  maxHeight: props.maxHeight || undefined
}))

function handleBackdropClose() {
  if (props.closeOnBackdrop) {
    emit('close')
  }
}
</script>

<style>
.modal-mask,
.modal-overlay {
  position: fixed;
  z-index: 9998;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.06), transparent 42%),
    rgba(15, 23, 42, 0.48);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px) saturate(120%);
  transition: opacity 0.18s ease;
}

.modal-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
}

.modal-container,
.converter-modal,
.diff-modal,
.codegen-modal {
  width: min(420px, calc(100vw - 40px));
  margin: 0 auto;
  max-height: min(calc(100vh - 48px), 920px);
  background: color-mix(in srgb, var(--bg-primary) 92%, rgba(255, 255, 255, 0.02));
  border: 1px solid color-mix(in srgb, var(--glass-border) 86%, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  box-shadow:
    0 18px 48px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.03) inset;
  transition: transform 0.18s ease, opacity 0.18s ease, border-color var(--transition-fast);
  color: var(--text-main);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 46px;
  padding: 0 18px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.05));
  background: color-mix(in srgb, var(--bg-secondary) 78%, rgba(var(--accent-primary-rgb), 0.025));
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
  letter-spacing: 0.01em;
}

.modal-subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

.close-btn {
  font-size: 18px;
  line-height: 1;
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 18px;
  line-height: 1.6;
  color: var(--text-main);
  overflow: auto;
  background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
}

.modal-body--flush {
  padding: 0;
  background: transparent;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.05));
  background: color-mix(in srgb, var(--bg-secondary) 76%, rgba(var(--accent-primary-rgb), 0.02));
}

/* Transitions */
.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-enter-from .converter-modal,
.modal-enter-from .diff-modal,
.modal-enter-from .codegen-modal,
.modal-leave-to .modal-container,
.modal-leave-to .converter-modal,
.modal-leave-to .diff-modal,
.modal-leave-to .codegen-modal {
  transform: translateY(8px) scale(0.985);
  opacity: 0;
}

@media (max-width: 720px) {
  .modal-wrapper {
    padding: 12px;
  }

  .modal-container,
  .converter-modal,
  .diff-modal,
  .codegen-modal {
    width: min(100%, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
  }

  .modal-body {
    padding: 14px;
  }

  .modal-footer {
    padding: 10px 14px;
  }
}
</style>

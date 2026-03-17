<template>
  <Transition name="modal">
    <div v-if="show" class="modal-mask">
      <div class="modal-wrapper" @click.self="$emit('close')">
        <div class="modal-container">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="$emit('close')">×</button>
          </div>

          <div class="modal-body">
            <slot name="body">
              {{ message }}
            </slot>
          </div>

          <div class="modal-footer">
            <slot name="footer">
              <button class="modal-btn primary" @click="$emit('confirm')">确定</button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  show: Boolean,
  title: {
    type: String,
    default: '提示'
  },
  message: {
    type: String,
    default: ''
  }
})

defineEmits(['close', 'confirm'])
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
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
}

.modal-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-container {
  width: min(420px, calc(100vw - 40px));
  margin: 0 auto;
  background: var(--glass-bg-active);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--menu-card-shadow);
  transition: all 0.3s ease;
  color: var(--text-main);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--glass-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.close-btn {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  background: rgba(var(--accent-primary-rgb), 0.05);
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
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
  padding: var(--space-5);
  line-height: 1.6;
  color: var(--text-main);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--modal-footer-gap);
  padding: var(--modal-footer-padding-y) var(--modal-footer-padding-x);
  border-top: 1px solid var(--glass-border);
}

.modal-btn {
  min-height: var(--btn-height-md);
  padding: 0 var(--btn-padding-x);
  border-radius: var(--field-radius);
  border: 1px solid var(--glass-border);
  background: var(--btn-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: var(--transition-fast);
  font-size: var(--field-font-size);
  font-weight: var(--btn-font-weight);
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

/* Transitions */
.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>

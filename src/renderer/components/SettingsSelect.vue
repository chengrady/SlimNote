<template>
  <div ref="rootRef" class="settings-select" :class="{ 'is-open': isOpen, 'is-disabled': disabled }" :style="selectStyle">
    <button
      ref="buttonRef"
      type="button"
      class="settings-select-button"
      :disabled="disabled"
      :aria-label="ariaLabel"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggle"
      @keydown="handleButtonKeydown"
    >
      <span class="settings-select-value" :style="selectedOption?.style">{{ selectedLabel }}</span>
      <span class="settings-select-caret" aria-hidden="true"></span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="settings-select-menu"
        role="listbox"
        :aria-label="ariaLabel"
        :style="menuStyle"
        tabindex="-1"
        @keydown="handleMenuKeydown"
      >
        <button
          v-for="(option, index) in normalizedOptions"
          :key="option.key"
          type="button"
          class="settings-select-option"
          :class="{ 'is-active': isSelected(option.value), 'is-highlighted': highlightedIndex === index }"
          :disabled="option.disabled"
          role="option"
          :aria-selected="isSelected(option.value) ? 'true' : 'false'"
          @mouseenter="highlightedIndex = index"
          @click="selectOption(option)"
        >
          <span class="settings-select-option-label" :style="option.style">{{ option.label }}</span>
          <span class="settings-select-check" aria-hidden="true">
            <span v-if="isSelected(option.value)" class="settings-select-check-dot"></span>
          </span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, Boolean],
    default: ''
  },
  options: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  minWidth: {
    type: Number,
    default: 180
  },
  maxWidth: {
    type: Number,
    default: 300
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const buttonRef = ref(null)
const menuRef = ref(null)
const isOpen = ref(false)
const highlightedIndex = ref(-1)
const menuStyle = ref({})

const normalizedOptions = computed(() => props.options.map((option, index) => {
  if (option && typeof option === 'object') {
    return {
      value: option.value,
      label: String(option.label ?? option.value ?? ''),
      disabled: Boolean(option.disabled),
      style: option.style || null,
      key: option.key ?? `${String(option.value)}-${index}`
    }
  }

  return {
    value: option,
    label: String(option ?? ''),
    disabled: false,
    style: null,
    key: `${String(option)}-${index}`
  }
}))

const selectedOption = computed(() => (
  normalizedOptions.value.find(option => isSelected(option.value)) || normalizedOptions.value[0] || null
))

const selectedLabel = computed(() => selectedOption.value?.label || '')

const preferredWidth = computed(() => {
  const labels = normalizedOptions.value.map(option => option.label).concat(selectedLabel.value)
  const longestLabelWidth = Math.max(0, ...labels.map(estimateTextWidth))
  return Math.min(props.maxWidth, Math.max(props.minWidth, Math.ceil(longestLabelWidth + 58)))
})

const selectStyle = computed(() => ({
  '--settings-select-width': `${preferredWidth.value}px`
}))

watch(isOpen, (open) => {
  if (open) {
    attachFloatingListeners()
    highlightedIndex.value = Math.max(0, normalizedOptions.value.findIndex(option => isSelected(option.value)))
    nextTick(updateMenuPosition)
    return
  }

  detachFloatingListeners()
})

watch(() => props.options, () => {
  if (isOpen.value) nextTick(updateMenuPosition)
})

onBeforeUnmount(() => {
  detachFloatingListeners()
})

function estimateTextWidth(value = '') {
  return Array.from(String(value || '')).reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 12 : 7), 0)
}

function isSelected(value) {
  return Object.is(value, props.modelValue) || String(value) === String(props.modelValue)
}

function open() {
  if (props.disabled || !normalizedOptions.value.length) return
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

function toggle() {
  if (isOpen.value) {
    close()
    return
  }

  open()
}

function selectOption(option) {
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value, option)
  close()
  nextTick(() => buttonRef.value?.focus?.())
}

function updateMenuPosition() {
  if (!isOpen.value || !buttonRef.value?.getBoundingClientRect || typeof window === 'undefined') return

  const rect = buttonRef.value.getBoundingClientRect()
  const gutter = 12
  const availableRight = window.innerWidth - gutter
  const availableLeft = gutter
  const width = Math.min(Math.max(rect.width, preferredWidth.value), Math.max(120, availableRight - availableLeft))
  const left = Math.min(Math.max(availableLeft, rect.left), Math.max(availableLeft, availableRight - width))
  const spaceBelow = window.innerHeight - rect.bottom - gutter
  const spaceAbove = rect.top - gutter
  const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow

  menuStyle.value = {
    left: `${Math.round(left)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(Math.max(120, Math.min(320, openAbove ? spaceAbove - 8 : spaceBelow - 8)))}px`,
    ...(openAbove
      ? { bottom: `${Math.round(window.innerHeight - rect.top + 6)}px` }
      : { top: `${Math.round(rect.bottom + 6)}px` })
  }
}

function moveHighlight(delta) {
  const options = normalizedOptions.value
  if (!options.length) return

  let nextIndex = highlightedIndex.value
  for (let count = 0; count < options.length; count += 1) {
    nextIndex = (nextIndex + delta + options.length) % options.length
    if (!options[nextIndex]?.disabled) {
      highlightedIndex.value = nextIndex
      break
    }
  }
}

function chooseHighlighted() {
  const option = normalizedOptions.value[highlightedIndex.value]
  if (option) selectOption(option)
}

function handleButtonKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    event.stopPropagation()
    close()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    event.stopPropagation()
    open()
    nextTick(() => menuRef.value?.focus?.())
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    event.stopPropagation()
    open()
    nextTick(() => menuRef.value?.focus?.())
    moveHighlight(-1)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    toggle()
  }
}

function handleMenuKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    close()
    nextTick(() => buttonRef.value?.focus?.())
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    event.stopPropagation()
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    event.stopPropagation()
    moveHighlight(-1)
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    chooseHighlighted()
  }
}

function handleDocumentPointerDown(event) {
  if (rootRef.value?.contains?.(event.target) || menuRef.value?.contains?.(event.target)) return
  close()
}

function attachFloatingListeners() {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  window.addEventListener('resize', updateMenuPosition)
  window.addEventListener('scroll', updateMenuPosition, true)
}

function detachFloatingListeners() {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, true)
}
</script>

<style scoped>
.settings-select {
  width: var(--settings-select-width);
  min-width: 0;
  display: inline-block;
}

.settings-select-button {
  width: 100%;
  height: var(--field-height-md, 34px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  align-items: center;
  gap: 8px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--field-radius, 7px);
  background: color-mix(in srgb, var(--bg-primary) 82%, var(--surface-panel));
  color: var(--text-main);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
  font: inherit;
  font-size: var(--field-font-size, 13px);
  text-align: left;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.settings-select-button:hover:not(:disabled),
.settings-select-button:focus-visible,
.settings-select.is-open .settings-select-button {
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring), var(--shadow-subtle);
  outline: none;
}

.settings-select-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.settings-select-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-select-caret {
  width: 0;
  height: 0;
  justify-self: center;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  opacity: 0.7;
}

.settings-select-menu {
  position: fixed;
  z-index: 10020;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--shadow-dropdown, 0 18px 42px rgba(0, 0, 0, 0.22)));
  color: var(--text-main);
  overflow: auto;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.settings-select-option {
  width: 100%;
  min-height: 34px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.settings-select-option:hover:not(:disabled),
.settings-select-option:focus-visible,
.settings-select-option.is-highlighted {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.settings-select-option.is-active {
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.36));
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--text-interactive-active, var(--accent-primary));
}

.settings-select-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.settings-select-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.25;
}

.settings-select-check {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.settings-select-check-dot {
  position: relative;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--text-interactive-active, var(--accent-primary));
  color: var(--surface-panel-strong);
}

.settings-select-check-dot::before {
  content: '';
  width: 8px;
  height: 4px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg) translate(1px, -1px);
}
</style>

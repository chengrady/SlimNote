<template>
  <div class="file-icon" :title="extensionLabel" :style="iconStyle">
    <span class="seti-icon" :style="{ color: iconData.color }" v-html="iconData.svg"></span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { themeIcons } from 'seti-icons'

const props = defineProps({
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    default: 16
  }
})

const getSetiIcon = themeIcons({
  blue: '#519aba',
  grey: '#4d5a5e',
  'grey-light': '#6d8086',
  green: '#8dc149',
  orange: '#e37933',
  pink: '#f55385',
  purple: '#a074c4',
  red: '#cc3e44',
  white: '#d4d7d6',
  yellow: '#cbcb41',
  ignore: '#41535b'
})

const baseName = computed(() => {
  const raw = props.filename || ''
  const normalized = raw.replace(/\\/g, '/')
  return normalized.split('/').pop() || raw
})

const extension = computed(() => {
  if (!baseName.value) return ''
  const parts = baseName.value.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
})

const extensionLabel = computed(() => baseName.value || (extension.value ? `.${extension.value}` : '文本文件'))

const iconData = computed(() => getSetiIcon(baseName.value || 'file.txt'))

const iconStyle = computed(() => ({
  '--file-icon-size': `${props.size}px`
}))
</script>

<style scoped>
.file-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--file-icon-size);
  height: var(--file-icon-size);
  user-select: none;
  flex-shrink: 0;
}

.seti-icon {
  display: inline-flex;
  width: var(--file-icon-size);
  height: var(--file-icon-size);
  line-height: 0;
}

.seti-icon :deep(svg) {
  width: var(--file-icon-size);
  height: var(--file-icon-size);
  display: block;
}

.seti-icon :deep(path),
.seti-icon :deep(circle),
.seti-icon :deep(rect),
.seti-icon :deep(polygon),
.seti-icon :deep(ellipse) {
  fill: currentColor;
}

.seti-icon :deep([stroke]) {
  stroke: currentColor;
}
</style>

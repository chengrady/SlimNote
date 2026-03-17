<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSettingsStore } from './stores/settings'
import { useFileStore } from './stores/file'

const settingsStore = useSettingsStore()
const fileStore = useFileStore()

onMounted(() => {
  settingsStore.loadSettings()
  fileStore.loadRecentFiles()
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-gradient);
  position: relative;
}

/* Only show overlay for main window, not pin window */
.app:not(:has(.pin-window))::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: var(--bg-overlay-gradient);
  pointer-events: none;
  z-index: 0;
}
</style>

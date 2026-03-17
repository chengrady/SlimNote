<template>
  <div class="file-explorer">
    <div class="explorer-header">
      <span>文件资源管理器</span>
      <div class="explorer-actions">
        <button @click="openFolder" title="打开文件夹">📁</button>
        <button @click="refresh" title="刷新">🔄</button>
      </div>
    </div>
    <div class="explorer-content">
      <div v-if="!fileStore.rootPath" class="empty-state">
        <p>未打开文件夹</p>
        <button @click="openFolder" class="btn btn-primary">打开文件夹</button>
      </div>
      <div v-else class="file-tree">
        <FileNode 
          v-for="node in fileStore.fileTree" 
          :key="node.path" 
          :node="node"
          @open-file="handleOpenFile"
        />
      </div>
    </div>
    <div v-if="fileStore.recentFiles.length > 0" class="recent-files">
      <div class="recent-header">最近打开</div>
      <div 
        v-for="file in fileStore.recentFiles" 
        :key="file.path"
        class="recent-file"
        @click="handleOpenFile(file.path)"
      >
        <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
        <button class="remove-btn" @click.stop="removeRecent(file.path)" title="从列表中移除">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFileStore } from '../stores/file'
import FileNode from './FileNode.vue'

const fileStore = useFileStore()

function removeRecent(file) {
  fileStore.removeRecentFile(file)
}

async function openFolder() {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    await fileStore.loadFolder(result.filePaths[0])
  }
}

async function refresh() {
  if (fileStore.rootPath) {
    await fileStore.loadFolder(fileStore.rootPath)
  }
}

function handleOpenFile(filePath) {
  // 由父组件处理
  window.dispatchEvent(new CustomEvent('open-file', { detail: filePath }))
}

function getFileName(path) {
  return path.split(/[\\/]/).pop() || path
}
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--glass-border);
  font-size: 13px;
  margin: var(--space-3) 0 var(--space-3) var(--space-3);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--panel-card-shadow);
}

.explorer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  font-weight: var(--ui-font-weight-bold);
  font-size: var(--ui-font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
  border-bottom: 1px solid var(--glass-border);
}

.explorer-actions {
  display: flex;
  gap: var(--space-2);
}

.explorer-actions button {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  background: rgba(var(--accent-primary-rgb), 0.05);
  border: 1px solid transparent;
  padding: 0;
  cursor: pointer;
  border-radius: var(--icon-button-radius);
  font-size: 13px;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
}

.explorer-actions button:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  color: var(--color-text);
  box-shadow: var(--interactive-hover-ring);
}

.explorer-actions button:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.explorer-content {
  flex: 1;
  overflow-y: auto;
  padding: 0; /* Remove padding for edge-to-edge selection */
}

.empty-state {
  padding: var(--empty-state-padding);
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: var(--empty-state-gap);
  align-items: center;
  justify-content: center;
  height: 50%;
}

.empty-state p {
  font-size: var(--empty-state-title-size);
  line-height: var(--panel-title-line-height);
  color: var(--text-main);
}

.file-tree {
  font-size: 13px;
}

.recent-files {
  border-top: 1px solid var(--glass-border);
  max-height: 30%;
  overflow-y: auto;
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
}

.recent-header {
  padding: var(--space-2) var(--space-4);
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-bold);
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.recent-file {
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-main);
  transition: var(--transition-fast);
  font-size: var(--field-font-size);
  line-height: 22px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 70%, transparent);
}

.recent-file:hover {
  background: var(--interactive-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.recent-file:focus-visible {
  outline: none;
  background: var(--interactive-selected-bg);
  box-shadow: var(--interactive-hover-ring);
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 16px;
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  line-height: 1;
  border-radius: var(--icon-button-radius);
  transition: var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.recent-file:hover .remove-btn,
.recent-file:focus-visible .remove-btn {
  opacity: 1;
}

.remove-btn:hover {
  color: var(--danger-soft-color);
  background: var(--danger-soft-bg);
  box-shadow: var(--interactive-hover-ring);
}

.remove-btn:focus-visible {
  outline: none;
  color: var(--danger-soft-color);
  border: 1px solid rgba(255, 77, 79, 0.18);
  background: var(--danger-soft-bg);
  box-shadow: var(--field-focus-ring);
}
</style>

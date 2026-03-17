<template>
  <div class="workspace-sidebar" :class="{ collapsed }">
    <div class="panel-header">
      <div class="panel-title-group">
        <span class="panel-title">工作台</span>
        <span v-if="!collapsed && sidebarSubtitle" class="panel-subtitle">{{ sidebarSubtitle }}</span>
      </div>
      <div class="header-actions">
        <button @click="$emit('toggle-collapse')" :title="collapsed ? '展开工作台' : '收起工作台'" :aria-label="collapsed ? '展开工作台' : '收起工作台'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline v-if="collapsed" points="9 18 15 12 9 6"/>
            <polyline v-else points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="collapsed" class="collapsed-list">
        <div class="collapsed-action-stack">
          <button class="collapsed-open-btn" @click="newFile" title="新建文件" aria-label="新建文件">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </button>
          <button class="collapsed-open-btn" @click="openFileDialog" title="打开文件" aria-label="打开文件">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="collapsed-open-btn" @click="openFolderDialog" title="打开目录" aria-label="打开目录">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
          </button>
        </div>
        <div v-if="collapsedRecentFiles.length > 0" class="collapsed-divider"></div>
        <div class="collapsed-recent-stack">
          <div
            v-for="file in collapsedRecentFiles"
            :key="file.path"
            class="collapsed-file"
            :class="{ active: file.path === activeFilePath }"
            @click="handleOpenFile(file.path)"
            :title="getFileName(file.path)"
          >
            <FileIcon :filename="file.path" :size="24" class="collapsed-recent-file-icon" />
          </div>
        </div>
      </div>

      <template v-else>
        <div class="action-grid sidebar-section sidebar-section--actions">
          <button class="action-card primary" @click="newFile">
            <span class="action-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            </span>
            <span class="action-card-label">新建文件</span>
          </button>
          <button class="action-card" @click="openFileDialog">
            <span class="action-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span class="action-card-label">打开文件</span>
          </button>
          <button class="action-card" @click="openFolderDialog">
            <span class="action-card-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
            </span>
            <span class="action-card-label">打开目录</span>
          </button>
        </div>

        <div v-if="currentRootPath" class="file-group workspace-group sidebar-section sidebar-section--workspace">
          <div class="group-header">
            <div class="group-heading">
              <div class="group-title">当前目录</div>
            </div>
            <div class="group-actions">
              <button class="group-action-btn" @click="toggleWorkspaceExpansion" :title="showWorkspaceSection ? '收起当前目录' : '展开当前目录'" :aria-label="showWorkspaceSection ? '收起当前目录' : '展开当前目录'">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline v-if="showWorkspaceSection" points="18 15 12 9 6 15"/>
                  <polyline v-else points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="workspace-summary" :class="{ collapsed: !showWorkspaceSection }">
            <span class="workspace-path" :title="currentRootPath">{{ currentRootPath }}</span>
            <span class="workspace-count">{{ fileTreeNodes.length }} 项</span>
          </div>
          <template v-if="showWorkspaceSection">
            <div class="workspace-toolbar">
              <button class="workspace-icon-btn" @click="createWorkspaceFile()" title="新建文件" aria-label="新建文件">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
              </button>
              <button class="workspace-icon-btn" @click="createWorkspaceFolder()" title="新建文件夹" aria-label="新建文件夹">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/><path d="M12 11v6"/><path d="M9 14h6"/></svg>
              </button>
              <button class="workspace-icon-btn" @click="collapseWorkspaceTree" title="折叠全部" aria-label="折叠全部">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/><path d="M6 5l6 6 6-6"/></svg>
              </button>
              <button class="workspace-icon-btn" @click="refreshWorkspace" title="刷新" aria-label="刷新">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>
              </button>
              <button class="workspace-icon-btn" @click="openFolderDialog" title="更换目录" aria-label="更换目录">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/><path d="M12 11h6"/><path d="M15 8l3 3-3 3"/></svg>
              </button>
              <button class="workspace-icon-btn" @click="closeWorkspace" title="关闭目录" aria-label="关闭目录">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/><path d="M10 10l4 4"/><path d="M14 10l-4 4"/></svg>
              </button>
            </div>
            <div ref="workspaceTreeShellRef" class="workspace-tree-shell" @contextmenu.prevent="showWorkspaceRootMenu">
              <div v-if="fileTreeNodes.length === 0" class="workspace-tree-empty">当前目录暂无可显示内容</div>
              <div v-else class="workspace-tree">
                <FileNode
                  v-for="node in fileTreeNodes"
                  :key="node.path"
                  :node="node"
                  :active-path="activeFilePath"
                  :selected-path="selectedWorkspacePath"
                  @open-file="handleOpenFile"
                  @context-menu="showWorkspaceNodeMenu"
                  @select-node="handleSelectWorkspaceNode"
                />
              </div>
            </div>
          </template>
        </div>

        <div v-if="!currentRootPath && totalRecentCount === 0 && recentFolders.length === 0" class="empty-state sidebar-section sidebar-section--empty">
          <div class="empty-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p>从这里开始新的工作，或继续最近打开的内容。</p>
        </div>

        <div v-else class="grouped-files">
          <div v-if="showPinnedGroup" class="file-group pinned-group sidebar-section" :class="currentRootPath ? 'sidebar-section--muted' : 'sidebar-section--emphasis'">
            <div class="group-header">
              <div class="group-heading">
                <div class="group-title">已固定</div>
                <div class="group-meta">{{ filteredPinnedFiles.length }} 项</div>
              </div>
              <div class="group-actions">
                <button v-if="currentRootPath" class="group-action-btn" @click="togglePinnedExpansion" :title="showPinnedSection ? '收起已固定' : '展开已固定'" :aria-label="showPinnedSection ? '收起已固定' : '展开已固定'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline v-if="showPinnedSection" points="18 15 12 9 6 15"/>
                    <polyline v-else points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>
            <div
              v-if="showPinnedSection"
              class="file-list"
              :class="{ 'group-drop-active': recentDrag.dragPath && recentDrag.targetPinned === true && !recentDrag.targetPath }"
              @dragover.prevent="onGroupDragOver(true)"
              @drop.prevent="onGroupDrop(true)"
            >
              <div
                v-for="file in filteredPinnedFiles"
                :key="file.path"
                class="recent-file pinned"
                :class="{ active: file.path === activeFilePath, dragging: recentDrag.dragPath === file.path, 'drag-target': recentDrag.targetPath === file.path && recentDrag.dragPath !== file.path, 'drag-before': recentDrag.targetPath === file.path && recentDrag.position === 'before', 'drag-after': recentDrag.targetPath === file.path && recentDrag.position === 'after' }"
                @click="handleOpenFile(file.path)"
                @contextmenu.prevent="showContextMenu($event, file)"
                tabindex="0"
                @keydown.enter="handleOpenFile(file.path)"
                @keydown.space.prevent="handleOpenFile(file.path)"
                draggable="true"
                @dragstart="onRecentDragStart(file.path)"
                @dragover.prevent="onRecentDragOver($event, file.path, true)"
                @drop.prevent="onRecentDrop(file.path, true)"
                @dragend="onRecentDragEnd"
              >
                <FileIcon :filename="file.path" :size="30" class="recent-file-icon" />
                <div class="file-info">
                  <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
                  <span class="file-path" :title="file.path">{{ file.path }}</span>
                </div>
                <span v-if="file.path === activeFilePath" class="file-badge">打开中</span>
                <button class="pin-btn active" @click.stop="togglePin(file.path)" title="取消固定" aria-label="取消固定">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="remove-btn" @click.stop="removeRecent(file.path)" title="从列表中移除">×</button>
              </div>
              <div v-if="filteredPinnedFiles.length === 0" class="drop-placeholder">拖到这里即可固定到顶部</div>
            </div>
          </div>

          <div v-if="showUnpinnedGroup" class="file-group recent-group sidebar-section" :class="currentRootPath ? 'sidebar-section--muted' : 'sidebar-section--primary'">
            <div class="group-header">
              <div class="group-heading">
                <div class="group-title">最近文件</div>
                <div class="group-meta">{{ filteredUnpinnedFiles.length }} 项</div>
              </div>
              <div class="group-actions">
                <button v-if="unpinnedRecentFiles.length > 0" class="group-action-btn" @click="clearRecent" title="清空最近文件" aria-label="清空最近文件">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
                <button v-if="currentRootPath" class="group-action-btn" @click="toggleRecentFilesExpansion" :title="showRecentFilesSection ? '收起最近文件' : '展开最近文件'" :aria-label="showRecentFilesSection ? '收起最近文件' : '展开最近文件'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline v-if="showRecentFilesSection" points="18 15 12 9 6 15"/>
                    <polyline v-else points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>
            <div
              v-if="showRecentFilesSection"
              class="file-list"
              :class="{ 'group-drop-active': recentDrag.dragPath && recentDrag.targetPinned === false && !recentDrag.targetPath }"
              @dragover.prevent="onGroupDragOver(false)"
              @drop.prevent="onGroupDrop(false)"
            >
              <div
                v-for="file in filteredUnpinnedFiles"
                :key="file.path"
                class="recent-file"
                :class="{ active: file.path === activeFilePath, dragging: recentDrag.dragPath === file.path, 'drag-target': recentDrag.targetPath === file.path && recentDrag.dragPath !== file.path, 'drag-before': recentDrag.targetPath === file.path && recentDrag.position === 'before', 'drag-after': recentDrag.targetPath === file.path && recentDrag.position === 'after' }"
                @click="handleOpenFile(file.path)"
                @contextmenu.prevent="showContextMenu($event, file)"
                tabindex="0"
                @keydown.enter="handleOpenFile(file.path)"
                @keydown.space.prevent="handleOpenFile(file.path)"
                draggable="true"
                @dragstart="onRecentDragStart(file.path)"
                @dragover.prevent="onRecentDragOver($event, file.path, false)"
                @drop.prevent="onRecentDrop(file.path, false)"
                @dragend="onRecentDragEnd"
              >
                <FileIcon :filename="file.path" :size="30" class="recent-file-icon" />
                <div class="file-info">
                  <span class="file-name" :title="file.path">{{ getFileName(file.path) }}</span>
                  <span class="file-path" :title="file.path">{{ file.path }}</span>
                </div>
                <span v-if="file.path === activeFilePath" class="file-badge">打开中</span>
                <button class="pin-btn" @click.stop="togglePin(file.path)" title="固定到顶部" aria-label="固定到顶部">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" /></svg>
                </button>
                <button class="remove-btn" @click.stop="removeRecent(file.path)" title="从列表中移除">×</button>
              </div>
              <div v-if="filteredUnpinnedFiles.length === 0" class="drop-placeholder">拖到这里即可移回最近列表</div>
            </div>
          </div>

          <div v-if="recentFolders.length > 0" class="file-group secondary-group sidebar-section" :class="currentRootPath ? 'sidebar-section--muted' : 'sidebar-section--secondary'">
            <div class="group-header">
              <div class="group-heading">
                <div class="group-title">最近目录</div>
                <div class="group-meta">{{ recentFolders.length }} 个目录</div>
              </div>
              <div class="group-actions">
                <button class="group-action-btn" @click="clearRecentFolders" title="清空最近目录" aria-label="清空最近目录">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                </button>
                <button v-if="currentRootPath" class="group-action-btn" @click="toggleRecentFoldersExpansion" :title="showRecentFoldersSection ? '收起最近目录' : '展开最近目录'" :aria-label="showRecentFoldersSection ? '收起最近目录' : '展开最近目录'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline v-if="showRecentFoldersSection" points="18 15 12 9 6 15"/>
                    <polyline v-else points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </div>
            <div v-if="showRecentFoldersSection" class="folder-list">
              <button
                v-for="folder in recentFolders"
                :key="folder.path"
                class="folder-item"
                @click="openRecentFolder(folder.path)"
                :title="folder.path"
              >
                <span class="folder-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 3h11"/><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
                </span>
                <span class="folder-info">
                  <span class="folder-name">{{ getFileName(folder.path) }}</span>
                  <span class="folder-path">{{ folder.path }}</span>
                </span>
                <span v-if="folder.path === currentRootPath" class="folder-badge">当前</span>
                <span class="folder-remove" @click.stop="removeRecentFolder(folder.path)">×</span>
              </button>
            </div>
          </div>
        </div>

      </template>
    </div>

    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        ref="contextMenuRef"
        class="context-menu"
        :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      >
        <template v-if="contextMenu.type === 'recent'">
          <div class="menu-item" @click="handleContextAction('open')">打开</div>
          <div class="menu-item" @click="handleContextAction('togglePin')">{{ contextMenu.file?.pinned ? '取消固定' : '固定到顶部' }}</div>
          <div class="menu-item" @click="handleContextAction('remove')">从列表中移除</div>
          <div class="menu-separator"></div>
          <div class="menu-item" @click="handleContextAction('clearUnpinned')">清理未固定记录</div>
        </template>
        <template v-else-if="contextMenu.type === 'workspace'">
          <div class="menu-item" @click="handleContextAction('workspace-open')">{{ contextMenu.node?.isDirectory ? (contextMenu.node?.expanded ? '收起目录' : '展开目录') : '打开文件' }}</div>
          <div class="menu-item" @click="handleContextAction('workspace-create-file')">新建文件</div>
          <div class="menu-item" @click="handleContextAction('workspace-create-folder')">新建文件夹</div>
          <div class="menu-item" @click="handleContextAction('workspace-reveal')">在资源管理器中显示</div>
          <template v-if="!contextMenu.node?.isRoot">
            <div class="menu-separator"></div>
            <div class="menu-item" @click="handleContextAction('workspace-rename')">重命名</div>
            <div class="menu-item danger" @click="handleContextAction('workspace-delete')">删除</div>
          </template>
        </template>
      </div>
    </Teleport>

    <ModalDialog
      :show="dialogState.visible"
      :title="dialogState.title"
      @close="handleDialogClose"
      @confirm="handleDialogConfirm"
    >
      <template #body>
        <div class="workspace-dialog-body">
          <p v-if="dialogState.message" class="workspace-dialog-message">{{ dialogState.message }}</p>
          <input
            v-if="dialogState.mode === 'input'"
            ref="dialogInputRef"
            v-model="dialogInputValue"
            class="workspace-dialog-input"
            type="text"
            :placeholder="dialogState.placeholder"
            @keydown.enter.prevent="handleDialogConfirm"
          >
        </div>
      </template>
      <template #footer>
        <button class="modal-btn" @click="handleDialogClose">取消</button>
        <button class="modal-btn primary" @click="handleDialogConfirm">确定</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editor'
import { useFileStore } from '../stores/file'
import FileIcon from './FileIcon.vue'
import FileNode from './FileNode.vue'
import ModalDialog from './ModalDialog.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle-collapse'])

const editorStore = useEditorStore()
const fileStore = useFileStore()

const showWorkspaceSection = ref(true)
const showPinnedSection = ref(true)
const showRecentFilesSection = ref(true)
const showRecentFoldersSection = ref(true)
const selectedWorkspacePath = ref('')
const recentDrag = ref({ dragPath: null, targetPath: null, targetPinned: null, position: 'before' })
const contextMenu = ref({ visible: false, x: 0, y: 0, type: 'recent', file: null, node: null })
const contextMenuRef = ref(null)
const workspaceTreeShellRef = ref(null)
const dialogInputRef = ref(null)
const dialogInputValue = ref('')
const dialogState = ref({
  visible: false,
  mode: 'confirm',
  title: '',
  message: '',
  placeholder: ''
})
let dialogResolver = null
const CONTEXT_MENU_MARGIN = 8
const totalRecentCount = computed(() => fileStore.recentFiles.length)
const recentFolders = computed(() => fileStore.recentFolders)
const currentRootPath = computed(() => fileStore.rootPath || '')
const fileTreeNodes = computed(() => fileStore.fileTree || [])
const activeFilePath = computed(() => editorStore.getActiveTab()?.filePath || '')
const sidebarSubtitle = computed(() => {
  if (fileStore.rootPath) {
    return ''
  }

  return totalRecentCount.value > 0 ? `${totalRecentCount.value} 个最近文件 · ${recentFolders.value.length} 个目录` : '快速进入 Markdown / JSON / SQL / Log 工作流'
})

const filteredEntries = computed(() => fileStore.recentFiles)
const filteredPinnedFiles = computed(() => filteredEntries.value.filter(file => file.pinned))
const filteredUnpinnedFiles = computed(() => filteredEntries.value.filter(file => !file.pinned))
const unpinnedRecentFiles = computed(() => fileStore.recentFiles.filter(file => !file.pinned))
const collapsedRecentFiles = computed(() => fileStore.recentFiles.slice(0, 6))
const showPinnedGroup = computed(() => totalRecentCount.value > 0)
const showUnpinnedGroup = computed(() => totalRecentCount.value > 0)

function newFile() {
  editorStore.createTab()
}

async function openFileDialog() {
  const result = await window.electronAPI.openFileDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    handleOpenFile(result.filePaths[0])
  }
}

async function openFolderDialog() {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    await fileStore.loadFolder(result.filePaths[0])
  }
}

async function openRecentFolder(folderPath) {
  await fileStore.loadFolder(folderPath)
}

async function refreshWorkspace() {
  if (!currentRootPath.value) return
  await fileStore.loadFolder(currentRootPath.value)
  await revealActiveFileInWorkspace()
}

async function createWorkspaceFile(basePath = getWorkspaceCreateBasePath()) {
  await createWorkspaceEntry('file', basePath)
}

async function createWorkspaceFolder(basePath = getWorkspaceCreateBasePath()) {
  await createWorkspaceEntry('folder', basePath)
}

function collapseWorkspaceTree() {
  collapseTreeNodes(fileTreeNodes.value)
}

function closeWorkspace() {
  fileStore.closeFolder()
  selectedWorkspacePath.value = ''
}

async function createWorkspaceEntry(type, basePath) {
  const parentPath = resolveDirectoryPath(basePath)
  if (!parentPath) return

  const defaultName = type === 'file' ? 'untitled.md' : '新建文件夹'
  const inputName = await openInputDialog({
    title: type === 'file' ? '新建文件' : '新建文件夹',
    message: type === 'file' ? '请输入新文件名' : '请输入新文件夹名',
    defaultValue: defaultName,
    placeholder: defaultName
  })
  const name = String(inputName || '').trim()
  if (!name) return

  const targetPath = joinPath(parentPath, name)
  if (type === 'file') {
    await window.electronAPI.createFile(targetPath)
    await refreshWorkspace()
    handleOpenFile(targetPath)
    return
  }

  await window.electronAPI.createFolder(targetPath)
  await refreshWorkspace()
}

async function renameWorkspaceNode(node) {
  const nextName = await openInputDialog({
    title: '重命名',
    message: `请输入“${node.name}”的新名称`,
    defaultValue: node.name,
    placeholder: node.name
  })
  const trimmedName = String(nextName || '').trim()
  if (!trimmedName || trimmedName === node.name) return

  const newPath = joinPath(getParentPath(node.path), trimmedName)
  await window.electronAPI.renamePath(node.path, newPath)
  await refreshWorkspace()
}

async function deleteWorkspaceNode(node) {
  const confirmed = await openConfirmDialog({
    title: '删除项目',
    message: `确定要删除“${node.name}”吗？`
  })
  if (!confirmed) return

  await window.electronAPI.deletePath(node.path)
  await refreshWorkspace()
}

function toggleWorkspaceExpansion() {
  showWorkspaceSection.value = !showWorkspaceSection.value
}

function togglePinnedExpansion() {
  showPinnedSection.value = !showPinnedSection.value
}

function toggleRecentFilesExpansion() {
  showRecentFilesSection.value = !showRecentFilesSection.value
}

function toggleRecentFoldersExpansion() {
  showRecentFoldersSection.value = !showRecentFoldersSection.value
}

function showContextMenu(event, file) {
  const pointerX = event.clientX
  const pointerY = event.clientY

  contextMenu.value = {
    visible: true,
    x: pointerX,
    y: pointerY,
    type: 'recent',
    file,
    node: null
  }

  nextTick(() => adjustContextMenuPosition(pointerX, pointerY))
}

function showWorkspaceNodeMenu(payload) {
  const pointerX = payload.event.clientX
  const pointerY = payload.event.clientY
  selectedWorkspacePath.value = payload.node?.path || ''

  contextMenu.value = {
    visible: true,
    x: pointerX,
    y: pointerY,
    type: 'workspace',
    file: null,
    node: payload.node
  }

  nextTick(() => adjustContextMenuPosition(pointerX, pointerY))
}

function showWorkspaceRootMenu(event) {
  if (!currentRootPath.value) return
  selectedWorkspacePath.value = currentRootPath.value

  const pointerX = event.clientX
  const pointerY = event.clientY

  contextMenu.value = {
    visible: true,
    x: pointerX,
    y: pointerY,
    type: 'workspace',
    file: null,
    node: {
      name: getFileName(currentRootPath.value),
      path: currentRootPath.value,
      isDirectory: true,
      isRoot: true,
      expanded: true
    }
  }

  nextTick(() => adjustContextMenuPosition(pointerX, pointerY))
}

function adjustContextMenuPosition(pointerX, pointerY) {
  const menuEl = contextMenuRef.value
  if (!menuEl) return

  const rect = menuEl.getBoundingClientRect()
  const maxX = Math.max(CONTEXT_MENU_MARGIN, window.innerWidth - rect.width - CONTEXT_MENU_MARGIN)
  const maxY = Math.max(CONTEXT_MENU_MARGIN, window.innerHeight - rect.height - CONTEXT_MENU_MARGIN)

  contextMenu.value = {
    ...contextMenu.value,
    x: Math.min(pointerX, maxX),
    y: Math.min(pointerY, maxY)
  }
}

function closeContextMenu() {
  contextMenu.value = { visible: false, x: 0, y: 0, type: 'recent', file: null, node: null }
}

function handleContextAction(action) {
  if (contextMenu.value.type === 'recent') {
    const file = contextMenu.value.file
    if (!file) return

    switch (action) {
      case 'open':
        handleOpenFile(file.path)
        break
      case 'togglePin':
        togglePin(file.path)
        break
      case 'remove':
        removeRecent(file.path)
        break
      case 'clearUnpinned':
        clearRecent()
        break
    }

    closeContextMenu()
    return
  }

  handleWorkspaceContextAction(action)
}

async function handleWorkspaceContextAction(action) {
  const node = contextMenu.value.node
  if (!node) return

  try {
    switch (action) {
      case 'workspace-open':
        if (node.isDirectory && !node.isRoot) {
          await fileStore.expandFolder(node)
        } else if (!node.isDirectory) {
          handleOpenFile(node.path)
        }
        break
      case 'workspace-create-file':
        await createWorkspaceFile(node.isDirectory ? node.path : getParentPath(node.path))
        break
      case 'workspace-create-folder':
        await createWorkspaceFolder(node.isDirectory ? node.path : getParentPath(node.path))
        break
      case 'workspace-reveal':
        await window.electronAPI.showItemInFolder(node.path)
        break
      case 'workspace-rename':
        await renameWorkspaceNode(node)
        break
      case 'workspace-delete':
        await deleteWorkspaceNode(node)
        break
    }
  } finally {
    closeContextMenu()
  }
}

function removeRecent(filePath) {
  fileStore.removeRecentFile(filePath)
}

function removeRecentFolder(folderPath) {
  fileStore.removeRecentFolder(folderPath)
}

function togglePin(filePath) {
  fileStore.toggleRecentPin(filePath)
}

function onRecentDragStart(filePath) {
  recentDrag.value = { dragPath: filePath, targetPath: null, targetPinned: null, position: 'before' }
}

function onRecentDragOver(event, filePath, targetPinned) {
  if (!recentDrag.value.dragPath || recentDrag.value.dragPath === filePath) return
  const rect = event.currentTarget.getBoundingClientRect()
  const offset = event.clientY - rect.top
  const position = offset > rect.height / 2 ? 'after' : 'before'
  recentDrag.value = { ...recentDrag.value, targetPath: filePath, targetPinned, position }
}

function onRecentDrop(filePath, targetPinned) {
  if (!recentDrag.value.dragPath || recentDrag.value.dragPath === filePath) {
    onRecentDragEnd()
    return
  }

  fileStore.moveRecentFile(recentDrag.value.dragPath, filePath, targetPinned, recentDrag.value.position)
  onRecentDragEnd()
}

function onGroupDragOver(targetPinned) {
  if (!recentDrag.value.dragPath) return
  recentDrag.value = { ...recentDrag.value, targetPath: null, targetPinned, position: 'before' }
}

function onGroupDrop(targetPinned) {
  if (!recentDrag.value.dragPath) return
  fileStore.moveRecentFile(recentDrag.value.dragPath, null, targetPinned)
  onRecentDragEnd()
}

function onRecentDragEnd() {
  recentDrag.value = { dragPath: null, targetPath: null, targetPinned: null, position: 'before' }
}

function clearRecent() {
  openConfirmDialog({
    title: '清空最近文件',
    message: '确定要清空未固定的最近文件记录吗？'
  }).then((confirmed) => {
    if (!confirmed) return
    fileStore.clearRecentFiles()
  })
}

function clearRecentFolders() {
  openConfirmDialog({
    title: '清空最近目录',
    message: '确定要清空最近目录记录吗？'
  }).then((confirmed) => {
    if (!confirmed) return
    fileStore.clearRecentFolders()
  })
}

function handleOpenFile(filePath) {
  window.dispatchEvent(new CustomEvent('open-file', { detail: filePath }))
}

function handleSelectWorkspaceNode(node) {
  selectedWorkspacePath.value = node?.path || ''
}

function collapseTreeNodes(nodes) {
  if (!Array.isArray(nodes)) return
  nodes.forEach((node) => {
    if (node?.isDirectory) {
      node.expanded = false
      collapseTreeNodes(node.children)
    }
  })
}

async function revealActiveFileInWorkspace() {
  if (!currentRootPath.value || !activeFilePath.value || !isPathWithinRoot(activeFilePath.value, currentRootPath.value)) {
    return
  }

  await expandTreeToFile(activeFilePath.value)
  selectedWorkspacePath.value = getParentPath(activeFilePath.value) || currentRootPath.value

  await nextTick()
  const activeNode = workspaceTreeShellRef.value?.querySelector('.node-label.active')
  activeNode?.scrollIntoView({ block: 'nearest' })
}

async function expandTreeToFile(filePath) {
  const parentPath = getParentPath(filePath)
  if (!parentPath || parentPath === currentRootPath.value) return

  const ancestorPaths = getAncestorPaths(parentPath, currentRootPath.value)
  let nodes = fileTreeNodes.value

  for (const ancestorPath of ancestorPaths) {
    const node = (nodes || []).find((item) => item.isDirectory && item.path === ancestorPath)
    if (!node) break
    await fileStore.expandFolder(node, { expand: true })
    nodes = node.children || []
  }
}

function openInputDialog({ title, message, defaultValue = '', placeholder = '' }) {
  dialogState.value = {
    visible: true,
    mode: 'input',
    title,
    message,
    placeholder
  }
  dialogInputValue.value = defaultValue

  return new Promise((resolve) => {
    dialogResolver = resolve
    nextTick(() => {
      dialogInputRef.value?.focus()
      dialogInputRef.value?.select?.()
    })
  })
}

function openConfirmDialog({ title, message }) {
  dialogState.value = {
    visible: true,
    mode: 'confirm',
    title,
    message,
    placeholder: ''
  }
  dialogInputValue.value = ''

  return new Promise((resolve) => {
    dialogResolver = resolve
  })
}

function handleDialogClose() {
  if (dialogResolver) {
    dialogResolver(dialogState.value.mode === 'input' ? '' : false)
  }
  resetDialogState()
}

function handleDialogConfirm() {
  if (dialogResolver) {
    dialogResolver(dialogState.value.mode === 'input' ? dialogInputValue.value : true)
  }
  resetDialogState()
}

function resetDialogState() {
  dialogResolver = null
  dialogState.value = {
    visible: false,
    mode: 'confirm',
    title: '',
    message: '',
    placeholder: ''
  }
  dialogInputValue.value = ''
}

function getFileName(path) {
  return path.split(/[\\/]/).pop() || path
}

function getParentPath(path) {
  return String(path || '').replace(/[\\/][^\\/]+$/, '')
}

function joinPath(basePath, name) {
  const normalizedBase = String(basePath || '').replace(/[\\/]+$/, '')
  const separator = normalizedBase.includes('\\') ? '\\' : '/'
  return `${normalizedBase}${separator}${name}`
}

function normalizePath(path) {
  return String(path || '').replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()
}

function isPathWithinRoot(path, rootPath) {
  const normalizedPath = normalizePath(path)
  const normalizedRoot = normalizePath(rootPath)
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}\\`)
}

function getAncestorPaths(path, rootPath) {
  const ancestors = []
  let cursor = path

  while (cursor && normalizePath(cursor) !== normalizePath(rootPath)) {
    ancestors.unshift(cursor)
    cursor = getParentPath(cursor)
  }

  return ancestors
}

function resolveDirectoryPath(path) {
  if (path && typeof path === 'object') {
    return path.isDirectory ? path.path : getParentPath(path.path)
  }
  if (!path) return currentRootPath.value
  if (path === currentRootPath.value) return currentRootPath.value
  const node = findTreeNodeByPath(path, fileTreeNodes.value)
  if (node?.isDirectory) return node.path
  return getParentPath(path)
}

function getWorkspaceCreateBasePath() {
  return selectedWorkspacePath.value || currentRootPath.value
}

function findTreeNodeByPath(path, nodes) {
  for (const node of nodes || []) {
    if (node.path === path) return node
    if (node.children?.length) {
      const found = findTreeNodeByPath(path, node.children)
      if (found) return found
    }
  }
  return null
}

onMounted(() => {
  document.addEventListener('click', closeContextMenu)
  window.addEventListener('resize', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
})

watch(currentRootPath, (path) => {
  const hasWorkspace = Boolean(path)
  showWorkspaceSection.value = hasWorkspace
  showPinnedSection.value = !hasWorkspace
  showRecentFilesSection.value = !hasWorkspace
  showRecentFoldersSection.value = !hasWorkspace
  selectedWorkspacePath.value = hasWorkspace ? path : ''
}, { immediate: true })

watch([currentRootPath, activeFilePath], async () => {
  await revealActiveFileInWorkspace()
}, { immediate: true })

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  window.removeEventListener('resize', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<style scoped>
.workspace-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--backdrop-blur));
  border: 1px solid var(--glass-border);
  font-size: 13px;
  word-break: break-word;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--panel-card-shadow);
  container-type: inline-size;
  container-name: workspace-sidebar;
}
.workspace-sidebar.collapsed {
  width: calc(100% - 6px);
  margin: 0 2px 0 4px;
  box-sizing: border-box;
  border-left-color: color-mix(in srgb, var(--glass-border) 100%, rgba(var(--accent-primary-rgb), 0.06));
  border-right-color: color-mix(in srgb, var(--glass-border) 100%, rgba(var(--accent-primary-rgb), 0.06));
  box-shadow:
    inset 1px 0 0 color-mix(in srgb, var(--glass-border) 94%, rgba(var(--accent-primary-rgb), 0.06)),
    inset -1px 0 0 color-mix(in srgb, var(--glass-border) 94%, rgba(var(--accent-primary-rgb), 0.06)),
    var(--panel-card-shadow);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: var(--panel-header-height);
  padding: var(--panel-header-padding-y) calc(var(--panel-header-padding-x) + 4px);
  gap: var(--space-3);
  border-bottom: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 90%, rgba(var(--accent-primary-rgb), 0.06));
}

.workspace-sidebar.collapsed .panel-header {
  padding: var(--panel-header-padding-y) 6px;
  justify-content: center;
}

.panel-title-group {
  display: flex;
  flex-direction: column;
  gap: var(--panel-title-gap);
  align-items: flex-start;
  min-width: 0;
}

.workspace-sidebar.collapsed .panel-title-group {
  display: none;
}

.panel-title {
  font-weight: var(--ui-font-weight-bold);
  font-size: var(--ui-font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.4px;
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
}

.panel-subtitle {
  font-size: var(--ui-font-size-xs);
  color: var(--text-muted);
  line-height: var(--panel-subtitle-line-height);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.header-actions button,
.collapsed-open-btn,
.section-link,
.folder-remove,
.pin-btn,
.remove-btn {
  transition: var(--transition-fast);
}

.header-actions button {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  background: var(--icon-button-bg);
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.header-actions button:hover,
.collapsed-open-btn:hover,
.collapsed-file:hover,
.action-card:hover,
.folder-item:hover,
.recent-file:hover,
.section-link:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.header-actions button:focus-visible,
.collapsed-open-btn:focus-visible,
.collapsed-file:focus-visible,
.action-card:focus-visible,
.folder-item:focus-visible,
.recent-file:focus-visible,
.menu-item:focus-visible,
.pin-btn:focus-visible,
.remove-btn:focus-visible,
.section-link:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px 0 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scrollbar-gutter: stable;
}

.sidebar-section {
  position: relative;
  margin: 0 16px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 92%, rgba(var(--accent-primary-rgb), 0.1));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--glass-bg) 95%, rgba(var(--accent-primary-rgb), 0.02));
  box-shadow: var(--panel-inner-shadow);
}

.sidebar-section--actions {
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.04));
}

.sidebar-section--session {
  border-color: color-mix(in srgb, var(--glass-border) 70%, rgba(var(--accent-primary-rgb), 0.24));
  background: color-mix(in srgb, var(--glass-bg) 90%, rgba(var(--accent-primary-rgb), 0.06));
}

.sidebar-section--secondary {
  background: color-mix(in srgb, var(--glass-bg) 97%, rgba(var(--accent-primary-rgb), 0.01));
}

.sidebar-section--workspace {
  border-color: color-mix(in srgb, var(--glass-border) 76%, rgba(var(--accent-primary-rgb), 0.18));
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.045));
}

.sidebar-section--muted {
  background: color-mix(in srgb, var(--glass-bg) 98%, rgba(var(--accent-primary-rgb), 0.008));
  border-color: color-mix(in srgb, var(--glass-border) 95%, rgba(var(--accent-primary-rgb), 0.04));
  box-shadow: none;
}

.sidebar-section--emphasis {
  border-color: color-mix(in srgb, var(--glass-border) 75%, rgba(var(--accent-primary-rgb), 0.22));
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.05));
}

.sidebar-section--primary {
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.018));
}

.sidebar-section--empty {
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.02));
}

.collapsed-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 0 4px 12px;
}

.collapsed-action-stack,
.collapsed-recent-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.collapsed-divider {
  width: 28px;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--glass-border) 18%, var(--glass-border) 82%, transparent 100%);
}

.collapsed-open-btn,
.collapsed-file {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.05);
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-sizing: border-box;
}

.collapsed-file.active {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.14) 78%, var(--glass-bg));
  border-color: rgba(var(--accent-primary-rgb), 0.24);
  box-shadow: 0 0 0 1px rgba(var(--accent-primary-rgb), 0.08);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
}

.action-card {
  min-height: 44px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.02));
  color: var(--text-main);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px;
  text-align: left;
  cursor: pointer;
}

.action-card.primary {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.14) 70%, var(--glass-bg));
}

.action-card:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.action-card-icon {
  width: 20px;
  height: 20px;
  border-radius: 8px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary);
  flex-shrink: 0;
}

.action-card-label {
  font-size: 11px;
  font-weight: var(--ui-font-weight-medium);
  line-height: 1.25;
  white-space: nowrap;
}

.section-card {
  margin: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
}

.section-card-header,
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.session-group.sidebar-section {
  padding: 12px;
}

.session-group.sidebar-section .group-header,
.file-group.sidebar-section .group-header {
  padding-bottom: 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.08));
  margin-bottom: 0;
}

.group-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.group-action-btn {
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  background: var(--icon-button-bg);
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: var(--transition-fast);
}

.group-action-btn:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.group-action-btn:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.group-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.section-card-title,
.group-title {
  font-size: 11px;
  font-weight: var(--ui-font-weight-bold);
  line-height: var(--panel-title-line-height);
  color: var(--accent-primary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.section-card-desc {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: var(--ui-font-size-xs);
}

.session-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.session-summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.session-badge,
.folder-badge,
.file-badge {
  width: fit-content;
  min-height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: var(--ui-font-weight-bold);
  letter-spacing: 0.03em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.session-badge {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.group-meta {
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.35;
}

.session-file {
  color: var(--text-main);
  font-weight: var(--ui-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-tip {
  font-size: var(--ui-font-size-xs);
  line-height: 1.5;
  color: var(--text-muted);
}

.section-link {
  min-height: var(--icon-button-size-sm);
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  background: var(--icon-button-bg);
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--ui-font-size-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.file-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px;
}

.file-group.sidebar-section {
  padding: 12px 12px 10px;
}

.file-group + .file-group {
  margin-top: 0;
}

.group-header {
  padding: 0;
}

.pinned-group .group-title {
  color: color-mix(in srgb, var(--accent-primary) 82%, #ffffff 18%);
}

.pinned-group .file-list {
  border-color: color-mix(in srgb, var(--glass-border) 78%, rgba(var(--accent-primary-rgb), 0.24));
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.05));
}

.recent-group .file-list {
  background: color-mix(in srgb, var(--glass-bg) 97%, rgba(var(--accent-primary-rgb), 0.015));
}

.workspace-group {
  gap: 10px;
}

.workspace-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 4px 10px;
}

.workspace-summary.collapsed {
  padding-top: 4px;
}

.workspace-path {
  color: var(--text-main);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.workspace-count {
  color: var(--text-muted);
  font-size: var(--ui-font-size-xs);
  white-space: nowrap;
  padding-top: 1px;
}

.workspace-toolbar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
  padding-top: 2px;
}

.workspace-icon-btn {
  width: var(--icon-button-size-md);
  height: var(--icon-button-size-md);
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  background: var(--icon-button-bg);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
}

.workspace-icon-btn:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.workspace-icon-btn:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.workspace-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workspace-dialog-message {
  margin: 0;
  color: var(--text-main);
  line-height: 1.6;
}

.workspace-dialog-input {
  width: 100%;
  min-height: var(--field-height-md);
  padding: 0 12px;
  border-radius: var(--field-radius);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.02));
  color: var(--text-main);
  font-size: var(--field-font-size);
}

.workspace-dialog-input:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.workspace-tree-shell {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--glass-bg) 97%, rgba(var(--accent-primary-rgb), 0.015));
  overflow: hidden;
}

.workspace-tree {
  display: flex;
  flex-direction: column;
  max-height: clamp(420px, 58vh, 780px);
  min-height: 340px;
  overflow: auto;
  padding: 6px 0;
}

.workspace-tree-empty {
  padding: 16px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.folder-list,
.grouped-files {
  display: flex;
  flex-direction: column;
}

.folder-list {
  gap: 8px;
}

.secondary-group .folder-list {
  gap: 6px;
}

.secondary-group {
  padding-top: 0;
}

.folder-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 97%, rgba(var(--accent-primary-rgb), 0.015));
  color: var(--text-main);
  cursor: pointer;
}

.folder-icon {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  color: var(--accent-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.folder-info,
.file-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.folder-name,
.file-name {
  font-weight: var(--ui-font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-name {
  font-size: 12px;
}

.folder-path,
.file-path {
  font-size: var(--ui-font-size-xs);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.85;
}

.folder-remove {
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}

.folder-badge,
.file-badge {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.08);
  flex-shrink: 0;
}

.folder-remove:hover,
.remove-btn:hover {
  color: var(--danger-soft-color);
  background: var(--danger-soft-bg);
  box-shadow: var(--interactive-hover-ring);
}

.file-list.group-drop-active {
  background: rgba(var(--accent-primary-rgb), 0.05);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-primary-rgb), 0.2);
}

.file-list {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.02));
}

.workspace-group .workspace-tree-shell,
.file-group .file-list,
.secondary-group .folder-list {
  margin-top: -2px;
}

.grouped-files {
  gap: 14px;
}

.sidebar-section--muted .group-title {
  color: color-mix(in srgb, var(--accent-primary) 56%, var(--text-muted));
}

.drop-placeholder {
  padding: 12px 16px 14px;
  color: var(--text-muted);
  font-size: 12px;
  border-bottom: 1px dashed var(--glass-border);
}

.recent-file {
  padding: 10px 12px 10px 14px;
  min-height: 52px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-main);
  transition: var(--transition-fast);
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}

.recent-file-icon,
.collapsed-recent-file-icon {
  opacity: 0.94;
  flex-shrink: 0;
}

.recent-file-icon {
  margin-left: -1px;
  margin-right: 2px;
}

.recent-file.pinned {
  background: rgba(var(--accent-primary-rgb), 0.04);
}

.recent-file.active {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.12) 76%, var(--glass-bg));
  box-shadow: inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.72);
}

.recent-file:hover {
  background: var(--interactive-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.recent-file.active:hover {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.14) 76%, var(--glass-bg));
}

.recent-file .file-name {
  font-size: 12.5px;
}

.recent-file.dragging {
  opacity: 0.58;
}

.recent-file.drag-target {
  border-color: var(--accent-primary);
  box-shadow: var(--interactive-drag-shadow);
}

.recent-file.drag-before::before,
.recent-file.drag-after::after {
  content: '';
  position: absolute;
  left: 16px;
  right: 12px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent-primary);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.12);
}

.recent-file.drag-before::before {
  top: -1px;
}

.recent-file.drag-after::after {
  bottom: -1px;
}

.recent-file:focus-visible {
  outline: none;
  background: var(--interactive-selected-bg);
  box-shadow: var(--field-focus-ring), inset 2px 0 0 rgba(var(--accent-primary-rgb), 0.52);
}

.recent-file.active .file-name {
  color: var(--accent-primary);
}

.pin-btn,
.remove-btn {
  opacity: 0;
  background: none;
  border: 1px solid transparent;
  color: var(--text-muted);
  cursor: pointer;
  width: var(--icon-button-size-sm);
  height: var(--icon-button-size-sm);
  border-radius: var(--icon-button-radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pin-btn.active,
.recent-file:hover .pin-btn,
.recent-file:hover .remove-btn,
.recent-file:focus-visible .pin-btn,
.recent-file:focus-visible .remove-btn {
  opacity: 1;
}

.pin-btn:hover {
  color: var(--icon-button-hover-color);
  background: var(--icon-button-hover-bg);
  box-shadow: var(--interactive-hover-ring);
}

.empty-state {
  padding: var(--empty-state-padding) 20px;
  text-align: center;
  color: var(--text-muted);
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--empty-state-gap);
  border: 1px dashed color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.14));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--glass-bg) 95%, rgba(var(--accent-primary-rgb), 0.02));
}

.empty-icon {
  width: var(--empty-state-icon-size);
  height: var(--empty-state-icon-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
}

.empty-state p {
  font-size: var(--empty-state-title-size);
  line-height: var(--panel-title-line-height);
  color: var(--text-main);
}

.context-menu {
  position: fixed;
  background: color-mix(in srgb, var(--glass-bg) 92%, var(--bg-deep));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--menu-card-shadow);
  padding: 4px 0;
  min-width: 144px;
  z-index: 5000;
  backdrop-filter: blur(10px);
}

.menu-item {
  min-height: var(--menu-item-min-height);
  padding: var(--menu-item-padding-y) var(--menu-item-padding-x);
  display: flex;
  align-items: center;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-main);
  cursor: pointer;
}

.menu-item:hover {
  background: var(--interactive-hover-bg);
  color: var(--accent-primary);
}

.menu-item.danger:hover {
  color: var(--danger-soft-color);
  background: var(--danger-soft-bg);
}

.menu-separator {
  height: 1px;
  background: var(--glass-border);
  margin: 4px 0;
}

@media (max-width: 720px) {
  .action-grid {
    grid-template-columns: 1fr;
  }
}

@container workspace-sidebar (max-width: 320px) {
  .panel-header {
    padding: 12px 14px;
  }

  .panel-content {
    padding-top: 12px;
    gap: 12px;
  }

  .sidebar-section {
    margin: 0 10px;
  }

  .file-group.sidebar-section,
  .session-group.sidebar-section {
    padding: 10px;
  }

  .action-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    padding: 8px;
  }

  .action-card {
    min-height: 40px;
    padding: 8px 6px;
  }

  .action-card-label {
    font-size: 10px;
  }

  .workspace-summary {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .workspace-count {
    padding-top: 0;
  }

  .workspace-toolbar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .workspace-icon-btn {
    width: 100%;
  }

  .group-header,
  .section-card-header {
    align-items: flex-start;
  }

  .group-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .recent-file {
    padding: 9px 10px;
    gap: 10px;
  }

  .folder-item {
    padding: 8px 9px;
    gap: 8px;
  }
}

@container workspace-sidebar (max-width: 300px) {
  .panel-subtitle,
  .group-meta,
  .workspace-count,
  .folder-path,
  .file-path,
  .section-card-desc,
  .session-tip {
    display: none;
  }

  .group-header,
  .section-card-header {
    align-items: center;
  }

  .recent-file,
  .folder-item {
    min-height: 44px;
  }

  .recent-file .file-name,
  .folder-name {
    font-size: 12px;
  }

  .workspace-summary {
    display: flex;
    align-items: center;
  }

  .workspace-path {
    font-size: 11px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .group-action-btn,
  .workspace-icon-btn {
    width: 30px;
    height: 30px;
  }
}

@container workspace-sidebar (max-width: 280px) {
  .action-grid {
    grid-template-columns: 1fr;
  }

  .action-card {
    justify-content: flex-start;
    padding-inline: 10px;
  }

  .workspace-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .folder-item,
  .recent-file {
    align-items: flex-start;
  }

  .folder-info,
  .file-info {
    min-width: 0;
  }

  .folder-path,
  .file-path {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .group-header,
  .section-card-header,
  .workspace-summary {
    gap: 6px;
  }
}

@container workspace-sidebar (max-width: 260px) {
  .action-card-label,
  .session-badge,
  .folder-badge,
  .file-badge,
  .section-link {
    display: none;
  }

  .action-card {
    justify-content: center;
    min-height: 38px;
    padding: 8px;
  }

  .action-card-icon {
    margin: 0;
  }

  .recent-file,
  .folder-item {
    gap: 6px;
  }

  .pin-btn,
  .remove-btn,
  .folder-remove {
    opacity: 1;
  }

  .workspace-path,
  .session-file {
    font-size: 11px;
  }
}

@container workspace-sidebar (max-width: 240px) {
  .panel-header {
    padding: 10px 10px;
  }

  .sidebar-section {
    margin: 0 8px;
  }

  .workspace-toolbar {
    grid-template-columns: 1fr;
  }

  .folder-item,
  .recent-file {
    padding: 8px;
  }

  .recent-file-icon,
  .folder-icon {
    transform: scale(0.92);
    transform-origin: top left;
  }

  .group-actions {
    gap: 4px;
  }

  .section-link {
    padding-inline: 8px;
  }

  .group-title,
  .section-card-title,
  .panel-title {
    font-size: 11px;
    letter-spacing: 0.02em;
  }
}
</style>

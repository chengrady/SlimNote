<template>
  <div class="editor-panel">
    <WelcomeWorkbench
      v-if="!activeTab"
      :last-opened-folder="lastOpenedFolder"
      :recent-quick-files="recentQuickFiles"
      :templates="templates"
      @new-file="newFile"
      @open-file="openFile"
      @open-folder="openFolder"
      @restore-last-folder="restoreLastFolder"
      @open-recent-file="openRecentFile"
      @create-template="createTemplate"
      @create-from-clipboard="createFromClipboard"
    />
    <div v-else class="editor-container">
      <EditorViewToolbar :file-type="activeTab.language?.toUpperCase?.() || 'TEXT'" @pin="openPinWindow" />
      <MarkdownModeToolbar
        v-if="activeTab.language === 'markdown'"
        :view-mode="markdownViewMode"
        :split-focus="markdownSplitFocus"
        @set-mode="setMarkdownViewMode"
        @set-split-focus="setMarkdownSplitFocus"
        @copy-plain="copyMarkdownAsPlainText"
        @copy-rich="copyMarkdownAsRichContent"
        @export-pdf="exportMarkdownAsPdf"
      />
      <JsonToolbar
        v-if="activeTab.language === 'json'"
        :show-tree="showJsonTree"
        @format="formatJson"
        @minify="minifyJson"
        @repair="repairJson"
        @unescape="unescapeJson"
        @expand-all="expandAll"
        @collapse-all="collapseAll"
        @open-converter="showConverter = true"
        @open-codegen="showCodeGen = true"
        @open-diff="showDiff = true"
        @export-image="exportAsImage"
        @toggle-tree="toggleJsonTree"
      />
      <SqlToolbar
        v-if="activeTab.language === 'sql'"
        :dialect-label="currentSqlDialectLabel"
        @snippet="insertSqlSnippet"
        @format="formatActiveSql"
        @minify="minifyActiveSql"
        @upper-keywords="uppercaseActiveSqlKeywords"
        @lower-keywords="lowercaseActiveSqlKeywords"
        @copy="copyActiveContent('SQL')"
      />
      <LogToolbar
        v-if="activeTab.language === 'log'"
        :filter-mode="logFilterMode"
        :wrap-enabled="logWrapEnabled"
        @set-filter="setLogFilterMode"
        @toggle-wrap="toggleLogWrap"
        @jump-level="jumpToLogLevel"
        @scroll-bottom="scrollLogToBottom"
        @copy="copyActiveContent('日志')"
      />
      <LogFilterPanel
        v-if="activeTab.language === 'log' && logFilterMode !== 'all'"
        :entries="filteredLogEntries"
        :summary="logFilterSummary"
        @reset="setLogFilterMode('all')"
        @jump="jumpToLogLine"
        @copy="copyFilteredLogResults"
        @export="exportFilteredLogResults"
      />
      <MarkdownFormatToolbar
        v-if="activeTab.language === 'markdown' && editorMode === 'source'"
        @bold="mdBold"
        @italic="mdItalic"
        @heading="mdHeading"
        @unordered-list="mdUnorderedList"
        @ordered-list="mdOrderedList"
        @check-list="mdCheckList"
        @code-block="mdCodeBlock"
        @quote="mdQuote"
        @link="mdLink"
        @image="mdImage"
        @table="mdTable"
        @horizontal-rule="mdHorizontalRule"
      />
      <div ref="editorWorkspaceRef" class="editor-workspace" :class="{ 'split-resizing': isSplitResizing, 'context-resizing': isContextSidebarResizing, 'with-context-sidebar': showContextSidebar }">
        <div class="document-workspace" :class="{ 'split-layout': isMarkdownSplitView, 'split-focus-editor': isMarkdownSplitView && markdownSplitFocus === 'editor', 'split-focus-preview': isMarkdownSplitView && markdownSplitFocus === 'preview' }">
          <div class="editor-pane" :style="splitEditorPaneStyle">
          <div class="monaco-wrapper">
            <!-- WYSIWYG Editor for Markdown -->
            <MilkdownEditor
              v-if="activeTab.language === 'markdown' && editorMode === 'wysiwyg'"
              ref="milkdownEditorRef"
              :modelValue="activeTab.content"
              :theme="settingsStore.settings.theme"
              :fontSize="activeTab.fontSize"
              @update:modelValue="handleContentChange"
            />
            <!-- Source Editor for all languages -->
            <MonacoEditor
              v-else
              ref="monacoEditorRef"
              :modelValue="activeTab.content"
              :language="activeTab.language"
              :fontSize="activeTab.fontSize"
              @update:modelValue="handleContentChange"
              @scroll="handleEditorScroll"
              @cursor-change="handleCursorChange"
              @change-font-size="handleFontSizeChange"
            />
          </div>
          <div v-if="activeTab.language === 'log'" class="log-stats-bar">
            <span class="log-stat-pill total">{{ t('editorPanel.logTotal') }} {{ logStats.total }}</span>
            <span class="log-stat-pill error">{{ t('editorPanel.logError') }} {{ logStats.error }}</span>
            <span class="log-stat-pill warn">{{ t('editorPanel.logWarn') }} {{ logStats.warn }}</span>
            <span class="log-stat-pill info">{{ t('editorPanel.logInfo') }} {{ logStats.info }}</span>
          </div>
          <!-- JSON 统计栏 -->
          <JsonStatsBar v-if="activeTab.language === 'json'" :content="activeTab.content" />
        </div>
          <div
            v-if="isMarkdownSplitView && markdownSplitFocus === 'both'"
            class="split-resizer"
            role="separator"
            :aria-label="t('editorPanel.splitResize')"
            aria-orientation="vertical"
            @mousedown="startSplitResize"
          >
            <div class="split-resizer-actions" @mousedown.stop>
              <button
                class="split-resizer-action split-resizer-action-editor"
                type="button"
                :title="t('editorPanel.focusSource')"
                :aria-label="t('editorPanel.focusSource')"
                @mousedown.stop.prevent
                @click.stop="setMarkdownSplitFocus('editor')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button
                class="split-resizer-action split-resizer-action-preview"
                type="button"
                :title="t('editorPanel.focusPreview')"
                :aria-label="t('editorPanel.focusPreview')"
                @mousedown.stop.prevent
                @click.stop="setMarkdownSplitFocus('preview')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-if="isMarkdownSplitView" class="preview-pane" :style="splitPreviewPaneStyle">
            <div class="preview-shell">
              <MarkdownPreview
                ref="markdownPreviewRef"
                :content="activeTab.content"
                @scroll="handlePreviewScroll"
                @active-heading-change="handleActiveHeadingChange"
                @heading-click="handlePreviewHeadingClick"
              />
            </div>
          </div>
        </div>
        <div
          v-if="showContextSidebar && !isContextSidebarCollapsed"
          class="context-resizer"
          role="separator"
          :aria-label="t('editorPanel.resizeContextSidebar')"
          aria-orientation="vertical"
          @mousedown="startContextResize"
        ></div>
        <ContextSidebar
          v-if="showContextSidebar"
          :title="contextSidebarTitle"
          :subtitle="contextSidebarSubtitle"
          :width="contextSidebarWidth"
          :collapsed="isContextSidebarCollapsed"
          @toggle-collapse="toggleContextSidebar"
        >
          <template #actions>
            <div v-if="activeTab.language === 'markdown'" class="context-tab-group">
              <button
                v-if="editorMode === 'source' && !isMarkdownSplitView"
                class="context-tab-button"
                :class="{ active: markdownContextTab === 'preview' }"
                type="button"
                @click="setMarkdownContextTab('preview')"
              >
                {{ t('editorPanel.preview') }}
              </button>
              <button
                class="context-tab-button"
                :class="{ active: markdownContextTab === 'outline' || isMarkdownSplitView || editorMode === 'wysiwyg' }"
                type="button"
                :disabled="markdownHeadings.length === 0"
                @click="setMarkdownContextTab('outline')"
              >
                {{ t('editorPanel.outline') }}
              </button>
            </div>
            <button
              v-else-if="activeTab.language === 'json'"
              class="context-header-button"
              type="button"
              @click="toggleJsonTree"
            >
              {{ t('editorPanel.hide') }}
            </button>
            <button
              v-else-if="activeTab.language === 'log' && logFilterMode !== 'all'"
              class="context-header-button"
              type="button"
              @click="setLogFilterMode('all')"
            >
              {{ t('editorPanel.clearFilter') }}
            </button>
          </template>

          <div v-if="showMarkdownContextPreview" class="context-preview-panel">
            <MarkdownPreview
              ref="markdownPreviewRef"
              class="context-markdown-preview"
              :content="activeTab.content"
              @scroll="handlePreviewScroll"
              @active-heading-change="handleActiveHeadingChange"
              @heading-click="handlePreviewHeadingClick"
            />
          </div>

          <MarkdownOutlinePanel
            v-else-if="showMarkdownOutlinePanel"
            :headings="markdownHeadings"
            :visible-headings="visibleMarkdownHeadings"
            :active-heading-id="activeHeadingId"
            :collapsed-heading-ids="collapsedHeadingIds"
            @jump="jumpToMarkdownHeading"
            @toggle-heading="toggleHeadingCollapse"
          />

          <JsonTreePanel
            v-else-if="showJsonContextTree"
            ref="jsonTreeRef"
            :content="activeTab.content"
            :selected-path="selectedJsonPath"
            @node-click="handleTreeNodeClick"
          />

          <div v-else-if="showLogContextPanel" class="log-context-panel">
            <div class="log-context-stats-grid">
              <div class="log-context-stat-card total">
                <span class="log-context-stat-label">{{ t('editorPanel.logTotalLines') }}</span>
                <strong>{{ logStats.total }}</strong>
              </div>
              <div class="log-context-stat-card error">
                <span class="log-context-stat-label">{{ t('editorPanel.logError') }}</span>
                <strong>{{ logStats.error }}</strong>
              </div>
              <div class="log-context-stat-card warn">
                <span class="log-context-stat-label">{{ t('editorPanel.logWarn') }}</span>
                <strong>{{ logStats.warn }}</strong>
              </div>
              <div class="log-context-stat-card info">
                <span class="log-context-stat-label">{{ t('editorPanel.logInfo') }}</span>
                <strong>{{ logStats.info }}</strong>
              </div>
            </div>

            <div v-if="logFilterMode === 'all'" class="log-context-empty-state">
              <p>{{ t('editorPanel.logFilterHint') }}</p>
              <div class="log-context-shortcuts">
                <button type="button" @click="setLogFilterMode('error')">{{ t('editorPanel.viewError') }}</button>
                <button type="button" @click="setLogFilterMode('warn')">{{ t('editorPanel.viewWarn') }}</button>
                <button type="button" @click="setLogFilterMode('issues')">{{ t('editorPanel.viewIssues') }}</button>
              </div>
            </div>

            <LogFilterPanel
              v-else
              embedded
              :entries="filteredLogEntries"
              :summary="logFilterSummary"
              @reset="setLogFilterMode('all')"
              @jump="jumpToLogLine"
              @copy="copyFilteredLogResults"
              @export="exportFilteredLogResults"
            />
          </div>
        </ContextSidebar>
      </div>
    </div>
    <ModalDialog
      :show="showErrorDialog"
      :title="t('editorPanel.errorTitle')"
      :message="errorMessage"
      @close="showErrorDialog = false"
      @confirm="showErrorDialog = false"
    />
    <!-- JSON 格式转换弹窗 -->
    <JsonConverter
      v-if="showConverter"
      :content="activeTab?.content || ''"
      @close="showConverter = false"
    />
    <!-- 代码生成弹窗 -->
    <CodeGenPanel
      v-if="showCodeGen"
      :content="activeTab?.content || ''"
      @close="showCodeGen = false"
    />
    <!-- JSON Diff 弹窗 -->
    <JsonDiffPanel
      v-if="showDiff"
      :content="activeTab?.content || ''"
      @close="showDiff = false"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '../stores/editor'
import { useFileStore } from '../stores/file'
import { useSettingsStore } from '../stores/settings'
import MonacoEditor from './MonacoEditor.vue'
import ContextSidebar from './ContextSidebar.vue'
import JsonToolbar from './JsonToolbar.vue'
import LogToolbar from './LogToolbar.vue'
import MarkdownFormatToolbar from './MarkdownFormatToolbar.vue'
import MarkdownPreview from './MarkdownPreview.vue'
import MarkdownModeToolbar from './MarkdownModeToolbar.vue'
import MarkdownOutlinePanel from './MarkdownOutlinePanel.vue'
import MilkdownEditor from './MilkdownEditor.vue'
import EditorViewToolbar from './EditorViewToolbar.vue'
import LogFilterPanel from './LogFilterPanel.vue'
import ModalDialog from './ModalDialog.vue'
import SqlToolbar from './SqlToolbar.vue'
import JsonTreePanel from './JsonTreePanel.vue'
import JsonStatsBar from './JsonStatsBar.vue'
import JsonConverter from './JsonConverter.vue'
import CodeGenPanel from './CodeGenPanel.vue'
import JsonDiffPanel from './JsonDiffPanel.vue'
import WelcomeWorkbench from './WelcomeWorkbench.vue'
import { repairAndFormat } from '../utils/jsonRepair'
import { exportCodeToImage, downloadImage } from '../utils/exportImage'
import { buildMarkdownClipboardPayload, buildMarkdownPdfDocument } from '../utils/markdownPdf'
import { formatSql, minifySql, transformSqlKeywords } from '../utils/sqlFormatter'

const { t } = useI18n()

const editorStore = useEditorStore()
const fileStore = useFileStore()
const settingsStore = useSettingsStore()
const CONTEXT_SIDEBAR_COLLAPSED_STORAGE_KEY_PREFIX = 'slimnote:context-sidebar-collapsed:'
const CONTEXT_SIDEBAR_WIDTH_STORAGE_KEY_PREFIX = 'slimnote:context-sidebar-width:'
const MARKDOWN_VIEW_MODE_STORAGE_KEY = 'slimnote:markdown-view-mode'
const MARKDOWN_CONTEXT_TAB_STORAGE_KEY = 'slimnote:markdown-context-tab'
const MARKDOWN_SPLIT_RATIO_STORAGE_KEY = 'slimnote:markdown-split-ratio'
const MARKDOWN_SPLIT_FOCUS_STORAGE_KEY = 'slimnote:markdown-split-focus'
const CONTEXT_SIDEBAR_MIN_WIDTH = 280
const CONTEXT_SIDEBAR_JSON_MIN_WIDTH = 420
const CONTEXT_SIDEBAR_DEFAULT_WIDTH = 320
const CONTEXT_SIDEBAR_MAX_WIDTH = 720
const CONTEXT_SIDEBAR_JSON_MAX_WIDTH = 1080
const CONTEXT_SIDEBAR_JSON_DEFAULT_RATIO = 0.62
const CONTEXT_SIDEBAR_JSON_MAX_RATIO = 0.72
const showPreview = ref(false)
const monacoEditorRef = ref(null)
const milkdownEditorRef = ref(null)
const markdownPreviewRef = ref(null)
const editorWorkspaceRef = ref(null)
const jsonTreeRef = ref(null)
const showErrorDialog = ref(false)
const errorMessage = ref('')
// Editor mode: 'wysiwyg' or 'source'
const editorMode = ref('source')
const splitRatio = ref(0.5)
const isSplitResizing = ref(false)
const isContextSidebarResizing = ref(false)
const contextSidebarWidth = ref(CONTEXT_SIDEBAR_DEFAULT_WIDTH)
const markdownSplitFocus = ref(localStorage.getItem(MARKDOWN_SPLIT_FOCUS_STORAGE_KEY) === 'editor' || localStorage.getItem(MARKDOWN_SPLIT_FOCUS_STORAGE_KEY) === 'preview' ? localStorage.getItem(MARKDOWN_SPLIT_FOCUS_STORAGE_KEY) : 'both')
const activeHeadingId = ref('')
const collapsedHeadingIds = ref([])
const isContextSidebarCollapsed = ref(false)
const markdownContextTab = ref(localStorage.getItem(MARKDOWN_CONTEXT_TAB_STORAGE_KEY) === 'outline' ? 'outline' : 'preview')
const logWrapEnabled = ref(true)
const logFilterMode = ref('all')

// JSON 编辑器增强功能状态
const showJsonTree = ref(true)
const showConverter = ref(false)
const showCodeGen = ref(false)
const showDiff = ref(false)
const selectedJsonPath = ref([])
const templates = [
  {
    title: 'README.md',
    description: 'Markdown 文档模板',
    content: '# 项目标题\n\n## 简介\n\n- 目标\n- 功能\n- 用法\n'
  },
  {
    title: 'data.json',
    description: 'JSON 示例模板',
    content: '{\n  "name": "SlimNote",\n  "version": "1.0.0",\n  "features": ["preview", "json", "markdown"]\n}'
  },
  {
    title: 'query.sql',
    description: 'SQL 查询模板',
    content: 'SELECT\n  id,\n  name,\n  created_at\nFROM users\nWHERE created_at >= CURRENT_DATE\nORDER BY created_at DESC;\n'
  },
  {
    title: 'app.log',
    description: '日志排查模板',
    content: `${new Date().toISOString().replace('T', ' ').slice(0, 19)} INFO SlimNote ready\n${new Date().toISOString().replace('T', ' ').slice(0, 19)} WARN Waiting for events\n${new Date().toISOString().replace('T', ' ').slice(0, 19)} ERROR Sample stack line`
  },
  {
    title: 'notes.txt',
    description: '通用文本模板',
    content: '会议记录\n========\n\n- 待办\n- 决策\n- 下一步\n'
  }
]

const activeTab = computed(() => editorStore.getActiveTab())
const recentQuickFiles = computed(() => fileStore.recentFiles.slice(0, 4))
const lastOpenedFolder = computed(() => localStorage.getItem('lastOpenedFolder') || '')
const currentContextType = computed(() => {
  const language = activeTab.value?.language
  if (language === 'markdown' || language === 'json' || language === 'log') {
    return language
  }
  return 'default'
})
const currentContextSidebarStorageKey = computed(() => `${CONTEXT_SIDEBAR_COLLAPSED_STORAGE_KEY_PREFIX}${currentContextType.value}`)
const isMarkdownSplitView = computed(() => activeTab.value?.language === 'markdown' && editorMode.value === 'source' && showPreview.value)
const showMarkdownContextPreview = computed(() => activeTab.value?.language === 'markdown' && editorMode.value === 'source' && !isMarkdownSplitView.value && markdownContextTab.value === 'preview')
const showMarkdownOutlinePanel = computed(() => activeTab.value?.language === 'markdown' && (!showMarkdownContextPreview.value || markdownContextTab.value === 'outline' || isMarkdownSplitView.value || editorMode.value === 'wysiwyg'))
const showJsonContextTree = computed(() => activeTab.value?.language === 'json' && showJsonTree.value)
const showLogContextPanel = computed(() => activeTab.value?.language === 'log')
const showContextSidebar = computed(() => showMarkdownContextPreview.value || showMarkdownOutlinePanel.value || showJsonContextTree.value || showLogContextPanel.value)
const contextSidebarTitle = computed(() => {
  if (activeTab.value?.language === 'markdown') {
    return markdownContextTab.value === 'preview' && !isMarkdownSplitView.value && editorMode.value === 'source'
      ? t('editorPanel.contextMarkdownPreview')
      : t('editorPanel.contextMarkdownOutline')
  }
  if (activeTab.value?.language === 'json') {
    return t('editorPanel.contextJson')
  }
  if (activeTab.value?.language === 'log') {
    return t('editorPanel.contextLog')
  }
  return t('contextSidebar.title')
})
const contextSidebarSubtitle = computed(() => {
  if (activeTab.value?.language === 'markdown') {
    if (markdownContextTab.value === 'preview' && !isMarkdownSplitView.value && editorMode.value === 'source') {
      return t('editorPanel.contextMarkdownSync')
    }
    return markdownHeadings.value.length > 0
      ? t('editorPanel.contextHeadingCount', { count: markdownHeadings.value.length })
      : t('editorPanel.contextNoHeadings')
  }
  if (activeTab.value?.language === 'json') {
    return t('editorPanel.contextJsonSync')
  }
  if (activeTab.value?.language === 'log') {
    return logFilterMode.value === 'all' ? t('editorPanel.contextLogSummary') : logFilterSummary.value
  }
  return ''
})
const shouldSyncMarkdownPreview = computed(() => activeTab.value?.language === 'markdown' && editorMode.value === 'source' && (isMarkdownSplitView.value || showMarkdownContextPreview.value))
const filteredLogEntries = computed(() => {
  if (activeTab.value?.language !== 'log' || logFilterMode.value === 'all') {
    return []
  }

  return (activeTab.value.content || '')
    .split('\n')
    .map((text, index) => {
      const upperLine = text.toUpperCase()
      const level = upperLine.includes('ERROR') ? 'ERROR' : upperLine.includes('WARN') ? 'WARN' : upperLine.includes('INFO') ? 'INFO' : 'LOG'
      return {
        lineNumber: index + 1,
        text,
        level,
        levelClass: level.toLowerCase()
      }
    })
    .filter((entry) => matchesLogFilter(entry.text, logFilterMode.value))
})
const logFilterSummary = computed(() => {
  if (logFilterMode.value === 'error') {
    return t('editorPanel.logFilterErrorSummary', { count: filteredLogEntries.value.length })
  }
  if (logFilterMode.value === 'warn') {
    return t('editorPanel.logFilterWarnSummary', { count: filteredLogEntries.value.length })
  }
  if (logFilterMode.value === 'issues') {
    return t('editorPanel.logFilterIssuesSummary', { count: filteredLogEntries.value.length })
  }
  return ''
})
const currentSqlDialectLabel = computed(() => {
  const dialectMap = {
    mysql: 'MySQL',
    postgresql: 'PostgreSQL',
    sqlite: 'SQLite',
    sqlserver: 'SQL Server'
  }
  return dialectMap[activeTab.value?.sqlDialect || 'mysql'] || 'MySQL'
})
const logStats = computed(() => {
  if (activeTab.value?.language !== 'log') {
    return { total: 0, error: 0, warn: 0, info: 0 }
  }

  return (activeTab.value.content || '').split('\n').reduce((stats, line) => {
    const upperLine = line.toUpperCase()
    if (line.trim()) {
      stats.total += 1
    }
    if (upperLine.includes('ERROR')) {
      stats.error += 1
    }
    if (upperLine.includes('WARN')) {
      stats.warn += 1
    }
    if (upperLine.includes('INFO')) {
      stats.info += 1
    }
    return stats
  }, { total: 0, error: 0, warn: 0, info: 0 })
})
const markdownHeadings = computed(() => {
  if (activeTab.value?.language !== 'markdown') {
    return []
  }

  const slugCounts = new Map()
  const headings = (activeTab.value.content || '')
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.*)$/)
      if (!match) return null

      const level = match[1].length
      const text = match[2].trim().replace(/#+\s*$/, '').trim()
      if (!text) return null

      const baseId = slugifyHeading(text)
      const count = slugCounts.get(baseId) || 0
      slugCounts.set(baseId, count + 1)

      return {
        id: count === 0 ? baseId : `${baseId}-${count}`,
        text,
        level,
        line: index + 1
      }
    })
    .filter(Boolean)

  return headings.map((heading, index) => {
    const parent = [...headings].slice(0, index).reverse().find((candidate) => candidate.level < heading.level)
    const hasChildren = headings.slice(index + 1).some((candidate) => {
      if (candidate.level <= heading.level) {
        return false
      }

      const intermediate = headings.slice(index + 1, headings.indexOf(candidate))
      return !intermediate.some((item) => item.level <= heading.level)
    })

    const ancestorIds = []
    let currentParent = parent
    while (currentParent) {
      ancestorIds.unshift(currentParent.id)
      currentParent = headings.slice(0, headings.indexOf(currentParent)).reverse().find((candidate) => candidate.level < currentParent.level)
    }

    return {
      ...heading,
      parentId: parent?.id || null,
      ancestorIds,
      hasChildren
    }
  })
})
const visibleMarkdownHeadings = computed(() => markdownHeadings.value.filter((heading) => {
  return !heading.ancestorIds.some((ancestorId) => collapsedHeadingIds.value.includes(ancestorId))
}))
const splitEditorPaneStyle = computed(() => {
  if (!isMarkdownSplitView.value) return undefined

  if (markdownSplitFocus.value === 'preview') {
    return {
      width: '0%',
      flex: '0 0 0%',
      minWidth: 0,
      opacity: 0,
      pointerEvents: 'none',
      overflow: 'hidden'
    }
  }

  if (markdownSplitFocus.value === 'editor') {
    return {
      width: '100%',
      flex: '1 1 100%'
    }
  }

  const width = `${Math.round(splitRatio.value * 1000) / 10}%`
  return {
    width,
    flex: `0 0 ${width}`
  }
})
const splitPreviewPaneStyle = computed(() => {
  if (!isMarkdownSplitView.value) return undefined

  if (markdownSplitFocus.value === 'editor') {
    return {
      width: '0%',
      flex: '0 0 0%',
      minWidth: 0,
      opacity: 0,
      pointerEvents: 'none',
      overflow: 'hidden',
      borderLeft: 'none',
      boxShadow: 'none'
    }
  }

  if (markdownSplitFocus.value === 'preview') {
    return {
      width: '100%',
      flex: '1 1 100%'
    }
  }

  const width = `${Math.round((1 - splitRatio.value) * 1000) / 10}%`
  return {
    width,
    flex: `0 0 ${width}`
  }
})
const markdownViewMode = computed(() => {
  if (activeTab.value?.language !== 'markdown') {
    return 'source'
  }

  if (editorMode.value === 'wysiwyg') {
    return 'wysiwyg'
  }

  return showPreview.value ? 'split' : 'source'
})
function handleEditorScroll(e) {
  if (shouldSyncMarkdownPreview.value && markdownPreviewRef.value) {
    markdownPreviewRef.value.setScrollRatio(e.ratio)
  }
}

function handlePreviewScroll(e) {
  if (shouldSyncMarkdownPreview.value && monacoEditorRef.value) {
    monacoEditorRef.value.setScrollRatio(e.ratio)
  }
}

function handleCursorChange(e) {
  editorStore.updateCursorPosition(e.line, e.column)
}

function handleFontSizeChange(size) {
  if (activeTab.value) {
    editorStore.updateTabFontSize(activeTab.value.id, size)
  }
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/<[^>]+>/g, '')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section'
}

function clampSplitRatio(nextRatio) {
  return Math.min(0.75, Math.max(0.25, nextRatio))
}

function startSplitResize(e) {
  if (!isMarkdownSplitView.value || markdownSplitFocus.value !== 'both') return
  isSplitResizing.value = true
  e.preventDefault()
}

function handleSplitMouseMove(e) {
  if (!isSplitResizing.value || markdownSplitFocus.value !== 'both' || !editorWorkspaceRef.value || window.innerWidth <= 1180) {
    return
  }

  const bounds = editorWorkspaceRef.value.getBoundingClientRect()
  if (bounds.width <= 0) return

  splitRatio.value = clampSplitRatio((e.clientX - bounds.left) / bounds.width)
}

function stopSplitResize() {
  if (!isSplitResizing.value) return

  isSplitResizing.value = false
  localStorage.setItem(MARKDOWN_SPLIT_RATIO_STORAGE_KEY, String(splitRatio.value))
}

function getContextSidebarStorageKey(type = currentContextType.value) {
  return `${CONTEXT_SIDEBAR_WIDTH_STORAGE_KEY_PREFIX}${type || 'default'}`
}

function getContextSidebarBounds(type = currentContextType.value) {
  const workspaceWidth = Math.max(0, editorWorkspaceRef.value?.getBoundingClientRect().width || window.innerWidth || 0)
  const minWidth = type === 'json' ? CONTEXT_SIDEBAR_JSON_MIN_WIDTH : CONTEXT_SIDEBAR_MIN_WIDTH
  const maxWidth = type === 'json'
    ? Math.max(minWidth, Math.min(CONTEXT_SIDEBAR_JSON_MAX_WIDTH, Math.floor(workspaceWidth * CONTEXT_SIDEBAR_JSON_MAX_RATIO)))
    : Math.max(minWidth, Math.min(CONTEXT_SIDEBAR_MAX_WIDTH, Math.floor(workspaceWidth * 0.58)))

  return {
    workspaceWidth,
    minWidth,
    maxWidth
  }
}

function clampContextSidebarWidth(nextWidth, type = currentContextType.value) {
  const { minWidth, maxWidth } = getContextSidebarBounds(type)
  return Math.max(minWidth, Math.min(maxWidth, nextWidth))
}

function getDefaultContextSidebarWidth(type = currentContextType.value) {
  const { workspaceWidth, minWidth, maxWidth } = getContextSidebarBounds(type)

  if (type === 'json') {
    return clampContextSidebarWidth(Math.floor(workspaceWidth * CONTEXT_SIDEBAR_JSON_DEFAULT_RATIO), type)
  }

  if (type === 'log') {
    return clampContextSidebarWidth(360, type)
  }

  return Math.max(minWidth, Math.min(maxWidth, CONTEXT_SIDEBAR_DEFAULT_WIDTH))
}

function loadContextSidebarWidth(type = currentContextType.value) {
  const savedWidth = Number(localStorage.getItem(getContextSidebarStorageKey(type)))
  if (Number.isFinite(savedWidth) && savedWidth > 0) {
    return clampContextSidebarWidth(savedWidth, type)
  }

  return getDefaultContextSidebarWidth(type)
}

function saveContextSidebarWidth(type = currentContextType.value, width = contextSidebarWidth.value) {
  localStorage.setItem(getContextSidebarStorageKey(type), String(clampContextSidebarWidth(width, type)))
}

function startContextResize(e) {
  if (!showContextSidebar.value || isContextSidebarCollapsed.value || !editorWorkspaceRef.value) return

  isContextSidebarResizing.value = true
  e.preventDefault()
}

function handleContextSidebarMouseMove(e) {
  if (!isContextSidebarResizing.value || !editorWorkspaceRef.value) return

  const bounds = editorWorkspaceRef.value.getBoundingClientRect()
  if (bounds.width <= 0) return

  const nextWidth = bounds.right - e.clientX
  contextSidebarWidth.value = clampContextSidebarWidth(nextWidth)
}

function stopContextResize() {
  if (!isContextSidebarResizing.value) return

  isContextSidebarResizing.value = false
  saveContextSidebarWidth(currentContextType.value, contextSidebarWidth.value)
}

function handleActiveHeadingChange(id) {
  activeHeadingId.value = id || ''
  expandHeadingAncestors(id)
}

function toggleHeadingCollapse(heading) {
  if (!heading?.hasChildren) return

  if (collapsedHeadingIds.value.includes(heading.id)) {
    collapsedHeadingIds.value = collapsedHeadingIds.value.filter((item) => item !== heading.id)
    return
  }

  collapsedHeadingIds.value = [...collapsedHeadingIds.value, heading.id]
}

function expandHeadingAncestors(id) {
  const heading = markdownHeadings.value.find((item) => item.id === id)
  if (!heading?.ancestorIds?.length) return

  collapsedHeadingIds.value = collapsedHeadingIds.value.filter((item) => !heading.ancestorIds.includes(item))
}

function handlePreviewHeadingClick(id) {
  const heading = markdownHeadings.value.find((item) => item.id === id)
  if (!heading) return

  activeHeadingId.value = heading.id
  expandHeadingAncestors(heading.id)
  monacoEditorRef.value?.jumpToLine(heading.line)
}

function toggleContextSidebar() {
  if (isContextSidebarCollapsed.value) {
    contextSidebarWidth.value = loadContextSidebarWidth(currentContextType.value)
  }

  isContextSidebarCollapsed.value = !isContextSidebarCollapsed.value
  localStorage.setItem(currentContextSidebarStorageKey.value, isContextSidebarCollapsed.value ? '1' : '0')
}

function setMarkdownSplitFocus(focus) {
  if (!['both', 'editor', 'preview'].includes(focus)) return

  markdownSplitFocus.value = focus
  localStorage.setItem(MARKDOWN_SPLIT_FOCUS_STORAGE_KEY, focus)
}

function setMarkdownContextTab(tab, persist = true) {
  if (!['preview', 'outline'].includes(tab)) return

  markdownContextTab.value = tab
  if (persist) {
    localStorage.setItem(MARKDOWN_CONTEXT_TAB_STORAGE_KEY, tab)
  }
}

function jumpToMarkdownHeading(heading) {
  if (!heading) return

  activeHeadingId.value = heading.id
  expandHeadingAncestors(heading.id)
  monacoEditorRef.value?.jumpToLine(heading.line)
  markdownPreviewRef.value?.scrollToHeading(heading.id)
}

async function openPinWindow() {
  if (!activeTab.value) return
  await window.electronAPI.createPinWindow(activeTab.value.content, settingsStore.settings.theme, activeTab.value.language)
}

// JSON Toolbar Actions
function formatJson() {
  if (!activeTab.value) return
  try {
    const parsed = JSON.parse(activeTab.value.content)
    const formatted = JSON.stringify(parsed, null, 2)
    editorStore.updateTabContent(activeTab.value.id, formatted)
  } catch (e) {
    console.error('Invalid JSON', e)
    errorMessage.value = `JSON 格式错误: ${e.message}`
    showErrorDialog.value = true
  }
}

function minifyJson() {
  if (!activeTab.value) return
  try {
    const parsed = JSON.parse(activeTab.value.content)
    const minified = JSON.stringify(parsed)
    editorStore.updateTabContent(activeTab.value.id, minified)
  } catch (e) {
    console.error('Invalid JSON', e)
    errorMessage.value = `JSON 格式错误: ${e.message}`
    showErrorDialog.value = true
  }
}

function unescapeJson() {
  if (!activeTab.value) return
  try {
    const content = activeTab.value.content.trim()
    const MAX_UNESCAPE_DEPTH = 5

    const tryParseJsonLikeString = (value) => {
      if (typeof value !== 'string') {
        return { success: false, value }
      }

      const normalized = value.trim()
      if (!normalized) {
        return { success: false, value }
      }

      const parseAttempts = [
        () => JSON.parse(normalized)
      ]

      if (!(normalized.startsWith('"') && normalized.endsWith('"'))) {
        parseAttempts.push(() => JSON.parse(`"${normalized}"`))
      }

      let lastError = null
      for (const parseValue of parseAttempts) {
        try {
          return {
            success: true,
            value: parseValue()
          }
        } catch (error) {
          lastError = error
        }
      }

      return {
        success: false,
        value,
        error: lastError
      }
    }

    const applyDecodedContent = (value) => {
      if (value !== null && typeof value === 'object') {
        editorStore.updateTabContent(activeTab.value.id, JSON.stringify(value, null, 2))
        return true
      }

      if (typeof value !== 'string') {
        editorStore.updateTabContent(activeTab.value.id, String(value))
        return true
      }

      const normalized = value.trim()
      if (!normalized) {
        editorStore.updateTabContent(activeTab.value.id, value)
        return true
      }

      try {
        const parsed = JSON.parse(normalized)
        if (parsed !== null && typeof parsed === 'object') {
          editorStore.updateTabContent(activeTab.value.id, JSON.stringify(parsed, null, 2))
          return true
        }
      } catch {
        // Keep plain decoded text when it is not JSON.
      }

      editorStore.updateTabContent(activeTab.value.id, value)
      return true
    }

    let currentValue = content
    let decoded = false
    let lastError = null

    for (let depth = 0; depth < MAX_UNESCAPE_DEPTH; depth += 1) {
      const result = tryParseJsonLikeString(currentValue)
      if (!result.success) {
        lastError = result.error || lastError
        break
      }

      decoded = true
      currentValue = result.value

      if (currentValue === null || typeof currentValue !== 'string') {
        break
      }
    }

    if (!decoded) {
      throw lastError || new Error('内容不是有效的 JSON 或转义字符串')
    }

    applyDecodedContent(currentValue)
  } catch (e) {
    console.error('Failed to unescape', e)
    errorMessage.value = `无法去除转义: ${e.message}`
    showErrorDialog.value = true
  }
}

function expandAll() {
  monacoEditorRef.value?.triggerAction('editor.unfoldAll')
}

function collapseAll() {
  monacoEditorRef.value?.triggerAction('editor.foldAll')
}

// JSON 修复
function repairJson() {
  if (!activeTab.value) return
  const result = repairAndFormat(activeTab.value.content)
  if (result.success) {
    editorStore.updateTabContent(activeTab.value.id, result.result)
  } else {
    errorMessage.value = result.error
    showErrorDialog.value = true
  }
}

// 处理树节点点击
function handleTreeNodeClick(path, line) {
  selectedJsonPath.value = Array.isArray(path) ? [...path] : []

  if (monacoEditorRef.value && line) {
    monacoEditorRef.value.jumpToLine(line)
  }
}

// 切换树形视图
function toggleJsonTree() {
  showJsonTree.value = !showJsonTree.value
}

watch(() => activeTab.value?.id, () => {
  selectedJsonPath.value = []
})

watch(() => activeTab.value?.content, () => {
  if (activeTab.value?.language === 'json') {
    selectedJsonPath.value = []
  }
})

// 导出为图片
async function exportAsImage() {
  if (!activeTab.value) return
  try {
    const blob = await exportCodeToImage(activeTab.value.content, {
      theme: settingsStore.settings.theme,
      fontSize: activeTab.fontSize || 14,
      lineNumbers: true
    })
    downloadImage(blob, `json-export-${Date.now()}.png`)
  } catch (e) {
    errorMessage.value = `导出失败: ${e.message}`
    showErrorDialog.value = true
  }
}

function transformActiveContent(transformer) {
  if (!activeTab.value || !monacoEditorRef.value) return

  const selection = monacoEditorRef.value.getSelection()
  if (selection) {
    monacoEditorRef.value.replaceSelection(transformer(selection))
    return
  }

  editorStore.updateTabContent(activeTab.value.id, transformer(activeTab.value.content))
}

function insertSqlSnippet(type) {
  if (!activeTab.value || activeTab.value.language !== 'sql' || !monacoEditorRef.value) return

  const snippets = {
    select: 'SELECT\n  id,\n  name\nFROM table_name\nWHERE condition = true\nORDER BY created_at DESC;\n',
    insert: 'INSERT INTO table_name (column_a, column_b)\nVALUES (value_a, value_b);\n',
    update: 'UPDATE table_name\nSET column_a = value_a,\n    updated_at = CURRENT_TIMESTAMP\nWHERE id = target_id;\n'
  }

  monacoEditorRef.value.replaceSelection(snippets[type] || snippets.select)
}

async function copyActiveContent(label = '内容') {
  if (!activeTab.value) return

  try {
    await navigator.clipboard.writeText(activeTab.value.content || '')
  } catch (e) {
    errorMessage.value = `复制${label}失败: ${e.message}`
    showErrorDialog.value = true
  }
}

function getMarkdownClipboardPayload() {
  if (!activeTab.value || activeTab.value.language !== 'markdown') {
    return { text: '', html: '' }
  }

  return buildMarkdownClipboardPayload({
    content: activeTab.value.content || '',
    sourcePath: activeTab.value.filePath || ''
  })
}

async function copyMarkdownAsPlainText() {
  const { text } = getMarkdownClipboardPayload()
  if (!text) {
    errorMessage.value = '当前 Markdown 暂无可复制内容。'
    showErrorDialog.value = true
    return
  }

  try {
    await navigator.clipboard.writeText(text)
  } catch (e) {
    errorMessage.value = `复制 Markdown 纯文本失败: ${e.message}`
    showErrorDialog.value = true
  }
}

async function copyMarkdownAsRichContent() {
  const { text, html } = getMarkdownClipboardPayload()
  if (!text && !html) {
    errorMessage.value = '当前 Markdown 暂无可复制内容。'
    showErrorDialog.value = true
    return
  }

  try {
    window.electronAPI.writeClipboard({ text, html })
  } catch (e) {
    errorMessage.value = `复制到 Word/微信失败: ${e.message}`
    showErrorDialog.value = true
  }
}

function formatActiveSql() {
  if (!activeTab.value || activeTab.value.language !== 'sql') return
  transformActiveContent((content) => formatSql(content))
}

function minifyActiveSql() {
  if (!activeTab.value || activeTab.value.language !== 'sql') return
  transformActiveContent((content) => minifySql(content))
}

function uppercaseActiveSqlKeywords() {
  if (!activeTab.value || activeTab.value.language !== 'sql') return
  transformActiveContent((content) => transformSqlKeywords(content, 'upper'))
}

function lowercaseActiveSqlKeywords() {
  if (!activeTab.value || activeTab.value.language !== 'sql') return
  transformActiveContent((content) => transformSqlKeywords(content, 'lower'))
}

function toggleLogWrap() {
  logWrapEnabled.value = !logWrapEnabled.value
  monacoEditorRef.value?.setWordWrap(logWrapEnabled.value)
}

function matchesLogFilter(text, mode) {
  const upperLine = String(text || '').toUpperCase()

  switch (mode) {
    case 'error':
      return upperLine.includes('ERROR')
    case 'warn':
      return upperLine.includes('WARN')
    case 'issues':
      return upperLine.includes('ERROR') || upperLine.includes('WARN')
    default:
      return true
  }
}

function setLogFilterMode(mode) {
  logFilterMode.value = mode
}

function getFilteredLogContent() {
  return filteredLogEntries.value.map((entry) => entry.text).join('\n')
}

async function copyFilteredLogResults() {
  if (!activeTab.value || activeTab.value.language !== 'log' || logFilterMode.value === 'all') return

  const content = getFilteredLogContent()
  if (!content) {
    errorMessage.value = '当前过滤结果为空，暂无可复制内容。'
    showErrorDialog.value = true
    return
  }

  try {
    await navigator.clipboard.writeText(content)
  } catch (e) {
    errorMessage.value = `复制过滤结果失败: ${e.message}`
    showErrorDialog.value = true
  }
}

async function exportFilteredLogResults() {
  if (!activeTab.value || activeTab.value.language !== 'log' || logFilterMode.value === 'all') return

  const content = getFilteredLogContent()
  if (!content) {
    errorMessage.value = '当前过滤结果为空，暂无可导出内容。'
    showErrorDialog.value = true
    return
  }

  try {
    const baseName = (activeTab.value.filePath || activeTab.value.title || 'filtered-log').replace(/\.[^.]+$/, '')
    const result = await window.electronAPI.saveFileDialog(`${baseName}-${logFilterMode.value}.log`)
    if (result.canceled || !result.filePath) {
      return
    }

    await window.electronAPI.writeFile(result.filePath, content, activeTab.value.encoding || 'utf8')
  } catch (e) {
    errorMessage.value = `导出过滤结果失败: ${e.message}`
    showErrorDialog.value = true
  }
}

function jumpToLogLevel(level) {
  if (!activeTab.value || activeTab.value.language !== 'log') return
  const found = monacoEditorRef.value?.findNext(`\\b${level}\\b`, { isRegex: true, matchCase: false })
  if (!found) {
    errorMessage.value = `当前日志中未找到 ${level}`
    showErrorDialog.value = true
  }
}

function scrollLogToBottom() {
  if (!activeTab.value || activeTab.value.language !== 'log') return
  monacoEditorRef.value?.scrollToBottom()
}

function jumpToLogLine(lineNumber) {
  if (!activeTab.value || activeTab.value.language !== 'log') return
  monacoEditorRef.value?.jumpToLine(lineNumber)
}

async function exportMarkdownAsPdf() {
  if (!activeTab.value || activeTab.value.language !== 'markdown') return

  try {
    const baseName = getFileName(activeTab.value.filePath || activeTab.value.title || 'markdown')
    const defaultFileName = baseName.replace(/\.[^.]+$/, '') || 'markdown'
    const defaultExportPath = activeTab.value.filePath
      ? activeTab.value.filePath.replace(/\.[^.]+$/, '.pdf')
      : `${defaultFileName}.pdf`
    const html = await buildMarkdownPdfDocument({
      content: activeTab.value.content,
      title: activeTab.value.title || defaultFileName,
      theme: settingsStore.settings.theme,
      sourcePath: activeTab.value.filePath || ''
    })

    await window.electronAPI.exportMarkdownPdf({
      html,
      defaultPath: defaultExportPath
    })
  } catch (e) {
    errorMessage.value = `导出 PDF 失败: ${e.message}`
    showErrorDialog.value = true
  }
}

// 键盘快捷键
function handleKeydown(e) {
  if (!activeTab.value) return

  if (e.ctrlKey || e.metaKey) {
    if (e.shiftKey) {
      switch (activeTab.value.language) {
        case 'json':
          switch (e.key.toLowerCase()) {
            case 'f':
              e.preventDefault()
              formatJson()
              break
            case 'm':
              e.preventDefault()
              minifyJson()
              break
            case 'r':
              e.preventDefault()
              repairJson()
              break
            case 't':
              e.preventDefault()
              toggleJsonTree()
              break
          }
          break
        case 'sql':
          switch (e.key.toLowerCase()) {
            case 'f':
              e.preventDefault()
              formatActiveSql()
              break
            case 'm':
              e.preventDefault()
              minifyActiveSql()
              break
            case 'u':
              e.preventDefault()
              uppercaseActiveSqlKeywords()
              break
            case 'l':
              e.preventDefault()
              lowercaseActiveSqlKeywords()
              break
          }
          break
        case 'log':
          if (e.key.toLowerCase() === 'w') {
            e.preventDefault()
            toggleLogWrap()
          }
          break
      }
    }
  }
}

onMounted(() => {
  const savedSplitRatio = Number(localStorage.getItem(MARKDOWN_SPLIT_RATIO_STORAGE_KEY))
  if (Number.isFinite(savedSplitRatio) && savedSplitRatio > 0) {
    splitRatio.value = clampSplitRatio(savedSplitRatio)
  }

  contextSidebarWidth.value = loadContextSidebarWidth(currentContextType.value)

  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousemove', handleSplitMouseMove)
  document.addEventListener('mouseup', stopSplitResize)
  document.addEventListener('mousemove', handleContextSidebarMouseMove)
  document.addEventListener('mouseup', stopContextResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousemove', handleSplitMouseMove)
  document.removeEventListener('mouseup', stopSplitResize)
  document.removeEventListener('mousemove', handleContextSidebarMouseMove)
  document.removeEventListener('mouseup', stopContextResize)
})

watch(() => activeTab.value?.language, (language) => {
  if (language === 'log') {
    logWrapEnabled.value = true
    logFilterMode.value = 'all'
    requestAnimationFrame(() => {
      monacoEditorRef.value?.setWordWrap(true)
    })
    return
  }

  logWrapEnabled.value = Boolean(settingsStore.settings.wordWrap)
  logFilterMode.value = 'all'
})

watch(currentContextType, (type) => {
  if (!type) return
  isContextSidebarCollapsed.value = localStorage.getItem(`${CONTEXT_SIDEBAR_COLLAPSED_STORAGE_KEY_PREFIX}${type}`) === '1'
  contextSidebarWidth.value = loadContextSidebarWidth(type)
}, { immediate: true })

watch(contextSidebarWidth, (newWidth) => {
  if (!showContextSidebar.value || isContextSidebarCollapsed.value || !currentContextType.value) return
  saveContextSidebarWidth(currentContextType.value, newWidth)
})

// Markdown Toolbar Actions
function insertMarkdown(prefix, suffix = '') {
  if (editorMode.value === 'wysiwyg') {
    // In WYSIWYG mode, use the Milkdown editor's insertText method
    if (milkdownEditorRef.value) {
      milkdownEditorRef.value.insertText(`${prefix}${suffix}`)
    }
  } else {
    // In source mode, use the Monaco editor
    if (!monacoEditorRef.value) return
    const selection = monacoEditorRef.value.getSelection()
    monacoEditorRef.value.replaceSelection(`${prefix}${selection}${suffix}`)
  }
}

function mdBold() { insertMarkdown('**', '**') }
function mdItalic() { insertMarkdown('*', '*') }
function mdHeading(level) { insertMarkdown('#'.repeat(level) + ' ') }
function mdUnorderedList() { insertMarkdown('- ') }
function mdOrderedList() { insertMarkdown('1. ') }
function mdCheckList() { insertMarkdown('- [ ] ') }
function mdCodeBlock() { insertMarkdown('```\n', '\n```') }
function mdQuote() { insertMarkdown('> ') }
function mdLink() { insertMarkdown('[', '](url)') }
function mdImage() { insertMarkdown('![alt text](', ')') }
function mdTable() {
  insertMarkdown('| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |')
}
function mdHorizontalRule() { insertMarkdown('\n---\n') }

function setMarkdownViewMode(mode) {
  if (mode === 'wysiwyg') {
    editorMode.value = 'wysiwyg'
    showPreview.value = false
    setMarkdownSplitFocus('both')
    localStorage.setItem(MARKDOWN_VIEW_MODE_STORAGE_KEY, 'wysiwyg')
    return
  }

  editorMode.value = 'source'
  showPreview.value = mode === 'split'
  if (mode !== 'split') {
    setMarkdownSplitFocus('both')
  }
  localStorage.setItem(MARKDOWN_VIEW_MODE_STORAGE_KEY, mode === 'split' ? 'split' : 'source')
}

// Auto-show preview for markdown files in source mode
watch(() => activeTab.value?.language, (newLang) => {
  if (newLang === 'Markdown' || newLang === 'markdown') {
    const savedMode = localStorage.getItem(MARKDOWN_VIEW_MODE_STORAGE_KEY)
    if (savedMode === 'wysiwyg' || savedMode === 'split' || savedMode === 'source') {
      setMarkdownViewMode(savedMode)
    } else {
      setMarkdownViewMode('source')
    }

    const savedContextTab = localStorage.getItem(MARKDOWN_CONTEXT_TAB_STORAGE_KEY)
    setMarkdownContextTab(savedContextTab === 'outline' ? 'outline' : 'preview', false)
  } else {
    showPreview.value = false
    activeHeadingId.value = ''
  }
}, { immediate: true })

watch(() => activeTab.value?.id, () => {
  activeHeadingId.value = markdownHeadings.value[0]?.id || ''
})

watch(markdownHeadings, (headings) => {
  if (!headings.length) {
    activeHeadingId.value = ''
    collapsedHeadingIds.value = []
    if (activeTab.value?.language === 'markdown' && editorMode.value === 'source' && !isMarkdownSplitView.value) {
      setMarkdownContextTab('preview', false)
    }
    return
  }

  collapsedHeadingIds.value = collapsedHeadingIds.value.filter((id) => headings.some((heading) => heading.id === id && heading.hasChildren))

  if (!headings.some((heading) => heading.id === activeHeadingId.value)) {
    activeHeadingId.value = headings[0].id
  }
})

watch(markdownViewMode, (mode) => {
  if (activeTab.value?.language !== 'markdown') return

  if (mode === 'source') {
    if (!markdownHeadings.value.length) {
      setMarkdownContextTab('preview', false)
    }
    return
  }

  setMarkdownContextTab('outline', false)
})

function handleContentChange(newContent) {
  if (activeTab.value) {
    editorStore.updateTabContent(activeTab.value.id, newContent)
  }
}

function newFile() {
  editorStore.createTab()
}

function openRecentFile(filePath) {
  window.dispatchEvent(new CustomEvent('open-file', { detail: filePath }))
}

async function restoreLastFolder() {
  try {
    await fileStore.loadLastOpenedFolder()
  } catch (error) {
    errorMessage.value = `恢复最近目录失败：${error.message}`
    showErrorDialog.value = true
  }
}

function createTemplate(template) {
  const tab = editorStore.createTab(template.title, null, template.content)
  editorStore.setActiveTab(tab.id)
}

async function createFromClipboard(type) {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      errorMessage.value = '剪贴板内容为空，无法创建文档。'
      showErrorDialog.value = true
      return
    }

    if (type === 'json') {
      const parsed = JSON.parse(text)
      const tab = editorStore.createTab('clipboard.json', null, JSON.stringify(parsed, null, 2))
      editorStore.setActiveTab(tab.id)
      return
    }

    const tab = editorStore.createTab('clipboard.md', null, text)
    editorStore.setActiveTab(tab.id)
  } catch (error) {
    errorMessage.value = type === 'json'
      ? `剪贴板内容不是有效的 JSON：${error.message}`
      : `无法读取剪贴板：${error.message}`
    showErrorDialog.value = true
  }
}

function getFileName(path) {
  return path.split(/[\\/]/).pop() || path
}

async function openFile() {
  const result = await window.electronAPI.openFileDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    window.dispatchEvent(new CustomEvent('open-file', { detail: result.filePaths[0] }))
  }
}

async function openFolder() {
  const result = await window.electronAPI.openFolderDialog()
  if (!result.canceled && result.filePaths.length > 0) {
    await fileStore.loadFolder(result.filePaths[0])
  }
}
</script>

<style scoped>
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--backdrop-blur));
  margin: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  box-shadow: var(--panel-card-shadow);
}

.editor-pane {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.editor-workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.editor-workspace.split-resizing,
.editor-workspace.context-resizing {
  cursor: col-resize;
  user-select: none;
}

.monaco-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.toolbar {
  min-height: var(--toolbar-height);
  display: flex;
  align-items: center;
  padding: 0 var(--panel-header-padding-x);
  border-bottom: 1px solid var(--glass-border);
  background: var(--glass-bg);
  gap: 4px;
  overflow-x: auto;
}

.secondary-toolbar {
  min-height: var(--toolbar-height);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
}

.toolbar button {
  background: var(--icon-button-bg);
  border: 1px solid transparent;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: var(--toolbar-button-radius);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);
  font-weight: 500;
  white-space: nowrap;
  min-width: 28px;
  height: var(--toolbar-button-height);
}

.toolbar button:hover {
  background: var(--interactive-hover-bg);
  color: var(--text-main);
  box-shadow: var(--interactive-hover-ring);
}

.toolbar button:active {
  transform: translateY(1px);
}

.toolbar button.active {
  background: rgba(var(--accent-primary-rgb), 0.12);
  border-color: rgba(var(--accent-primary-rgb), 0.16);
  color: var(--accent-primary);
}

.toolbar-mode-text {
  font-size: 12px;
  line-height: 1;
}

.toolbar-text-button {
  gap: 6px;
  padding: 4px 10px !important;
  min-width: auto !important;
  border: 1px solid transparent !important;
}

.toolbar-text-button:hover {
  border-color: var(--interactive-hover-border) !important;
}

@media (max-width: 900px) {
  .toolbar-mode-text {
    display: none;
  }

  .toolbar-text-button {
    padding: 4px 8px !important;
  }

}

.toolbar .separator {
  width: 1px;
  height: 18px;
  background: var(--glass-border);
  margin: 0 6px;
}

.log-stats-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-top: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.03));
  overflow-x: auto;
}

.log-stat-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.log-stat-pill.total {
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--accent-primary);
}

.log-stat-pill.error {
  background: rgba(244, 71, 71, 0.14);
  color: #f44747;
}

.log-stat-pill.warn {
  background: rgba(220, 202, 122, 0.16);
  color: #b88a00;
}

.log-stat-pill.info {
  background: rgba(78, 201, 176, 0.14);
  color: #2b9e84;
}

.editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

.document-workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
}

.document-workspace.split-layout .editor-pane {
  width: 50%;
  border-right: none;
}

.split-resizer {
  position: relative;
  flex: 0 0 12px;
  cursor: col-resize;
  background: transparent;
  z-index: 2;
}

.split-resizer-actions {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transform: translate(-50%, -50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.split-resizer:hover .split-resizer-actions,
.split-resizer:focus-within .split-resizer-actions,
.editor-workspace.split-resizing .split-resizer-actions {
  opacity: 1;
  pointer-events: auto;
}

.split-resizer:hover .split-resizer-actions {
  transform: translate(-50%, -50%) scale(1);
}

.split-resizer-action {
  min-width: 74px;
  height: var(--toolbar-button-height);
  padding: 0 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  background: color-mix(in srgb, var(--icon-button-bg) 78%, var(--glass-bg));
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: var(--panel-inner-shadow);
  backdrop-filter: blur(8px);
  transition: var(--transition-fast);
  font-size: 11px;
  font-weight: var(--ui-font-weight-medium);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.split-resizer-action:hover {
  color: var(--accent-primary);
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.08));
  border-color: rgba(var(--accent-primary-rgb), 0.18);
}

.split-resizer-action:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring), 0 4px 10px rgba(0, 0, 0, 0.06);
}

.split-resizer-action svg {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}

.split-resizer-action::after {
  line-height: 1;
}

.split-resizer-action-editor::after {
  content: '看源码';
}

.split-resizer-action-preview::after {
  content: '看预览';
}

.split-resizer::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: var(--glass-border);
  transition: var(--transition-fast);
}

.split-resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 30px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: var(--resizer-handle-bg);
  box-shadow: var(--interactive-hover-ring);
  transition: var(--transition-fast);
}

.split-resizer:hover::before,
.split-resizer:hover::after,
.editor-workspace.split-resizing .split-resizer::before,
.editor-workspace.split-resizing .split-resizer::after {
  background: var(--resizer-active-bg);
}

.preview-pane {
  display: flex;
  width: 50%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-primary) 92%, rgba(var(--accent-primary-rgb), 0.03));
  border-left: 1px solid var(--glass-border);
  box-shadow: inset 12px 0 24px rgba(0, 0, 0, 0.03);
  transition: background var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.preview-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.context-resizer {
  position: relative;
  flex: 0 0 12px;
  cursor: col-resize;
  background: transparent;
  z-index: 1;
}

.context-resizer::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: var(--glass-border);
  transition: var(--transition-fast);
}

.context-resizer::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 30px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: var(--resizer-handle-bg);
  box-shadow: var(--interactive-hover-ring);
  transition: var(--transition-fast);
}

.context-resizer:hover::before,
.context-resizer:hover::after,
.editor-workspace.context-resizing .context-resizer::before,
.editor-workspace.context-resizing .context-resizer::after {
  background: var(--resizer-active-bg);
}

.context-tab-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.context-tab-button,
.context-header-button,
.log-context-shortcuts button {
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.05);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.context-tab-button:hover,
.context-header-button:hover,
.log-context-shortcuts button:hover {
  color: var(--text-main);
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.context-tab-button.active {
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
}

.context-tab-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.context-preview-panel {
  flex: 1;
  min-height: 0;
}

.context-preview-panel :deep(.markdown-preview) {
  height: 100%;
  border-left: none;
  background: transparent;
}

.log-context-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.log-context-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.log-context-stat-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-context-stat-card strong {
  font-size: 18px;
  color: var(--text-main);
}

.log-context-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.log-context-stat-card.total strong { color: var(--accent-primary); }
.log-context-stat-card.error strong { color: #f44747; }
.log-context-stat-card.warn strong { color: #b88a00; }
.log-context-stat-card.info strong { color: #2b9e84; }

.log-context-empty-state {
  padding: 14px;
  border-radius: 12px;
  border: 1px dashed var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 96%, rgba(var(--accent-primary-rgb), 0.02));
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-context-empty-state p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.log-context-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 1180px) {
  .editor-workspace.split-resizing {
    cursor: default;
  }

  .editor-workspace.with-context-sidebar {
    flex-direction: column;
  }

  .document-workspace {
    min-height: 280px;
  }

  .split-resizer {
    display: none;
  }

  .document-workspace.split-layout {
    flex-direction: column;
  }

  .document-workspace.split-layout .editor-pane,
  .document-workspace.split-layout .preview-pane {
    width: 100%;
    flex: 1 1 auto !important;
  }

  .document-workspace.split-layout .preview-pane {
    height: 42%;
    border-left: none;
    border-top: 1px solid var(--glass-border);
    box-shadow: inset 0 12px 24px rgba(0, 0, 0, 0.03);
  }

  .log-context-stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}

</style>

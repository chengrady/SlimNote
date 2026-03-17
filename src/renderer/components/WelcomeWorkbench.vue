<template>
  <div class="empty-editor">
    <div class="empty-badge">轻量 · 专注 · 即开即用</div>
    <h2>SlimNote</h2>
    <p>打开文件、选择工作流直接开始，历史记录统一放在左侧工作台查看</p>
    <div class="quick-actions">
      <div class="quick-actions-primary">
        <button @click="$emit('new-file')" class="btn btn-primary">新建文件</button>
        <button @click="$emit('open-file')" class="btn">打开文件</button>
        <button @click="$emit('open-folder')" class="btn">打开目录</button>
      </div>
      <div v-if="lastOpenedFolder" class="quick-actions-secondary">
        <button @click="$emit('restore-last-folder')" class="btn">恢复最近目录</button>
      </div>
    </div>
    <div class="workflow-highlights">
      <button class="workflow-card markdown" type="button" @click="emitTemplate(markdownTemplate)">
        <span class="workflow-label">文档工作流</span>
        <strong>Markdown / Notes</strong>
        <p>适合方案、说明、会议记录与日常笔记。</p>
      </button>
      <button class="workflow-card json" type="button" @click="emitTemplate(jsonTemplate)">
        <span class="workflow-label">数据工作流</span>
        <strong>JSON / SQL</strong>
        <p>结构化数据查看、修复、格式化与查询脚本整理。</p>
      </button>
      <button class="workflow-card log" type="button" @click="emitTemplate(logTemplate)">
        <span class="workflow-label">排查工作流</span>
        <strong>Log / Text</strong>
        <p>快速打开日志、过滤异常并继续上下文排查。</p>
      </button>
    </div>
    <div class="welcome-overview-strip">
      <div class="overview-pill">
        <span class="overview-label">左侧记录</span>
        <strong>{{ recentQuickFiles.length }}</strong>
      </div>
      <div class="overview-pill">
        <span class="overview-label">支持类型</span>
        <strong>MD / JSON / SQL / LOG</strong>
      </div>
    </div>
    <div class="welcome-grid">
      <div class="welcome-card start-card">
        <div class="welcome-card-header">
          <h3>开始任务</h3>
          <span>欢迎页专用</span>
        </div>
        <p class="welcome-empty-text">这里保留启动动作和工作流入口；最近文件、已固定项目与目录历史都集中在左侧工作台。</p>
        <div class="start-insight-strip">
          <div class="start-insight">
            <span>最近文件</span>
            <strong>{{ recentQuickFiles.length }}</strong>
          </div>
          <div class="start-insight">
            <span>上次目录</span>
            <strong>{{ lastOpenedFolder ? getFileName(lastOpenedFolder) : '暂无' }}</strong>
          </div>
        </div>
        <div class="start-actions">
          <button class="start-action" @click="$emit('open-file')">
            <strong>打开单个文件</strong>
            <span>适合快速查看 Markdown、JSON、SQL、Log</span>
          </button>
          <button v-if="lastOpenedFolder" class="start-action" @click="$emit('restore-last-folder')">
            <strong>恢复最近目录</strong>
            <span>{{ getFileName(lastOpenedFolder) }}</span>
          </button>
          <button class="start-action" @click="$emit('create-from-clipboard', 'json')">
            <strong>从剪贴板开始 JSON</strong>
            <span>直接进入结构化数据整理流程</span>
          </button>
          <button class="start-action" @click="$emit('create-from-clipboard', 'markdown')">
            <strong>从剪贴板开始 Markdown</strong>
            <span>适合会议记录、方案整理与快速成稿</span>
          </button>
        </div>
      </div>
      <template v-if="!isCompactWelcomeMode">
        <div class="welcome-card template-card">
          <div class="welcome-card-header">
            <h3>快速模板</h3>
            <span>一键创建</span>
          </div>
          <div class="clipboard-actions">
            <button class="clipboard-btn" @click="$emit('create-from-clipboard', 'json')">从剪贴板新建 JSON</button>
            <button class="clipboard-btn" @click="$emit('create-from-clipboard', 'markdown')">从剪贴板新建 Markdown</button>
          </div>
          <div class="template-grid">
            <button class="template-item" @click="$emit('create-template', template)" v-for="template in templates" :key="template.title">
              <span class="template-title">{{ template.title }}</span>
              <span class="template-desc">{{ template.description }}</span>
            </button>
          </div>
        </div>
        <div class="welcome-card shortcut-card">
          <div class="welcome-card-header">
            <h3>常用场景</h3>
            <span>按任务进入</span>
          </div>
          <div class="scenario-list">
            <button class="scenario-item" type="button" @click="emitTemplate(markdownTemplate)">
              <strong>开始写文档</strong>
              <span>进入 Markdown 工作流，适合方案、说明和会议记录。</span>
            </button>
            <button class="scenario-item" type="button" @click="emitTemplate(jsonTemplate)">
              <strong>整理数据</strong>
              <span>从 JSON / SQL 模板起步，继续格式化、修复或查询整理。</span>
            </button>
            <button class="scenario-item" type="button" @click="emitTemplate(logTemplate)">
              <strong>排查日志</strong>
              <span>快速进入 Log / Text 场景，继续过滤异常和定位问题。</span>
            </button>
          </div>
        </div>
      </template>
    </div>
    <div v-if="isCompactWelcomeMode" class="welcome-compact-section">
      <button class="btn welcome-more-toggle" @click="showCompactExtras = !showCompactExtras" :aria-expanded="showCompactExtras">
        <span>{{ showCompactExtras ? '收起更多功能' : '展开更多功能' }}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ expanded: showCompactExtras }">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <p class="welcome-compact-tip">小窗口下默认保留最近文件与常用入口，扩展功能可按需展开。</p>
      <div v-if="showCompactExtras" class="welcome-extra-stack">
        <div class="welcome-card template-card compact-card">
          <div class="welcome-card-header">
            <h3>快速模板</h3>
            <span>一键创建</span>
          </div>
          <div class="clipboard-actions">
            <button class="clipboard-btn" @click="$emit('create-from-clipboard', 'json')">从剪贴板新建 JSON</button>
            <button class="clipboard-btn" @click="$emit('create-from-clipboard', 'markdown')">从剪贴板新建 Markdown</button>
          </div>
          <div class="template-grid compact-template-grid">
            <button class="template-item" @click="$emit('create-template', template)" v-for="template in templates" :key="`compact-${template.title}`">
              <span class="template-title">{{ template.title }}</span>
              <span class="template-desc">{{ template.description }}</span>
            </button>
          </div>
        </div>
        <div class="welcome-card shortcut-card compact-card">
          <div class="welcome-card-header">
            <h3>常用场景</h3>
            <span>按任务进入</span>
          </div>
          <div class="scenario-list compact-scenario-list">
            <button class="scenario-item" type="button" @click="emitTemplate(markdownTemplate)">
              <strong>开始写文档</strong>
              <span>Markdown 记录与成稿</span>
            </button>
            <button class="scenario-item" type="button" @click="emitTemplate(jsonTemplate)">
              <strong>整理数据</strong>
              <span>JSON / SQL 清洗与处理</span>
            </button>
            <button class="scenario-item" type="button" @click="emitTemplate(logTemplate)">
              <strong>排查日志</strong>
              <span>Log / Text 异常分析</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  lastOpenedFolder: {
    type: String,
    default: ''
  },
  recentQuickFiles: {
    type: Array,
    default: () => []
  },
  templates: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'new-file',
  'open-file',
  'open-folder',
  'restore-last-folder',
  'open-recent-file',
  'create-template',
  'create-from-clipboard'
])

const viewportWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 0)
const viewportHeight = ref(typeof window !== 'undefined' ? window.innerHeight : 0)
const showCompactExtras = ref(false)

const isCompactWelcomeMode = computed(() => viewportWidth.value <= 760 || viewportHeight.value <= 700)
const markdownTemplate = computed(() => props.templates.find((item) => item.title?.toLowerCase().includes('markdown') || item.title?.toLowerCase().includes('readme')) || props.templates[0] || null)
const jsonTemplate = computed(() => props.templates.find((item) => item.title?.toLowerCase().includes('json')) || props.templates[1] || null)
const logTemplate = computed(() => props.templates.find((item) => item.title?.toLowerCase().includes('log')) || props.templates[3] || null)

watch(isCompactWelcomeMode, (isCompact) => {
  if (!isCompact) {
    showCompactExtras.value = false
  }
})

function updateViewportSize() {
  viewportWidth.value = window.innerWidth
  viewportHeight.value = window.innerHeight
}

function getFileName(path) {
  return String(path || '').split(/[\\/]/).pop() || path
}

function emitTemplate(template) {
  if (!template) return
  emit('create-template', template)
}

onMounted(() => {
  updateViewportSize()
  window.addEventListener('resize', updateViewportSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportSize)
})
</script>

<style scoped>
.empty-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  flex: 1;
  min-height: 0;
  color: var(--text-muted);
  background: var(--bg-primary);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  margin: 12px;
  padding: 36px 28px;
  text-align: center;
  overflow-y: auto;
  overflow-x: hidden;
}

.empty-badge {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.08);
  color: var(--accent-primary);
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold);
  margin-bottom: 16px;
}

.empty-editor h2 {
  font-size: 30px;
  font-weight: var(--ui-font-weight-semibold);
  margin-bottom: 12px;
  color: var(--text-main);
  letter-spacing: 0.4px;
}

.empty-editor p {
  font-size: 14px;
  margin-bottom: 24px;
  opacity: 1;
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.quick-actions {
  width: min(880px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: var(--action-row-margin);
}

.quick-actions-primary,
.quick-actions-secondary {
  display: flex;
  justify-content: center;
  gap: var(--action-row-gap);
}

.quick-actions-primary {
  width: 100%;
}

.workflow-highlights {
  width: min(880px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.workflow-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: left;
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.02));
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.workflow-card:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.workflow-card strong {
  color: var(--text-main);
  font-size: 15px;
}

.workflow-card p {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.workflow-label {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.workflow-card.markdown .workflow-label {
  background: rgba(78, 201, 176, 0.14);
  color: #2b9e84;
}

.workflow-card.json .workflow-label {
  background: rgba(var(--accent-primary-rgb), 0.12);
  color: var(--accent-primary);
}

.workflow-card.log .workflow-label {
  background: rgba(244, 71, 71, 0.12);
  color: #f44747;
}

.welcome-overview-strip {
  width: min(880px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.overview-pill {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border);
  background: color-mix(in srgb, var(--glass-bg) 94%, rgba(var(--accent-primary-rgb), 0.03));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.overview-label {
  color: var(--text-muted);
  font-size: 12px;
}

.overview-pill strong {
  color: var(--text-main);
  font-size: 13px;
}

.welcome-grid {
  width: min(880px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  text-align: left;
  padding-bottom: 4px;
}

.welcome-compact-section {
  width: min(880px, 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 4px;
  text-align: left;
}

.welcome-more-toggle {
  width: 100%;
  justify-content: space-between;
}

.welcome-more-toggle svg {
  transition: transform var(--transition-fast);
}

.welcome-more-toggle svg.expanded {
  transform: rotate(180deg);
}

.welcome-compact-tip {
  margin: 0;
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.welcome-extra-stack {
  display: grid;
  gap: 12px;
}

.compact-card {
  width: 100%;
}

.compact-template-grid {
  grid-template-columns: 1fr;
}

.compact-feature-list {
  gap: 8px;
}

.welcome-card {
  background: color-mix(in srgb, var(--glass-bg) 92%, rgba(var(--accent-primary-rgb), 0.04));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.welcome-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.welcome-card-header h3 {
  margin: 0;
  font-size: var(--section-title-size);
  font-weight: var(--ui-font-weight-semibold);
  line-height: var(--panel-title-line-height);
  color: var(--text-main);
}

.welcome-card-header span {
  font-size: var(--section-meta-size);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.start-insight-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.start-insight {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.12);
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.start-insight span {
  font-size: var(--ui-font-size-xs);
  color: var(--text-muted);
}

.start-insight strong {
  font-size: var(--ui-font-size-sm);
  color: var(--text-main);
  line-height: var(--panel-title-line-height);
}

.start-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.start-action {
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  cursor: pointer;
  transition: var(--transition-fast);
}

.start-action:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.start-action strong {
  color: var(--text-main);
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-title-line-height);
}

.start-action span {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
}

.start-action:focus-visible,
.clipboard-btn:focus-visible,
.template-item:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.welcome-empty-text {
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

.scenario-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.scenario-item {
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.scenario-item:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.scenario-item strong {
  color: var(--text-main);
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-title-line-height);
}

.scenario-item span {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
}

.scenario-item:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.compact-scenario-list {
  gap: 8px;
}

.start-card,
.template-card,
.shortcut-card {
  grid-column: span 2;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.clipboard-actions {
  display: flex;
  gap: var(--action-row-gap);
  flex-wrap: wrap;
}

.clipboard-btn {
  border: 1px solid rgba(var(--accent-primary-rgb), 0.16);
  background: rgba(var(--accent-primary-rgb), 0.05);
  color: var(--text-main);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.clipboard-btn:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.template-item {
  border: 1px solid transparent;
  background: rgba(var(--accent-primary-rgb), 0.04);
  border-radius: var(--radius-sm);
  padding: 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: var(--transition-fast);
}

.welcome-card > .welcome-empty-text,
.welcome-card > .template-grid,
.welcome-card > .session-summary,
.welcome-card > .scenario-list {
  margin-top: 0;
}

.template-item:hover {
  background: var(--interactive-hover-bg);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.template-title {
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.template-desc {
  font-size: var(--ui-font-size-sm);
  line-height: var(--panel-subtitle-line-height);
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .empty-editor {
    padding: 28px 20px;
  }

  .workflow-highlights,
  .welcome-overview-strip,
  .welcome-grid {
    grid-template-columns: 1fr;
  }

  .start-card,
  .template-card,
  .shortcut-card {
    grid-column: span 1;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .start-actions,
  .start-insight-strip {
    grid-template-columns: 1fr;
  }

  .clipboard-actions {
    flex-direction: column;
  }

  .quick-actions-primary,
  .quick-actions-secondary {
    flex-wrap: wrap;
  }

  .welcome-compact-section {
    gap: 8px;
  }
}

@media (max-height: 820px) {
  .empty-editor {
    padding: 24px 20px;
  }

  .empty-badge {
    margin-bottom: 12px;
  }

  .empty-editor h2 {
    font-size: 26px;
    margin-bottom: 8px;
  }

  .empty-editor p {
    margin-bottom: 18px;
  }

  .quick-actions {
    gap: 10px;
    margin-bottom: 20px;
  }

  .workflow-highlights {
    gap: 12px;
  }

  .welcome-grid {
    gap: 12px;
  }

  .welcome-card {
    padding: 16px;
  }
}

@media (max-height: 700px) {
  .empty-editor {
    padding: 18px 16px;
  }

  .empty-badge {
    font-size: 11px;
    margin-bottom: 10px;
  }

  .empty-editor h2 {
    font-size: 22px;
  }

  .empty-editor p {
    font-size: 13px;
    margin-bottom: 14px;
  }

  .welcome-card {
    padding: 14px;
    gap: 10px;
  }

  .recent-quick-list,
  .template-grid,
  .scenario-list {
    gap: 8px;
  }

  .template-item,
  .start-action,
  .clipboard-btn {
    padding-top: 9px;
    padding-bottom: 9px;
  }

  .welcome-compact-tip {
    font-size: var(--ui-font-size-xs);
  }
}
</style>

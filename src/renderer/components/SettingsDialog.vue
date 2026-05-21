<template>
  <ModalDialog
    :show="show"
    :title="t('settings.title')"
    body-class="modal-body--flush"
    :show-footer="false"
    width="min(1180px, calc(100vw - 32px))"
    max-width="min(1180px, calc(100vw - 32px))"
    height="min(780px, calc(100vh - 32px))"
    max-height="min(780px, calc(100vh - 32px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="settings-workbench" @keydown.capture="handleShortcutRecordingKeydown">
        <aside class="settings-nav">
          <nav class="settings-nav-list" aria-label="Settings sections">
            <button
              v-for="section in navigationItems"
              :key="section.id"
              class="settings-nav-item"
              :class="{ active: activeSection === section.id }"
              :title="section.description"
              type="button"
              @click="selectSection(section.id)"
            >
              <span class="settings-nav-item-main">
                <span class="settings-nav-item-title">{{ section.title }}</span>
              </span>
            </button>
          </nav>

          <div class="settings-nav-footer">
            <button type="button" class="modal-btn settings-reset-btn" @click="handleReset">
              {{ t('settings.restoreDefaults') }}
            </button>
          </div>
        </aside>

        <section class="settings-main">
          <header class="settings-toolbar">
            <div class="settings-search-wrap">
              <input
                v-model="searchQuery"
                class="ui-field settings-search-input"
                type="search"
                :placeholder="searchPlaceholder"
              >
            </div>

            <div class="settings-toolbar-meta">
              <div class="settings-toolbar-copy">
                <h4>{{ currentPanelTitle }}</h4>
              </div>
              <div class="settings-toolbar-actions">
                <span class="settings-toolbar-badge">{{ resultSummary }}</span>
              </div>
            </div>
          </header>

          <div ref="settingsContentRef" class="settings-content" @scroll.passive="handleSettingsScroll">
            <section v-if="showAboutPanel" class="settings-group settings-group--about">
              <div class="settings-group-head">
                <h5>{{ aboutTitle }}</h5>
              </div>
              <div class="settings-about-panel">
                <AboutOverview />
              </div>
            </section>

            <div v-else-if="visibleSections.length" class="settings-groups">
              <section
                v-for="section in visibleSections"
                :key="section.id"
                class="settings-group"
                :class="{ 'settings-group--active': activeSection === section.id }"
                :data-settings-section="section.id"
              >
                <div class="settings-group-head" :class="{ 'settings-group-head--shortcuts': section.id === 'shortcuts' }">
                  <div class="settings-group-head-copy">
                    <h5>{{ section.title }}</h5>
                  </div>
                  <div v-if="section.id === 'shortcuts'" class="shortcut-head-actions">
                    <button class="shortcut-reset-all-button" type="button" @click="resetAllShortcuts">
                      {{ t('settings.shortcutResetAll') }}
                    </button>
                  </div>
                  <p v-if="section.id === 'shortcuts' && shortcutPanelMessage" class="shortcut-panel-message" :class="{ 'shortcut-panel-message--error': shortcutSaveError }">
                    {{ shortcutPanelMessage }}
                  </p>
                </div>

                <div v-if="section.id === 'shortcuts' && !isSearching" class="shortcut-tab-bar">
                  <div class="shortcut-category-filter" :aria-label="t('settings.shortcutCategoryFilter')" role="tablist">
                    <button
                      v-for="category in shortcutCategoryOptions"
                      :key="category.id"
                      class="shortcut-category-button"
                      :class="{ active: shortcutCategoryFilter === category.id }"
                      type="button"
                      role="tab"
                      :aria-selected="shortcutCategoryFilter === category.id ? 'true' : 'false'"
                      @click="shortcutCategoryFilter = category.id"
                    >
                      {{ category.label }}
                    </button>
                  </div>
                </div>

                <div v-if="section.id === 'shortcuts'" class="shortcut-simple-list" role="table" :aria-label="section.title">
                  <div class="shortcut-simple-head" role="row">
                    <span>{{ localizeText('settings.shortcutCommandColumn', '命令', 'Command') }}</span>
                    <span>{{ localizeText('settings.shortcutScopeColumn', '范围', 'Scope') }}</span>
                    <span>{{ localizeText('settings.shortcutKeyColumn', '快捷键', 'Shortcut') }}</span>
                    <span class="shortcut-simple-head-action">{{ localizeText('settings.shortcutActionColumn', '操作', 'Action') }}</span>
                  </div>
                  <div
                    v-for="row in section.rows"
                    :key="`${section.id}-${row.id}`"
                    class="shortcut-simple-row"
                    :class="{
                      'is-recording': row.isRecording,
                      'is-disabled': row.isDisabled,
                      'has-conflict': row.hasConflict
                    }"
                    role="row"
                  >
                    <div class="shortcut-simple-copy" role="cell">
                      <div class="shortcut-simple-title">{{ row.title }}</div>
                      <p v-if="row.conflictText" class="shortcut-conflict">
                        {{ row.conflictText }}
                      </p>
                    </div>
                    <div class="shortcut-simple-scope" role="cell">
                      <span>{{ row.categoryText }}</span>
                      <span>{{ row.scopeText }}</span>
                    </div>
                    <div class="shortcut-simple-control" role="cell">
                      <button
                        class="shortcut-simple-field"
                        :class="{
                          'is-recording': row.isRecording,
                          'is-disabled': row.isDisabled,
                          'has-conflict': row.hasConflict
                        }"
                        type="button"
                        :title="row.isRecording ? t('settings.shortcutRecordingHint') : row.description"
                        :aria-label="`${t('settings.shortcutEdit')} ${row.title}`"
                        @click="startShortcutRecording(row.id)"
                      >
                        <span class="shortcut-simple-value">{{ row.shortcutText }}</span>
                      </button>
                    </div>
                    <div class="shortcut-simple-actions" role="cell">
                      <button
                        class="shortcut-simple-clear"
                        type="button"
                        :disabled="row.isRecording || !row.hasAssignedShortcut"
                        :title="t('settings.shortcutClear')"
                        :aria-label="`${t('settings.shortcutClear')} ${row.title}`"
                        @click.stop="clearShortcut(row.id)"
                      >
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div v-else class="settings-list">
                  <div
                    v-for="row in section.rows"
                    :key="`${section.id}-${row.id}`"
                    class="settings-row"
                    :class="{
                      'settings-row--checkbox': isInlineCheckboxControl(row.control),
                      'settings-row--preview': row.control === 'preview',
                      'settings-row--associations': row.control === 'associations',
                      'settings-row--action': row.control === 'system-association'
                    }"
                  >
                    <div class="settings-row-copy">
                      <label v-if="isInlineCheckboxControl(row.control)" class="settings-inline-checkbox">
                        <input type="checkbox" v-model="localSettings[getInlineCheckboxSettingKey(row.control)]" :aria-label="row.title">
                        <span>{{ row.title }}</span>
                      </label>
                      <div v-else class="settings-row-title">{{ row.title }}</div>
                    </div>

                    <div v-if="!isInlineCheckboxControl(row.control)" class="settings-row-control">
                      <template v-if="row.control === 'language'">
                        <select class="ui-select" v-model="localSettings.locale" @change="handleLocaleChange">
                          <option v-for="loc in supportedLocales" :key="loc.value" :value="loc.value">
                            {{ loc.label }}
                          </option>
                        </select>
                      </template>

                      <template v-else-if="row.control === 'theme'">
                        <select class="ui-select" v-model="localSettings.theme">
                          <option value="light">{{ t('settings.light') }}</option>
                          <option value="dark">{{ t('settings.dark') }}</option>
                        </select>
                      </template>

                      <template v-else-if="row.control === 'font-size'">
                        <input
                          v-model="fontSizeInput"
                          class="ui-field"
                          type="number"
                          inputmode="numeric"
                          min="8"
                          max="72"
                          step="1"
                          @change="commitFontSize"
                          @blur="commitFontSize"
                          @keydown.enter.prevent="commitFontSize"
                        >
                      </template>

                      <template v-else-if="row.control === 'font-family'">
                        <select class="ui-select" v-model="localSettings.fontFamily">
                          <option v-for="font in fontFamilies" :key="font.value" :value="font.value" :style="getFontOptionStyle(font)">
                            {{ font.label }}
                          </option>
                        </select>
                      </template>

                      <template v-else-if="row.control === 'preview'">
                        <div class="live-preview" :class="localSettings.theme" :style="previewStyle">
                          <div class="live-preview-toolbar">
                            <span class="live-preview-dot"></span>
                            <span class="live-preview-dot"></span>
                            <span class="live-preview-dot"></span>
                          </div>
                          <div class="live-preview-content">
                            <div class="live-preview-title">{{ t('settings.previewTitle') }}</div>
                            <div class="live-preview-text">{{ t('settings.previewSample') }}</div>
                            <div class="live-preview-line">- {{ t('settings.previewFont', { font: currentPreviewFont }) }}</div>
                            <div class="live-preview-line">- {{ t('settings.previewSize', { size: localSettings.fontSize }) }}</div>
                          </div>
                        </div>
                      </template>

                      <template v-else-if="row.control === 'tab-density'">
                        <select class="ui-select" v-model="localSettings.tabDensity">
                          <option value="comfortable">{{ t('settings.comfortable') }}</option>
                          <option value="compact">{{ t('settings.compact') }}</option>
                        </select>
                      </template>

                      <template v-else-if="row.control === 'tab-max-rows'">
                        <input
                          v-model="unpinnedTabMaxRowsInput"
                          class="ui-field"
                          type="number"
                          inputmode="numeric"
                          min="1"
                          max="10"
                          step="1"
                          @change="commitUnpinnedTabMaxRows"
                          @blur="commitUnpinnedTabMaxRows"
                          @keydown.enter.prevent="commitUnpinnedTabMaxRows"
                        >
                      </template>

                      <template v-else-if="row.control === 'tab-size'">
                        <select class="ui-select" v-model.number="localSettings.tabSize">
                          <option value="2">{{ t('settings.spaces', { count: 2 }) }}</option>
                          <option value="4">{{ t('settings.spaces', { count: 4 }) }}</option>
                          <option value="8">{{ t('settings.spaces', { count: 8 }) }}</option>
                        </select>
                      </template>

                      <template v-else-if="row.control === 'associations'">
                        <div class="settings-tag-list">
                          <span v-for="item in associationGroups" :key="item" class="ui-chip settings-tag">
                            {{ item }}
                          </span>
                        </div>
                      </template>

                      <template v-else-if="row.control === 'system-association'">
                        <div class="settings-action-stack">
                          <button class="modal-btn" type="button" @click="handleOpenFileAssociations">
                            {{ t('settings.openSystemAssociations') }}
                          </button>
                          <p v-if="associationStatus" class="settings-status">
                            {{ associationStatus }}
                          </p>
                        </div>
                      </template>

                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div v-else class="settings-empty-state">
              <div class="settings-empty-title">{{ emptyStateTitle }}</div>
              <p class="settings-empty-desc">{{ emptyStateDescription }}</p>
            </div>
          </div>
        </section>
      </div>
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { useShortcutsStore } from '../stores/shortcuts'
import { getSupportedLocales } from '../locales'
import { FONT_FAMILIES, findFontFamilyOption, getFontOptionStyle } from '../utils/fontFamilies'
import {
  SHORTCUT_CATEGORY_ORDER,
  buildShortcutConflictMap,
  eventToShortcutAccelerator,
  formatShortcutAccelerator,
  getShortcutById,
  getShortcutDefinitions,
  isShortcutCustomized,
  normalizeShortcutAccelerator,
  resolveShortcutAccelerator,
  shortcutDisplay
} from '../utils/shortcuts'
import AboutOverview from './AboutOverview.vue'
import ModalDialog from './ModalDialog.vue'

const { t, locale } = useI18n()

const props = defineProps({
  show: Boolean
})

defineEmits(['close'])

const settingsStore = useSettingsStore()
const shortcutsStore = useShortcutsStore()
const activeSection = ref('appearance')
const settingsContentRef = ref(null)
const searchQuery = ref('')
const supportedLocales = getSupportedLocales()
const associationStatus = ref('')
const fontSizeInput = ref('14')
const unpinnedTabMaxRowsInput = ref('10')
const shortcutCategoryFilter = ref('all')
const recordingShortcutId = ref('')
const shortcutStatusMessage = ref('')
const shortcutSaveError = ref('')
const associationGroups = [
  'Markdown',
  'Text',
  'Log',
  'JSON',
  'YAML',
  'TOML / INI',
  'CSV / TSV'
]
let settingsScrollFrame = 0
let pendingSettingsScrollSection = ''
let pendingSettingsScrollDeadline = 0
const SETTINGS_SCROLL_LOCK_MS = 900
const inlineCheckboxSettingKeys = {
  'word-wrap': 'wordWrap',
  'unicode-highlight': 'unicodeHighlight',
  'line-numbers': 'lineNumbers',
  minimap: 'minimap'
}

const localSettings = ref({})
const aboutTitle = computed(() => localizeText('settings.about', '关于', 'About'))
const searchDisabled = computed(() => activeSection.value === 'about')
const searchPlaceholder = computed(() => {
  if (searchDisabled.value) {
    return localizeText('settings.aboutSearchPlaceholder', '当前页不支持搜索', 'Search is unavailable in this section')
  }
  return localizeText('settings.searchPlaceholder', '搜索设置', 'Search settings')
})
const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())
const isSearching = computed(() => Boolean(normalizedSearch.value))
const previewStyle = computed(() => ({
  fontFamily: localSettings.value.fontFamily || 'Microsoft YaHei',
  fontSize: `${Math.max(12, (localSettings.value.fontSize || 14) - 1)}px`
}))

const fontFamilies = FONT_FAMILIES

const currentPreviewFont = computed(() => {
  const current = findFontFamilyOption(localSettings.value.fontFamily)
  return current?.label || localSettings.value.fontFamily || 'Microsoft YaHei'
})

const shortcutDefinitions = computed(() => getShortcutDefinitions({ includeDev: import.meta.env.DEV }))
const shortcutConflictMap = computed(() => buildShortcutConflictMap(shortcutDefinitions.value, undefined, shortcutsStore.shortcutOverrides))
const shortcutPanelMessage = computed(() => shortcutSaveError.value || shortcutStatusMessage.value)
const shortcutRows = computed(() => shortcutDefinitions.value.map(shortcut => {
  const conflictItems = shortcutConflictMap.value.get(shortcut.id) || []
  const conflictNames = conflictItems.map(getShortcutLabel).join(locale.value === 'zh-CN' ? '、' : ', ')
  const effectiveAccelerator = resolveShortcutAccelerator(shortcut, undefined, shortcutsStore.shortcutOverrides)
  const defaultAccelerator = resolveShortcutAccelerator(shortcut, undefined, {})
  const isCustomized = isShortcutCustomized(shortcut, shortcutsStore.shortcutOverrides)
  const isDisabled = isCustomized && !effectiveAccelerator
  const isRecording = recordingShortcutId.value === shortcut.id
  const categoryText = getShortcutCategoryLabel(shortcut.category)
  const scopeText = getShortcutScopeLabel(shortcut.scope)

  return {
    id: shortcut.id,
    title: getShortcutLabel(shortcut),
    description: getShortcutDescription(shortcut),
    control: 'shortcut-display',
    aliases: [
      shortcut.id,
      shortcut.action,
      shortcut.category,
      shortcut.scope,
      shortcutDisplay(shortcut, undefined, shortcutsStore.shortcutOverrides),
      formatShortcutAccelerator(defaultAccelerator),
      categoryText,
      scopeText
    ],
    category: shortcut.category,
    categoryText,
    scopeText,
    shortcutText: isRecording ? t('settings.shortcutRecording') : (shortcutDisplay(shortcut, undefined, shortcutsStore.shortcutOverrides) || t('settings.shortcutUnassigned')),
    isDisabled,
    isRecording,
    hasAssignedShortcut: Boolean(effectiveAccelerator),
    hasConflict: conflictItems.length > 0,
    conflictText: conflictItems.length ? t('settings.shortcutConflictWith', { names: conflictNames }) : ''
  }
}))

const shortcutCategoryOptions = computed(() => SHORTCUT_CATEGORY_ORDER
  .filter(hasShortcutCategory)
  .map(category => ({
    id: category,
    label: getShortcutCategoryLabel(category)
  })))

const sectionDefinitions = computed(() => [
  {
    id: 'appearance',
    title: t('settings.appearance'),
    description: t('settings.appearanceSection'),
    rows: [
      {
        id: 'language',
        title: t('settings.language'),
        description: localizeText('settings.languageDesc', '界面显示语言。', 'Interface display language.'),
        control: 'language',
        aliases: ['language', 'locale', '语言']
      },
      {
        id: 'theme',
        title: t('settings.theme'),
        description: localizeText('settings.themeDesc', '切换应用的明暗主题。', 'Switch between the light and dark application theme.'),
        control: 'theme',
        aliases: ['theme', 'light', 'dark', '主题']
      },
      {
        id: 'font-size',
        title: t('settings.fontSize', { size: localSettings.value.fontSize || settingsStore.DEFAULT_SETTINGS.fontSize }),
        description: localizeText('settings.fontSizeDesc', '直接输入编辑器字号，适合精确调整阅读密度。', 'Enter the editor font size directly for precise reading density control.'),
        control: 'font-size',
        aliases: ['font size', 'size', '字号', '字体大小']
      },
      {
        id: 'font-family',
        title: t('settings.fontFamily'),
        description: localizeText('settings.fontFamilyDesc', '为编辑器和预览面板选择显示字体。', 'Choose the font family used by the editor and preview panel.'),
        control: 'font-family',
        aliases: ['font family', 'font', '字体']
      },
      {
        id: 'preview',
        title: t('settings.livePreview'),
        description: localizeText('settings.livePreviewDesc', '实时预览当前主题、字体和字号组合效果。', 'Preview the current theme, font family and font size together.'),
        control: 'preview',
        aliases: ['preview', 'live preview', '预览']
      }
    ]
  },
  {
    id: 'editor',
    title: t('settings.editor'),
    description: t('settings.editorDesc'),
    rows: [
      {
        id: 'tab-density',
        title: t('settings.tabDensity'),
        description: localizeText('settings.tabDensityDesc', '调整标签栏的紧凑程度。', 'Adjust how compact the tab bar appears.'),
        control: 'tab-density',
        aliases: ['tab density', 'density', '紧凑', '标签栏']
      },
      {
        id: 'tab-max-rows',
        title: localizeText('settings.unpinnedTabMaxRows', '未固定标签最大行数', 'Unpinned Tab Max Rows'),
        description: localizeText('settings.unpinnedTabMaxRowsDesc', '未固定标签过多时会自动换到下一行，超过最大行数后在标签区域内滚动。', 'Unpinned tabs wrap into additional rows until this limit, then scroll inside the tab area.'),
        control: 'tab-max-rows',
        aliases: ['tab rows', 'tab max rows', 'tabs wrap', '标签行数', '最大行数']
      },
      {
        id: 'word-wrap',
        title: t('settings.wordWrap'),
        description: localizeText('settings.wordWrapDesc', '长行内容会自动换行显示。', 'Automatically wrap long lines instead of scrolling horizontally.'),
        control: 'word-wrap',
        aliases: ['word wrap', 'wrap', '自动换行']
      },
      {
        id: 'line-numbers',
        title: t('settings.lineNumbers'),
        description: localizeText('settings.lineNumbersDesc', '在编辑器左侧显示行号。', 'Show line numbers beside the editor content.'),
        control: 'line-numbers',
        aliases: ['line numbers', 'gutter', '行号']
      },
      {
        id: 'unicode-highlight',
        title: localizeText('settings.unicodeHighlight', 'Unicode 字符提示', 'Unicode Highlight'),
        description: localizeText(
          'settings.unicodeHighlightDesc',
          '高亮显示可疑的 Unicode 字符，例如全角标点、易混淆字符或不可见字符。',
          'Highlight suspicious Unicode characters such as full-width punctuation, confusable characters, or invisible characters.'
        ),
        control: 'unicode-highlight',
        aliases: ['unicode', 'unicode highlight', 'confusable characters', '全角标点', '特殊字符', '不可见字符']
      },
      {
        id: 'minimap',
        title: t('settings.minimap'),
        description: localizeText('settings.minimapDesc', '在编辑器侧边显示代码缩略图。', 'Show a minimap overview on the side of the editor.'),
        control: 'minimap',
        aliases: ['minimap', '缩略图']
      },
      {
        id: 'tab-size',
        title: t('settings.tabSize'),
        description: localizeText('settings.tabSizeDesc', '控制 Tab 缩进转换为空格时的宽度。', 'Control how many spaces are used for tab indentation.'),
        control: 'tab-size',
        aliases: ['tab size', 'indent', 'indentation', '缩进']
      }
    ]
  },
  {
    id: 'shortcuts',
    title: t('settings.shortcuts'),
    description: t('settings.shortcutsSection'),
    rows: shortcutRows.value
  },
  {
    id: 'files',
    title: t('settings.files'),
    description: t('settings.filesSection'),
    rows: [
      {
        id: 'associations',
        title: t('settings.fileAssociations'),
        description: t('settings.fileAssociationsSummary'),
        control: 'associations',
        aliases: ['file associations', 'association', '文件关联']
      },
      {
        id: 'system-association',
        title: t('settings.systemAssociationControl'),
        description: t('settings.systemAssociationHint'),
        control: 'system-association',
        aliases: ['system association', 'default apps', '默认应用']
      }
    ]
  }
])

const currentSectionDefinition = computed(() => (
  sectionDefinitions.value.find(section => section.id === activeSection.value) || sectionDefinitions.value[0]
))

const showAboutPanel = computed(() => activeSection.value === 'about' && !isSearching.value)

const visibleSections = computed(() => {
  if (showAboutPanel.value) {
    return []
  }

  return sectionDefinitions.value
    .map(section => ({
      ...section,
      rows: section.rows.filter(row => matchesRow(row) && matchesShortcutCategory(row, section.id))
    }))
    .filter(section => !isSearching.value || section.rows.length)
})

const displaySection = computed(() => visibleSections.value[0] || null)

const navigationItems = computed(() => [
  ...sectionDefinitions.value.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description
  }))
])

const currentPanelTitle = computed(() => (
  showAboutPanel.value
    ? aboutTitle.value
    : (isSearching.value
      ? localizeText('settings.searchResultsTitle', '搜索结果', 'Search Results')
      : localizeText('settings.allSettingsTitle', '全部设置', 'All Settings'))
))

const resultSummary = computed(() => {
  if (showAboutPanel.value) {
    return localizeText('settings.aboutBadge', '项目概览', 'Project Overview')
  }

  if (isSearching.value) {
    const total = sectionDefinitions.value.reduce((count, section) => count + section.rows.length, 0)
    const visible = visibleSections.value.reduce((count, section) => count + section.rows.length, 0)
    return locale.value === 'zh-CN' ? `匹配 ${visible} / ${total}` : `${visible} of ${total} matched`
  }

  const total = sectionDefinitions.value.reduce((count, section) => count + section.rows.length, 0)
  const visible = visibleSections.value.reduce((count, section) => count + section.rows.length, 0)
  if (shortcutCategoryFilter.value !== 'all') {
    return locale.value === 'zh-CN' ? `显示 ${visible} / ${total}` : `${visible} of ${total} shown`
  }
  if (!normalizedSearch.value) {
    return locale.value === 'zh-CN' ? `${total} 项设置` : `${total} settings`
  }
  return locale.value === 'zh-CN' ? `匹配 ${visible} / ${total}` : `${visible} of ${total} matched`
})

const emptyStateTitle = computed(() => (
  localizeText('settings.emptyStateTitle', '没有找到匹配的设置', 'No matching settings found')
))

const emptyStateDescription = computed(() => (
  localizeText(
    'settings.emptyStateDesc',
    '尝试搜索 theme、font、wrap、关联 等关键词。',
    'Try searching for keywords like theme, font, wrap, or association.'
  )
))

watch(() => props.show, (newVal) => {
  if (newVal) {
    associationStatus.value = ''
    shortcutStatusMessage.value = ''
    shortcutSaveError.value = ''
    recordingShortcutId.value = ''
    searchQuery.value = ''
    activeSection.value = 'appearance'
    clearPendingSettingsScroll()
    shortcutCategoryFilter.value = 'all'
    localSettings.value = {
      ...settingsStore.settings,
      theme: settingsStore.settings.theme || 'light'
    }
    syncFontSizeInput(localSettings.value.fontSize)
    syncUnpinnedTabMaxRowsInput(localSettings.value.unpinnedTabMaxRows)
    shortcutsStore.loadShortcuts()
    nextTick(() => settingsContentRef.value?.scrollTo({ top: 0 }))
  }
}, { immediate: true })

watch(() => activeSection.value, (section) => {
  if (section === 'about') {
    searchQuery.value = ''
  }
})

watch(() => localSettings.value.fontSize, (fontSize) => {
  syncFontSizeInput(fontSize)
})

watch(() => localSettings.value.unpinnedTabMaxRows, (unpinnedTabMaxRows) => {
  syncUnpinnedTabMaxRowsInput(unpinnedTabMaxRows)
})

watch(() => localSettings.value.theme, (theme) => {
  if (props.show && theme) {
    settingsStore.updateSettings({ theme })
  }
})

watch(
  () => [localSettings.value.fontSize, localSettings.value.fontFamily, localSettings.value.tabDensity, localSettings.value.unpinnedTabMaxRows],
  ([fontSize, fontFamily, tabDensity, unpinnedTabMaxRows]) => {
    if (props.show) {
      settingsStore.updateSettings({ fontSize, fontFamily, tabDensity, unpinnedTabMaxRows })
    }
  }
)

watch(
  () => [
    localSettings.value.wordWrap,
    localSettings.value.unicodeHighlight,
    localSettings.value.lineNumbers,
    localSettings.value.minimap,
    localSettings.value.tabSize
  ],
  ([wordWrap, unicodeHighlight, lineNumbers, minimap, tabSize]) => {
    if (props.show) {
      settingsStore.updateSettings({ wordWrap, unicodeHighlight, lineNumbers, minimap, tabSize })
    }
  }
)

async function selectSection(sectionId) {
  activeSection.value = sectionId
  await nextTick()
  scrollToSection(sectionId)
}

function scrollToSection(sectionId) {
  const content = settingsContentRef.value
  const target = content?.querySelector(`[data-settings-section="${sectionId}"]`)
  if (!content || !target) {
    clearPendingSettingsScroll()
    return
  }

  const nextTop = getClampedSectionScrollTop(content, target)
  if (Math.abs(content.scrollTop - nextTop) <= 2) {
    clearPendingSettingsScroll()
    content.scrollTo({ top: nextTop })
    return
  }

  pendingSettingsScrollSection = sectionId
  pendingSettingsScrollDeadline = Date.now() + SETTINGS_SCROLL_LOCK_MS
  content.scrollTo({ top: nextTop, behavior: 'smooth' })
}

function handleSettingsScroll() {
  if (settingsScrollFrame) {
    cancelAnimationFrame(settingsScrollFrame)
  }

  settingsScrollFrame = requestAnimationFrame(() => {
    settingsScrollFrame = 0
    const content = settingsContentRef.value
    if (!content) return

    const sections = Array.from(content.querySelectorAll('[data-settings-section]'))
    if (!sections.length) return

    if (shouldKeepPendingSettingsSection(content)) return

    if (content.scrollTop >= getMaxSettingsScrollTop(content) - 2) {
      const lastSection = sections[sections.length - 1]?.dataset?.settingsSection
      if (lastSection && lastSection !== activeSection.value) {
        activeSection.value = lastSection
      }
      return
    }

    const anchorTop = content.scrollTop + 16
    const current = sections.reduce((candidate, section) => (
      getSectionScrollTop(content, section) <= anchorTop ? section : candidate
    ), sections[0])
    const nextSection = current?.dataset?.settingsSection
    if (nextSection && nextSection !== activeSection.value) {
      activeSection.value = nextSection
    }
  })
}

function getSectionScrollTop(content, section) {
  return content.scrollTop + section.getBoundingClientRect().top - content.getBoundingClientRect().top
}

function getClampedSectionScrollTop(content, section) {
  return Math.min(Math.max(getSectionScrollTop(content, section), 0), getMaxSettingsScrollTop(content))
}

function getMaxSettingsScrollTop(content) {
  return Math.max(content.scrollHeight - content.clientHeight, 0)
}

function shouldKeepPendingSettingsSection(content) {
  if (!pendingSettingsScrollSection) return false

  const target = content.querySelector(`[data-settings-section="${pendingSettingsScrollSection}"]`)
  if (!target || Date.now() > pendingSettingsScrollDeadline) {
    clearPendingSettingsScroll()
    return false
  }

  const targetTop = getClampedSectionScrollTop(content, target)
  if (Math.abs(content.scrollTop - targetTop) <= 2) {
    clearPendingSettingsScroll()
    return false
  }

  if (activeSection.value !== pendingSettingsScrollSection) {
    activeSection.value = pendingSettingsScrollSection
  }
  return true
}

function clearPendingSettingsScroll() {
  pendingSettingsScrollSection = ''
  pendingSettingsScrollDeadline = 0
}

function handleReset() {
  settingsStore.resetSettings()
  localSettings.value = {
    ...settingsStore.settings,
    theme: settingsStore.settings.theme || 'light'
  }
  syncFontSizeInput(localSettings.value.fontSize)
  syncUnpinnedTabMaxRowsInput(localSettings.value.unpinnedTabMaxRows)
}

function startShortcutRecording(id) {
  recordingShortcutId.value = id
  shortcutSaveError.value = ''
  shortcutStatusMessage.value = t('settings.shortcutRecordingHint')
}

async function handleShortcutRecordingKeydown(event) {
  if (!recordingShortcutId.value) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation?.()

  const shortcutId = recordingShortcutId.value
  if (event.key === 'Escape') {
    recordingShortcutId.value = ''
    shortcutStatusMessage.value = ''
    shortcutSaveError.value = ''
    return
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    await clearShortcut(shortcutId)
    return
  }

  const result = eventToShortcutAccelerator(event)
  if (result.error === 'modifier-only') {
    shortcutSaveError.value = t('settings.shortcutModifierOnly')
    shortcutStatusMessage.value = ''
    return
  }
  if (result.error === 'missing-modifier') {
    shortcutSaveError.value = t('settings.shortcutMissingModifier')
    shortcutStatusMessage.value = ''
    return
  }

  await saveShortcut(shortcutId, result.accelerator, t('settings.shortcutSaved'))
}

async function saveShortcut(id, accelerator, successMessage) {
  shortcutSaveError.value = ''
  shortcutStatusMessage.value = ''

  const localConflicts = getShortcutConflictsForChange(id, accelerator)
  if (localConflicts.length) {
    shortcutSaveError.value = getShortcutConflictMessage(localConflicts)
    return false
  }

  try {
    const result = await shortcutsStore.updateShortcut(id, accelerator)
    if (!result?.ok) {
      shortcutSaveError.value = getShortcutResultError(result)
      return false
    }

    recordingShortcutId.value = ''
    shortcutStatusMessage.value = successMessage
    return true
  } catch (error) {
    shortcutSaveError.value = error?.message || t('settings.shortcutSaveFailed')
    return false
  }
}

async function clearShortcut(id) {
  await saveShortcut(id, '', t('settings.shortcutCleared'))
}

async function resetShortcut(id) {
  shortcutSaveError.value = ''
  shortcutStatusMessage.value = ''
  try {
    const result = await shortcutsStore.resetShortcut(id)
    if (!result?.ok) {
      shortcutSaveError.value = getShortcutResultError(result)
      return
    }
    if (recordingShortcutId.value === id) recordingShortcutId.value = ''
    shortcutStatusMessage.value = t('settings.shortcutResetDone')
  } catch (error) {
    shortcutSaveError.value = error?.message || t('settings.shortcutSaveFailed')
  }
}

async function resetAllShortcuts() {
  shortcutSaveError.value = ''
  shortcutStatusMessage.value = ''
  recordingShortcutId.value = ''
  try {
    const result = await shortcutsStore.resetShortcuts()
    if (!result?.ok) {
      shortcutSaveError.value = getShortcutResultError(result)
      return
    }
    shortcutStatusMessage.value = t('settings.shortcutResetAllDone')
  } catch (error) {
    shortcutSaveError.value = error?.message || t('settings.shortcutSaveFailed')
  }
}

function getShortcutConflictsForChange(id, accelerator) {
  if (!accelerator) return []
  const shortcut = getShortcutById(id)
  if (!shortcut) return []

  const nextOverrides = { ...shortcutsStore.shortcutOverrides }
  const defaultAccelerator = resolveShortcutAccelerator(shortcut, undefined, {})
  if (normalizeShortcutAccelerator(accelerator) === normalizeShortcutAccelerator(defaultAccelerator)) {
    delete nextOverrides[id]
  } else {
    nextOverrides[id] = accelerator
  }

  return buildShortcutConflictMap(shortcutDefinitions.value, undefined, nextOverrides).get(id) || []
}

function getShortcutConflictMessage(conflicts) {
  const names = conflicts.map(getShortcutLabel).join(locale.value === 'zh-CN' ? '、' : ', ')
  return t('settings.shortcutConflictWith', { names })
}

function getShortcutResultError(result) {
  const conflictIds = result?.conflictIds || []
  if (conflictIds.length) {
    const conflicts = conflictIds.map(id => getShortcutById(id)).filter(Boolean)
    if (conflicts.length) return getShortcutConflictMessage(conflicts)
  }

  if (String(result?.message || '').includes('Shortcut IPC handler is not available')) {
    return t('settings.shortcutIpcUnavailable')
  }

  return result?.message || t('settings.shortcutSaveFailed')
}

function handleLocaleChange() {
  const newLocale = localSettings.value.locale
  if (newLocale) {
    settingsStore.updateLocale(newLocale)
  }
}

function localizeText(key, zhFallback, enFallback) {
  const value = t(key)
  if (value !== key) return value
  return locale.value === 'zh-CN' ? zhFallback : enFallback
}

function getShortcutLabel(shortcut) {
  const value = t(shortcut.labelKey)
  if (value !== shortcut.labelKey) return value
  return locale.value === 'zh-CN' ? shortcut.fallbackZh : shortcut.fallbackEn
}

function getShortcutDescription(shortcut) {
  const category = getShortcutCategoryLabel(shortcut.category)
  const scope = getShortcutScopeLabel(shortcut.scope)
  return locale.value === 'zh-CN' ? `分类：${category} · 作用范围：${scope}` : `Category: ${category} · Scope: ${scope}`
}

function getShortcutCategoryLabel(category) {
  const value = t(`settings.shortcutCategories.${category}`)
  if (value !== `settings.shortcutCategories.${category}`) return value

  const zhLabels = {
    all: '全部',
    file: '文件',
    edit: '编辑',
    view: '视图',
    json: 'JSON',
    sql: 'SQL',
    log: '日志',
    developer: '开发'
  }
  const enLabels = {
    all: 'All',
    file: 'File',
    edit: 'Edit',
    view: 'View',
    json: 'JSON',
    sql: 'SQL',
    log: 'Log',
    developer: 'Developer'
  }
  const labels = locale.value === 'zh-CN' ? zhLabels : enLabels
  return labels[category] || category
}

function getShortcutScopeLabel(scope) {
  const value = t(`settings.shortcutScopes.${scope}`)
  if (value !== `settings.shortcutScopes.${scope}`) return value

  const zhLabels = {
    global: '全局',
    native: '系统编辑',
    editor: '编辑器',
    json: 'JSON 文件',
    sql: 'SQL 文件',
    log: '日志文件',
    developer: '开发模式'
  }
  const enLabels = {
    global: 'Global',
    native: 'Native Edit',
    editor: 'Editor',
    json: 'JSON files',
    sql: 'SQL files',
    log: 'Log files',
    developer: 'Developer Mode'
  }
  const labels = locale.value === 'zh-CN' ? zhLabels : enLabels
  return labels[scope] || scope
}

function hasShortcutCategory(category) {
  return category === 'all' || shortcutDefinitions.value.some(shortcut => shortcut.category === category)
}

function normalizeFontSize(value, fallback = localSettings.value.fontSize || settingsStore.DEFAULT_SETTINGS.fontSize) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(8, Math.min(72, parsed))
}

function syncFontSizeInput(value) {
  fontSizeInput.value = String(normalizeFontSize(value, settingsStore.DEFAULT_SETTINGS.fontSize))
}

function commitFontSize() {
  const nextFontSize = normalizeFontSize(fontSizeInput.value)
  localSettings.value.fontSize = nextFontSize
  fontSizeInput.value = String(nextFontSize)
}

function normalizeUnpinnedTabMaxRows(value, fallback = localSettings.value.unpinnedTabMaxRows || settingsStore.DEFAULT_SETTINGS.unpinnedTabMaxRows) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.min(10, parsed))
}

function syncUnpinnedTabMaxRowsInput(value) {
  unpinnedTabMaxRowsInput.value = String(normalizeUnpinnedTabMaxRows(value, settingsStore.DEFAULT_SETTINGS.unpinnedTabMaxRows))
}

function commitUnpinnedTabMaxRows() {
  const nextUnpinnedTabMaxRows = normalizeUnpinnedTabMaxRows(unpinnedTabMaxRowsInput.value)
  localSettings.value.unpinnedTabMaxRows = nextUnpinnedTabMaxRows
  unpinnedTabMaxRowsInput.value = String(nextUnpinnedTabMaxRows)
}

function matchesRow(row) {
  const search = normalizedSearch.value
  if (!search) return true

  return [row.title, row.description, ...(row.aliases || [])]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(search))
}

function matchesShortcutCategory(row, sectionId) {
  if (sectionId !== 'shortcuts' || isSearching.value || row.control !== 'shortcut-display') return true
  if (shortcutCategoryFilter.value === 'all') return true
  return row.category === shortcutCategoryFilter.value
}

function isInlineCheckboxControl(control) {
  return Boolean(inlineCheckboxSettingKeys[control])
}

function getInlineCheckboxSettingKey(control) {
  return inlineCheckboxSettingKeys[control] || ''
}

async function handleOpenFileAssociations() {
  const result = await window.electronAPI.openFileAssociationSettings()
  associationStatus.value = result?.ok
    ? t('settings.systemAssociationOpened')
    : (result?.message || t('settings.systemAssociationFailed'))
}
</script>

<style scoped>
.settings-workbench {
  display: flex;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-primary) 95%, rgba(0, 0, 0, 0.04));
}

.settings-nav {
  width: 184px;
  min-width: 184px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  background:
    linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.04), transparent 28%),
    var(--surface-toolbar);
}

.settings-nav-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-item {
  width: 100%;
  min-height: 34px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  transition: var(--transition-interactive);
}

.settings-nav-item:hover {
  background: var(--surface-hover);
  border-color: var(--interactive-hover-border);
  box-shadow: var(--interactive-hover-ring);
}

.settings-nav-item.active {
  background: color-mix(in srgb, var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.18)) 62%, var(--bg-secondary));
  border-color: color-mix(in srgb, var(--interactive-selected-border-strong, var(--accent-primary)) 54%, var(--glass-border));
  box-shadow:
    inset 2px 0 0 var(--text-interactive-active, var(--accent-primary)),
    inset 0 0 0 1px color-mix(in srgb, var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.34)) 72%, transparent);
}

.settings-nav-item:focus-visible {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: var(--field-focus-ring);
}

.settings-nav-item-main {
  min-width: 0;
  display: grid;
}

.settings-nav-item-title {
  color: var(--text-main);
  font-size: 13px;
  font-weight: var(--ui-font-weight-medium);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-nav-item.active .settings-nav-item-title {
  color: var(--text-interactive-active, var(--accent-primary));
}

.settings-nav-footer {
  padding: 10px 8px 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 86%, rgba(255, 255, 255, 0.04));
}

.settings-reset-btn {
  width: 100%;
}

.settings-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-panel-strong);
}

.settings-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 12px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  background:
    linear-gradient(180deg, var(--surface-panel-strong), color-mix(in srgb, var(--surface-panel-strong) 94%, rgba(var(--accent-primary-rgb), 0.02)));
  display: grid;
  grid-template-columns: minmax(220px, 420px) minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.settings-search-wrap {
  min-width: 0;
}

.settings-search-input {
  height: 34px;
  padding-left: 12px;
}

.settings-search-input:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.settings-toolbar-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.settings-toolbar-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}

.settings-toolbar-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.settings-toolbar-copy h4 {
  margin: 0;
  font-size: 15px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.settings-toolbar-badge {
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  font-size: 12px;
  color: var(--accent-primary);
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.16));
  background: rgba(var(--accent-primary-rgb), 0.08);
}

.settings-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 18px;
}

.settings-groups {
  display: grid;
  gap: 22px;
}

.settings-group {
  scroll-margin-top: 12px;
  display: grid;
  gap: 8px;
}

.settings-group-head {
  padding: 1px 2px 2px;
  border-bottom: none;
  display: grid;
  gap: 0;
  background: transparent;
}

.settings-group-head-copy {
  display: grid;
  gap: 3px;
}

.settings-group-head--shortcuts {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.settings-group-head h5 {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: var(--ui-font-weight-bold);
  color: var(--text-main);
  line-height: 1.35;
}

.settings-group-head h5::before {
  content: '';
  width: 3px;
  height: 16px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-dim) 52%, transparent);
}

.settings-group--active .settings-group-head h5 {
  color: var(--text-interactive-active, var(--accent-primary));
}

.settings-group--active .settings-group-head h5::before {
  background: var(--accent-primary);
}

.settings-about-panel {
  padding: 14px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: visible;
  border: none;
  border-radius: 0;
  background: transparent;
}

.settings-group > .settings-list,
.settings-group > .shortcut-tab-bar,
.settings-group > .shortcut-simple-list {
  margin-left: 28px;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(128px, 180px) minmax(180px, 300px);
  justify-content: start;
  gap: 16px;
  align-items: center;
  min-height: 30px;
  padding: 4px 0;
  border-top: none;
  border-radius: 5px;
  background: transparent;
}

.settings-row:hover {
  background: color-mix(in srgb, var(--surface-hover) 68%, transparent);
}

.settings-row--checkbox {
  grid-template-columns: minmax(0, max-content);
  min-height: 28px;
}

.settings-row--preview {
  grid-template-columns: minmax(128px, 180px) minmax(280px, 320px);
  align-items: flex-start;
  gap: 16px;
  padding: 8px 0 10px;
}

.settings-row--associations {
  grid-template-columns: minmax(128px, 180px) minmax(0, 1fr);
}

.settings-row--action {
  grid-template-columns: minmax(128px, 180px) minmax(220px, 300px);
}

.settings-row-copy {
  min-width: 0;
  display: grid;
  gap: 0;
}

.settings-row-title {
  font-size: 13px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
  line-height: 1.3;
}

.settings-inline-checkbox {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--text-main);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.3;
}

.settings-inline-checkbox input {
  width: 16px;
  height: 16px;
  margin: 0;
  flex: 0 0 auto;
}

.settings-inline-checkbox span {
  min-width: 0;
}

.settings-row-control {
  min-width: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.settings-row--preview .settings-row-control {
  align-items: flex-start;
}

.settings-row-control > .ui-field,
.settings-row-control > .ui-select {
  width: 100%;
  max-width: 300px;
}

.settings-tag-list {
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  justify-content: flex-start;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.settings-tag-list::-webkit-scrollbar {
  display: none;
}

.settings-tag {
  flex: 0 0 auto;
  min-height: 24px;
}

.settings-action-stack {
  width: min(100%, 300px);
  display: grid;
  justify-items: flex-start;
  gap: 6px;
}

.settings-status {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
  font-size: 12px;
  text-align: left;
}

.shortcut-head-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.shortcut-tab-bar {
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow-x: auto;
  padding: 0;
  border-bottom: none;
  display: block;
  background: transparent;
}

.shortcut-category-filter {
  width: max-content;
  max-width: 100%;
  padding: 3px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  border-radius: var(--radius-sm);
  display: flex;
  flex-wrap: nowrap;
  gap: 3px;
  background: color-mix(in srgb, var(--bg-primary) 84%, rgba(var(--accent-primary-rgb), 0.04));
}

.shortcut-category-button {
  min-height: 26px;
  padding: 0 10px;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  white-space: nowrap;
  transition: var(--transition-interactive);
}

.shortcut-category-button:hover {
  color: var(--text-main);
  background: var(--surface-hover);
}

.shortcut-category-button.active {
  border-color: color-mix(in srgb, var(--accent-primary) 72%, var(--glass-border));
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.24) 82%, var(--surface-panel));
  color: var(--accent-primary);
  font-weight: var(--ui-font-weight-semibold);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 32%, transparent),
    0 0 0 2px color-mix(in srgb, var(--accent-primary) 14%, transparent),
    0 1px 2px color-mix(in srgb, var(--shadow-color, #000) 14%, transparent);
}

.shortcut-category-button.active:hover {
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.3) 84%, var(--surface-panel));
  color: var(--accent-primary);
}

.shortcut-reset-all-button {
  width: fit-content;
  min-height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  background: var(--surface-panel);
  color: var(--text-main);
  cursor: pointer;
  font-size: 12px;
  transition: var(--transition-interactive);
}

.shortcut-reset-all-button:hover {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.shortcut-panel-message {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.45;
  font-size: 12px;
}

.shortcut-panel-message--error {
  color: var(--danger, #d73a49);
}

.shortcut-simple-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  border-radius: var(--radius-sm);
  background: var(--surface-panel);
}

.shortcut-simple-head {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 0.7fr) minmax(180px, 0.9fr) 32px;
  gap: 12px;
  align-items: center;
  padding: 7px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  color: var(--text-muted);
  font-size: 11px;
  font-weight: var(--ui-font-weight-semibold);
}

.shortcut-simple-head-action {
  text-align: center;
}

.shortcut-simple-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(140px, 0.7fr) minmax(180px, 0.9fr) 32px;
  gap: 12px;
  align-items: center;
  padding: 8px 14px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
}

.shortcut-simple-head + .shortcut-simple-row {
  border-top: none;
}

.shortcut-simple-copy {
  min-width: 0;
  display: grid;
  gap: 3px;
}

.shortcut-simple-title {
  color: var(--text-main);
  font-size: 13px;
  font-weight: var(--ui-font-weight-medium);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-simple-scope {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.shortcut-simple-scope span {
  max-width: 100%;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-primary) 88%, rgba(var(--accent-primary-rgb), 0.06));
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  font-size: 11px;
  line-height: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-simple-control {
  min-width: 0;
  display: flex;
  align-items: center;
}

.shortcut-simple-field {
  min-width: 0;
  width: 100%;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--glass-border) 84%, rgba(var(--accent-primary-rgb), 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--bg-primary) 92%, rgba(var(--accent-primary-rgb), 0.04));
  color: var(--text-main);
  cursor: text;
  font-family: var(--font-family-mono);
  font-size: 12px;
  font-weight: var(--ui-font-weight-semibold);
  transition: var(--transition-interactive);
}

.shortcut-simple-field:hover,
.shortcut-simple-field:focus-visible {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.shortcut-simple-field:focus-visible {
  outline: none;
  box-shadow: var(--field-focus-ring);
}

.shortcut-simple-field.is-recording {
  border-color: color-mix(in srgb, var(--accent-primary) 68%, var(--glass-border));
  background: rgba(var(--accent-primary-rgb), 0.14);
  color: var(--accent-primary);
}

.shortcut-simple-field.is-disabled {
  color: var(--text-muted);
  border-style: dashed;
}

.shortcut-simple-field.has-conflict {
  border-color: color-mix(in srgb, var(--danger, #d73a49) 70%, var(--glass-border));
}

.shortcut-simple-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-simple-actions {
  display: flex;
  justify-content: center;
}

.shortcut-simple-clear {
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--danger, #d73a49);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: var(--transition-interactive);
}

.shortcut-simple-clear span {
  position: relative;
  width: 10px;
  height: 10px;
  font-size: 0;
}

.shortcut-simple-clear span::before,
.shortcut-simple-clear span::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
  transform-origin: center;
}

.shortcut-simple-clear span::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.shortcut-simple-clear span::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.shortcut-simple-clear:hover:not(:disabled),
.shortcut-simple-clear:focus-visible {
  background: color-mix(in srgb, var(--danger, #d73a49) 86%, #000);
}

.shortcut-simple-clear:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger, #d73a49) 26%, transparent);
}

.shortcut-simple-clear:disabled {
  cursor: not-allowed;
  opacity: 0.28;
}

.shortcut-conflict {
  margin: 0;
  color: var(--danger, #d73a49);
  line-height: 1.35;
  font-size: 12px;
}

.live-preview {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-subtle);
}

.live-preview.light {
  background: #ffffff;
  color: #1e1e1e;
}

.live-preview.dark {
  background: #1f1f1f;
  color: #d4d4d4;
  border-color: #3b3b3b;
}

.live-preview-toolbar {
  height: 26px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(var(--accent-primary-rgb), 0.12);
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.18);
}

.live-preview-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
}

.live-preview.dark .live-preview-dot {
  background: rgba(255, 255, 255, 0.34);
}

.live-preview-content {
  padding: 12px;
  display: grid;
  gap: 6px;
}

.live-preview-title {
  font-weight: 700;
}

.live-preview-text {
  font-family: var(--font-family-mono);
  opacity: 0.92;
}

.live-preview-line {
  opacity: 0.76;
}

.settings-empty-state {
  min-height: 180px;
  display: grid;
  place-content: center;
  gap: 10px;
  text-align: center;
  border: 1px dashed color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md);
  background: var(--surface-panel);
}

.settings-empty-title {
  color: var(--text-main);
  font-size: 15px;
  font-weight: var(--ui-font-weight-semibold);
}

.settings-empty-desc {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 960px) {
  .settings-workbench {
    flex-direction: column;
  }

  .settings-nav {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  }

  .settings-nav-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .settings-content,
  .settings-about-panel {
    padding-left: 16px;
    padding-right: 16px;
  }

  .settings-toolbar {
    grid-template-columns: 1fr;
    gap: 10px;
    padding-left: 16px;
    padding-right: 16px;
  }

  .settings-row,
  .settings-row--preview {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 8px 12px;
  }

  .settings-row--preview {
    gap: 12px;
    padding: 10px 12px;
  }

  .settings-row-control,
  .settings-action-stack {
    justify-content: flex-start;
    justify-items: flex-start;
  }

  .settings-group > .settings-list,
  .settings-group > .shortcut-tab-bar,
  .settings-group > .shortcut-simple-list {
    margin-left: 0;
  }

  .settings-tag-list {
    justify-content: flex-start;
  }

  .settings-status {
    text-align: left;
  }

  .shortcut-simple-head {
    display: none;
  }

  .shortcut-simple-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .shortcut-simple-control {
    width: 100%;
    max-width: 430px;
  }

  .shortcut-simple-actions {
    justify-content: flex-start;
  }

  .settings-group-head--shortcuts {
    grid-template-columns: 1fr;
  }

  .shortcut-head-actions {
    justify-content: flex-start;
  }

  .settings-toolbar-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-toolbar-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 620px) {
  .settings-nav-list {
    grid-template-columns: 1fr;
  }
}
</style>

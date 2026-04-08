<template>
  <ModalDialog
    :show="show"
    :title="t('settings.title')"
    :subtitle="t('settings.subtitle')"
    body-class="modal-body--flush"
    :show-footer="false"
    width="min(1180px, calc(100vw - 32px))"
    max-width="min(1180px, calc(100vw - 32px))"
    height="min(780px, calc(100vh - 32px))"
    max-height="min(780px, calc(100vh - 32px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="settings-workbench">
        <aside class="settings-nav">
          <div class="settings-nav-header">
            <span class="settings-nav-eyebrow">{{ t('app.name') }}</span>
            <h4>{{ t('settings.title') }}</h4>
            <p>{{ t('settings.subtitle') }}</p>
          </div>

          <nav class="settings-nav-list" aria-label="Settings sections">
            <button
              v-for="section in navigationItems"
              :key="section.id"
              class="settings-nav-item"
              :class="{ active: activeSection === section.id }"
              type="button"
              @click="selectSection(section.id)"
            >
              <span class="settings-nav-item-main">
                <span class="settings-nav-item-title">{{ section.title }}</span>
                <span class="settings-nav-item-desc">{{ section.description }}</span>
              </span>
              <span v-if="section.count !== null" class="settings-nav-item-count">
                {{ section.count }}
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
                <p>{{ currentPanelDescription }}</p>
              </div>
              <div class="settings-toolbar-actions">
                <span class="settings-toolbar-badge">{{ resultSummary }}</span>
              </div>
            </div>
          </header>

          <div class="settings-content">
            <section v-if="showAboutPanel" class="settings-group settings-group--about">
              <div class="settings-group-head">
                <h5>{{ aboutTitle }}</h5>
                <p>{{ aboutSection }}</p>
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
              >
                <div class="settings-group-head">
                  <h5>{{ section.title }}</h5>
                  <p>{{ section.description }}</p>
                </div>

                <div class="settings-list">
                  <div
                    v-for="row in section.rows"
                    :key="`${section.id}-${row.id}`"
                    class="settings-row"
                    :class="{
                      'settings-row--preview': row.control === 'preview',
                      'settings-row--action': row.control === 'system-association'
                    }"
                  >
                    <div class="settings-row-copy">
                      <div class="settings-row-title">{{ row.title }}</div>
                      <p class="settings-row-desc">{{ row.description }}</p>
                    </div>

                    <div class="settings-row-control">
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

                      <template v-else-if="row.control === 'word-wrap'">
                        <label class="settings-checkbox">
                          <input type="checkbox" v-model="localSettings.wordWrap" :aria-label="row.title">
                        </label>
                      </template>

                      <template v-else-if="row.control === 'unicode-highlight'">
                        <label class="settings-checkbox">
                          <input type="checkbox" v-model="localSettings.unicodeHighlight" :aria-label="row.title">
                        </label>
                      </template>

                      <template v-else-if="row.control === 'line-numbers'">
                        <label class="settings-checkbox">
                          <input type="checkbox" v-model="localSettings.lineNumbers" :aria-label="row.title">
                        </label>
                      </template>

                      <template v-else-if="row.control === 'minimap'">
                        <label class="settings-checkbox">
                          <input type="checkbox" v-model="localSettings.minimap" :aria-label="row.title">
                        </label>
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
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'
import { getSupportedLocales } from '../locales'
import { FONT_FAMILIES, findFontFamilyOption, getFontOptionStyle } from '../utils/fontFamilies'
import AboutOverview from './AboutOverview.vue'
import ModalDialog from './ModalDialog.vue'

const { t, locale } = useI18n()

const props = defineProps({
  show: Boolean
})

defineEmits(['close'])

const settingsStore = useSettingsStore()
const activeSection = ref('appearance')
const searchQuery = ref('')
const supportedLocales = getSupportedLocales()
const associationStatus = ref('')
const fontSizeInput = ref('14')
const associationGroups = [
  'Markdown',
  'Text',
  'Log',
  'JSON',
  'YAML',
  'TOML / INI',
  'CSV / TSV'
]

const localSettings = ref({})
const aboutTitle = computed(() => localizeText('settings.about', '关于', 'About'))
const aboutSection = computed(() => localizeText('settings.aboutSection', '查看 SlimNote 的项目介绍、版本信息和 GitHub 仓库。', 'View project overview, version details and the GitHub repository.'))
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

  if (isSearching.value) {
    return sectionDefinitions.value
      .map(section => ({
        ...section,
        rows: section.rows.filter(matchesRow)
      }))
      .filter(section => section.rows.length)
  }

  const current = currentSectionDefinition.value
  if (!current) {
    return []
  }

  const rows = current.rows.filter(matchesRow)
  if (!rows.length) {
    return []
  }

  return [{
    ...current,
    rows
  }]
})

const displaySection = computed(() => visibleSections.value[0] || null)

const navigationItems = computed(() => [
  ...sectionDefinitions.value.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    count: section.rows.length
  }))
])

const currentPanelTitle = computed(() => (
  showAboutPanel.value
    ? aboutTitle.value
    : (isSearching.value
      ? localizeText('settings.searchResultsTitle', '搜索结果', 'Search Results')
      : (currentSectionDefinition.value?.title || t('settings.title')))
))

const currentPanelDescription = computed(() => {
  if (showAboutPanel.value) {
    return aboutSection.value
  }
  if (isSearching.value) {
    return localizeText(
      'settings.searchHintGlobal',
      '按名称、描述或关键词搜索所有设置项。',
      'Search across all settings by name, description, or keyword.'
    )
  }
  if (normalizedSearch.value) {
    return localizeText(
      'settings.searchHint',
      '按名称或描述筛选当前分类中的设置项。',
      'Filter settings in the current category by name or description.'
    )
  }
  return currentSectionDefinition.value?.description || t('settings.subtitle')
})

const resultSummary = computed(() => {
  if (showAboutPanel.value) {
    return localizeText('settings.aboutBadge', '项目概览', 'Project Overview')
  }

  if (isSearching.value) {
    const total = sectionDefinitions.value.reduce((count, section) => count + section.rows.length, 0)
    const visible = visibleSections.value.reduce((count, section) => count + section.rows.length, 0)
    return locale.value === 'zh-CN' ? `匹配 ${visible} / ${total}` : `${visible} of ${total} matched`
  }

  const total = currentSectionDefinition.value?.rows.length || 0
  const visible = displaySection.value?.rows.length || 0
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
    searchQuery.value = ''
    localSettings.value = {
      ...settingsStore.settings,
      theme: settingsStore.settings.theme || 'light'
    }
    syncFontSizeInput(localSettings.value.fontSize)
  }
})

watch(() => activeSection.value, (section) => {
  if (section === 'about') {
    searchQuery.value = ''
  }
})

watch(() => localSettings.value.fontSize, (fontSize) => {
  syncFontSizeInput(fontSize)
})

watch(() => localSettings.value.theme, (theme) => {
  if (props.show && theme) {
    settingsStore.updateSettings({ theme })
  }
})

watch(
  () => [localSettings.value.fontSize, localSettings.value.fontFamily, localSettings.value.tabDensity],
  ([fontSize, fontFamily, tabDensity]) => {
    if (props.show) {
      settingsStore.updateSettings({ fontSize, fontFamily, tabDensity })
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

function selectSection(sectionId) {
  activeSection.value = sectionId
}

function handleReset() {
  settingsStore.resetSettings()
  localSettings.value = {
    ...settingsStore.settings,
    theme: settingsStore.settings.theme || 'light'
  }
  syncFontSizeInput(localSettings.value.fontSize)
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

function matchesRow(row) {
  const search = normalizedSearch.value
  if (!search) return true

  return [row.title, row.description, ...(row.aliases || [])]
    .filter(Boolean)
    .some(value => String(value).toLowerCase().includes(search))
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
  width: 260px;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  background:
    linear-gradient(180deg, rgba(var(--accent-primary-rgb), 0.04), transparent 28%),
    color-mix(in srgb, var(--bg-secondary) 92%, rgba(0, 0, 0, 0.06));
}

.settings-nav-header {
  padding: 22px 18px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 86%, rgba(255, 255, 255, 0.04));
  display: grid;
  gap: 6px;
}

.settings-nav-eyebrow {
  font-size: 11px;
  font-weight: var(--ui-font-weight-semibold);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-primary);
}

.settings-nav-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.settings-nav-header p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
  font-size: var(--ui-font-size-sm);
}

.settings-nav-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-nav-item {
  width: 100%;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  transition: var(--transition-fast);
}

.settings-nav-item:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  border-color: var(--interactive-hover-border);
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
  gap: 3px;
}

.settings-nav-item-title {
  color: var(--text-main);
  font-weight: var(--ui-font-weight-medium);
  line-height: 1.35;
}

.settings-nav-item.active .settings-nav-item-title {
  color: var(--text-interactive-active, var(--accent-primary));
}

.settings-nav-item-desc {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.settings-nav-item.active .settings-nav-item-desc {
  color: var(--text-main);
}

.settings-nav-item-count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-shortcut, var(--text-muted));
  background: color-mix(in srgb, var(--bg-primary) 88%, rgba(var(--accent-primary-rgb), 0.08));
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
}

.settings-nav-item.active .settings-nav-item-count {
  color: var(--text-interactive-active, var(--accent-primary));
  background: rgba(var(--accent-primary-rgb), 0.16);
  border-color: color-mix(in srgb, var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.34)) 70%, transparent);
}

.settings-nav-footer {
  padding: 14px 12px 16px;
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
  background: color-mix(in srgb, var(--bg-primary) 96%, rgba(255, 255, 255, 0.01));
}

.settings-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 18px 24px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-primary) 97%, rgba(255, 255, 255, 0.01)), color-mix(in srgb, var(--bg-primary) 94%, rgba(255, 255, 255, 0.02)));
  display: grid;
  gap: 14px;
}

.settings-search-wrap {
  max-width: 560px;
}

.settings-search-input {
  height: 40px;
  padding-left: 14px;
}

.settings-search-input:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.settings-toolbar-meta {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
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
  gap: 4px;
}

.settings-toolbar-copy h4 {
  margin: 0;
  font-size: 18px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.settings-toolbar-copy p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
  font-size: var(--ui-font-size-sm);
}

.settings-toolbar-badge {
  min-height: 28px;
  padding: 0 12px;
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
  padding: 20px 24px 28px;
}

.settings-groups {
  display: grid;
  gap: 16px;
}

.settings-group {
  border: 1px solid color-mix(in srgb, var(--glass-border) 92%, rgba(255, 255, 255, 0.04));
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg-secondary) 86%, rgba(var(--accent-primary-rgb), 0.02));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.settings-group-head {
  padding: 18px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  display: grid;
  gap: 5px;
  background: color-mix(in srgb, var(--bg-primary) 82%, rgba(var(--accent-primary-rgb), 0.03));
}

.settings-group-head h5 {
  margin: 0;
  font-size: 14px;
  font-weight: var(--ui-font-weight-semibold);
  color: var(--text-main);
}

.settings-group-head p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.55;
  font-size: var(--ui-font-size-sm);
}

.settings-about-panel {
  padding: 20px;
}

.settings-list {
  display: flex;
  flex-direction: column;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 20px;
  align-items: flex-start;
  padding: 16px 20px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
}

.settings-row:first-child {
  border-top: none;
}

.settings-row--preview {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
}

.settings-row-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.settings-row-title {
  font-size: 14px;
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-main);
  line-height: 1.4;
}

.settings-row-desc {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
  font-size: var(--ui-font-size-sm);
}

.settings-row-control {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
}

.settings-row-control > .ui-field,
.settings-row-control > .ui-select {
  max-width: 320px;
}

.settings-checkbox {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  padding: 0 2px;
  cursor: pointer;
}

.settings-checkbox input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.settings-tag-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.settings-tag {
  min-height: 28px;
}

.settings-action-stack {
  width: min(100%, 340px);
  display: grid;
  justify-items: flex-end;
  gap: 10px;
}

.settings-status {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
  font-size: 12px;
  text-align: right;
}

.live-preview {
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
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
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(var(--accent-primary-rgb), 0.12);
  border-bottom: 1px solid rgba(var(--accent-primary-rgb), 0.18);
}

.live-preview-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
}

.live-preview.dark .live-preview-dot {
  background: rgba(255, 255, 255, 0.34);
}

.live-preview-content {
  padding: 16px;
  display: grid;
  gap: 8px;
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
  min-height: 240px;
  display: grid;
  place-content: center;
  gap: 10px;
  text-align: center;
  border: 1px dashed color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-secondary) 82%, rgba(var(--accent-primary-rgb), 0.03));
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
  .settings-toolbar,
  .settings-content,
  .settings-about-panel {
    padding-left: 16px;
    padding-right: 16px;
  }

  .settings-row,
  .settings-row--preview {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .settings-row-control,
  .settings-action-stack {
    justify-content: flex-start;
    justify-items: flex-start;
  }

  .settings-tag-list {
    justify-content: flex-start;
  }

  .settings-status {
    text-align: left;
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

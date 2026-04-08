<template>
  <ModalDialog
    :show="show"
    :title="t('globalSearch.title')"
    :subtitle="t('globalSearch.subtitle')"
    width="min(920px, calc(100vw - 40px))"
    max-width="min(920px, calc(100vw - 40px))"
    height="min(680px, calc(100vh - 48px))"
    max-height="min(680px, calc(100vh - 48px))"
    @close="$emit('close')"
  >
    <template #body>
      <div class="global-search-layout">
        <div class="search-form card-like">
          <label class="field-label" for="global-search-query">{{ t('globalSearch.query') }}</label>
          <div class="search-row">
            <input
              id="global-search-query"
              ref="queryInputRef"
              v-model.trim="query"
              class="search-input ui-field"
              type="search"
              :placeholder="t('globalSearch.placeholder')"
              @keydown.enter.prevent="runSearch"
            >
            <button class="modal-btn primary search-submit-btn" type="button" :disabled="searching || !rootPath" @click="runSearch">
              {{ searching ? t('globalSearch.searching') : t('globalSearch.search') }}
            </button>
          </div>
          <label class="checkbox-label">
            <input v-model="matchCase" type="checkbox">
            {{ t('globalSearch.matchCase') }}
          </label>
          <div v-if="recentSearches.length" class="history-section">
            <div class="history-header">
              <span class="history-title">{{ t('globalSearch.recentSearches') }}</span>
              <button class="history-clear" type="button" @click="clearHistory">{{ t('globalSearch.clearHistory') }}</button>
            </div>
            <div class="history-list">
              <button
                v-for="item in recentSearches"
                :key="item"
                class="history-chip ui-chip"
                type="button"
                @click="applyRecentSearch(item)"
              >
                {{ item }}
              </button>
            </div>
          </div>
          <p v-if="!rootPath" class="search-hint">{{ t('globalSearch.emptyRoot') }}</p>
          <p v-else class="search-hint">{{ rootPath }}</p>
        </div>

        <div class="results-panel card-like">
          <div class="status-line">{{ statusMessage }}</div>
          <div v-if="results.length" class="results-list">
            <div v-for="result in results" :key="result.filePath" class="result-group">
              <div class="result-group-header">
                <div class="result-path" :title="result.filePath">{{ result.filePath }}</div>
                <div class="result-count">{{ result.matches.length }}</div>
              </div>
              <button
                v-for="match in result.matches"
                :key="`${result.filePath}:${match.lineNumber}:${match.column}`"
                class="result-item"
                type="button"
                @click="$emit('open-result', { filePath: result.filePath, lineNumber: match.lineNumber, column: match.column })"
              >
                <span class="result-line">{{ match.lineNumber }}:{{ match.column }}</span>
                <span class="result-text">
                  <template v-for="(segment, index) in getHighlightedSegments(match.text)" :key="`${result.filePath}:${match.lineNumber}:${match.column}:${index}`">
                    <mark v-if="segment.highlight" class="result-highlight">{{ segment.text }}</mark>
                    <span v-else>{{ segment.text }}</span>
                  </template>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <button class="modal-btn" type="button" @click="$emit('close')">{{ t('globalSearch.close') }}</button>
    </template>
  </ModalDialog>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import ModalDialog from './ModalDialog.vue'

const { t } = useI18n()
const RECENT_SEARCHES_STORAGE_KEY = 'slimnote:global-search-history'
const MAX_RECENT_SEARCHES = 8

defineEmits(['close', 'open-result'])

const props = defineProps({
  show: Boolean,
  rootPath: {
    type: String,
    default: ''
  }
})

const query = ref('')
const matchCase = ref(false)
const searching = ref(false)
const results = ref([])
const totalMatches = ref(0)
const queryInputRef = ref(null)
const recentSearches = ref(loadRecentSearches())

const statusMessage = computed(() => {
  if (!props.rootPath) return t('globalSearch.emptyRoot')
  if (searching.value) return t('globalSearch.searching')
  if (!query.value) return t('globalSearch.emptyQuery')
  if (!results.value.length) return t('globalSearch.noResults')
  return t('globalSearch.resultSummary', { count: totalMatches.value })
})

watch(() => props.show, async (visible) => {
  if (!visible) return
  await nextTick()
  queryInputRef.value?.focus()
  queryInputRef.value?.select?.()
})

function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : []
  } catch (error) {
    return []
  }
}

function saveRecentSearch(searchText) {
  const normalized = String(searchText || '').trim()
  if (!normalized) return

  recentSearches.value = [normalized, ...recentSearches.value.filter((item) => item !== normalized)].slice(0, MAX_RECENT_SEARCHES)
  localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(recentSearches.value))
}

function clearHistory() {
  recentSearches.value = []
  localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY)
}

function applyRecentSearch(searchText) {
  query.value = searchText
  runSearch()
}

function getHighlightedSegments(text = '') {
  const source = String(text || '')
  const needle = String(query.value || '')
  if (!needle) {
    return [{ text: source, highlight: false }]
  }

  const haystack = matchCase.value ? source : source.toLowerCase()
  const expected = matchCase.value ? needle : needle.toLowerCase()
  const segments = []
  let cursor = 0

  while (cursor < source.length) {
    const foundIndex = haystack.indexOf(expected, cursor)
    if (foundIndex === -1) {
      segments.push({ text: source.slice(cursor), highlight: false })
      break
    }

    if (foundIndex > cursor) {
      segments.push({ text: source.slice(cursor, foundIndex), highlight: false })
    }

    segments.push({
      text: source.slice(foundIndex, foundIndex + needle.length),
      highlight: true
    })
    cursor = foundIndex + needle.length
  }

  return segments.length ? segments : [{ text: source, highlight: false }]
}

async function runSearch() {
  if (!props.rootPath || !query.value) {
    results.value = []
    totalMatches.value = 0
    return
  }

  searching.value = true
  try {
    saveRecentSearch(query.value)
    const response = await window.electronAPI.searchInWorkspace({
      rootPath: props.rootPath,
      query: query.value,
      matchCase: matchCase.value,
      maxResults: 300
    })

    results.value = Array.isArray(response?.results) ? response.results : []
    totalMatches.value = Number(response?.totalMatches) || 0
  } finally {
    searching.value = false
  }
}
</script>

<style scoped>
.global-search-layout {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-4);
}

.search-form {
  display: grid;
  gap: var(--space-3);
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-3);
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--ui-font-size-sm);
}

.history-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-title {
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  color: var(--text-main);
}

.history-clear {
  border: none;
  background: transparent;
  color: var(--accent-primary);
  cursor: pointer;
  font-size: var(--ui-font-size-sm);
  padding: 0;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-hint,
.status-line {
  margin: 0;
  font-size: var(--ui-font-size-sm);
  color: var(--text-muted);
}

.results-panel {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.results-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.search-submit-btn {
  min-width: 108px;
}

.result-group {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.result-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  border-bottom: 1px solid var(--glass-border);
}

.result-path {
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-count {
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--accent-primary-rgb), 0.14);
  font-size: var(--ui-font-size-sm);
}

.result-item {
  width: 100%;
  border: none;
  border-top: 1px solid var(--glass-border);
  background: transparent;
  color: var(--text-main);
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: var(--transition-fast);
}

.result-item:hover {
  background: var(--interactive-hover-bg-strong, var(--interactive-hover-bg));
  box-shadow: var(--interactive-hover-ring);
}

.result-item:focus-visible {
  outline: none;
  background: var(--interactive-selected-bg-strong, var(--interactive-selected-bg));
  box-shadow: var(--field-focus-ring), inset 2px 0 0 var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.34));
}

.result-line {
  font-family: var(--font-family-mono);
  color: var(--text-shortcut, var(--text-muted));
}

.result-item:hover .result-line,
.result-item:focus-visible .result-line {
  color: var(--text-interactive-active, var(--accent-primary));
}

.result-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-highlight {
  background: rgba(255, 214, 10, 0.38);
  color: inherit;
  padding: 0 1px;
  border-radius: 3px;
}

@media (max-width: 700px) {
  .search-row {
    grid-template-columns: 1fr;
  }

  .result-item {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>

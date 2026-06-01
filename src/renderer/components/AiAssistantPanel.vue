<template>
  <div ref="panelRef" class="ai-assistant-panel">
    <div class="ai-panel-header">
      <div class="ai-panel-title">{{ t('ai.title') }}</div>
      <div class="ai-panel-actions">
        <button
          type="button"
          class="ai-panel-action-button ai-panel-new-session-button"
          :title="t('ai.newConversation')"
          :aria-label="t('ai.newConversation')"
          :disabled="sessionActionDisabled"
          @click="startNewConversation"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
        <div
          ref="sessionHistoryPickerRef"
          class="ai-session-history-picker"
          @focusout="handleSessionHistoryFocusOut"
          @keydown.esc.prevent="closeSessionHistoryPopover"
        >
          <button
            ref="sessionHistoryButtonRef"
            type="button"
            class="ai-panel-action-button ai-panel-history-button"
            :class="{ 'is-active': sessionHistoryOpen }"
            :title="t('ai.conversationHistory')"
            :aria-label="t('ai.conversationHistory')"
            :aria-expanded="sessionHistoryOpen"
            :disabled="isSessionTransitioning"
            aria-haspopup="dialog"
            @click="toggleSessionHistoryPopover"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h10" />
            </svg>
          </button>
          <div
            v-if="sessionHistoryOpen"
            ref="sessionHistoryPopoverRef"
            class="ai-session-history-popover"
            role="dialog"
            :aria-label="t('ai.conversationHistory')"
            :style="sessionHistoryPopoverStyle"
          >
            <div class="ai-session-history-header">
              <div class="ai-session-history-heading">
                <span>{{ t('ai.conversationHistory') }}</span>
                <span>{{ sessionHistoryItems.length }}</span>
              </div>
              <button
                type="button"
                class="ai-session-history-icon-button is-danger"
                :title="t('ai.deleteAllConversations')"
                :aria-label="t('ai.deleteAllConversations')"
                :disabled="sessionActionDisabled || !sessionHistoryItems.length"
                @click="deleteAllConversationSessions"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
              <button
                type="button"
                class="ai-session-history-icon-button is-primary"
                :title="t('ai.newConversation')"
                :aria-label="t('ai.newConversation')"
                :disabled="sessionActionDisabled"
                @click="startNewConversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            </div>
            <div class="ai-session-history-search-wrap">
              <input
                ref="sessionHistorySearchRef"
                v-model="sessionHistorySearch"
                class="ai-session-history-search"
                type="search"
                :placeholder="t('ai.searchConversationHistory')"
              >
            </div>
            <div v-if="filteredSessionHistoryItems.length" class="ai-session-history-list">
              <div
                v-for="session in filteredSessionHistoryItems"
                :key="session.id"
                class="ai-session-history-row"
                :class="{ 'is-active': session.isActive, 'is-menu-open': sessionHistoryActionMenuId === session.id }"
              >
                <button
                  type="button"
                  class="ai-session-history-main"
                  :title="session.title"
                  :disabled="sessionActionDisabled"
                  @click="switchConversationSession(session)"
                >
                  <span class="ai-session-history-name">{{ session.title }}</span>
                  <span class="ai-session-history-meta">{{ session.meta }}</span>
                </button>
                <button
                  type="button"
                  class="ai-session-history-more"
                  :title="t('ai.moreConversationActions')"
                  :aria-label="t('ai.moreConversationActions')"
                  :aria-expanded="sessionHistoryActionMenuId === session.id"
                  :disabled="sessionActionDisabled"
                  aria-haspopup="menu"
                  @click.stop="toggleSessionHistoryActionMenu(session.id)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.7" />
                    <circle cx="12" cy="12" r="1.7" />
                    <circle cx="12" cy="19" r="1.7" />
                  </svg>
                </button>
                <div
                  v-if="sessionHistoryActionMenuId === session.id"
                  class="ai-session-history-action-menu"
                  role="menu"
                >
                  <button
                    type="button"
                    class="ai-session-history-action-item is-danger"
                    :disabled="sessionActionDisabled"
                    role="menuitem"
                    @click.stop="deleteConversationSession(session)"
                  >
                    {{ t('ai.deleteConversation') }}
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="ai-session-history-empty">
              {{ sessionHistorySearch ? t('ai.noConversationHistoryMatches') : t('ai.noConversationHistoryDesc') }}
            </div>
          </div>
        </div>
        <button
          type="button"
          class="ai-panel-action-button ai-panel-clear-button"
          :title="t('ai.clearConversation')"
          :aria-label="t('ai.clearConversation')"
          :disabled="!hasConversationMessages || isBusy"
          @click="clearCurrentConversation"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
        <button
          type="button"
          class="ai-panel-action-button ai-panel-settings-button"
          :title="t('settings.ai')"
          :aria-label="t('settings.ai')"
          @click="$emit('open-settings')"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82V22a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8.6 20a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.82-.33H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.44 3.9l.06.06A1.65 1.65 0 0 0 8.6 4.6a1.65 1.65 0 0 0 1-.6V4a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.37.2.68.5.9.86H22a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1 .6z" />
          </svg>
        </button>
      </div>
    </div>

    <div ref="panelBodyRef" class="ai-panel-body">
      <div v-if="panelError" class="ai-error-card">{{ panelError }}</div>
      <div v-if="saveWarning" class="ai-error-card is-warning">{{ saveWarning }}</div>

      <div class="ai-message-list">
        <article
          v-for="message in aiStore.messages"
          :key="message.id"
          class="ai-message"
          :class="`is-${message.role}`"
        >
          <template v-if="message.role === 'assistant'">
            <div v-if="shouldShowAssistantProcess(message)" class="ai-process-block">
              <details v-if="getAssistantReasoning(message)" class="ai-reasoning-details" :open="shouldOpenAssistantReasoning(message)">
                <summary class="ai-process-summary">
                  <span class="ai-process-pill">
                    <span>{{ getAssistantThinkingLabel(message) }}</span>
                    <span v-if="message.id === currentAssistantMessageId" class="ai-dot-loader" aria-hidden="true"><i></i><i></i><i></i></span>
                    <span class="ai-process-chevron" aria-hidden="true">›</span>
                  </span>
                </summary>
                <span class="ai-process-divider" aria-hidden="true"></span>
                <div class="ai-reasoning-markdown-preview">
                  <MarkdownPreview
                    :content="getAssistantReasoning(message)"
                    :source-path="props.activeTab?.filePath || ''"
                    :font-size="12"
                  />
                </div>
              </details>
              <div v-else class="ai-process-summary">
                <span class="ai-process-pill">
                  <span>{{ getAssistantThinkingLabel(message) }}</span>
                  <span v-if="message.id === currentAssistantMessageId" class="ai-dot-loader" aria-hidden="true"><i></i><i></i><i></i></span>
                </span>
              </div>
            </div>
            <div v-if="message.content.trim()" class="ai-message-markdown-preview">
              <MarkdownPreview
                :content="message.content"
                :source-path="props.activeTab?.filePath || ''"
                :font-size="13"
              />
            </div>
          </template>
          <pre v-else-if="message.content.trim()">{{ message.content }}</pre>
          <div v-if="canShowMessageActions(message)" class="ai-message-actions">
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('common.copy')"
              :aria-label="t('common.copy')"
              @click="copyMessageResult(message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('ai.replaceDocument')"
              :aria-label="t('ai.replaceDocument')"
              :disabled="!canApplyMessageInline(message)"
              @click="handleApplyResult('replace-document', message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M8 13h8" />
                <path d="M13 10l3 3-3 3" />
              </svg>
            </button>
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('ai.replaceSelection')"
              :aria-label="t('ai.replaceSelection')"
              :disabled="!canReplaceMessageResult(message)"
              @click="handleApplyResult('replace-selection', message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M16 3h5v5" />
                <path d="M21 3l-7 7" />
                <path d="M8 21H3v-5" />
                <path d="M3 21l7-7" />
              </svg>
            </button>
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('ai.insertCursor')"
              :aria-label="t('ai.insertCursor')"
              :disabled="!canApplyMessageInline(message)"
              @click="handleApplyResult('insert-cursor', message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 4v16" />
                <path d="M9 12h10" />
                <path d="M15 8l4 4-4 4" />
              </svg>
            </button>
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('ai.appendEnd')"
              :aria-label="t('ai.appendEnd')"
              :disabled="!canApplyMessageInline(message)"
              @click="handleApplyResult('append-end', message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 5v10" />
                <path d="M8 11l4 4 4-4" />
                <path d="M5 19h14" />
              </svg>
            </button>
            <button
              type="button"
              class="ai-message-action-button"
              :title="t('ai.newDocument')"
              :aria-label="t('ai.newDocument')"
              @click="handleApplyResult('new-document', message.content)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="M9 15h6" />
              </svg>
            </button>
          </div>
        </article>
      </div>
    </div>

    <form class="ai-input-area" @submit.prevent="sendChat()">
      <div class="ai-composer-shell">
        <textarea
          v-model="userInput"
          class="ai-input"
          rows="3"
          :placeholder="t('ai.inputPlaceholder')"
          :title="composerInputTitle"
          :disabled="isBusy"
          @keydown="handleComposerInputKeydown"
        />
        <div v-if="visibleContextChips.length" class="ai-context-chip-row">
          <div
            v-for="chip in visibleContextChips"
            :key="chip.id"
            class="ai-context-chip"
            :class="{ 'is-selected': chip.selected }"
          >
            <button
              type="button"
              class="ai-context-chip-main"
              :title="chip.path || chip.name"
              @click="toggleContextChip(chip)"
            >
              <span class="ai-context-chip-status" aria-hidden="true">{{ chip.selected ? '✓' : '⌖' }}</span>
              <span class="ai-context-chip-file-icon" aria-hidden="true">
                <span v-if="chip.type === 'folder'" class="ai-context-folder-icon">
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path d="M2.05 4.85c0-.83.67-1.5 1.5-1.5h2.82l1.1 1.25h6.98c.83 0 1.5.67 1.5 1.5v.72H2.05Z" fill="#d5a14b" />
                    <path d="M2.05 6.1h13.9v5.85c0 .83-.67 1.5-1.5 1.5H3.55c-.83 0-1.5-.67-1.5-1.5Z" fill="#e0b35b" />
                    <path d="M2.05 6.1h13.9" stroke="rgba(120,78,17,0.2)" stroke-width="0.8" />
                  </svg>
                </span>
                <FileIcon v-else :filename="chip.path || chip.name" :size="16" />
              </span>
              <span class="ai-context-chip-name">{{ chip.name }}</span>
            </button>
            <button
              v-if="chip.removable"
              type="button"
              class="ai-context-chip-remove"
              :aria-label="t('ai.removeContext')"
              @click="removeContextAttachment(chip.id)"
            >
              ×
            </button>
          </div>
        </div>
        <div class="ai-composer-toolbar">
          <div class="ai-composer-tools">
            <div
              class="ai-context-add-picker"
              @mouseenter="clearContextMenuCloseTimer"
              @mouseleave="scheduleCloseContextMenu"
              @focusout="handleContextMenuFocusOut"
            >
              <button
                ref="contextAddButtonRef"
                type="button"
                class="ai-context-add-button"
                :class="{ 'is-active': contextMenuOpen }"
                :aria-expanded="contextMenuOpen"
                :aria-label="t('ai.addContext')"
                :title="t('ai.addContext')"
                aria-haspopup="menu"
                @click="toggleContextMenu"
              >
                +
              </button>
              <div v-if="contextMenuOpen" class="ai-context-menu" role="menu" :style="contextMenuStyle">
                <input
                  v-model="contextSearch"
                  class="ai-context-search"
                  type="search"
                  :placeholder="t('ai.searchContext')"
                  @keydown.esc.prevent="closeContextMenu"
                >
                <button
                  type="button"
                  class="ai-context-menu-item"
                  :class="{ 'is-active': currentDocumentSelected && currentDocumentChip }"
                  :disabled="!currentDocumentChip"
                  role="menuitem"
                  @click="selectCurrentDocumentContext"
                >
                  <span class="ai-context-menu-icon">▣</span>
                  <span>{{ t('ai.currentDocument') }}</span>
                </button>
                <button type="button" class="ai-context-menu-item" role="menuitem" @click="chooseContextFile">
                  <span class="ai-context-menu-icon">□</span>
                  <span>{{ t('ai.chooseFile') }}</span>
                </button>
                <button type="button" class="ai-context-menu-item" role="menuitem" @click="chooseContextFolder">
                  <span class="ai-context-menu-icon">▤</span>
                  <span>{{ t('ai.chooseFolder') }}</span>
                </button>
                <div v-if="filteredRecentContextItems.length" class="ai-context-menu-divider"></div>
                <div v-if="filteredRecentContextItems.length" class="ai-context-menu-header">
                  <span>{{ t('ai.recentContext') }}</span>
                  <span>{{ t('ai.fromSlimNote') }}</span>
                </div>
                <button
                  v-for="item in filteredRecentContextItems"
                  :key="item.id"
                  type="button"
                  class="ai-context-menu-item is-recent"
                  role="menuitem"
                  :title="item.path"
                  @click="addContextAttachment(item)"
                >
                  <span class="ai-context-menu-icon" aria-hidden="true">
                    <span v-if="item.type === 'folder'" class="ai-context-folder-icon">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M2.05 4.85c0-.83.67-1.5 1.5-1.5h2.82l1.1 1.25h6.98c.83 0 1.5.67 1.5 1.5v.72H2.05Z" fill="#d5a14b" />
                        <path d="M2.05 6.1h13.9v5.85c0 .83-.67 1.5-1.5 1.5H3.55c-.83 0-1.5-.67-1.5-1.5Z" fill="#e0b35b" />
                        <path d="M2.05 6.1h13.9" stroke="rgba(120,78,17,0.2)" stroke-width="0.8" />
                      </svg>
                    </span>
                    <FileIcon v-else :filename="item.path || item.name" :size="18" />
                  </span>
                  <span class="ai-context-menu-name">{{ item.displayName }}</span>
                  <span class="ai-context-menu-kind">{{ item.kindLabel }}</span>
                </button>
              </div>
            </div>
            <div v-if="aiProviderOptions.length" class="ai-model-routing-controls">
              <div
                ref="providerRoutePickerRef"
                class="ai-route-picker"
                @focusout="handleRouteMenuFocusOut"
                @keydown.esc.prevent="closeRouteMenu"
              >
                <button
                  ref="providerRouteButtonRef"
                  type="button"
                  class="ai-route-select-shell ai-route-select-shell--provider"
                  :class="{ 'is-disabled': isBusy, 'is-active': routeMenuOpen === 'provider' }"
                  :title="selectedAiProviderLabel"
                  :aria-label="t('ai.providerSelect')"
                  :aria-expanded="routeMenuOpen === 'provider'"
                  :disabled="isBusy"
                  aria-haspopup="listbox"
                  @click="toggleRouteMenu('provider')"
                >
                  <span class="ai-route-provider-label">
                    <span class="ai-provider-route-icon" :class="getAiProviderIconClass(selectedAiProviderIcon)" :style="getAiProviderIconStyle(selectedAiProviderIcon)" aria-hidden="true">
                      <svg v-if="selectedAiProviderIcon.path" class="ai-provider-route-icon-svg" viewBox="0 0 24 24" focusable="false">
                        <path :d="selectedAiProviderIcon.path"/>
                      </svg>
                      <span v-else>{{ selectedAiProviderIcon.label }}</span>
                    </span>
                    <span class="ai-route-select-label">{{ selectedAiProviderLabel }}</span>
                  </span>
                  <span class="ai-route-select-caret" aria-hidden="true"></span>
                </button>
                <div
                  v-if="routeMenuOpen === 'provider'"
                  class="ai-list-popover ai-route-menu"
                  role="listbox"
                  :aria-label="t('ai.providerSelect')"
                  :style="routeMenuStyle"
                >
                  <div class="ai-list-header">
                    <span>{{ t('ai.providerSelect') }}</span>
                  </div>
                  <button
                    v-for="provider in aiProviderOptions"
                    :key="provider.id"
                    type="button"
                    class="ai-list-item ai-route-menu-item"
                    :class="{ 'is-active': provider.id === selectedProviderId }"
                    role="option"
                    :aria-selected="provider.id === selectedProviderId"
                    @click="selectRouteProvider(provider.id)"
                  >
                    <span class="ai-list-item-content">
                      <span class="ai-provider-route-icon" :class="getAiProviderIconClass(provider.icon)" :style="getAiProviderIconStyle(provider.icon)" aria-hidden="true">
                        <svg v-if="provider.icon.path" class="ai-provider-route-icon-svg" viewBox="0 0 24 24" focusable="false">
                          <path :d="provider.icon.path"/>
                        </svg>
                        <span v-else>{{ provider.icon.label }}</span>
                      </span>
                      <span class="ai-list-item-title">{{ provider.name }}</span>
                    </span>
                    <span class="ai-list-item-icon" aria-hidden="true">
                      <span v-if="provider.id === selectedProviderId" class="ai-list-check"></span>
                    </span>
                  </button>
                </div>
              </div>
              <div
                ref="modelRoutePickerRef"
                class="ai-route-picker"
                @focusout="handleRouteMenuFocusOut"
                @keydown.esc.prevent="closeRouteMenu"
              >
                <button
                  ref="modelRouteButtonRef"
                  type="button"
                  class="ai-route-select-shell ai-route-select-shell--model"
                  :class="{ 'is-disabled': isBusy || !aiModelOptions.length, 'is-active': routeMenuOpen === 'model' }"
                  :title="selectedAiModelLabel"
                  :aria-label="t('ai.modelSelect')"
                  :aria-expanded="routeMenuOpen === 'model'"
                  :disabled="isBusy || !aiModelOptions.length"
                  aria-haspopup="listbox"
                  @click="toggleRouteMenu('model')"
                >
                  <span class="ai-route-select-label">{{ selectedAiModelLabel }}</span>
                  <span class="ai-route-select-caret" aria-hidden="true"></span>
                </button>
                <div
                  v-if="routeMenuOpen === 'model'"
                  class="ai-list-popover ai-route-menu"
                  role="listbox"
                  :aria-label="t('ai.modelSelect')"
                  :style="routeMenuStyle"
                >
                  <div class="ai-list-header">
                    <span>{{ t('ai.modelSelect') }}</span>
                  </div>
                  <button
                    v-for="model in aiModelOptions"
                    :key="model.id"
                    type="button"
                    class="ai-list-item ai-route-menu-item"
                    :class="{ 'is-active': model.id === selectedModelId }"
                    role="option"
                    :aria-selected="model.id === selectedModelId"
                    @click="selectRouteModel(model.id)"
                  >
                    <span class="ai-list-item-content">
                      <span class="ai-list-item-title">{{ model.name }}</span>
                    </span>
                    <span class="ai-list-item-icon" aria-hidden="true">
                      <span v-if="model.id === selectedModelId" class="ai-list-check"></span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="ai-composer-controls">
            <div
              class="ai-quick-action-picker"
              @mouseenter="clearQuickActionCloseTimer"
              @mouseleave="scheduleCloseQuickActionMenu"
              @focusin="clearQuickActionCloseTimer"
              @focusout="scheduleCloseQuickActionMenu"
            >
              <button
                type="button"
                class="ai-quick-action-trigger ai-quick-action-main"
                :disabled="isSelectedQuickActionDisabled"
                :title="selectedQuickActionLabel"
                @click="handleQuickActionSelect(selectedQuickAction)"
              >
                <span class="ai-quick-action-label">{{ selectedQuickActionLabel }}</span>
              </button>
              <button
                type="button"
                class="ai-quick-action-trigger ai-quick-action-menu-trigger"
                :disabled="isSelectedQuickActionDisabled"
                :aria-expanded="quickActionMenuOpen"
                aria-haspopup="menu"
                :title="selectedQuickActionLabel"
                @mouseenter="openQuickActionMenu"
                @click="toggleQuickActionMenu"
                @keydown.down.prevent="openQuickActionMenu"
              >
                <span class="ai-quick-action-caret" aria-hidden="true"></span>
              </button>
              <div v-if="quickActionMenuOpen" class="ai-quick-action-menu" role="menu">
                <button
                  v-for="action in visibleActions"
                  :key="action.id"
                  type="button"
                  class="ai-quick-action-item"
                  :class="{ 'is-active': action.id === selectedQuickAction.id }"
                  :disabled="isActionDisabled(action)"
                  role="menuitem"
                  @click="handleQuickActionSelect(action)"
                >
                  <span>{{ t(action.labelKey) }}</span>
                  <span v-if="action.id === selectedQuickAction.id" class="ai-quick-action-mark" aria-hidden="true"></span>
                </button>
              </div>
            </div>
            <div
              ref="contextUsagePickerRef"
              class="ai-context-usage-picker"
              :style="contextUsageRingStyle"
              @focusout="handleContextUsageFocusOut"
              @keydown.esc.prevent="closeContextUsagePopover"
            >
              <button
                type="button"
                class="ai-context-usage-button"
                :class="`is-${contextUsageStats.status}`"
                :aria-label="contextUsageTitle"
                :aria-expanded="contextUsagePopoverOpen"
                :title="contextUsageTitle"
                aria-haspopup="dialog"
                @click="toggleContextUsagePopover"
              >
                <span class="ai-context-usage-ring" :style="contextUsageRingStyle" aria-hidden="true"></span>
              </button>
              <div
                v-if="contextUsagePopoverOpen"
                class="ai-context-usage-popover"
                role="dialog"
                :aria-label="t('ai.contextUsageDetail')"
                :style="contextUsagePopoverStyle"
              >
                <div class="ai-context-usage-summary ai-context-usage-card">
                  <div class="ai-context-usage-header">
                    <span class="ai-context-usage-heading">{{ t('ai.contextUsageDetail') }}</span>
                    <span class="ai-context-usage-percent">{{ contextUsageStats.percent }}%</span>
                  </div>
                  <div class="ai-context-usage-total">
                    <span>{{ contextUsageTotalLabel }}</span>
                    <span>{{ contextUsageOutputReserveLabel }}</span>
                  </div>
                  <div class="ai-context-usage-meter" :style="contextUsageRingStyle" aria-hidden="true">
                    <span :style="contextUsageMeterFillStyle"></span>
                  </div>
                </div>
                <div class="ai-context-usage-detail ai-context-usage-card">
                  <div class="ai-context-usage-rows">
                    <div v-for="row in contextUsageRows" :key="row.id" class="ai-context-usage-row" :style="row.style">
                      <span class="ai-context-usage-row-label">{{ row.label }}</span>
                      <span class="ai-context-usage-row-value">{{ row.tokensLabel }}</span>
                      <span class="ai-context-usage-row-meter" aria-hidden="true">
                        <span></span>
                      </span>
                    </div>
                  </div>
                  <div class="ai-context-usage-notes">
                    <div class="ai-context-usage-note" :class="`is-${contextUsageStats.status}`">{{ contextUsageStatusNote }}</div>
                    <div class="ai-context-usage-note is-muted">{{ t('ai.contextUsageEstimateNote') }}</div>
                  </div>
                </div>
              </div>
            </div>
            <button
              :type="aiStore.isGenerating ? 'button' : 'submit'"
              class="ai-send-button"
              :class="{ 'is-generating': aiStore.isGenerating }"
              :disabled="sendButtonDisabled"
              :aria-label="aiStore.isGenerating ? t('ai.stop') : t('ai.send')"
              :title="composerActionTitle"
              @click="handleComposerActionButtonClick"
            >
              <span class="ai-send-icon" :class="{ 'is-stop-icon': aiStore.isGenerating }" aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
    </form>

    <ModalDialog
      :show="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @close="closeConfirmDialog"
      @confirm="acceptConfirmDialog"
    >
      <template #footer>
        <button type="button" class="modal-btn" @click="closeConfirmDialog">{{ t('common.cancel') }}</button>
        <button type="button" class="modal-btn primary" @click="acceptConfirmDialog">{{ confirmDialog.confirmLabel }}</button>
      </template>
    </ModalDialog>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAIStore } from '../stores/ai'
import { useFileStore } from '../stores/file'
import { buildConversationCompressionPlan, buildConversationSummaryMessages } from '../utils/aiConversationSummary'
import { buildAiContext, canApplyAiEdits } from '../utils/aiContext'
import { buildContextUsageStats } from '../utils/aiContextUsage'
import { resolveAiAutoApplyIntent } from '../utils/aiAutoApply'
import { resolveAiComposerKeyAction } from '../utils/aiComposerKeyboard'
import { AI_ACTIONS, POLISH_DOCUMENT_ACTION_ID, PROOFREAD_DOCUMENT_ACTION_ID, buildAiMessages } from '../utils/aiPrompts'
import { AI_PROVIDER_PRESETS, resolveLocalAiModelSelection } from '../utils/aiSettingsView'
import { getFileExtension, isSupportedFile } from '../utils/fileSupport'
import FileIcon from './FileIcon.vue'
import ModalDialog from './ModalDialog.vue'

const MarkdownPreview = defineAsyncComponent(() => import('./MarkdownPreview.vue'))

const { t, locale } = useI18n()

const props = defineProps({
  activeTab: { type: Object, default: null },
  getSelection: { type: Function, default: () => '' },
  getCursorOffset: { type: Function, default: () => 0 }
})

const emit = defineEmits(['apply-result', 'open-settings'])
const aiStore = useAIStore()
const fileStore = useFileStore()
const QUICK_ACTION_STORAGE_KEY = 'slimnote.ai.lastQuickActionId'
const QUICK_ACTION_ID_ALIASES = {
  'polish-selection': POLISH_DOCUMENT_ACTION_ID
}
const AI_PROVIDER_SELECTION_STORAGE_KEY = 'slimnote.ai.selectedProviderId'
const AI_MODEL_SELECTION_STORAGE_KEY = 'slimnote.ai.selectedModelId'
const AI_PROVIDER_MODEL_SELECTION_STORAGE_KEY = 'slimnote.ai.selectedModelIdByProvider'
const DEFAULT_QUICK_ACTION_ID = 'summarize-document'
const CURRENT_DOCUMENT_CONTEXT_ID = 'current-document'
const FOLDER_CONTEXT_FILE_LIMIT = 8
const FOLDER_CONTEXT_CONTENT_LIMIT = 12000
const FOLDER_CONTEXT_FILE_CONTENT_LIMIT = 2000
const CONTEXT_DISPLAY_NAME_MAX_LENGTH = 30
const CONVERSATION_SUMMARY_TIMEOUT_FALLBACK_MS = 30000
const CONTEXT_USAGE_STATUS_COLORS = {
  normal: '#2563eb',
  warning: '#d97706',
  danger: '#e11d48',
  full: '#dc2626'
}
const CONTEXT_USAGE_PART_COLORS = {
  system: '#2563eb',
  summary: '#7c3aed',
  history: '#0891b2',
  currentDocument: '#16a34a',
  attachments: '#ea580c',
  userInput: '#db2777'
}
const CONTEXT_USAGE_PARTS = [
  { id: 'system', labelKey: 'ai.contextUsageSystem' },
  { id: 'summary', labelKey: 'ai.contextUsageSummary' },
  { id: 'history', labelKey: 'ai.contextUsageHistory' },
  { id: 'currentDocument', labelKey: 'ai.contextUsageCurrentDocument' },
  { id: 'attachments', labelKey: 'ai.contextUsageAttachments' },
  { id: 'userInput', labelKey: 'ai.contextUsageUserInput' }
]
const ASSISTANT_PROCESS_PHASE_LABELS = {
  preparing: 'ai.processStatus.preparing',
  connecting: 'ai.processStatus.connecting',
  waiting: 'ai.processStatus.waiting',
  reasoning: 'ai.processStatus.reasoning',
  generating: 'ai.processStatus.generating',
  complete: 'ai.processStatus.complete'
}
const userInput = ref('')
const panelError = ref('')
const saveWarning = ref('')
const isSubmitting = ref(false)
const currentAssistantMessageId = ref('')
const assistantProcessByMessageId = ref({})
const quickActionMenuOpen = ref(false)
const contextMenuOpen = ref(false)
const routeMenuOpen = ref('')
const sessionHistoryOpen = ref(false)
const sessionHistorySearch = ref('')
const sessionHistoryActionMenuId = ref('')
const panelRef = ref(null)
const panelBodyRef = ref(null)
const contextAddButtonRef = ref(null)
const sessionHistoryPickerRef = ref(null)
const sessionHistoryButtonRef = ref(null)
const sessionHistoryPopoverRef = ref(null)
const sessionHistorySearchRef = ref(null)
const providerRoutePickerRef = ref(null)
const providerRouteButtonRef = ref(null)
const modelRoutePickerRef = ref(null)
const modelRouteButtonRef = ref(null)
const contextMenuStyle = ref({})
const routeMenuStyle = ref({})
const sessionHistoryPopoverStyle = ref({})
const contextSearch = ref('')
const contextUsagePopoverOpen = ref(false)
const contextUsagePickerRef = ref(null)
const contextUsagePopoverStyle = ref({})
const selectedQuickActionId = ref(readStoredQuickActionId())
const selectedProviderId = ref(readStoredProviderId())
const selectedModelId = ref(readStoredModelId())
const currentSelectionText = ref('')
const currentDocumentSelected = ref(true)
const contextAttachments = ref([])
const thinkingStartedAt = ref(0)
const thinkingNow = ref(0)
const isSessionTransitioning = ref(false)
const confirmDialog = ref({ visible: false, title: '', message: '', confirmLabel: '' })
const unlisteners = []
let quickActionCloseTimer = null
let contextMenuCloseTimer = null
let contextMenuResizeObserver = null
let thinkingTimer = null
let selectionSyncFrame = 0
let autoApplyByRequestId = {}
let confirmDialogAction = null

const canApplyEdits = computed(() => canApplyAiEdits(props.activeTab?.language))
const isBusy = computed(() => isSubmitting.value || aiStore.isGenerating)
const latestAssistantContent = computed(() => {
  const assistantMessages = aiStore.messages.filter(message => message.role === 'assistant')
  return assistantMessages[assistantMessages.length - 1]?.content || ''
})
const canSend = computed(() => userInput.value.trim().length > 0)
const sendButtonDisabled = computed(() => !aiStore.isGenerating && (isBusy.value || !canSend.value))
const composerInputTitle = computed(() => t('ai.inputShortcutHint'))
const composerActionTitle = computed(() => aiStore.isGenerating ? t('ai.stopShortcutHint') : t('ai.sendShortcutHint'))
const hasConversationMessages = computed(() => aiStore.messages.some(message => ['user', 'assistant'].includes(message.role) && message.content.trim()))
const sessionActionDisabled = computed(() => isBusy.value || isSessionTransitioning.value)
const thinkingElapsedLabel = computed(() => {
  const elapsedSeconds = Math.max(0, Math.floor((thinkingNow.value - thinkingStartedAt.value) / 1000))
  return elapsedSeconds > 0 ? formatThinkingDuration(elapsedSeconds) : ''
})
const sessionHistoryItems = computed(() => aiStore.sessions.map(session => {
  const title = String(session.title || '').trim() || t('ai.untitledConversation')
  return {
    ...session,
    title,
    meta: t('ai.conversationHistoryMeta', {
      time: formatSessionUpdatedAt(session.updatedAt || session.createdAt),
      count: getSessionMessageCount(session)
    }),
    isActive: Boolean(aiStore.activeSessionId && session.id === aiStore.activeSessionId)
  }
}))
const filteredSessionHistoryItems = computed(() => {
  const keyword = sessionHistorySearch.value.trim().toLowerCase()
  if (!keyword) return sessionHistoryItems.value
  return sessionHistoryItems.value.filter(session => {
    const title = session.title.toLowerCase()
    const firstUserMessage = session.messages?.find(message => message.role === 'user' && message.content)?.content || ''
    return title.includes(keyword) || firstUserMessage.toLowerCase().includes(keyword)
  })
})
const visibleActions = computed(() => AI_ACTIONS)
const selectedQuickAction = computed(() => findQuickAction(selectedQuickActionId.value) || findQuickAction(DEFAULT_QUICK_ACTION_ID) || AI_ACTIONS[0])
const selectedQuickActionLabel = computed(() => selectedQuickAction.value ? t(selectedQuickAction.value.labelKey) : '')
const isSelectedQuickActionDisabled = computed(() => isActionDisabled(selectedQuickAction.value))
const fallbackAiProviderIcon = { label: 'API', accent: '#0f766e', brand: 'custom' }
const aiProviderPresetIconOptions = AI_PROVIDER_PRESETS.map(preset => ({
  id: preset.id,
  name: preset.name,
  baseURL: preset.baseURL,
  icon: preset.icon || fallbackAiProviderIcon
}))
const aiProviderOptions = computed(() => {
  const providers = Array.isArray(aiStore.settings?.providers) ? aiStore.settings.providers : []
  return providers.map(provider => ({
    id: provider.id,
    name: provider.name || provider.id || 'Provider',
    icon: resolveAiProviderIcon(provider),
    provider
  }))
})
const selectedAiProvider = computed(() => aiProviderOptions.value.find(option => option.id === selectedProviderId.value)?.provider || aiProviderOptions.value[0]?.provider || null)
const selectedAiProviderIcon = computed(() => aiProviderOptions.value.find(option => option.id === selectedProviderId.value)?.icon || aiProviderOptions.value[0]?.icon || fallbackAiProviderIcon)
const aiModelOptions = computed(() => getProviderModelOptions(selectedAiProvider.value).map(model => ({
  id: model.id,
  name: model.name || model.model || model.id || 'Model',
  model
})))
const selectedAiSelection = computed(() => resolveLocalAiModelSelection(aiStore.settings || {}, {
  providerId: selectedProviderId.value,
  modelId: selectedModelId.value
}))
const selectedAiProviderLabel = computed(() => selectedAiSelection.value?.providerName || selectedAiProvider.value?.name || '')
const selectedAiModelLabel = computed(() => selectedAiSelection.value?.modelName || selectedAiSelection.value?.modelValue || '')
const contextUsageStats = computed(() => buildContextUsageStats({
  model: selectedAiSelection.value?.model || { model: selectedAiSelection.value?.modelValue, maxTokens: selectedAiSelection.value?.maxTokens },
  conversationSummary: aiStore.conversationSummary,
  messages: aiStore.messages,
  activeTab: props.activeTab || {},
  currentDocumentSelected: currentDocumentSelected.value,
  contextAttachments: contextAttachments.value,
  userInput: userInput.value
}))
const contextUsageRingStyle = computed(() => {
  const status = contextUsageStats.value.status
  const ratio = Math.min(1, Math.max(0, contextUsageStats.value.ratio))
  return {
    '--ai-context-usage-color': CONTEXT_USAGE_STATUS_COLORS[status] || CONTEXT_USAGE_STATUS_COLORS.normal,
    '--ai-context-usage-sweep': `${Math.round(ratio * 360)}deg`
  }
})
const contextUsageMeterFillStyle = computed(() => ({
  width: `${Math.min(100, Math.max(0, contextUsageStats.value.percent))}%`
}))
const contextUsageTitle = computed(() => t('ai.contextUsageTitle', {
  percent: contextUsageStats.value.percent,
  used: formatTokenCount(contextUsageStats.value.usedTokens),
  total: formatTokenCount(contextUsageStats.value.inputBudgetTokens)
}))
const contextUsageTotalLabel = computed(() => t('ai.contextUsageTotal', {
  used: formatTokenCount(contextUsageStats.value.usedTokens),
  total: formatTokenCount(contextUsageStats.value.inputBudgetTokens)
}))
const contextUsageOutputReserveLabel = computed(() => t('ai.contextUsageOutputReserve', {
  tokens: formatTokenCount(contextUsageStats.value.maxOutputTokens)
}))
const contextUsageStatusNote = computed(() => t(`ai.contextUsageStatus.${contextUsageStats.value.status}`))
const contextUsageRows = computed(() => {
  const stats = contextUsageStats.value
  const inputBudget = Math.max(1, stats.inputBudgetTokens)
  return CONTEXT_USAGE_PARTS.map(part => {
    const tokens = stats.parts[part.id]?.tokens || 0
    const width = Math.min(100, Math.max(0, (tokens / inputBudget) * 100))
    return {
      id: part.id,
      label: t(part.labelKey),
      tokensLabel: formatTokenCount(tokens),
      style: {
        '--ai-context-usage-row-width': `${width}%`,
        '--ai-context-usage-row-color': CONTEXT_USAGE_PART_COLORS[part.id] || 'var(--ai-context-usage-color)'
      }
    }
  })
})
const currentDocumentChip = computed(() => {
  if (!props.activeTab) return null
  return {
    id: CURRENT_DOCUMENT_CONTEXT_ID,
    type: 'current-document',
    name: getDisplayFileName(props.activeTab),
    path: props.activeTab.filePath || '',
    badge: getContextBadge(props.activeTab.filePath || props.activeTab.title || props.activeTab.language),
    selected: currentDocumentSelected.value,
    removable: false
  }
})
const visibleContextChips = computed(() => [
  ...(currentDocumentChip.value ? [currentDocumentChip.value] : []),
  ...contextAttachments.value
])
const selectedContextCount = computed(() => visibleContextChips.value.filter(chip => chip.selected).length)
const hasSelectedContext = computed(() => selectedContextCount.value > 0)
const filteredRecentContextItems = computed(() => {
  const keyword = contextSearch.value.trim().toLowerCase()
  const recentFiles = fileStore.recentFiles.map(file => buildRecentContextItem(file.path, 'file')).filter(Boolean)
  const recentFolders = fileStore.recentFolders.map(folder => buildRecentContextItem(folder.path, 'folder')).filter(Boolean)
  return [...recentFiles, ...recentFolders]
    .filter(item => !keyword || item.name.toLowerCase().includes(keyword) || item.path.toLowerCase().includes(keyword))
    .slice(0, 8)
})

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `ai-request-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function formatThinkingDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}m${remainingSeconds}s` : `${remainingSeconds}s`
}

function formatReasoningLength(text = '') {
  const length = String(text || '').trim().length
  return length > 0 ? t('ai.reasoningLength', { count: length }) : ''
}

function formatTokenCount(value) {
  const tokens = Math.max(0, Math.round(Number(value) || 0))
  if (tokens >= 1000000) return `${formatCompactNumber(tokens / 1000000)}m`
  if (tokens >= 1000) return `${formatCompactNumber(tokens / 1000)}k`
  return String(tokens)
}

function formatCompactNumber(value) {
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function getSessionMessageCount(session = {}) {
  return Array.isArray(session.messages) ? session.messages.filter(message => ['user', 'assistant'].includes(message.role) && message.content?.trim()).length : 0
}

function formatSessionUpdatedAt(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return t('ai.unknownConversationTime')

  try {
    const now = new Date()
    const sameYear = date.getFullYear() === now.getFullYear()
    return new Intl.DateTimeFormat(locale.value, {
      month: '2-digit',
      day: '2-digit',
      ...(sameYear ? {} : { year: 'numeric' }),
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function stopThinkingTimer() {
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = null
  }
}

function startThinkingTimer() {
  stopThinkingTimer()
  const now = Date.now()
  thinkingStartedAt.value = now
  thinkingNow.value = now
  thinkingTimer = setInterval(() => {
    thinkingNow.value = Date.now()
  }, 1000)
}

function resetThinkingTimer() {
  stopThinkingTimer()
  thinkingStartedAt.value = 0
  thinkingNow.value = 0
}

function getAssistantProcess(message = {}) {
  return message?.id ? assistantProcessByMessageId.value[message.id] || null : null
}

function getAssistantReasoning(message = {}) {
  return String(getAssistantProcess(message)?.reasoning || '').trim()
}

function getCurrentThinkingElapsedSeconds() {
  if (!thinkingStartedAt.value) return 0
  const endTime = thinkingNow.value || Date.now()
  return Math.max(0, Math.floor((endTime - thinkingStartedAt.value) / 1000))
}

function isAssistantProcessComplete(message = {}) {
  return getAssistantProcess(message)?.phase === 'complete'
}

function getAssistantElapsedLabel(message = {}) {
  if (message.id === currentAssistantMessageId.value) return thinkingElapsedLabel.value
  return formatThinkingDuration(getAssistantProcess(message)?.elapsedSeconds || 0)
}

function getAssistantThinkingLabel(message = {}) {
  const elapsedLabel = getAssistantElapsedLabel(message)
  const label = isAssistantProcessComplete(message) ? '\u5df2\u5904\u7406' : '\u601d\u8003\u4e2d'
  return elapsedLabel ? `${label} ${elapsedLabel}` : label
}

function shouldOpenAssistantReasoning(message = {}) {
  return message.id === currentAssistantMessageId.value && !isAssistantProcessComplete(message)
}

function shouldShowAssistantProcess(message = {}) {
  if (message.role !== 'assistant') return false
  const process = getAssistantProcess(message)
  return Boolean(process && (message.id === currentAssistantMessageId.value || isAssistantProcessComplete(message) || getAssistantReasoning(message)))
}

function getAssistantProcessLabel(message = {}) {
  const phase = getAssistantProcess(message)?.phase || 'waiting'
  return t(ASSISTANT_PROCESS_PHASE_LABELS[phase] || ASSISTANT_PROCESS_PHASE_LABELS.waiting)
}

function updateAssistantProcess(messageId, patch = {}) {
  if (!messageId) return
  const currentProcess = assistantProcessByMessageId.value[messageId] || { phase: 'preparing', reasoning: '' }
  assistantProcessByMessageId.value = {
    ...assistantProcessByMessageId.value,
    [messageId]: {
      ...currentProcess,
      ...patch
    }
  }
}

function appendAssistantReasoning(messageId, text = '') {
  const reasoningText = String(text || '')
  if (!reasoningText) return
  const currentProcess = assistantProcessByMessageId.value[messageId] || { phase: 'reasoning', reasoning: '' }
  updateAssistantProcess(messageId, {
    phase: 'reasoning',
    reasoning: `${currentProcess.reasoning || ''}${reasoningText}`
  })
}

function clearAssistantProcess(messageId = '') {
  if (!messageId) {
    assistantProcessByMessageId.value = {}
    return
  }
  const { [messageId]: _removed, ...nextProcesses } = assistantProcessByMessageId.value
  assistantProcessByMessageId.value = nextProcesses
}

function findQuickAction(actionId) {
  return AI_ACTIONS.find(action => action.id === actionId) || null
}

function normalizeQuickActionId(actionId) {
  const normalizedActionId = QUICK_ACTION_ID_ALIASES[actionId] || actionId
  return findQuickAction(normalizedActionId)?.id || DEFAULT_QUICK_ACTION_ID
}

function readStoredQuickActionId() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_QUICK_ACTION_ID
    return normalizeQuickActionId(localStorage.getItem(QUICK_ACTION_STORAGE_KEY))
  } catch {
    return DEFAULT_QUICK_ACTION_ID
  }
}

function readStorageValue(key) {
  try {
    return typeof localStorage === 'undefined' ? '' : String(localStorage.getItem(key) || '')
  } catch {
    return ''
  }
}

function saveStorageValue(key, value) {
  try {
    if (typeof localStorage === 'undefined') return
    const normalized = String(value || '').trim()
    if (normalized) {
      localStorage.setItem(key, normalized)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage failures; the current in-memory selection remains usable.
  }
}

function readStoredProviderId() {
  return readStorageValue(AI_PROVIDER_SELECTION_STORAGE_KEY)
}

function readStoredModelId() {
  return readStorageValue(AI_MODEL_SELECTION_STORAGE_KEY)
}

function readStoredProviderModelMap() {
  try {
    const parsed = JSON.parse(readStorageValue(AI_PROVIDER_MODEL_SELECTION_STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function readStoredModelIdForProvider(providerId) {
  return String(readStoredProviderModelMap()[providerId] || '')
}

function saveStoredProviderId(providerId) {
  saveStorageValue(AI_PROVIDER_SELECTION_STORAGE_KEY, providerId)
}

function saveStoredModelId(modelId) {
  saveStorageValue(AI_MODEL_SELECTION_STORAGE_KEY, modelId)
}

function saveStoredModelIdForProvider(providerId, modelId) {
  try {
    if (typeof localStorage === 'undefined') return
    const normalizedProviderId = String(providerId || '').trim()
    const normalizedModelId = String(modelId || '').trim()
    if (!normalizedProviderId) return
    const map = readStoredProviderModelMap()
    if (normalizedModelId) {
      map[normalizedProviderId] = normalizedModelId
    } else {
      delete map[normalizedProviderId]
    }
    localStorage.setItem(AI_PROVIDER_MODEL_SELECTION_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage failures; the current in-memory selection remains usable.
  }
}

function getProviderModelOptions(provider = {}) {
  const models = Array.isArray(provider?.models) ? provider.models : []
  const enabledModels = models.filter(model => model.enabled !== false)
  return enabledModels.length ? enabledModels : models
}

function estimateMenuTextWidth(value = '') {
  return Array.from(String(value || '')).reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 12 : 7), 0)
}

function normalizeAiProviderMatchText(value = '') {
  return String(value || '').trim().toLowerCase()
}

function resolveAiProviderIcon(provider = {}) {
  const providerId = normalizeAiProviderMatchText(provider.id)
  const providerName = normalizeAiProviderMatchText(provider.name)
  const providerBaseURL = normalizeAiProviderMatchText(provider.baseURL)
  const matchedPreset = aiProviderPresetIconOptions.find(preset => {
    const presetId = normalizeAiProviderMatchText(preset.id)
    const presetName = normalizeAiProviderMatchText(preset.name)
    const presetBaseURL = normalizeAiProviderMatchText(preset.baseURL)
    return providerId === presetId || providerId.startsWith(`${presetId}-`) || providerName === presetName || (providerBaseURL && providerBaseURL === presetBaseURL)
  })

  return matchedPreset?.icon || fallbackAiProviderIcon
}

function getAiProviderIconClass(icon = fallbackAiProviderIcon) {
  return `ai-provider-route-icon--${icon.brand || 'custom'}`
}

function getAiProviderIconStyle(icon = fallbackAiProviderIcon) {
  return { '--provider-accent': icon.accent || fallbackAiProviderIcon.accent }
}

function getRouteMenuPreferredWidth(type) {
  const labels = type === 'provider'
    ? aiProviderOptions.value.map(provider => provider.name)
    : aiModelOptions.value.map(model => model.name)
  const headerLabels = type === 'provider' ? [t('ai.providerSelect')] : [t('ai.modelSelect')]
  const longestLabelWidth = Math.max(0, ...labels.concat(headerLabels).map(label => estimateMenuTextWidth(label)))
  const contentChrome = type === 'provider' ? 88 : 60
  const minWidth = 148
  const maxWidth = type === 'provider' ? 232 : 204
  return Math.min(maxWidth, Math.max(minWidth, Math.ceil(longestLabelWidth + contentChrome)))
}

function syncAiModelSelection() {
  const providers = aiProviderOptions.value
  if (!providers.length) {
    selectedProviderId.value = ''
    selectedModelId.value = ''
    return
  }

  const providerOption = providers.find(option => option.id === selectedProviderId.value) || providers.find(option => option.id === readStoredProviderId()) || providers[0]
  selectedProviderId.value = providerOption.id

  const models = getProviderModelOptions(providerOption.provider)
  const storedModelId = readStoredModelIdForProvider(providerOption.id) || readStoredModelId()
  const model = models.find(item => item.id === selectedModelId.value) || models.find(item => item.id === storedModelId) || models[0] || null
  selectedModelId.value = model?.id || ''

  saveStoredProviderId(selectedProviderId.value)
  saveStoredModelId(selectedModelId.value)
  saveStoredModelIdForProvider(selectedProviderId.value, selectedModelId.value)
}

function handleProviderChange() {
  const provider = selectedAiProvider.value
  const models = getProviderModelOptions(provider)
  const storedModelId = readStoredModelIdForProvider(selectedProviderId.value)
  const model = models.find(item => item.id === storedModelId) || models[0] || null
  selectedModelId.value = model?.id || ''
  rememberModelSelection()
}

function rememberModelSelection() {
  saveStoredProviderId(selectedProviderId.value)
  saveStoredModelId(selectedModelId.value)
  saveStoredModelIdForProvider(selectedProviderId.value, selectedModelId.value)
}

function selectRouteProvider(providerId) {
  if (isBusy.value || selectedProviderId.value === providerId) {
    closeRouteMenu()
    return
  }

  selectedProviderId.value = providerId
  handleProviderChange()
  closeRouteMenu()
}

function selectRouteModel(modelId) {
  if (isBusy.value || !aiModelOptions.value.length) return
  selectedModelId.value = modelId
  rememberModelSelection()
  closeRouteMenu()
}

function saveStoredQuickActionId(actionId) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(QUICK_ACTION_STORAGE_KEY, normalizeQuickActionId(actionId))
  } catch {
    // Ignore storage failures; the quick action still works for the current session.
  }
}

function normalizePath(value) {
  return String(value || '').trim()
}

function getPathName(filePath) {
  const normalized = normalizePath(filePath)
  return normalized.split(/[\\/]/).pop() || normalized
}

function getDisplayFileName(tab = {}) {
  return normalizePath(tab.title) || getPathName(tab.filePath) || t('ai.currentDocument')
}

function formatMiddleEllipsis(value, maxLength = CONTEXT_DISPLAY_NAME_MAX_LENGTH) {
  const normalized = normalizePath(value)
  const limit = Math.max(8, Number(maxLength) || CONTEXT_DISPLAY_NAME_MAX_LENGTH)
  if (normalized.length <= limit) return normalized

  const marker = '...'
  const availableLength = limit - marker.length
  const endLength = Math.max(6, Math.floor(availableLength * 0.45))
  const startLength = Math.max(2, availableLength - endLength)
  return `${normalized.slice(0, startLength)}${marker}${normalized.slice(-endLength)}`
}

function getContextBadge(value) {
  const extension = getFileExtension(value)
  if (extension) return extension.slice(0, 4).toUpperCase()
  const normalized = normalizePath(value)
  return normalized ? normalized.slice(0, 3).toUpperCase() : 'TXT'
}

function getContextAttachmentId(type, path) {
  return `${type}:${normalizePath(path)}`
}

function getContextKindLabel(type) {
  return type === 'folder' ? t('ai.folderContext') : t('ai.fileContext')
}

function buildRecentContextItem(path, type) {
  const normalizedPath = normalizePath(path)
  if (!normalizedPath) return null
  return {
    id: getContextAttachmentId(type, normalizedPath),
    type,
    path: normalizedPath,
    name: getPathName(normalizedPath),
    displayName: formatMiddleEllipsis(getPathName(normalizedPath)),
    badge: type === 'folder' ? 'DIR' : getContextBadge(normalizedPath),
    selected: true,
    removable: true,
    kindLabel: getContextKindLabel(type)
  }
}

function clearContextMenuCloseTimer() {
  if (!contextMenuCloseTimer) return
  clearTimeout(contextMenuCloseTimer)
  contextMenuCloseTimer = null
}

function openContextMenu() {
  clearContextMenuCloseTimer()
  contextMenuOpen.value = true
  closeSessionHistoryPopover()
  nextTick(updateContextMenuPosition)
}

function closeContextMenu() {
  clearContextMenuCloseTimer()
  contextMenuOpen.value = false
  contextMenuStyle.value = {}
  contextSearch.value = ''
}

function updateContextMenuPosition() {
  if (!contextMenuOpen.value || typeof window === 'undefined') return
  const buttonElement = contextAddButtonRef.value
  if (!buttonElement?.getBoundingClientRect) return

  const rect = buttonElement.getBoundingClientRect()
  const panelRect = buttonElement.closest?.('.ai-assistant-panel')?.getBoundingClientRect?.()
  const gutter = 12
  const boundaryLeft = Math.max(gutter, (panelRect?.left ?? 0) + gutter)
  const boundaryRight = Math.min(window.innerWidth - gutter, (panelRect?.right ?? window.innerWidth) - gutter)
  const availableWidth = Math.max(0, boundaryRight - boundaryLeft)
  const width = Math.max(120, Math.min(360, availableWidth || window.innerWidth - gutter * 2))
  const leftLimit = Math.max(boundaryLeft, boundaryRight - width)
  const left = Math.min(Math.max(boundaryLeft, rect.left), leftLimit)
  const boundaryTop = Math.max(gutter, (panelRect?.top ?? 0) + gutter)
  const availableAbove = Math.max(80, rect.top - boundaryTop - 8)
  const maxHeight = Math.min(380, availableAbove)

  contextMenuStyle.value = {
    left: `${Math.round(left)}px`,
    bottom: `${Math.round(window.innerHeight - rect.top + 8)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(maxHeight)}px`
  }
}

function updateContextUsagePopoverPosition() {
  if (!contextUsagePopoverOpen.value || typeof window === 'undefined') return
  const pickerElement = contextUsagePickerRef.value
  const buttonElement = pickerElement?.querySelector?.('.ai-context-usage-button') || pickerElement
  if (!buttonElement?.getBoundingClientRect) return

  const rect = buttonElement.getBoundingClientRect()
  const panelRect = buttonElement.closest?.('.ai-assistant-panel')?.getBoundingClientRect?.()
  const gutter = 12
  const boundaryLeft = Math.max(gutter, (panelRect?.left ?? 0) + gutter)
  const boundaryRight = Math.min(window.innerWidth - gutter, (panelRect?.right ?? window.innerWidth) - gutter)
  const availableWidth = Math.max(0, boundaryRight - boundaryLeft)
  const width = Math.min(420, availableWidth || window.innerWidth - gutter * 2)
  const leftLimit = Math.max(boundaryLeft, boundaryRight - width)
  const left = Math.min(Math.max(boundaryLeft, rect.right - width), leftLimit)
  const boundaryTop = Math.max(gutter, (panelRect?.top ?? 0) + gutter)
  const availableAbove = Math.max(160, rect.top - boundaryTop - 8)

  contextUsagePopoverStyle.value = {
    left: `${Math.round(left)}px`,
    bottom: `${Math.round(window.innerHeight - rect.top + 8)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(Math.min(560, availableAbove))}px`,
    '--ai-context-usage-detail-max-height': `${Math.round(Math.max(180, Math.min(390, availableAbove - 154)))}px`
  }
}

function updateRouteMenuPosition() {
  if (!routeMenuOpen.value || typeof window === 'undefined') return
  const buttonElement = routeMenuOpen.value === 'provider' ? providerRouteButtonRef.value : modelRouteButtonRef.value
  if (!buttonElement?.getBoundingClientRect) return

  const rect = buttonElement.getBoundingClientRect()
  const panelRect = buttonElement.closest?.('.ai-assistant-panel')?.getBoundingClientRect?.()
  const gutter = 12
  const boundaryLeft = Math.max(gutter, (panelRect?.left ?? 0) + gutter)
  const boundaryRight = Math.min(window.innerWidth - gutter, (panelRect?.right ?? window.innerWidth) - gutter)
  const availableWidth = Math.max(0, boundaryRight - boundaryLeft)
  const preferredWidth = getRouteMenuPreferredWidth(routeMenuOpen.value)
  const width = Math.min(preferredWidth, availableWidth || window.innerWidth - gutter * 2)
  const leftLimit = Math.max(boundaryLeft, boundaryRight - width)
  const left = Math.min(Math.max(boundaryLeft, rect.left), leftLimit)
  const boundaryTop = Math.max(gutter, (panelRect?.top ?? 0) + gutter)
  const availableAbove = Math.max(120, rect.top - boundaryTop - 8)

  routeMenuStyle.value = {
    left: `${Math.round(left)}px`,
    bottom: `${Math.round(window.innerHeight - rect.top + 8)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(Math.min(360, availableAbove))}px`
  }
}

function updateSessionHistoryPopoverPosition() {
  if (!sessionHistoryOpen.value || typeof window === 'undefined') return
  const buttonElement = sessionHistoryButtonRef.value
  if (!buttonElement?.getBoundingClientRect) return

  const rect = buttonElement.getBoundingClientRect()
  const gutter = 12
  const boundaryLeft = gutter
  const boundaryRight = window.innerWidth - gutter
  const availableWidth = Math.max(0, boundaryRight - boundaryLeft)
  const width = Math.min(400, availableWidth || window.innerWidth - gutter * 2)
  const leftLimit = Math.max(boundaryLeft, boundaryRight - width)
  const left = Math.min(Math.max(boundaryLeft, rect.right - width), leftLimit)
  const top = Math.min(window.innerHeight - gutter, rect.bottom + 8)
  const maxHeight = Math.max(220, window.innerHeight - top - gutter)

  sessionHistoryPopoverStyle.value = {
    left: `${Math.round(left)}px`,
    top: `${Math.round(top)}px`,
    width: `${Math.round(width)}px`,
    maxHeight: `${Math.round(Math.min(432, maxHeight))}px`
  }
}

function updateContextFloatingPositions() {
  updateContextMenuPosition()
  updateContextUsagePopoverPosition()
  updateRouteMenuPosition()
  updateSessionHistoryPopoverPosition()
}

function toggleContextMenu() {
  if (contextMenuOpen.value) {
    closeContextMenu()
    return
  }

  openContextMenu()
}

function scheduleCloseContextMenu() {
  clearContextMenuCloseTimer()
  contextMenuCloseTimer = setTimeout(() => {
    closeContextMenu()
  }, 140)
}

function handleContextMenuFocusOut(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  scheduleCloseContextMenu()
}

function openRouteMenu(type) {
  if (isBusy.value || !['provider', 'model'].includes(type)) return
  if (type === 'model' && !aiModelOptions.value.length) return
  routeMenuOpen.value = type
  closeContextMenu()
  closeQuickActionMenu()
  closeContextUsagePopover()
  closeSessionHistoryPopover()
  nextTick(updateRouteMenuPosition)
}

function closeRouteMenu() {
  routeMenuOpen.value = ''
  routeMenuStyle.value = {}
}

function toggleRouteMenu(type) {
  if (routeMenuOpen.value === type) {
    closeRouteMenu()
    return
  }

  openRouteMenu(type)
}

function handleRouteMenuFocusOut(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  nextTick(() => {
    const activeElement = typeof document === 'undefined' ? null : document.activeElement
    if (providerRoutePickerRef.value?.contains?.(activeElement) || modelRoutePickerRef.value?.contains?.(activeElement)) return
    closeRouteMenu()
  })
}

function closeContextUsagePopover() {
  contextUsagePopoverOpen.value = false
  contextUsagePopoverStyle.value = {}
}

function openContextUsagePopover() {
  contextUsagePopoverOpen.value = true
  closeSessionHistoryPopover()
  nextTick(updateContextUsagePopoverPosition)
}

function toggleContextUsagePopover() {
  if (contextUsagePopoverOpen.value) {
    closeContextUsagePopover()
    return
  }

  openContextUsagePopover()
}

function handleContextUsageFocusOut(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  closeContextUsagePopover()
}

function openSessionHistoryPopover() {
  sessionHistoryOpen.value = true
  clearSessionHistorySearch()
  sessionHistoryActionMenuId.value = ''
  closeContextMenu()
  closeRouteMenu()
  closeQuickActionMenu()
  closeContextUsagePopover()
  nextTick(() => {
    sessionHistorySearchRef.value?.focus?.()
    updateSessionHistoryPopoverPosition()
  })
}

function closeSessionHistoryPopover() {
  sessionHistoryOpen.value = false
  sessionHistoryPopoverStyle.value = {}
  clearSessionHistorySearch()
  sessionHistoryActionMenuId.value = ''
}

function clearSessionHistorySearch() {
  sessionHistorySearch.value = ''
}

function closeSessionHistoryActionMenu() {
  sessionHistoryActionMenuId.value = ''
}

function toggleSessionHistoryActionMenu(sessionId) {
  if (sessionActionDisabled.value) return
  sessionHistoryActionMenuId.value = sessionHistoryActionMenuId.value === sessionId ? '' : sessionId
}

function toggleSessionHistoryPopover() {
  if (sessionHistoryOpen.value) {
    closeSessionHistoryPopover()
    return
  }

  openSessionHistoryPopover()
}

function handleSessionHistoryFocusOut(event) {
  if (event.currentTarget?.contains(event.relatedTarget)) return
  nextTick(() => {
    const activeElement = typeof document === 'undefined' ? null : document.activeElement
    if (sessionHistoryPickerRef.value?.contains?.(activeElement) || sessionHistoryPopoverRef.value?.contains?.(activeElement)) return
    closeSessionHistoryPopover()
  })
}

function handleDocumentPointerDown(event) {
  if (contextUsagePopoverOpen.value && !contextUsagePickerRef.value?.contains?.(event.target)) closeContextUsagePopover()
  if (sessionHistoryOpen.value && !sessionHistoryPickerRef.value?.contains?.(event.target) && !sessionHistoryPopoverRef.value?.contains?.(event.target)) closeSessionHistoryPopover()
  if (sessionHistoryOpen.value && sessionHistoryPopoverRef.value?.contains?.(event.target) && !event.target?.closest?.('.ai-session-history-row')) closeSessionHistoryActionMenu()
  if (!routeMenuOpen.value) return
  if (providerRoutePickerRef.value?.contains?.(event.target) || modelRoutePickerRef.value?.contains?.(event.target)) return
  closeRouteMenu()
}

function toggleContextChip(chip) {
  if (!chip) return
  if (chip.id === CURRENT_DOCUMENT_CONTEXT_ID) {
    currentDocumentSelected.value = !currentDocumentSelected.value
    return
  }

  contextAttachments.value = contextAttachments.value.map(item => (
    item.id === chip.id ? { ...item, selected: !item.selected } : item
  ))
}

function removeContextAttachment(attachmentId) {
  contextAttachments.value = contextAttachments.value.filter(item => item.id !== attachmentId)
}

function addContextAttachment(item) {
  if (!item?.path || !item?.type) return
  const nextItem = {
    id: getContextAttachmentId(item.type, item.path),
    type: item.type,
    path: item.path,
    name: item.name || getPathName(item.path),
    badge: item.badge || (item.type === 'folder' ? 'DIR' : getContextBadge(item.path)),
    selected: true,
    removable: true
  }
  contextAttachments.value = [
    nextItem,
    ...contextAttachments.value.filter(attachment => attachment.id !== nextItem.id)
  ]
  closeContextMenu()
}

function selectCurrentDocumentContext() {
  if (!currentDocumentChip.value) return
  currentDocumentSelected.value = true
  closeContextMenu()
}

async function chooseContextFile() {
  const electronAPI = getElectronAPI()
  if (!electronAPI?.showOpenDialog) return
  const result = await electronAPI.showOpenDialog({ properties: ['openFile', 'multiSelections'] })
  if (result?.canceled || !Array.isArray(result?.filePaths)) return
  result.filePaths.forEach(filePath => addContextAttachment(buildRecentContextItem(filePath, 'file')))
}

async function chooseContextFolder() {
  const electronAPI = getElectronAPI()
  if (!electronAPI?.showOpenDialog) return
  const result = await electronAPI.showOpenDialog({ properties: ['openDirectory'] })
  if (result?.canceled || !Array.isArray(result?.filePaths)) return
  result.filePaths.forEach(folderPath => addContextAttachment(buildRecentContextItem(folderPath, 'folder')))
}

function rememberQuickAction(action) {
  if (!action?.id) return
  selectedQuickActionId.value = normalizeQuickActionId(action.id)
  saveStoredQuickActionId(action.id)
}

function clearQuickActionCloseTimer() {
  if (!quickActionCloseTimer) return
  clearTimeout(quickActionCloseTimer)
  quickActionCloseTimer = null
}

function openQuickActionMenu() {
  clearQuickActionCloseTimer()
  quickActionMenuOpen.value = true
  closeSessionHistoryPopover()
}

function closeQuickActionMenu() {
  clearQuickActionCloseTimer()
  quickActionMenuOpen.value = false
}

function toggleQuickActionMenu() {
  clearQuickActionCloseTimer()
  quickActionMenuOpen.value = !quickActionMenuOpen.value
}

function scheduleCloseQuickActionMenu() {
  clearQuickActionCloseTimer()
  quickActionCloseTimer = setTimeout(() => {
    quickActionMenuOpen.value = false
    quickActionCloseTimer = null
  }, 120)
}

function isActionDisabled(action) {
  return !action || isBusy.value || !hasSelectedContext.value || (action.requiresEditable && !canApplyEdits.value)
}

function handleQuickActionSelect(action) {
  if (isActionDisabled(action)) return
  rememberQuickAction(action)
  closeQuickActionMenu()
  sendChat(action)
}

function handleComposerActionButtonClick(event) {
  if (!aiStore.isGenerating) return
  event?.preventDefault()
  stopChat()
}

function runComposerKeyboardAction(action, event) {
  if (!action) return
  event?.preventDefault?.()
  event?.stopPropagation?.()
  if (action === 'send') sendChat()
  if (action === 'stop') stopChat()
}

function handleComposerInputKeydown(event) {
  const action = resolveAiComposerKeyAction(event, { canSend: canSend.value && !isBusy.value, isGenerating: aiStore.isGenerating })
  runComposerKeyboardAction(action, event)
}

function handlePanelKeydown(event) {
  if (event?.key === 'Escape' && (routeMenuOpen.value || contextMenuOpen.value || quickActionMenuOpen.value || contextUsagePopoverOpen.value || sessionHistoryOpen.value)) {
    closeRouteMenu()
    closeContextMenu()
    closeQuickActionMenu()
    closeContextUsagePopover()
    closeSessionHistoryPopover()
    event.preventDefault()
    event.stopPropagation()
    return
  }

  const action = resolveAiComposerKeyAction(event, { canSend: false, isGenerating: aiStore.isGenerating })
  runComposerKeyboardAction(action, event)
}

function getElectronAPI() {
  return typeof window === 'undefined' ? null : window.electronAPI
}

async function readContextFile(electronAPI, filePath, limit = FOLDER_CONTEXT_FILE_CONTENT_LIMIT) {
  const result = await electronAPI.readFile(filePath)
  const content = String(result?.content || '')
  return {
    content: content.length > limit ? content.slice(0, limit) : content,
    contentLength: content.length,
    isTruncated: content.length > limit
  }
}

async function resolveFileContextAttachment(electronAPI, attachment) {
  const file = await readContextFile(electronAPI, attachment.path, FOLDER_CONTEXT_CONTENT_LIMIT)
  return {
    ...attachment,
    content: file.content,
    contentLength: file.contentLength,
    isTruncated: file.isTruncated
  }
}

async function resolveFolderContextAttachment(electronAPI, attachment) {
  const items = await electronAPI.readDir(attachment.path)
  const files = Array.isArray(items)
    ? items.filter(item => !item.isDirectory && isSupportedFile(item.name)).sort((a, b) => a.name.localeCompare(b.name))
    : []
  const selectedFiles = files.slice(0, FOLDER_CONTEXT_FILE_LIMIT)
  const parts = [
    `Folder: ${attachment.path}`,
    `Supported files: ${files.length}`,
    `Included files: ${selectedFiles.map(file => file.name).join(', ') || '-'}`
  ]
  let totalLength = parts.join('\n').length
  let isTruncated = files.length > selectedFiles.length

  for (const file of selectedFiles) {
    const remaining = Math.max(0, FOLDER_CONTEXT_CONTENT_LIMIT - totalLength)
    if (remaining <= 0) {
      isTruncated = true
      break
    }

    const contentLimit = Math.min(FOLDER_CONTEXT_FILE_CONTENT_LIMIT, remaining)
    const fileContent = await readContextFile(electronAPI, file.path, contentLimit)
    parts.push(`## ${file.name}\n${fileContent.content}`)
    totalLength += fileContent.content.length
    if (fileContent.isTruncated) isTruncated = true
  }

  return {
    ...attachment,
    content: parts.join('\n\n'),
    contentLength: totalLength,
    isTruncated
  }
}

async function resolveSelectedContextAttachments(electronAPI) {
  const attachments = []
  if (currentDocumentSelected.value && props.activeTab) {
    attachments.push({
      id: CURRENT_DOCUMENT_CONTEXT_ID,
      type: 'current-document',
      name: getDisplayFileName(props.activeTab),
      path: props.activeTab.filePath || '',
      content: props.activeTab.content || '',
      selected: true
    })
  }

  for (const attachment of contextAttachments.value.filter(item => item.selected)) {
    try {
      if (attachment.type === 'folder') {
        attachments.push(await resolveFolderContextAttachment(electronAPI, attachment))
      } else {
        attachments.push(await resolveFileContextAttachment(electronAPI, attachment))
      }
    } catch (error) {
      attachments.push({
        ...attachment,
        content: `Unable to read ${attachment.type === 'folder' ? 'folder' : 'file'}: ${error?.message || 'unknown error'}`,
        isTruncated: false
      })
    }
  }

  return attachments
}

function getSettingsError(selection) {
  if (!selection?.hasApiKey) return 'API key is missing'
  if (!selection?.modelValue) return 'Model is missing'
  if (!selection?.chatEndpointURL && !selection?.baseURL) return 'Chat endpoint is missing'
  return ''
}

function appendError(message) {
  panelError.value = message || 'AI request failed'
}

function removeEmptyAssistantMessage(messageId) {
  if (!messageId) return
  const index = aiStore.messages.findIndex(message => message.id === messageId && message.role === 'assistant' && !message.content.trim())
  if (index >= 0) aiStore.messages.splice(index, 1)
}

function canShowMessageActions(message = {}) {
  return message.role === 'assistant' && Boolean(message.content?.trim())
}

function canApplyMessageInline(message = {}) {
  return canShowMessageActions(message) && canApplyEdits.value
}

function canReplaceMessageResult(message = {}) {
  return canApplyMessageInline(message) && Boolean(currentSelectionText.value.trim())
}

function isInsideAiPanel(target) {
  return Boolean(target && panelRef.value?.contains?.(target))
}

function syncCurrentSelectionText({ preserveWhenEmpty = false } = {}) {
  const nextSelectionText = props.getSelection?.() || ''
  if (nextSelectionText || !preserveWhenEmpty) currentSelectionText.value = nextSelectionText
}

function scheduleCurrentSelectionTextSync(event) {
  const preserveWhenEmpty = isInsideAiPanel(event?.target) || (typeof document !== 'undefined' && isInsideAiPanel(document.activeElement))
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    syncCurrentSelectionText({ preserveWhenEmpty })
    return
  }
  if (selectionSyncFrame) window.cancelAnimationFrame(selectionSyncFrame)
  selectionSyncFrame = window.requestAnimationFrame(() => {
    selectionSyncFrame = 0
    syncCurrentSelectionText({ preserveWhenEmpty })
  })
}

function handleDocumentSelectionRefresh(event) {
  scheduleCurrentSelectionTextSync(event)
}

function normalizeSelectionText(value) {
  return String(value || '').trim()
}

function cancelSelectionTextSync() {
  if (selectionSyncFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(selectionSyncFrame)
  }
  selectionSyncFrame = 0
}

function handleApplyResult(action, content = latestAssistantContent.value) {
  emit('apply-result', {
    action,
    content,
    originalContent: currentSelectionText.value
  })
}

function isFullDocumentQuickEditAction(actionId) {
  return [POLISH_DOCUMENT_ACTION_ID, PROOFREAD_DOCUMENT_ACTION_ID].includes(actionId)
}

function buildAutoApplyContextOptions(intent, selectedAttachments, actionId = '') {
  if (!intent) {
    if (isFullDocumentQuickEditAction(actionId)) {
      return {
        actionId,
        contextMode: 'manual',
        cursorOffset: props.getCursorOffset(),
        manualContext: {
          fileInfo: true,
          fullDocument: true
        }
      }
    }

    return {
      actionId,
      contextAttachments: selectedAttachments,
      cursorOffset: props.getCursorOffset()
    }
  }

  return {
    actionId: intent.actionId,
    contextMode: 'manual',
    selection: intent.selectionText,
    cursorOffset: props.getCursorOffset(),
    manualContext: {
      fileInfo: true,
      selection: intent.action === 'replace-selection',
      nearbyText: intent.action === 'replace-selection',
      fullDocument: intent.action === 'replace-document'
    }
  }
}

function rememberAutoApplyIntent(requestId, intent) {
  if (!requestId || !intent) return
  autoApplyByRequestId = {
    ...autoApplyByRequestId,
    [requestId]: intent
  }
}

function takeAutoApplyIntent(requestId) {
  const intent = autoApplyByRequestId[requestId]
  if (!intent) return null
  const { [requestId]: _removed, ...nextIntents } = autoApplyByRequestId
  autoApplyByRequestId = nextIntents
  return intent
}

function applyAutoResult(intent, content = '') {
  const normalizedContent = String(content || '').trim()
  if (!intent || !normalizedContent) return
  if (intent.tabId && props.activeTab?.id && intent.tabId !== props.activeTab.id) {
    saveWarning.value = 'AI result was not auto-applied because the active document changed.'
    return
  }

  if (intent.action === 'replace-selection') {
    const currentText = normalizeSelectionText(props.getSelection?.() || currentSelectionText.value)
    if (intent.selectionText && !currentText) {
      saveWarning.value = 'AI result was not auto-applied because the selection is no longer active.'
      return
    }
    if (intent.selectionText && currentText && currentText !== intent.selectionText) {
      saveWarning.value = 'AI result was not auto-applied because the selected text changed.'
      return
    }
  }

  handleApplyResult(intent.action, normalizedContent)
}

function openConfirmDialog({ title, message, confirmLabel = t('common.confirm'), onConfirm }) {
  confirmDialogAction = onConfirm
  confirmDialog.value = {
    visible: true,
    title,
    message,
    confirmLabel
  }
}

function closeConfirmDialog() {
  confirmDialogAction = null
  confirmDialog.value = {
    visible: false,
    title: '',
    message: '',
    confirmLabel: ''
  }
}

function acceptConfirmDialog() {
  const action = confirmDialogAction
  closeConfirmDialog()
  action?.()
}

async function copyMessageResult(content = '') {
  try {
    await navigator.clipboard.writeText(content)
  } catch (error) {
    appendError(`Failed to copy AI result: ${error?.message || error}`)
  }
}

function clearCurrentConversation() {
  if (!hasConversationMessages.value || isBusy.value) return
  openConfirmDialog({
    title: t('ai.clearConversation'),
    message: t('ai.clearConversationConfirm'),
    onConfirm: () => {
      aiStore.resetSessionState()
      resetConversationUiState()
    }
  })
}

function resetConversationUiState({ clearInput = false } = {}) {
  panelError.value = ''
  saveWarning.value = ''
  currentAssistantMessageId.value = ''
  autoApplyByRequestId = {}
  clearAssistantProcess()
  resetThinkingTimer()
  closeQuickActionMenu()
  closeRouteMenu()
  closeContextUsagePopover()
  closeSessionHistoryPopover()
  if (clearInput) userInput.value = ''
}

function getCurrentConversationTitle() {
  const firstUserMessage = aiStore.messages.find(message => message.role === 'user' && message.content.trim())
  return firstUserMessage?.content?.replace(/\s+/g, ' ')?.trim()?.slice(0, 48) || t('ai.title')
}

async function saveCurrentConversationSnapshot() {
  if (!hasConversationMessages.value) return { ok: true, skipped: true }
  const result = await aiStore.saveActiveSession({ title: getCurrentConversationTitle() })
  if (!result?.ok) saveWarning.value = result?.message || 'Failed to save AI session.'
  if (result?.warning) saveWarning.value = result.warning
  return result
}

async function saveSessionBeforeConversationChange() {
  const result = await saveCurrentConversationSnapshot()
  return Boolean(result?.ok)
}

function scrollConversationToBottom() {
  nextTick(() => {
    const element = panelBodyRef.value
    if (element) element.scrollTop = element.scrollHeight
  })
}

async function startNewConversation() {
  if (sessionActionDisabled.value) return
  isSessionTransitioning.value = true
  closeSessionHistoryActionMenu()

  try {
    const saved = await saveSessionBeforeConversationChange()
    if (!saved) return
    aiStore.resetSessionState()
    resetConversationUiState({ clearInput: true })
  } finally {
    isSessionTransitioning.value = false
  }
}

async function switchConversationSession(session = {}) {
  if (!session?.id || sessionActionDisabled.value) return
  closeSessionHistoryActionMenu()
  if (session.id === aiStore.activeSessionId) {
    closeSessionHistoryPopover()
    scrollConversationToBottom()
    return
  }

  isSessionTransitioning.value = true

  try {
    const saved = await saveSessionBeforeConversationChange()
    if (!saved) return

    const latestSession = aiStore.sessions.find(item => item.id === session.id) || session
    const result = aiStore.activateSession(latestSession)
    if (!result?.ok) {
      panelError.value = result?.message || 'Failed to load AI session.'
      return
    }

    resetConversationUiState({ clearInput: true })
    scrollConversationToBottom()
  } finally {
    isSessionTransitioning.value = false
  }
}

async function deleteConversationSession(session = {}) {
  if (!session?.id || sessionActionDisabled.value) return
  closeSessionHistoryActionMenu()
  openConfirmDialog({
    title: t('ai.deleteConversation'),
    message: t('ai.deleteConversationConfirm', { title: session.title || t('ai.untitledConversation') }),
    confirmLabel: t('ai.deleteConversation'),
    onConfirm: () => confirmDeleteConversationSession(session)
  })
}

async function confirmDeleteConversationSession(session = {}) {
  isSessionTransitioning.value = true

  try {
    const deletingActiveSession = session.id === aiStore.activeSessionId
    const result = await aiStore.deleteSession(session.id)
    if (!result?.ok) {
      saveWarning.value = result?.message || 'Failed to delete AI session.'
      return
    }
    if (deletingActiveSession) resetConversationUiState({ clearInput: true })
    nextTick(updateSessionHistoryPopoverPosition)
  } finally {
    isSessionTransitioning.value = false
  }
}

async function deleteAllConversationSessions() {
  if (sessionActionDisabled.value || !sessionHistoryItems.value.length) return
  closeSessionHistoryActionMenu()
  openConfirmDialog({
    title: t('ai.deleteAllConversations'),
    message: t('ai.deleteAllConversationsConfirm'),
    confirmLabel: t('ai.deleteAllConversations'),
    onConfirm: confirmDeleteAllConversationSessions
  })
}

async function confirmDeleteAllConversationSessions() {
  isSessionTransitioning.value = true
  clearSessionHistorySearch()

  try {
    const hadActiveSavedSession = Boolean(aiStore.activeSessionId)
    const result = await aiStore.clearSessions()
    if (!result?.ok) {
      saveWarning.value = result?.message || 'Failed to clear AI sessions.'
      return
    }
    if (hadActiveSavedSession) resetConversationUiState({ clearInput: true })
    nextTick(updateSessionHistoryPopoverPosition)
  } finally {
    isSessionTransitioning.value = false
  }
}

async function ensureSettingsReady() {
  if (!aiStore.settings) {
    const result = await aiStore.loadSettings()
    if (!result?.ok) return result?.message || 'Failed to load AI settings.'
  }

  syncAiModelSelection()
  return getSettingsError(selectedAiSelection.value)
}

function getConversationSummaryTimeoutMs() {
  const timeoutMs = Number(aiStore.settings?.timeoutMs) || CONVERSATION_SUMMARY_TIMEOUT_FALLBACK_MS
  return Math.min(Math.max(timeoutMs, 10000), 60000)
}

function requestHiddenConversationSummary(electronAPI, aiSelection, compressionPlan) {
  if (!electronAPI?.startAIChat || !electronAPI?.onAIChatChunk || !electronAPI?.onAIChatComplete || !electronAPI?.onAIChatError) {
    return Promise.resolve({ ok: false, message: 'AI summary IPC is not available.' })
  }

  const requestId = createRequestId()
  const requestMessages = buildConversationSummaryMessages({
    previousSummary: compressionPlan.previousSummary,
    messagesToSummarize: compressionPlan.messagesToSummarize
  })

  return new Promise((resolve) => {
    const unlisteners = []
    let settled = false
    let summary = ''
    let timer = null

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      timer = null
      unlisteners.splice(0).forEach(unlisten => unlisten?.())
    }

    const settle = (result) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(result)
    }

    unlisteners.push(electronAPI.onAIChatChunk((payload = {}) => {
      if (payload.requestId !== requestId) return
      summary += payload.text || ''
    }))
    unlisteners.push(electronAPI.onAIChatComplete((payload = {}) => {
      if (payload.requestId !== requestId) return
      const normalizedSummary = summary.trim()
      settle(normalizedSummary ? { ok: true, summary: normalizedSummary } : { ok: false, message: 'AI summary response was empty.' })
    }))
    unlisteners.push(electronAPI.onAIChatError((payload = {}) => {
      if (payload.requestId !== requestId) return
      settle({ ok: false, message: payload.message || 'AI summary request failed.' })
    }))

    timer = setTimeout(() => {
      electronAPI.stopAIChat?.(requestId)
      settle({ ok: false, message: 'AI conversation summary timed out.' })
    }, getConversationSummaryTimeoutMs())

    electronAPI.startAIChat({
      requestId,
      messages: requestMessages,
      providerId: aiSelection.providerId,
      modelId: aiSelection.modelId
    }).then((result) => {
      if (!result?.ok) settle({ ok: false, message: result?.message || 'AI summary request failed.' })
    }).catch((error) => {
      settle({ ok: false, message: error?.message || 'AI summary request failed.' })
    })
  })
}

async function ensureConversationSummary(electronAPI, aiSelection) {
  const compressionPlan = buildConversationCompressionPlan({
    messages: aiStore.messages,
    summary: aiStore.conversationSummary,
    summaryMessageCount: aiStore.conversationSummaryMessageCount
  })

  if (!compressionPlan.shouldCompress) return { ok: true, compressed: false }

  const result = await requestHiddenConversationSummary(electronAPI, aiSelection, compressionPlan)
  if (!result?.ok) return result

  aiStore.setConversationSummary(result.summary, compressionPlan.coveredMessageCount)
  return { ok: true, compressed: true }
}

async function sendChat(action = null) {
  if (isBusy.value) return
  isSubmitting.value = true

  try {
    const settingsError = await ensureSettingsReady()
    if (settingsError) {
      appendError(settingsError)
      isSubmitting.value = false
      return
    }

    const electronAPI = getElectronAPI()
    if (!electronAPI?.startAIChat) {
      appendError('AI chat IPC is not available.')
      isSubmitting.value = false
      return
    }

    const actionId = action?.id || ''
    const actionLabel = action ? t(action.labelKey) : ''
    const inputText = userInput.value.trim()
    if (!inputText && !actionId) {
      isSubmitting.value = false
      return
    }
    const selectionText = props.getSelection?.() || currentSelectionText.value
    const autoApplyIntent = resolveAiAutoApplyIntent({
      userInput: inputText,
      actionId,
      activeTab: props.activeTab,
      selectionText
    })
    const effectiveActionId = autoApplyIntent?.actionId || actionId

    const aiSelection = selectedAiSelection.value
    panelError.value = ''
    saveWarning.value = ''
    const summaryResult = await ensureConversationSummary(electronAPI, aiSelection)
    if (summaryResult?.ok === false) {
      saveWarning.value = summaryResult.message || 'AI conversation summary failed; continuing with recent messages only.'
    }

    const selectedAttachments = autoApplyIntent || isFullDocumentQuickEditAction(effectiveActionId) ? [] : await resolveSelectedContextAttachments(electronAPI)
    const context = buildAiContext(props.activeTab || {}, buildAutoApplyContextOptions(autoApplyIntent, selectedAttachments, effectiveActionId))
    const requestMessages = buildAiMessages({
      context,
      userInput: inputText,
      actionId: effectiveActionId,
      appLocale: locale.value,
      responseLanguage: aiStore.settings?.responseLanguage || 'app',
      conversationMessages: aiStore.messages,
      conversationSummary: aiStore.conversationSummary,
      aiProviderName: aiSelection.providerName,
      aiModelName: aiSelection.modelName,
      aiModelValue: aiSelection.modelValue
    })
    const displayContent = actionLabel && inputText ? `${actionLabel}\n${inputText}` : inputText || actionLabel
    const requestId = createRequestId()
    rememberAutoApplyIntent(requestId, autoApplyIntent)
    aiStore.appendMessage({ role: 'user', content: displayContent })
    const assistantMessage = aiStore.appendMessage({ role: 'assistant', content: '' })
    currentAssistantMessageId.value = assistantMessage.id
    updateAssistantProcess(assistantMessage.id, { phase: 'preparing', reasoning: '' })
    startThinkingTimer()
    aiStore.isGenerating = true
    aiStore.activeRequestId = requestId
    userInput.value = ''

    const result = await electronAPI.startAIChat({
      requestId,
      messages: requestMessages,
      providerId: aiSelection.providerId,
      modelId: aiSelection.modelId
    })
    if (!result?.ok) {
      takeAutoApplyIntent(requestId)
      aiStore.isGenerating = false
      aiStore.activeRequestId = ''
      isSubmitting.value = false
      removeEmptyAssistantMessage(assistantMessage.id)
      clearAssistantProcess(assistantMessage.id)
      currentAssistantMessageId.value = ''
      resetThinkingTimer()
      appendError(result?.message || 'AI request failed')
      return
    }
    isSubmitting.value = false
  } catch (error) {
    takeAutoApplyIntent(aiStore.activeRequestId)
    aiStore.isGenerating = false
    aiStore.activeRequestId = ''
    isSubmitting.value = false
    removeEmptyAssistantMessage(currentAssistantMessageId.value)
    clearAssistantProcess(currentAssistantMessageId.value)
    currentAssistantMessageId.value = ''
    resetThinkingTimer()
    appendError(error?.message || 'AI request failed')
  }
}

async function saveSessionAfterComplete() {
  await saveCurrentConversationSnapshot()
}

function handleStatus(payload = {}) {
  if (payload.requestId !== aiStore.activeRequestId || !currentAssistantMessageId.value) return
  updateAssistantProcess(currentAssistantMessageId.value, { phase: payload.phase || 'waiting' })
}

function handleReasoning(payload = {}) {
  if (payload.requestId !== aiStore.activeRequestId || !currentAssistantMessageId.value) return
  appendAssistantReasoning(currentAssistantMessageId.value, payload.text || '')
}

function handleChunk(payload = {}) {
  if (payload.requestId !== aiStore.activeRequestId || !currentAssistantMessageId.value) return
  const message = aiStore.messages.find(item => item.id === currentAssistantMessageId.value)
  aiStore.updateAssistantMessage(currentAssistantMessageId.value, `${message?.content || ''}${payload.text || ''}`)
  if (payload.text) updateAssistantProcess(currentAssistantMessageId.value, { phase: 'generating' })
}

async function handleComplete(payload = {}) {
  if (payload.requestId !== aiStore.activeRequestId) return
  const assistantMessageId = currentAssistantMessageId.value
  const assistantMessage = aiStore.messages.find(message => message.id === assistantMessageId && message.role === 'assistant')
  const autoApplyIntent = takeAutoApplyIntent(payload.requestId)
  isSubmitting.value = false
  updateAssistantProcess(assistantMessageId, { phase: 'complete', elapsedSeconds: getCurrentThinkingElapsedSeconds() })
  removeEmptyAssistantMessage(assistantMessageId)
  aiStore.isGenerating = false
  aiStore.activeRequestId = ''
  currentAssistantMessageId.value = ''
  resetThinkingTimer()
  applyAutoResult(autoApplyIntent, assistantMessage?.content || '')
  await saveSessionAfterComplete()
}

function handleError(payload = {}) {
  if (payload.requestId !== aiStore.activeRequestId) return
  takeAutoApplyIntent(payload.requestId)
  isSubmitting.value = false
  removeEmptyAssistantMessage(currentAssistantMessageId.value)
  clearAssistantProcess(currentAssistantMessageId.value)
  aiStore.isGenerating = false
  aiStore.activeRequestId = ''
  currentAssistantMessageId.value = ''
  resetThinkingTimer()
  appendError(payload.message || 'AI request failed')
}

async function stopChat() {
  const assistantMessageId = currentAssistantMessageId.value
  const assistantMessage = aiStore.messages.find(message => message.id === assistantMessageId && message.role === 'assistant')
  const requestId = aiStore.activeRequestId
  await aiStore.stopGenerating()
  takeAutoApplyIntent(requestId)
  isSubmitting.value = false
  removeEmptyAssistantMessage(assistantMessageId)
  clearAssistantProcess(assistantMessageId)
  currentAssistantMessageId.value = ''
  resetThinkingTimer()
  if (assistantMessage?.content?.trim()) await saveSessionAfterComplete()
}

onMounted(async () => {
  const electronAPI = getElectronAPI()
  if (electronAPI?.onAIChatStatus) unlisteners.push(electronAPI.onAIChatStatus(handleStatus))
  if (electronAPI?.onAIChatReasoning) unlisteners.push(electronAPI.onAIChatReasoning(handleReasoning))
  if (electronAPI?.onAIChatChunk) unlisteners.push(electronAPI.onAIChatChunk(handleChunk))
  if (electronAPI?.onAIChatComplete) unlisteners.push(electronAPI.onAIChatComplete(handleComplete))
  if (electronAPI?.onAIChatError) unlisteners.push(electronAPI.onAIChatError(handleError))
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateContextFloatingPositions)
    window.addEventListener('scroll', updateContextFloatingPositions, true)
  }
  if (typeof document !== 'undefined') document.addEventListener('pointerdown', handleDocumentPointerDown)
  if (typeof document !== 'undefined') document.addEventListener('keydown', handlePanelKeydown, true)
  if (typeof document !== 'undefined') document.addEventListener('selectionchange', handleDocumentSelectionRefresh, true)
  if (typeof document !== 'undefined') document.addEventListener('mouseup', handleDocumentSelectionRefresh, true)
  if (typeof document !== 'undefined') document.addEventListener('keyup', handleDocumentSelectionRefresh, true)

  const result = await aiStore.loadSettings()
  if (result?.ok) syncAiModelSelection()
  await aiStore.loadSessions()

  await nextTick()
  syncCurrentSelectionText()
  const panelElement = contextAddButtonRef.value?.closest?.('.ai-assistant-panel')
  if (typeof ResizeObserver !== 'undefined' && panelElement) {
    contextMenuResizeObserver = new ResizeObserver(updateContextFloatingPositions)
    contextMenuResizeObserver.observe(panelElement)
  }
})

onUnmounted(() => {
  clearQuickActionCloseTimer()
  clearContextMenuCloseTimer()
  resetThinkingTimer()
  cancelSelectionTextSync()
  contextMenuResizeObserver?.disconnect()
  contextMenuResizeObserver = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateContextFloatingPositions)
    window.removeEventListener('scroll', updateContextFloatingPositions, true)
  }
  if (typeof document !== 'undefined') document.removeEventListener('pointerdown', handleDocumentPointerDown)
  if (typeof document !== 'undefined') document.removeEventListener('keydown', handlePanelKeydown, true)
  if (typeof document !== 'undefined') document.removeEventListener('selectionchange', handleDocumentSelectionRefresh, true)
  if (typeof document !== 'undefined') document.removeEventListener('mouseup', handleDocumentSelectionRefresh, true)
  if (typeof document !== 'undefined') document.removeEventListener('keyup', handleDocumentSelectionRefresh, true)
  unlisteners.splice(0).forEach(unlisten => unlisten?.())
})

watch(() => props.activeTab?.filePath || props.activeTab?.id || props.activeTab?.title, () => {
  currentDocumentSelected.value = true
  currentSelectionText.value = ''
  nextTick(() => syncCurrentSelectionText())
})

watch(() => props.activeTab?.content, () => {
  scheduleCurrentSelectionTextSync()
}, { flush: 'post' })

watch(() => aiStore.settings?.providers, () => {
  syncAiModelSelection()
}, { deep: true })
</script>

<style scoped>
.ai-assistant-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--surface-panel-strong);
  color: var(--text-main);
  overflow: hidden;
}

.ai-panel-header {
  min-height: 35px;
  height: 35px;
  flex: 0 0 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  box-sizing: border-box;
  padding: 4px 12px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--surface-toolbar);
}

.ai-panel-title {
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-panel-actions {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ai-panel-action-button {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius, 6px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-panel-action-button:hover:not(:disabled),
.ai-panel-action-button:focus-visible {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  box-shadow: var(--interactive-hover-ring);
  outline: none;
}

.ai-panel-action-button.is-active {
  border-color: var(--interactive-selected-border);
  background: var(--interactive-selected-bg);
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-panel-action-button:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.ai-panel-new-session-button:hover:not(:disabled),
.ai-panel-new-session-button:focus-visible,
.ai-panel-history-button:hover:not(:disabled),
.ai-panel-history-button:focus-visible {
  border-color: var(--interactive-selected-border);
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-panel-clear-button:hover:not(:disabled),
.ai-panel-clear-button:focus-visible {
  border-color: rgba(244, 67, 54, 0.32);
  color: #ff8a80;
}

.ai-session-history-picker {
  position: relative;
  display: inline-flex;
}

.ai-session-history-popover {
  position: fixed;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--menu-card-shadow, 0 18px 42px rgba(0, 0, 0, 0.22)));
  color: var(--text-main);
  overflow: auto;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ai-session-history-header {
  min-height: 30px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px 6px 8px;
}

.ai-session-history-heading {
  min-width: 0;
  flex: 1;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.ai-session-history-heading span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-session-history-heading span:last-child {
  color: var(--text-dim, var(--text-muted));
  font-weight: 500;
}

.ai-session-history-icon-button {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-session-history-icon-button:hover:not(:disabled),
.ai-session-history-icon-button:focus-visible,
.ai-session-history-icon-button.is-active {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-session-history-icon-button.is-primary {
  border-color: rgba(var(--accent-primary-rgb), 0.2);
  background: var(--interactive-selected-bg, rgba(var(--accent-primary-rgb), 0.08));
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-session-history-icon-button.is-danger:hover:not(:disabled),
.ai-session-history-icon-button.is-danger:focus-visible {
  border-color: rgba(244, 67, 54, 0.28);
  background: var(--danger-soft-bg, rgba(244, 67, 54, 0.1));
  color: var(--danger-soft-color, #d9363e);
}

.ai-session-history-icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-session-history-search-wrap {
  min-height: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  padding: 0 16px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.45);
  border-radius: var(--field-radius, 6px);
  background: var(--bg-primary);
  transition: var(--transition-interactive);
}

.ai-session-history-search-wrap:focus-within {
  box-shadow: var(--field-focus-ring);
}

.ai-session-history-search {
  min-width: 0;
  height: 24px;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 14px;
}

.ai-session-history-search-wrap .ai-session-history-search {
  padding: 0;
  border: 0;
  border-radius: 0;
  outline: 0;
  box-shadow: none;
  transition: none;
}

.ai-session-history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-session-history-row {
  position: relative;
  min-height: 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  align-items: stretch;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  transition: var(--transition-interactive);
}

.ai-session-history-row:hover,
.ai-session-history-row:focus-within,
.ai-session-history-row.is-menu-open {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.ai-session-history-row.is-active {
  min-height: 52px;
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.36));
  background: var(--interactive-selected-bg, rgba(var(--accent-primary-rgb), 0.08));
}

.ai-session-history-row.is-active::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 14px;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--text-interactive-active, var(--accent-primary));
  transform: translateY(-50%);
  pointer-events: none;
}

.ai-session-history-row.is-active:hover::after,
.ai-session-history-row.is-active:focus-within::after,
.ai-session-history-row.is-active.is-menu-open::after {
  opacity: 0;
}

.ai-session-history-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.ai-session-history-main:disabled {
  cursor: not-allowed;
}

.ai-session-history-name {
  width: 100%;
  overflow: hidden;
  color: var(--text-main);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-session-history-meta {
  width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-session-history-more {
  width: 28px;
  height: 28px;
  align-self: center;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  transition: var(--transition-interactive);
}

.ai-session-history-row:hover .ai-session-history-more,
.ai-session-history-row:focus-within .ai-session-history-more,
.ai-session-history-row.is-menu-open .ai-session-history-more {
  opacity: 1;
}

.ai-session-history-more:hover:not(:disabled),
.ai-session-history-more:focus-visible,
.ai-session-history-row.is-menu-open .ai-session-history-more {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
  opacity: 1;
}

.ai-session-history-more:disabled {
  cursor: not-allowed;
  opacity: 0.36;
}

.ai-session-history-action-menu {
  position: absolute;
  right: 6px;
  top: 38px;
  z-index: 2;
  min-width: 88px;
  padding: 6px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--menu-card-shadow, 0 18px 42px rgba(0, 0, 0, 0.22)));
}

.ai-session-history-action-item {
  width: 100%;
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 6px);
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-session-history-action-item:hover:not(:disabled),
.ai-session-history-action-item:focus-visible {
  background: var(--surface-hover);
  outline: none;
}

.ai-session-history-action-item.is-danger {
  color: var(--danger-soft-color, #d9363e);
}

.ai-session-history-action-item.is-danger:hover:not(:disabled),
.ai-session-history-action-item.is-danger:focus-visible {
  border-color: rgba(244, 67, 54, 0.24);
  background: var(--danger-soft-bg, rgba(244, 67, 54, 0.1));
}

.ai-session-history-empty {
  padding: 18px 10px 16px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
}

.ai-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow: auto;
}

.ai-error-card {
  padding: 8px 10px;
  border: 1px solid rgba(244, 67, 54, 0.38);
  border-radius: var(--field-radius, 6px);
  color: #ff8a80;
  background: rgba(244, 67, 54, 0.1);
  font-size: 12px;
  line-height: 1.45;
  word-break: break-word;
}

.ai-error-card.is-warning {
  border-color: rgba(255, 193, 7, 0.35);
  color: #ffd54f;
  background: rgba(255, 193, 7, 0.1);
}

.ai-message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ai-message {
  max-width: min(100%, 720px);
  padding: 0;
  border: none;
  background: transparent;
}

.ai-message.is-user {
  align-self: flex-end;
  max-width: min(82%, 520px);
  padding: 8px 12px;
  border-radius: 18px;
  background: var(--icon-button-bg);
}

.ai-message.is-assistant {
  align-self: flex-start;
  width: 100%;
  min-width: min(100%, 220px);
}

.ai-message-markdown-preview {
  width: 100%;
}

.ai-message-markdown-preview :deep(.markdown-preview) {
  height: auto;
  min-height: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  line-height: 1.58;
  scrollbar-gutter: auto;
}

.ai-message-markdown-preview :deep(.markdown-preview-content) {
  font-size: 13px;
}

.ai-message-markdown-preview :deep(.markdown-preview-content > :first-child) {
  margin-top: 0;
}

.ai-message-markdown-preview :deep(.markdown-preview-content > :last-child) {
  margin-bottom: 0;
}

.ai-message-markdown-preview :deep(.markdown-preview-content h1),
.ai-message-markdown-preview :deep(.markdown-preview-content h2) {
  padding-bottom: 0.22em;
}

.ai-message-markdown-preview :deep(.markdown-preview-content h1) {
  font-size: 1.35em;
}

.ai-message-markdown-preview :deep(.markdown-preview-content h2) {
  font-size: 1.2em;
}

.ai-message-markdown-preview :deep(.markdown-preview-content h3) {
  font-size: 1.08em;
}

.ai-message-markdown-preview :deep(.markdown-preview-content pre) {
  padding: 10px;
  border-radius: var(--field-radius, 6px);
}

.ai-message pre {
  margin: 0;
  color: var(--text-main);
  font-family: inherit;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-process-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

.ai-reasoning-details {
  width: 100%;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ai-reasoning-details > summary {
  list-style: none;
}

.ai-reasoning-details > summary::-webkit-details-marker {
  display: none;
}

.ai-process-summary {
  display: flex;
  align-items: center;
  width: max-content;
  max-width: 100%;
  min-height: 26px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  user-select: none;
}

.ai-reasoning-details .ai-process-summary {
  cursor: pointer;
}

.ai-process-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  color: var(--text-muted);
  transition: var(--transition-interactive);
}

.ai-reasoning-details .ai-process-summary:hover .ai-process-pill {
  background: var(--surface-hover);
  color: var(--text-main);
}

.ai-process-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  color: var(--text-tertiary, var(--text-muted));
  font-size: 16px;
  line-height: 1;
  transition: transform var(--transition-fast), color var(--transition-fast);
}

.ai-reasoning-details[open] .ai-process-chevron {
  color: var(--text-main);
  transform: rotate(90deg);
}

.ai-process-divider {
  display: block;
  width: calc(100% - 32px);
  height: 1px;
  margin: 4px 0 10px 32px;
  background: var(--border-color, rgba(148, 163, 184, 0.22));
}

.ai-reasoning-markdown-preview {
  width: 100%;
  margin-top: 4px;
  padding-left: 6px;
}

.ai-reasoning-markdown-preview :deep(.markdown-preview) {
  height: auto;
  min-height: 0;
  padding: 0;
  overflow: visible;
  background: transparent;
  color: var(--text-muted);
  line-height: 1.55;
  scrollbar-gutter: auto;
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content) {
  font-size: 12px;
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content > :first-child) {
  margin-top: 0;
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content > :last-child) {
  margin-bottom: 0;
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content h1),
.ai-reasoning-markdown-preview :deep(.markdown-preview-content h2),
.ai-reasoning-markdown-preview :deep(.markdown-preview-content h3),
.ai-reasoning-markdown-preview :deep(.markdown-preview-content h4),
.ai-reasoning-markdown-preview :deep(.markdown-preview-content h5),
.ai-reasoning-markdown-preview :deep(.markdown-preview-content h6) {
  margin-top: 10px;
  margin-bottom: 6px;
  color: var(--text-secondary);
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content pre) {
  padding: 10px;
  overflow: visible;
  white-space: pre-wrap;
  border-radius: var(--field-radius, 6px);
}

.ai-reasoning-markdown-preview :deep(.markdown-preview-content pre code) {
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-reasoning-length {
  color: var(--text-tertiary, var(--text-muted));
  font-size: 11px;
}

.ai-message-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.ai-message-action-button {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-message-action-button:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.18);
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-message-action-button:focus-visible {
  outline: 2px solid rgba(var(--accent-primary-rgb), 0.45);
  outline-offset: 2px;
}

.ai-message-action-button:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.ai-message-action-button svg {
  flex: 0 0 auto;
}

.ai-dot-loader {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.ai-dot-loader i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.35;
  animation: ai-dot-pulse 1.2s ease-in-out infinite;
}

.ai-dot-loader i:nth-child(2) {
  animation-delay: 0.18s;
}

.ai-dot-loader i:nth-child(3) {
  animation-delay: 0.36s;
}

.ai-input-area {
  position: relative;
  z-index: 5;
  flex: 0 0 auto;
  padding: 12px;
  border-top: 0;
  background: transparent;
  overflow: visible;
}

.ai-composer-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 82%, var(--text-muted) 18%);
  border-radius: 18px;
  background: var(--surface-panel-strong, var(--surface-panel));
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast), opacity var(--transition-fast);
  overflow: visible;
}

.ai-composer-shell:focus-within {
  border-color: color-mix(in srgb, var(--glass-border) 58%, var(--accent-primary) 42%);
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
}

.ai-context-chip-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-height: 28px;
}

.ai-context-chip {
  max-width: 100%;
  height: 28px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--glass-border);
  border-radius: var(--field-radius, 6px);
  background: var(--surface-panel);
  color: var(--text-muted);
  overflow: hidden;
}

.ai-context-chip.is-selected {
  border-color: rgba(var(--accent-primary-rgb), 0.34);
  background: rgba(var(--accent-primary-rgb), 0.1);
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-context-chip-main {
  min-width: 0;
  height: 100%;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.ai-context-chip-main:hover {
  background: var(--surface-hover);
}

.ai-context-chip-status {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 10px;
}

.ai-context-chip.is-selected .ai-context-chip-status {
  color: var(--surface-panel-strong);
  background: var(--text-interactive-active, var(--accent-primary));
}

.ai-context-chip-file-icon,
.ai-context-folder-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.ai-context-chip-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-context-chip-remove {
  width: 22px;
  height: 100%;
  flex: 0 0 auto;
  border: 0;
  border-left: 1px solid var(--glass-border);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.ai-context-chip-remove:hover {
  background: var(--surface-hover);
}

.ai-composer-toolbar {
  --ai-composer-control-height: 30px;
  --ai-composer-control-line-height: 1;
  min-height: var(--ai-composer-control-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 8px;
  min-width: 0;
  overflow: visible;
}

.ai-composer-tools {
  flex: 1 1 auto;
  min-width: 0;
  height: var(--ai-composer-control-height);
  align-self: center;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  overflow: visible;
}

.ai-context-add-picker {
  position: relative;
  z-index: 60;
  display: flex;
  align-items: center;
  height: var(--ai-composer-control-height);
  flex: 0 0 auto;
}

.ai-context-add-button {
  position: relative;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font-size: 0;
  line-height: 1;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-context-add-button::before,
.ai-context-add-button::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 11px;
  height: 1.5px;
  border-radius: 999px;
  background: currentColor;
  transform: translate(-50%, -50%);
}

.ai-context-add-button::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.ai-context-add-button:hover,
.ai-context-add-button.is-active {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-model-routing-controls {
  min-width: 0;
  max-width: 100%;
  height: var(--ai-composer-control-height);
  flex: 0 1 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.ai-route-picker {
  min-width: 0;
  height: var(--ai-composer-control-height);
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
}

.ai-route-select-shell {
  min-width: 0;
  height: var(--ai-composer-control-height);
  max-width: 100%;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 1 auto;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-route-select-shell--provider {
  flex: 0 0 auto;
  max-width: 172px;
}

.ai-route-select-shell--provider .ai-route-select-label {
  max-width: 122px;
}

.ai-route-select-shell--model {
  flex: 0 1 138px;
  max-width: 148px;
  color: var(--text-main);
}

.ai-route-select-shell--model .ai-route-select-label {
  max-width: 148px;
}

.ai-route-select-label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.45;
}

.ai-route-provider-label {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ai-route-select-caret {
  flex: 0 0 auto;
  width: 0;
  height: 0;
  pointer-events: none;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid color-mix(in srgb, currentColor 72%, transparent);
}

.ai-route-select-shell:hover:not(.is-disabled),
.ai-route-select-shell:focus-visible,
.ai-route-select-shell.is-active {
  border-color: rgba(var(--accent-primary-rgb), 0.2);
  background: var(--interactive-selected-bg, rgba(var(--accent-primary-rgb), 0.08));
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-route-select-shell.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-list-popover {
  position: fixed;
  right: auto;
  top: auto;
  z-index: 1000;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--menu-card-shadow, 0 18px 42px rgba(0, 0, 0, 0.22)));
  color: var(--text-main);
  overflow: auto;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ai-list-header {
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 8px 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.3;
}

.ai-list-header span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-list-item {
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

.ai-list-item:hover:not(:disabled),
.ai-list-item:focus-visible {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-list-item.is-active {
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.36));
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-list-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-list-item-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.ai-list-check {
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

.ai-list-check::before {
  content: '';
  width: 8px;
  height: 4px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg) translate(1px, -1px);
}

.ai-list-item-content {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.ai-route-menu-item .ai-list-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-list-item-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-list-item-title {
  font-weight: 600;
  line-height: 1.25;
}

.ai-route-menu {
  min-width: 0;
}

.ai-provider-route-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--provider-accent, var(--accent-primary));
  background: color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 11%, var(--surface-panel));
  border: 1px solid color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 18%, var(--glass-border));
  box-shadow: 0 6px 14px color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 12%, transparent);
  font-size: 8px;
  font-weight: var(--ui-font-weight-bold);
  letter-spacing: 0;
}

.ai-provider-route-icon-svg {
  width: 13px;
  height: 13px;
  display: block;
  fill: currentColor;
}

.ai-context-menu {
  position: fixed;
  right: auto;
  top: auto;
  z-index: 1000;
  width: min(360px, calc(100vw - 48px));
  max-height: 380px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--shadow-dropdown, 0 18px 42px rgba(0, 0, 0, 0.22)));
  overflow: auto;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ai-context-search {
  width: 100%;
  height: 34px;
  margin-bottom: 6px;
  padding: 0 10px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.45);
  border-radius: var(--field-radius, 6px);
  background: var(--bg-primary);
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  outline: none;
}

.ai-context-menu-item {
  width: 100%;
  min-height: 34px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
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
}

.ai-context-menu-item:hover:not(:disabled),
.ai-context-menu-item:focus-visible {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-context-menu-item.is-active {
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.36));
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-context-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-context-menu-icon,
.ai-context-menu-badge {
  width: 20px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-align: center;
}

.ai-context-menu-badge {
  color: #b58900;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.ai-context-menu-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.ai-context-menu-kind {
  flex: 0 0 auto;
  max-width: 72px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.16);
  border-radius: 999px;
  background: rgba(var(--accent-primary-rgb), 0.06);
  color: var(--text-muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-context-menu-divider {
  height: 1px;
  margin: 7px 4px;
  background: color-mix(in srgb, var(--glass-border) 86%, transparent);
}

.ai-context-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  padding: 0 8px 4px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.ai-composer-controls {
  height: var(--ai-composer-control-height);
  align-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}

.ai-context-usage-picker {
  --ai-context-usage-track-color: color-mix(in srgb, var(--text-muted) 36%, var(--surface-panel-strong) 64%);
  position: relative;
  z-index: 45;
  width: var(--ai-composer-control-height);
  height: var(--ai-composer-control-height);
  flex: 0 0 var(--ai-composer-control-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ai-context-usage-button {
  width: var(--ai-composer-control-height);
  height: var(--ai-composer-control-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-context-usage-button:hover,
.ai-context-usage-button:focus-visible {
  background: var(--surface-hover);
  outline: none;
}

.ai-context-usage-button.is-warning .ai-context-usage-ring,
.ai-context-usage-button.is-danger .ai-context-usage-ring,
.ai-context-usage-button.is-full .ai-context-usage-ring {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ai-context-usage-color) 14%, transparent);
}

.ai-context-usage-ring {
  position: relative;
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border-radius: 50%;
  background: conic-gradient(var(--ai-context-usage-color) 0deg var(--ai-context-usage-sweep), var(--ai-context-usage-track-color) var(--ai-context-usage-sweep) 360deg);
}

.ai-context-usage-ring::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 80%, transparent);
  border-radius: 50%;
  background: var(--surface-panel-strong);
}

.ai-context-usage-popover {
  position: fixed;
  right: auto;
  top: auto;
  bottom: calc(100% + 8px);
  z-index: 1000;
  --ai-context-usage-detail-max-height: 390px;
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--text-main);
  overflow: visible;
}

.ai-context-usage-card {
  border: 1px solid color-mix(in srgb, var(--glass-border) 84%, transparent);
  border-radius: 12px;
  background: var(--surface-panel-strong);
  box-shadow: var(--shadow-dropdown, 0 16px 34px rgba(0, 0, 0, 0.22));
  overflow: hidden;
}

.ai-context-usage-summary {
  flex: 0 0 auto;
  padding: 20px 22px 18px;
  border-color: color-mix(in srgb, var(--ai-context-usage-color) 22%, var(--glass-border) 78%);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--ai-context-usage-color) 13%, transparent), color-mix(in srgb, #7c3aed 8%, transparent) 48%, transparent),
    color-mix(in srgb, var(--surface-hover) 48%, var(--surface-panel-strong) 52%);
}

.ai-context-usage-detail {
  min-height: 0;
  flex: 1 1 auto;
  max-height: var(--ai-context-usage-detail-max-height);
  padding: 18px 18px 20px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface-hover) 42%, transparent), transparent 42%),
    var(--surface-panel-strong);
  overflow-y: auto;
}

.ai-context-usage-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 13px;
}

.ai-context-usage-heading {
  min-width: 0;
  font-size: 19px;
  font-weight: 750;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-context-usage-percent {
  flex: 0 0 auto;
  color: var(--ai-context-usage-color);
  font-size: 25px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ai-context-usage-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}

.ai-context-usage-total span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-context-usage-meter {
  height: 8px;
  margin: 18px 0 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 18%, transparent);
  overflow: hidden;
}

.ai-context-usage-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ai-context-usage-color), color-mix(in srgb, #7c3aed 72%, var(--ai-context-usage-color) 28%));
}

.ai-context-usage-rows {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.ai-context-usage-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px 12px;
  font-size: 14px;
}

.ai-context-usage-row-label {
  position: relative;
  min-width: 0;
  padding-left: 14px;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-context-usage-row-label::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ai-context-usage-row-color);
  transform: translateY(-50%);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--ai-context-usage-row-color) 14%, transparent);
}

.ai-context-usage-row-value {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.ai-context-usage-row-meter {
  grid-column: 1 / -1;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ai-context-usage-row-color) 12%, var(--glass-border) 88%);
  overflow: hidden;
}

.ai-context-usage-row-meter span {
  display: block;
  width: var(--ai-context-usage-row-width);
  height: 100%;
  max-width: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ai-context-usage-row-color), color-mix(in srgb, var(--ai-context-usage-row-color) 64%, var(--text-main) 36%));
}

.ai-context-usage-notes {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 62%, transparent);
}

.ai-context-usage-note {
  color: var(--ai-context-usage-color);
  font-size: 13px;
  font-weight: 650;
  line-height: 1.7;
}

.ai-context-usage-note.is-muted {
  color: var(--text-muted);
  font-weight: 400;
}

.ai-quick-action-picker {
  position: relative;
  display: inline-flex;
  min-width: 0;
  max-width: 150px;
  height: var(--ai-composer-control-height);
}

.ai-quick-action-trigger {
  box-sizing: border-box;
  min-width: 0;
  height: var(--ai-composer-control-height);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 7px;
  border: 1px solid var(--glass-border);
  background: var(--surface-panel);
  color: var(--text-main);
  font-size: 12px;
  line-height: var(--ai-composer-control-line-height);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-quick-action-main {
  min-width: 0;
  flex: 1 1 auto;
  border-radius: 6px 0 0 6px;
}

.ai-quick-action-menu-trigger {
  width: var(--ai-composer-control-height);
  flex: 0 0 var(--ai-composer-control-height);
  margin-left: -1px;
  padding: 0;
  border-radius: 0 6px 6px 0;
}

.ai-quick-action-trigger:hover:not(:disabled),
.ai-quick-action-trigger:focus-visible {
  background: var(--surface-hover);
  border-color: rgba(var(--accent-primary-rgb), 0.36);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-quick-action-trigger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-quick-action-label {
  min-width: 0;
  height: 100%;
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--ai-composer-control-line-height);
}

.ai-quick-action-caret {
  width: 0;
  height: 0;
  flex: 0 0 auto;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
}

.ai-quick-action-menu {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
  z-index: 20;
  width: 148px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(var(--accent-primary-rgb), 0.12));
  border-radius: var(--radius-md, 10px);
  background: var(--surface-popover, var(--surface-panel-strong));
  box-shadow: var(--shadow-popover, var(--shadow-dropdown, 0 12px 28px rgba(0, 0, 0, 0.22)));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ai-quick-action-item {
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
}

.ai-quick-action-item > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-quick-action-item:hover:not(:disabled),
.ai-quick-action-item:focus-visible {
  background: var(--surface-hover);
  color: var(--text-interactive-active, var(--accent-primary));
  outline: none;
}

.ai-quick-action-item.is-active {
  border-color: var(--interactive-selected-border-strong, rgba(var(--accent-primary-rgb), 0.36));
  background: var(--interactive-selected-bg-strong, rgba(var(--accent-primary-rgb), 0.12));
  color: var(--text-interactive-active, var(--accent-primary));
}

.ai-quick-action-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-quick-action-mark {
  position: relative;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--text-interactive-active, var(--accent-primary));
  color: var(--surface-panel-strong);
}

.ai-quick-action-mark::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 5px;
  width: 7px;
  height: 4px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
}

.ai-input {
  width: 100%;
  min-height: 76px;
  resize: none;
  padding: 2px 4px;
  border: 0;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  outline: none;
}

.ai-input:focus {
  outline: none;
}

.ai-input::placeholder {
  color: var(--text-muted);
}

.ai-send-button {
  position: relative;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--text-main);
  border-radius: 50%;
  background: var(--text-main);
  color: var(--surface-panel-strong);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-send-button.is-generating {
  border-color: var(--text-muted);
  background: var(--text-muted);
  color: var(--surface-panel-strong);
}

.ai-send-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--interactive-hover-ring);
}

.ai-send-button:disabled {
  opacity: 0.36;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.ai-send-icon {
  position: relative;
  width: 13px;
  height: 15px;
  display: inline-block;
}

.ai-send-icon::before,
.ai-send-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  background: currentColor;
  transform: translateX(-50%);
}

.ai-send-icon::before {
  top: 2px;
  width: 8px;
  height: 8px;
  border-top: 2px solid currentColor;
  border-left: 2px solid currentColor;
  background: transparent;
  transform: translateX(-50%) rotate(45deg);
}

.ai-send-icon::after {
  top: 5px;
  width: 2px;
  height: 10px;
  border-radius: 999px;
}

.ai-send-icon.is-stop-icon {
  width: 12px;
  height: 12px;
}

.ai-send-icon.is-stop-icon::before,
.ai-send-icon.is-stop-icon::after {
  top: 1px;
  width: 3px;
  height: 10px;
  border: 0;
  border-radius: 999px;
  background: currentColor;
  transform: none;
}

.ai-send-icon.is-stop-icon::before {
  left: 2px;
}

.ai-send-icon.is-stop-icon::after {
  left: 7px;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ai-dot-pulse {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }

  40% {
    transform: translateY(-2px);
    opacity: 1;
  }
}
</style>

<template>
  <Teleport to="body">
    <Transition name="settings-page">
      <div
        v-if="show"
        class="settings-page-shell"
        @keydown.capture="handleShortcutRecordingKeydown"
        @keydown.esc="emit('close')"
      >
        <TitleBar
          class="settings-window-titlebar"
          :left-sidebar-collapsed="leftSidebarCollapsed"
          :right-sidebar-collapsed="rightSidebarCollapsed"
          :show-layout-controls="false"
          @open-settings="handleTitleBarOpenSettings"
          @menu-action="handleTitleBarMenuAction"
        />

        <aside class="settings-page-sidebar settings-nav">
          <button type="button" class="settings-return-button" @click="emit('close')">
            <span class="settings-return-icon" aria-hidden="true"></span>
            <span>{{ localizeText('settings.returnToApp', '返回应用', 'Back to app') }}</span>
          </button>

          <div class="settings-search-wrap">
            <input
              v-model="searchQuery"
              class="ui-field settings-search-input"
              type="search"
              :placeholder="searchPlaceholder"
            >
          </div>

          <div class="settings-nav-label">{{ t('settings.title') }}</div>

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

        <main class="settings-content-panel">
          <div class="settings-content-topbar" aria-hidden="true"></div>
          <section class="settings-main">
          <header class="settings-toolbar" :class="{ 'settings-toolbar--ai': !isSearching && activeSection === 'ai' }">
            <div class="settings-toolbar-meta">
              <div class="settings-toolbar-copy">
                <h4>{{ currentPanelTitle }}</h4>
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

            <div v-else-if="visibleSections.length" class="settings-groups" :class="{ 'settings-groups--ai': !isSearching && activeSection === 'ai' }">
              <section
                v-for="section in visibleSections"
                :key="section.id"
                class="settings-group"
                :class="{ 'settings-group--active': activeSection === section.id }"
                :data-settings-section="section.id"
              >
                <div v-if="shouldShowSectionHeader(section)" class="settings-group-head" :class="{ 'settings-group-head--shortcuts': section.id === 'shortcuts' }">
                  <div v-if="shouldShowSectionTitle(section)" class="settings-group-head-copy">
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

                <div v-else-if="section.id === 'ai'" class="ai-settings-panel">
                  <section class="ai-settings-section">
                    <h5 class="ai-settings-section-title">{{ t('settings.aiCommonSettings') }}</h5>
                    <div class="ai-settings-card">
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiResponseLanguage') }}</strong>
                          <span>{{ t('settings.aiResponseLanguageDesc') }}</span>
                        </div>
                        <SettingsSelect
                          v-model="localAiSettings.responseLanguage"
                          :options="aiResponseLanguageOptions"
                          class="ai-settings-row-control"
                          :aria-label="t('settings.aiResponseLanguage')"
                          @change="saveAiSettings()"
                        />
                      </div>
                    </div>
                  </section>

                  <section class="ai-settings-section">
                    <h5 class="ai-settings-section-title">{{ t('settings.aiInlineCompletion') }}</h5>
                    <div class="ai-settings-card">
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionEnabled') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionDesc') }}</span>
                        </div>
                        <label class="ai-switch">
                          <input v-model="localAiSettings.inlineCompletion.enabled" type="checkbox" @change="saveAiSettings()">
                          <span aria-hidden="true"></span>
                        </label>
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionMode') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionModeDesc') }}</span>
                        </div>
                        <div class="ai-inline-completion-model-control ai-settings-row-control ai-settings-row-control--wide">
                          <div class="ai-inline-mode-segmented" role="radiogroup" :aria-label="t('settings.aiInlineCompletionMode')">
                            <button type="button" :class="{ active: isInlineCompletionMode('auto') }" role="radio" :aria-checked="isInlineCompletionMode('auto') ? 'true' : 'false'" :title="t('settings.aiInlineCompletionModeAutoTooltip')" @click="setInlineCompletionMode('auto')">
                              {{ t('settings.aiInlineCompletionModeAuto') }}
                            </button>
                            <button type="button" :class="{ active: isInlineCompletionMode('fixed') }" role="radio" :aria-checked="isInlineCompletionMode('fixed') ? 'true' : 'false'" @click="setInlineCompletionMode('fixed')">
                              {{ t('settings.aiInlineCompletionModeCustom') }}
                            </button>
                          </div>
                          <div v-if="isInlineCompletionMode('fixed')" class="ai-inline-model-selects">
                            <SettingsSelect
                              v-model="inlineCompletionProviderSelectValue"
                              :options="aiInlineCompletionProviderOptions"
                              :disabled="!aiInlineCompletionProviderOptions.length"
                              :aria-label="t('settings.aiInlineCompletionProvider')"
                              :min-width="132"
                              :max-width="220"
                              @change="setInlineCompletionProvider"
                            />
                            <SettingsSelect
                              v-model="inlineCompletionModelSelectValue"
                              :options="aiInlineCompletionModelOptions"
                              :disabled="!inlineCompletionProviderSelectValue || !aiInlineCompletionModelOptions.length"
                              :aria-label="t('settings.aiInlineCompletionModel')"
                              :min-width="132"
                              :max-width="240"
                              @change="setInlineCompletionModel"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionDelay') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionDelayDesc') }}</span>
                        </div>
                        <input v-model="localAiSettings.inlineCompletion.delayMs" class="ui-field ai-settings-row-control" type="number" inputmode="numeric" min="150" max="3000" step="50" @change="saveAiSettings()" @blur="saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionMaxChars') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionMaxCharsDesc') }}</span>
                        </div>
                        <input v-model="localAiSettings.inlineCompletion.maxChars" class="ui-field ai-settings-row-control" type="number" inputmode="numeric" min="20" max="1200" step="20" @change="saveAiSettings()" @blur="saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionColor') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionColorDesc') }}</span>
                        </div>
                        <div class="ai-inline-color-control ai-settings-row-control ai-settings-row-control--wide">
                          <div class="ai-inline-color-swatches" role="radiogroup" :aria-label="t('settings.aiInlineCompletionColor')">
                            <button
                              v-for="option in aiInlineCompletionColorOptions"
                              :key="option.value"
                              class="ai-inline-color-swatch"
                              type="button"
                              :class="{ active: localAiSettings.inlineCompletion.colorPreset === option.value }"
                              :style="getInlineCompletionColorSwatchStyle(option)"
                              role="radio"
                              :aria-checked="localAiSettings.inlineCompletion.colorPreset === option.value ? 'true' : 'false'"
                              :title="option.label"
                              @click="setInlineCompletionColorPreset(option.value)"
                            >
                              <span class="ai-inline-color-swatch-dot" aria-hidden="true"></span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionOpacity') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionOpacityDesc') }}</span>
                        </div>
                        <div class="ai-inline-opacity-control ai-settings-row-control">
                          <div class="ai-inline-opacity-slider" :style="inlineCompletionOpacityTrackStyle">
                            <output class="ai-inline-opacity-bubble" :style="inlineCompletionOpacityTrackStyle">{{ inlineCompletionOpacityPercent }}%</output>
                            <input :value="inlineCompletionOpacityPercent" type="range" min="30" max="100" step="5" :aria-label="t('settings.aiInlineCompletionOpacity')" @input="handleInlineCompletionOpacityInput" @change="handleInlineCompletionOpacityChange">
                            <div class="ai-inline-opacity-scale" aria-hidden="true">
                              <span>30</span>
                              <span>100</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="ai-settings-row">
                        <div class="ai-settings-row-copy">
                          <strong>{{ t('settings.aiInlineCompletionLogFiles') }}</strong>
                          <span>{{ t('settings.aiInlineCompletionLogFilesDesc') }}</span>
                        </div>
                        <label class="ai-switch">
                          <input v-model="localAiSettings.inlineCompletion.includeLog" type="checkbox" @change="saveAiSettings()">
                          <span aria-hidden="true"></span>
                        </label>
                      </div>
                    </div>
                  </section>

                  <section class="ai-settings-section">
                    <h5 class="ai-settings-section-title">{{ t('settings.aiModelService') }}</h5>
                    <div class="ai-config-layout">
                      <section class="ai-api-list-panel">
                        <div class="ai-panel-head">
                          <strong>{{ t('settings.aiProviders') }}</strong>
                          <div ref="aiProviderCreateMenuRef" class="ai-provider-create-menu">
                            <div class="ai-provider-icon-actions">
                              <button class="ai-provider-icon-button ai-provider-icon-button--primary" type="button" :title="t('settings.aiAddProvider')" :aria-label="t('settings.aiAddProvider')" @click="addAiProvider">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                                  <path d="M12 5v14"/>
                                  <path d="M5 12h14"/>
                                </svg>
                              </button>
                              <button class="ai-provider-icon-button" type="button" :class="{ active: showAiProviderPresetMenu }" :title="t('settings.aiProviderPresetPlaceholder')" :aria-label="t('settings.aiProviderPresetPlaceholder')" @click="toggleAiProviderPresetMenu">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <rect x="4" y="4" width="7" height="7" rx="1.5"/>
                                  <rect x="13" y="4" width="7" height="7" rx="1.5"/>
                                  <rect x="4" y="13" width="7" height="7" rx="1.5"/>
                                  <path d="M15 16h4"/>
                                  <path d="M17 14v4"/>
                                </svg>
                              </button>
                            </div>
                            <div v-if="showAiProviderPresetMenu" class="ai-provider-preset-menu">
                              <button v-for="preset in aiProviderPresetOptions" :key="preset.id" class="ai-provider-preset-item" type="button" @click="addAiProviderFromPreset(preset.id)">
                                <span class="ai-provider-brand-mark" :class="getAiProviderIconClass(preset.icon)" :style="getAiProviderIconStyle(preset.icon)" aria-hidden="true">
                                  <svg v-if="preset.icon.path" class="ai-provider-brand-svg" viewBox="0 0 24 24" focusable="false">
                                    <path :d="preset.icon.path"/>
                                  </svg>
                                  <span v-else>{{ preset.icon.label }}</span>
                                </span>
                                <span class="ai-provider-preset-copy">
                                  <strong>{{ preset.name }}</strong>
                                  <span>{{ t('settings.aiAddProviderFromPreset') }}</span>
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div class="ai-api-list">
                          <div
                            v-for="provider in aiProviders"
                            :key="provider.id"
                            class="ai-api-card"
                            :class="{
                              active: editingAiProvider?.id === provider.id
                            }"
                            role="button"
                            tabindex="0"
                            @click="selectAiProvider(provider.id)"
                            @keydown.enter.prevent="selectAiProvider(provider.id)"
                            @keydown.space.prevent="selectAiProvider(provider.id)"
                          >
                            <span class="ai-provider-brand-mark ai-provider-brand-mark--card" :class="getAiProviderIconClass(resolveAiProviderIcon(provider))" :style="getAiProviderIconStyle(resolveAiProviderIcon(provider))" aria-hidden="true">
                              <svg v-if="resolveAiProviderIcon(provider).path" class="ai-provider-brand-svg" viewBox="0 0 24 24" focusable="false">
                                <path :d="resolveAiProviderIcon(provider).path"/>
                              </svg>
                              <span v-else>{{ resolveAiProviderIcon(provider).label }}</span>
                            </span>
                            <span class="ai-api-copy">
                              <span class="ai-api-title">
                                <span>{{ provider.name || t('settings.aiProviderUnnamed') }}</span>
                                <span v-if="isInlineCompletionProvider(provider.id)" class="ai-api-badge">{{ t('settings.aiInlineCompletionProviderBadge') }}</span>
                                <span v-if="!provider.hasApiKey" class="ai-api-badge ai-api-badge--warn">{{ t('settings.aiMissingKey') }}</span>
                              </span>
                            </span>
                            <span class="ai-api-card-actions">
                              <button class="ai-api-card-action ai-api-card-action--danger" type="button" :disabled="!canDeleteAiProvider(provider.id)" :title="t('settings.aiDeleteProvider')" :aria-label="`${t('settings.aiDeleteProvider')} ${provider.name || t('settings.aiProviderUnnamed')}`" @click.stop="deleteAiProvider(provider.id)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14H6L5 6"/>
                                  <path d="M10 11v6"/>
                                  <path d="M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </span>
                          </div>
                        </div>
                      </section>

                    <section class="ai-provider-detail-shell">
                      <section class="ai-provider-detail-section">
                        <div class="ai-provider-detail-section-head">
                          <strong>{{ t('settings.aiCurrentProviderDetail') }}</strong>
                        </div>
                        <div v-if="editingAiProvider" class="ai-provider-detail-body ai-detail-form">
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiProviderName') }}</label>
                            <input class="ui-field" type="text" :value="editingAiProvider.name" autocomplete="off" @input="updateEditingAiProvider({ name: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                          </div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiProviderProtocol') }}</label>
                            <SettingsSelect
                              :model-value="editingAiProvider.protocol"
                              :options="aiProviderProtocolOptions"
                              :aria-label="t('settings.aiProviderProtocol')"
                              @update:model-value="handleAiProviderProtocolSelect"
                            />
                          </div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiBaseURL') }}</label>
                            <input class="ui-field" type="text" :value="editingAiProvider.baseURL" autocomplete="off" @input="updateEditingAiProvider({ baseURL: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                          </div>
                          <div class="ai-form-row ai-form-row--with-hint">
                            <label>{{ t('settings.aiInlineCompletionProviderURL') }}</label>
                            <div class="ai-form-field-stack">
                              <input class="ui-field" type="text" :value="editingAiProvider.inlineCompletionURL" :placeholder="t('settings.aiInlineCompletionProviderURLPlaceholder')" autocomplete="off" @input="updateEditingAiProvider({ inlineCompletionURL: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                              <span>{{ t('settings.aiInlineCompletionProviderURLDesc') }}</span>
                            </div>
                          </div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiApiKey') }}</label>
                            <input
                              class="ui-field ai-key-input"
                              type="password"
                              autocomplete="off"
                              :value="getAiKeyInputValue(editingAiProviderKey?.id)"
                              :placeholder="editingAiProviderKey?.hasApiKey ? AI_MASKED_KEY_VALUE : t('settings.aiApiKeyPlaceholder')"
                              @focus="focusAiKeyInput(editingAiProviderKey?.id)"
                              @input="setAiKeyInputValue(editingAiProviderKey?.id, $event.target.value)"
                              @blur="commitAiKeyInput(editingAiProviderKey?.id)"
                              @keydown.enter.prevent="commitAiKeyInput(editingAiProviderKey?.id)"
                              @copy.prevent
                              @cut.prevent
                            >
                          </div>
                          <div class="ai-form-divider" aria-hidden="true"></div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiTemperature') }}</label>
                            <input class="ui-field" type="number" inputmode="decimal" min="0" max="2" step="0.1" :value="editingAiProvider.temperature" @input="updateEditingAiProvider({ temperature: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                          </div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiMaxTokens') }}</label>
                            <input class="ui-field" type="number" inputmode="numeric" min="1" step="1" :value="editingAiProvider.maxTokens" @input="updateEditingAiProvider({ maxTokens: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                          </div>
                          <div class="ai-form-row">
                            <label>{{ t('settings.aiTimeout') }}</label>
                            <input class="ui-field" type="number" inputmode="numeric" min="1000" step="1000" :value="editingAiProvider.timeoutMs" @input="updateEditingAiProvider({ timeoutMs: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                          </div>
                        </div>
                      </section>

                      <section class="ai-provider-detail-section">
                        <div class="ai-provider-detail-section-head">
                          <strong>{{ t('settings.aiModels') }}</strong>
                          <button class="shortcut-reset-all-button" type="button" @click="addAiModel">
                            {{ t('settings.aiAddModel') }}
                          </button>
                        </div>
                        <div class="ai-provider-detail-body ai-model-list">
                          <div class="ai-model-list-head" aria-hidden="true">
                            <span></span>
                            <span>{{ t('settings.aiModelDisplayName') }}</span>
                            <span>{{ t('settings.aiModelId') }}</span>
                            <span>{{ t('settings.aiConnectionStatus') }}</span>
                          </div>
                          <div
                            v-for="model in editingAiProviderModels"
                            :key="model.id"
                            class="ai-model-row"
                            :class="{
                              active: editingAiModel?.id === model.id,
                              'is-dragging': draggingAiModelId === model.id,
                              'is-drop-target': dragOverAiModelId === model.id && draggingAiModelId !== model.id
                            }"
                            @dragover.prevent="handleAiModelDragOver(model.id)"
                            @drop.prevent="dropAiModel(model.id)"
                            @dragenter.prevent="handleAiModelDragOver(model.id)"
                          >
                            <button class="ai-model-drag-handle" type="button" draggable="true" :disabled="editingAiProviderModels.length <= 1" :title="t('settings.aiDragModel')" :aria-label="`${t('settings.aiDragModel')} ${model.name || model.model || t('settings.aiModelId')}`" @dragstart="startAiModelDrag(model.id, $event)" @dragend="endAiModelDrag">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <circle cx="9" cy="6" r="1"/>
                                <circle cx="15" cy="6" r="1"/>
                                <circle cx="9" cy="12" r="1"/>
                                <circle cx="15" cy="12" r="1"/>
                                <circle cx="9" cy="18" r="1"/>
                                <circle cx="15" cy="18" r="1"/>
                              </svg>
                            </button>
                            <input class="ui-field" type="text" :placeholder="t('settings.aiModelDisplayName')" :value="model.name" autocomplete="off" @focus="selectAiModel(model.id)" @input="updateAiModelById(model.id, { name: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                            <input class="ui-field" type="text" :placeholder="t('settings.aiModelId')" :value="model.model" autocomplete="off" @focus="selectAiModel(model.id)" @input="updateAiModelById(model.id, { model: $event.target.value }); saveAiSettings()" @keydown.enter.prevent="saveAiSettings()">
                            <span class="ai-model-inline-actions">
                              <span v-if="aiTestingModelId === model.id" class="ai-model-status-icon is-testing" :aria-label="t('settings.aiTesting')" role="img">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M21 12a9 9 0 0 1-9 9"/>
                                  <path d="M3 12a9 9 0 0 1 9-9"/>
                                </svg>
                              </span>
                              <span v-else-if="getAiModelTestStatus(model.id) !== 'untested'" class="ai-model-status-icon" :class="getAiModelTestStatusClass(model.id)" :title="getAiModelTestStatusLabel(model.id)" :aria-label="getAiModelTestStatusLabel(model.id)" role="img">
                                <svg v-if="getAiModelTestStatus(model.id) === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M20 6 9 17l-5-5"/>
                                </svg>
                                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M18 6 6 18"/>
                                  <path d="m6 6 12 12"/>
                                </svg>
                              </span>
                              <button class="ai-model-test-button" type="button" :class="{ 'is-testing': aiTestingModelId === model.id }" :disabled="aiTesting && aiTestingModelId !== model.id" :title="aiTestingModelId === model.id ? t('settings.aiTesting') : t('settings.aiTestConnection')" :aria-label="`${t('settings.aiTestConnection')} ${model.name || model.model || t('settings.aiModelId')}`" @click="testAiConnection(editingAiProvider?.id || '', model.id)">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <path d="M9 7V2"/>
                                  <path d="M15 7V2"/>
                                  <path d="M7 7h10v5a5 5 0 0 1-10 0z"/>
                                  <path d="M12 17v5"/>
                                </svg>
                              </button>
                              <button class="ai-model-delete-button" type="button" :disabled="editingAiProviderModels.length <= 1" :title="t('settings.aiDeleteApi')" :aria-label="`${t('settings.aiDeleteApi')} ${model.name || model.model || t('settings.aiModelId')}`" @click="deleteAiModel(model.id)">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6l-1 14H6L5 6"/>
                                  <path d="M10 11v6"/>
                                  <path d="M14 11v6"/>
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                </svg>
                              </button>
                            </span>
                          </div>
                        </div>
                      </section>
                      </section>
                    </div>
                  </section>
                </div>

                <div v-else class="settings-section-stack">
                  <section
                    v-for="group in getSettingsRowGroups(section)"
                    :key="`${section.id}-${group.id}`"
                    class="settings-subsection"
                    :data-settings-row-group="group.id"
                  >
                    <h5 v-if="group.title" class="settings-subsection-title">{{ group.title }}</h5>
                    <div class="settings-list">
                      <div
                        v-for="row in group.rows"
                        :key="`${section.id}-${row.id}`"
                        class="settings-row"
                        :class="{
                          'settings-row--checkbox': isInlineCheckboxControl(row.control),
                          'settings-row--preview': row.control === 'preview',
                          'settings-row--associations': row.control === 'associations',
                          'settings-row--action': row.control === 'system-association' || row.control === 'ai-test'
                        }"
                      >
                    <div class="settings-row-copy">
                      <div class="settings-row-title">{{ row.title }}</div>
                    </div>

                    <div class="settings-row-control">
                      <template v-if="isInlineCheckboxControl(row.control)">
                        <label class="settings-toggle">
                          <input type="checkbox" v-model="localSettings[getInlineCheckboxSettingKey(row.control)]" :aria-label="row.title">
                          <span class="settings-toggle-track" aria-hidden="true"></span>
                        </label>
                      </template>

                      <template v-else-if="row.control === 'language'">
                        <SettingsSelect
                          v-model="localSettings.locale"
                          :options="supportedLocales"
                          :aria-label="row.title"
                          @change="handleLocaleChange"
                        />
                      </template>

                      <template v-else-if="row.control === 'theme'">
                        <SettingsSelect v-model="localSettings.theme" :options="themeOptions" :aria-label="row.title" />
                      </template>

                      <template v-else-if="row.control === 'ui-font-size'">
                        <input
                          v-model="uiFontSizeInput"
                          class="ui-field"
                          type="number"
                          inputmode="numeric"
                          min="11"
                          max="20"
                          step="1"
                          @change="commitUiFontSize"
                          @blur="commitUiFontSize"
                          @keydown.enter.prevent="commitUiFontSize"
                        >
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
                        <SettingsSelect
                          v-model="localSettings.fontFamily"
                          :options="fontFamilyOptions"
                          :aria-label="row.title"
                          :max-width="300"
                        />
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
                            <div class="live-preview-line">- {{ t('settings.previewCodeSize', { size: localSettings.fontSize }) }}</div>
                          </div>
                        </div>
                      </template>

                      <template v-else-if="row.control === 'tab-density'">
                        <SettingsSelect v-model="localSettings.tabDensity" :options="tabDensityOptions" :aria-label="row.title" />
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
                        <SettingsSelect v-model="localSettings.tabSize" :options="tabSizeOptions" :aria-label="row.title" />
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
              </section>
            </div>

            <div v-else class="settings-empty-state">
              <div class="settings-empty-title">{{ emptyStateTitle }}</div>
              <p class="settings-empty-desc">{{ emptyStateDescription }}</p>
            </div>
          </div>
          </section>
        </main>

        <ModalDialog
          :show="restoreDefaultsConfirmDialog.visible"
          :title="t('settings.restoreDefaultsTitle')"
          @close="closeRestoreDefaultsConfirmDialog"
          @confirm="confirmRestoreDefaults"
        >
          <template #body>
            <div class="settings-confirm-message">
              {{ t('settings.restoreDefaultsConfirm') }}
            </div>
          </template>
          <template #footer>
            <button type="button" class="modal-btn" @click="closeRestoreDefaultsConfirmDialog">{{ t('common.cancel') }}</button>
            <button type="button" class="modal-btn primary" @click="confirmRestoreDefaults">{{ t('settings.restoreDefaults') }}</button>
          </template>
        </ModalDialog>

        <ModalDialog
          :show="aiProviderDeleteDialog.visible"
          :title="t('settings.aiDeleteProviderTitle')"
          @close="closeAiProviderDeleteDialog"
          @confirm="confirmAiProviderDelete"
        >
          <template #body>
            <div class="settings-confirm-message">
              {{ t('settings.aiDeleteProviderConfirm', { name: aiProviderDeleteDialog.name }) }}
            </div>
          </template>
          <template #footer>
            <button type="button" class="modal-btn" @click="closeAiProviderDeleteDialog">{{ t('common.cancel') }}</button>
            <button type="button" class="modal-btn primary" @click="confirmAiProviderDelete">{{ t('settings.aiDeleteProvider') }}</button>
          </template>
        </ModalDialog>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAIStore } from '../stores/ai'
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
import { createSequentialLatestRunner } from '../utils/latestAsyncQueue'
import { createAiApiKeyInputState } from '../utils/aiApiKeyInputs'
import {
  AI_PROVIDER_PRESETS,
  AI_PROVIDER_PROTOCOL_VALUES,
  AI_RESPONSE_LANGUAGE_VALUES,
  DEFAULT_AI_API_KEY,
  DEFAULT_AI_CHAT_ENDPOINT_PATH,
  DEFAULT_AI_MODEL,
  DEFAULT_AI_PROVIDER,
  INLINE_COMPLETION_COLOR_PRESETS,
  createAiProviderFromPreset,
  normalizeAiResponseLanguage,
  normalizeLocalInlineCompletion,
  normalizeLocalAiModel,
  normalizeLocalAiProvider,
  normalizeLocalAiSettings
} from '../utils/aiSettingsView'
import AboutOverview from './AboutOverview.vue'
import ModalDialog from './ModalDialog.vue'
import SettingsSelect from './SettingsSelect.vue'
import TitleBar from './TitleBar.vue'

const { t, locale } = useI18n()

const props = defineProps({
  show: Boolean,
  initialSection: {
    type: String,
    default: 'appearance'
  },
  leftSidebarCollapsed: {
    type: Boolean,
    default: false
  },
  rightSidebarCollapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'menu-action'])

const settingsStore = useSettingsStore()
const shortcutsStore = useShortcutsStore()
const aiStore = useAIStore()
const DEFAULT_AI_MANUAL_CONTEXT = {
  selection: true,
  fileInfo: true,
  nearbyText: true,
  fullDocument: false
}
const AI_MASKED_KEY_VALUE = '••••••••••••••••••••'
const activeSection = ref('appearance')
const settingsContentRef = ref(null)
const searchQuery = ref('')
const supportedLocales = getSupportedLocales()
const aiResponseLanguageOptions = computed(() => [
  t('settings.aiResponseLanguageApp'),
  t('settings.aiResponseLanguageDocument'),
  t('settings.aiResponseLanguageZhCN'),
  t('settings.aiResponseLanguageEnUS')
].map((label, index) => ({ value: AI_RESPONSE_LANGUAGE_VALUES[index], label })))
const inlineCompletionColorPreviewMap = {
  gray: '#64748b',
  blue: '#2563eb',
  cyan: '#06b6d4',
  green: '#16a34a',
  red: '#dc2626'
}
const aiInlineCompletionColorOptions = computed(() => INLINE_COMPLETION_COLOR_PRESETS.map(value => ({
  value,
  label: t(`settings.aiInlineCompletionColor${value.charAt(0).toUpperCase()}${value.slice(1)}`),
  color: inlineCompletionColorPreviewMap[value]
})))
const inlineCompletionOpacityPercent = computed({
  get: () => Math.round(Number(localAiSettings.value.inlineCompletion?.opacity ?? 0.7) * 100),
  set: (value) => {
    setInlineCompletionOpacityPercent(value)
  }
})
const inlineCompletionOpacityTrackStyle = computed(() => {
  const min = 30
  const max = 100
  const percent = Math.min(max, Math.max(min, inlineCompletionOpacityPercent.value))
  const progress = ((percent - min) / (max - min)) * 100
  const colorPreset = localAiSettings.value.inlineCompletion?.colorPreset || 'cyan'
  return {
    '--inline-opacity-progress': `${progress}%`,
    '--inline-opacity-label-left': `clamp(20px, ${progress}%, calc(100% - 20px))`,
    '--inline-opacity-accent': inlineCompletionColorPreviewMap[colorPreset] || inlineCompletionColorPreviewMap.cyan
  }
})
const associationStatus = ref('')
const uiFontSizeInput = ref('14')
const fontSizeInput = ref('14')
const unpinnedTabMaxRowsInput = ref('10')
const shortcutCategoryFilter = ref('all')
const recordingShortcutId = ref('')
const shortcutStatusMessage = ref('')
const shortcutSaveError = ref('')
const localAiSettings = ref(normalizeLocalAiSettings({}))
const editingAiProviderId = ref('')
const editingAiModelId = ref('')
const showAiProviderPresetMenu = ref(false)
const aiProviderCreateMenuRef = ref(null)
const restoreDefaultsConfirmDialog = ref({ visible: false })
const aiProviderDeleteDialog = ref({ visible: false, providerId: '', name: '' })
const aiApiKeyInputState = createAiApiKeyInputState(() => editingAiProvider.value?.id || '')
const aiApiKeyInputs = aiApiKeyInputState.inputs
const aiTestMessage = ref('')
const aiTestError = ref(false)
const aiTesting = ref(false)
const aiTestingModelId = ref('')
const aiModelTestResults = ref({})
const draggingAiModelId = ref('')
const dragOverAiModelId = ref('')
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
let aiTestRequestId = 0
const aiSettingsSaveRunner = createSequentialLatestRunner()
const SETTINGS_SCROLL_LOCK_MS = 900
const inlineCheckboxSettingKeys = {
  'word-wrap': 'wordWrap',
  'unicode-highlight': 'unicodeHighlight',
  'line-numbers': 'lineNumbers',
  minimap: 'minimap'
}

const localSettings = ref({})
const aiProviderPresetOptions = computed(() => AI_PROVIDER_PRESETS.map(preset => ({
  id: preset.id,
  name: preset.name,
  icon: preset.icon || { label: preset.name.slice(0, 1), accent: '#667085', brand: 'custom' }
})))
const fallbackAiProviderIcon = { label: 'API', accent: '#0f766e', brand: 'custom' }
const aiProviderPresetIconOptions = computed(() => AI_PROVIDER_PRESETS.map(preset => ({
  id: preset.id,
  name: preset.name,
  baseURL: preset.baseURL,
  icon: preset.icon || fallbackAiProviderIcon
})))
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
  fontSize: `${Math.max(8, localSettings.value.fontSize || 14)}px`
}))

function normalizeAiProviderMatchText(value = '') {
  return String(value || '').trim().toLowerCase()
}

function resolveAiProviderIcon(provider = {}) {
  const providerId = normalizeAiProviderMatchText(provider.id)
  const providerName = normalizeAiProviderMatchText(provider.name)
  const providerBaseURL = normalizeAiProviderMatchText(provider.baseURL)
  const matchedPreset = aiProviderPresetIconOptions.value.find(preset => {
    const presetId = normalizeAiProviderMatchText(preset.id)
    const presetName = normalizeAiProviderMatchText(preset.name)
    const presetBaseURL = normalizeAiProviderMatchText(preset.baseURL)
    return providerId === presetId
      || providerId.startsWith(`${presetId}-`)
      || providerName === presetName
      || (providerBaseURL && providerBaseURL === presetBaseURL)
  })

  return matchedPreset?.icon || fallbackAiProviderIcon
}

function getAiProviderIconClass(icon = fallbackAiProviderIcon) {
  return `ai-provider-brand-mark--${icon.brand || 'custom'}`
}

function getAiProviderIconStyle(icon = fallbackAiProviderIcon) {
  return { '--provider-accent': icon.accent || fallbackAiProviderIcon.accent }
}

function getInlineCompletionColorSwatchStyle(option = {}) {
  const color = option.color || inlineCompletionColorPreviewMap.cyan
  return {
    '--inline-completion-swatch-color': color
  }
}

function updateLocalInlineCompletion(patch = {}) {
  const inlineCompletion = normalizeLocalInlineCompletion({
    ...normalizeLocalInlineCompletion(localAiSettings.value.inlineCompletion),
    ...patch
  })
  localAiSettings.value = normalizeLocalAiSettings({
    ...localAiSettings.value,
    inlineCompletion
  })
  return inlineCompletion
}

function setInlineCompletionColorPreset(value) {
  if (!INLINE_COMPLETION_COLOR_PRESETS.includes(value)) return
  updateLocalInlineCompletion({ colorPreset: value })
  saveAiSettings()
}

function setInlineCompletionOpacityPercent(value) {
  const nextValue = Math.min(100, Math.max(30, Number(value) || 70))
  updateLocalInlineCompletion({ opacity: nextValue / 100 })
}

function handleInlineCompletionOpacityInput(event) {
  setInlineCompletionOpacityPercent(event?.target?.value)
  saveAiSettings()
}

function handleInlineCompletionOpacityChange(event) {
  setInlineCompletionOpacityPercent(event?.target?.value)
  saveAiSettings()
}

const fontFamilies = FONT_FAMILIES

const themeOptions = computed(() => [
  { value: 'light', label: t('settings.light') },
  { value: 'dark', label: t('settings.dark') }
])

const fontFamilyOptions = computed(() => fontFamilies.map(font => ({
  value: font.value,
  label: font.label,
  style: getFontOptionStyle(font)
})))

const tabDensityOptions = computed(() => [
  { value: 'comfortable', label: t('settings.comfortable') },
  { value: 'compact', label: t('settings.compact') }
])

const tabSizeOptions = computed(() => [
  { value: 2, label: t('settings.spaces', { count: 2 }) },
  { value: 4, label: t('settings.spaces', { count: 4 }) },
  { value: 8, label: t('settings.spaces', { count: 8 }) }
])

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

const aiProviderProtocolOptions = computed(() => AI_PROVIDER_PROTOCOL_VALUES.map(value => ({
  value,
  label: t(`settings.aiProviderProtocols.${value}`)
})))

const aiProviders = computed(() => (
  Array.isArray(localAiSettings.value.providers) ? localAiSettings.value.providers : []
))

const activeAiProvider = computed(() => (
  aiProviders.value[0] || null
))

const editingAiProvider = computed(() => (
  aiProviders.value.find(provider => provider.id === editingAiProviderId.value) || activeAiProvider.value
))

const editingAiProviderKeys = computed(() => (
  Array.isArray(editingAiProvider.value?.apiKeys) ? editingAiProvider.value.apiKeys : []
))

const editingAiProviderKey = computed(() => (
  editingAiProviderKeys.value[0] || null
))

const editingAiProviderModels = computed(() => (
  Array.isArray(editingAiProvider.value?.models) ? editingAiProvider.value.models : []
))

const editingAiModel = computed(() => (
  editingAiProviderModels.value.find(model => model.id === editingAiModelId.value)
  || editingAiProviderModels.value[0]
  || null
))

const inlineCompletionModelRef = computed(() => resolveInlineCompletionModelRef())

const inlineCompletionModelSummary = computed(() => {
  const target = inlineCompletionModelRef.value
  if (!target) return t('settings.aiInlineCompletionModelNotSet')
  const providerName = target.provider.name || target.provider.id || t('settings.aiProviderUnnamed')
  const modelName = target.model.name || target.model.model || target.model.id || t('settings.aiModelId')
  return `${providerName} / ${modelName}`
})

const inlineCompletionModelStatus = computed(() => (
  isInlineCompletionMode('fixed')
    ? t('settings.aiInlineCompletionFixedUsing', { model: inlineCompletionModelSummary.value })
    : t('settings.aiInlineCompletionAutoUsing', { model: inlineCompletionModelSummary.value })
))

const aiInlineCompletionProviderOptions = computed(() => aiProviders.value.map(provider => ({
  value: provider.id,
  label: provider.name || provider.id || t('settings.aiProviderUnnamed')
})))

const inlineCompletionProviderSelectValue = computed({
  get() {
    const providerId = localAiSettings.value.inlineCompletion?.providerId || ''
    if (aiProviders.value.some(provider => provider.id === providerId)) return providerId
    return inlineCompletionModelRef.value?.provider.id || aiProviders.value[0]?.id || ''
  },
  set(providerId) {
    updateInlineCompletionProviderSelection(providerId)
  }
})

const selectedInlineCompletionProvider = computed(() => (
  aiProviders.value.find(provider => provider.id === inlineCompletionProviderSelectValue.value) || aiProviders.value[0] || null
))

const aiInlineCompletionModelOptions = computed(() => (
  getSelectableInlineCompletionModels(selectedInlineCompletionProvider.value).map(model => ({
    value: model.id,
    label: model.name || model.model || model.id || t('settings.aiModelId')
  }))
))

const inlineCompletionModelSelectValue = computed({
  get() {
    const inlineCompletion = localAiSettings.value.inlineCompletion || {}
    const models = getSelectableInlineCompletionModels(selectedInlineCompletionProvider.value)
    if (inlineCompletion.providerId === selectedInlineCompletionProvider.value?.id && models.some(model => model.id === inlineCompletion.modelId)) {
      return inlineCompletion.modelId
    }
    return models[0]?.id || ''
  },
  set(modelId) {
    updateInlineCompletionModelSelection(inlineCompletionProviderSelectValue.value, modelId)
  }
})

const canDeleteEditingAiProvider = computed(() => canDeleteAiProvider(editingAiProvider.value?.id || ''))

const SETTINGS_ROW_GROUPS = {
  appearance: [
    {
      id: 'appearance-interface',
      titleKey: 'settings.interfaceSettings',
      fallbackZh: '界面设置',
      fallbackEn: 'Interface',
      rowIds: ['language', 'theme']
    },
    {
      id: 'appearance-font-reading',
      titleKey: 'settings.fontAndReadingSettings',
      fallbackZh: '字体与阅读',
      fallbackEn: 'Font and Reading',
      rowIds: ['ui-font-size']
    }
  ],
  editor: [
    {
      id: 'editor-font-reading',
      titleKey: 'settings.fontAndReadingSettings',
      fallbackZh: '字体与阅读',
      fallbackEn: 'Font and Reading',
      rowIds: ['font-size', 'font-family', 'preview']
    },
    {
      id: 'editor-tabs',
      titleKey: 'settings.tabBarSettings',
      fallbackZh: '标签栏',
      fallbackEn: 'Tab Bar',
      rowIds: ['tab-density', 'tab-max-rows']
    },
    {
      id: 'editor-display',
      titleKey: 'settings.editorDisplaySettings',
      fallbackZh: '编辑区显示',
      fallbackEn: 'Editor Display',
      rowIds: ['word-wrap', 'line-numbers', 'unicode-highlight', 'minimap']
    },
    {
      id: 'editor-input-indent',
      titleKey: 'settings.inputAndIndentSettings',
      fallbackZh: '输入与缩进',
      fallbackEn: 'Input and Indent',
      rowIds: ['tab-size']
    }
  ]
}

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
        id: 'ui-font-size',
        title: t('settings.uiFontSize'),
        description: localizeText('settings.uiFontSizeDesc', '调整菜单、设置页和工具栏等界面文字字号。', 'Adjust text size for menus, settings and toolbars.'),
        control: 'ui-font-size',
        aliases: ['ui font size', 'interface size', '界面字号']
      }
    ]
  },
  {
    id: 'editor',
    title: t('settings.editor'),
    description: t('settings.editorDesc'),
    rows: [
      {
        id: 'font-size',
        title: t('settings.codeFontSize'),
        description: localizeText('settings.codeFontSizeDesc', '调整所有已打开编辑器和新建编辑器的代码字号；单个编辑器仍可临时单独缩放。', 'Adjust code font size for all open and new editors; individual editors can still be zoomed temporarily.'),
        control: 'font-size',
        aliases: ['code font size', 'editor font size', 'font size', 'size', '代码字号', '编辑器字号']
      },
      {
        id: 'font-family',
        title: t('settings.codeFontFamily'),
        description: localizeText('settings.codeFontFamilyDesc', '为编辑器和代码内容选择字体，不影响界面字体。', 'Choose the font family used by editors and code content without changing the interface font.'),
        control: 'font-family',
        aliases: ['code font family', 'editor font', 'font family', 'font', '代码字体']
      },
      {
        id: 'preview',
        title: t('settings.livePreview'),
        description: localizeText('settings.livePreviewDesc', '实时预览当前主题、代码字体和代码字号组合效果。', 'Preview the current theme, code font family and code font size together.'),
        control: 'preview',
        aliases: ['preview', 'live preview', '预览']
      },
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
    id: 'ai',
    title: t('settings.ai'),
    description: t('settings.aiDesc'),
    rows: [
      {
        id: 'ai-common',
        title: t('settings.aiResponseLanguage'),
        description: t('settings.aiResponseLanguageDesc'),
        control: 'ai-panel',
        aliases: ['ai', 'assistant', 'language', 'response language', 'reply language', '中文', 'english']
      },
      {
        id: 'ai-api-configs',
        title: t('settings.aiProviders'),
        description: t('settings.aiDesc'),
        control: 'ai-panel',
        aliases: ['api', 'api key', 'token', 'secret', 'url', 'base url', 'model', 'temperature', 'max tokens', 'timeout', 'openai', 'glm', 'connection test']
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

  if (!isSearching.value) {
    const section = currentSectionDefinition.value
    return section ? [{
      ...section,
      rows: section.rows.filter(row => matchesRow(row) && matchesShortcutCategory(row, section.id))
    }] : []
  }

  return sectionDefinitions.value
    .map(section => ({
      ...section,
      rows: section.rows.filter(row => matchesRow(row) && matchesShortcutCategory(row, section.id))
    }))
    .filter(section => section.rows.length)
})

function getSettingsRowGroups(section) {
  const rows = Array.isArray(section?.rows) ? section.rows : []
  const groupConfig = !isSearching.value ? SETTINGS_ROW_GROUPS[section?.id] : null
  if (!groupConfig) {
    return [{ id: 'all', title: '', rows }]
  }

  const groupedRowIds = new Set(groupConfig.flatMap(group => group.rowIds))
  const groups = groupConfig.map(group => ({
    id: group.id,
    title: localizeText(group.titleKey, group.fallbackZh, group.fallbackEn),
    rows: rows.filter(row => group.rowIds.includes(row.id))
  })).filter(group => group.rows.length)

  const ungroupedRows = rows.filter(row => !groupedRowIds.has(row.id))
  if (ungroupedRows.length) {
    groups.push({ id: `${section.id}-other`, title: '', rows: ungroupedRows })
  }

  return groups
}

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
      : currentSectionDefinition.value?.title || localizeText('settings.allSettingsTitle', '全部设置', 'All Settings'))
))

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

onMounted(() => {
  document.addEventListener('click', handleAiProviderPresetClickOutside, true)
})

onUnmounted(() => {
  document.removeEventListener('click', handleAiProviderPresetClickOutside, true)
})

watch(() => props.show, async (newVal) => {
  if (newVal) {
    const initialSection = resolveInitialSection(props.initialSection)
    associationStatus.value = ''
    aiTestMessage.value = ''
    aiTestError.value = false
    closeAiProviderPresetMenu()
    restoreDefaultsConfirmDialog.value.visible = false
    aiProviderDeleteDialog.value = { visible: false, providerId: '', name: '' }
    shortcutStatusMessage.value = ''
    shortcutSaveError.value = ''
    recordingShortcutId.value = ''
    searchQuery.value = ''
    activeSection.value = initialSection
    clearPendingSettingsScroll()
    shortcutCategoryFilter.value = 'all'
    localSettings.value = {
      ...settingsStore.settings,
      theme: settingsStore.settings.theme || 'light'
    }
    syncUiFontSizeInput(localSettings.value.uiFontSize)
    syncFontSizeInput(localSettings.value.fontSize)
    syncUnpinnedTabMaxRowsInput(localSettings.value.unpinnedTabMaxRows)
    shortcutsStore.loadShortcuts()
    const aiSettingsResult = await aiStore.loadSettings()
    localAiSettings.value = normalizeLocalAiSettings(aiSettingsResult?.settings || {})
    editingAiProviderId.value = localAiSettings.value.providers?.[0]?.id || ''
    editingAiModelId.value = localAiSettings.value.providers?.[0]?.models?.[0]?.id || ''
    aiApiKeyInputState.clearAll()
    nextTick(() => {
      if (initialSection === 'appearance') {
        settingsContentRef.value?.scrollTo({ top: 0 })
        return
      }

      scrollToSection(initialSection)
    })
  }
}, { immediate: true })

watch(() => props.initialSection, async (sectionId) => {
  if (!props.show) return
  const initialSection = resolveInitialSection(sectionId)
  activeSection.value = initialSection
  await nextTick()
  scrollToSection(initialSection)
})

watch(() => activeSection.value, (section) => {
  if (section === 'about') {
    searchQuery.value = ''
  }
})

watch(() => localSettings.value.fontSize, (fontSize) => {
  syncFontSizeInput(fontSize)
})

watch(() => localSettings.value.uiFontSize, (uiFontSize) => {
  syncUiFontSizeInput(uiFontSize)
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
  () => [localSettings.value.uiFontSize, localSettings.value.fontSize, localSettings.value.fontFamily, localSettings.value.tabDensity, localSettings.value.unpinnedTabMaxRows],
  ([uiFontSize, fontSize, fontFamily, tabDensity, unpinnedTabMaxRows]) => {
    if (props.show) {
      settingsStore.updateSettings({ uiFontSize, fontSize, fontFamily, tabDensity, unpinnedTabMaxRows })
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
  searchQuery.value = ''
  clearPendingSettingsScroll()
  await nextTick()
  settingsContentRef.value?.scrollTo({ top: 0 })
}

function handleTitleBarOpenSettings() {
  selectSection('appearance')
}

function handleTitleBarMenuAction(action) {
  emit('menu-action', action)
}

function resolveInitialSection(sectionId) {
  const candidate = String(sectionId || '').trim()
  return sectionDefinitions.value.some(section => section.id === candidate) ? candidate : 'appearance'
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
  restoreDefaultsConfirmDialog.value.visible = true
}

function closeRestoreDefaultsConfirmDialog() {
  restoreDefaultsConfirmDialog.value.visible = false
}

function confirmRestoreDefaults() {
  closeRestoreDefaultsConfirmDialog()
  settingsStore.resetSettings()
  localSettings.value = {
    ...settingsStore.settings,
    theme: settingsStore.settings.theme || 'light'
  }
  syncUiFontSizeInput(localSettings.value.uiFontSize)
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

function handleAiProviderProtocolSelect(protocol) {
  updateEditingAiProvider({ protocol })
  saveAiSettings()
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

function normalizeUiFontSize(value, fallback = localSettings.value.uiFontSize || settingsStore.DEFAULT_SETTINGS.uiFontSize) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(11, Math.min(20, parsed))
}

function syncUiFontSizeInput(value) {
  uiFontSizeInput.value = String(normalizeUiFontSize(value, settingsStore.DEFAULT_SETTINGS.uiFontSize))
}

function commitUiFontSize() {
  const nextUiFontSize = normalizeUiFontSize(uiFontSizeInput.value)
  localSettings.value.uiFontSize = nextUiFontSize
  uiFontSizeInput.value = String(nextUiFontSize)
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

function shouldShowSectionTitle(section) {
  return Boolean(section) && isSearching.value
}

function shouldShowSectionHeader(section) {
  return shouldShowSectionTitle(section) || section?.id === 'shortcuts'
}

function isInlineCheckboxControl(control) {
  return Boolean(inlineCheckboxSettingKeys[control])
}

function getInlineCheckboxSettingKey(control) {
  return inlineCheckboxSettingKeys[control] || ''
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeAiString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeAiBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function createAiEntityId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getNextAiProviderName() {
  return t('settings.aiNewProviderName', { count: aiProviders.value.length + 1 })
}

function getNextAiModelName() {
  return t('settings.aiNewModelName', { count: editingAiProviderModels.value.length + 1 })
}

function getEditingAiProviderIndex() {
  return aiProviders.value.findIndex(provider => provider.id === editingAiProvider.value?.id)
}

function getSelectableInlineCompletionModels(provider = null) {
  const models = Array.isArray(provider?.models) ? provider.models : []
  return models.filter(model => model?.enabled !== false)
}

function getFirstInlineCompletionModel(provider = null) {
  return getSelectableInlineCompletionModels(provider).find(model => model.model || model.name || model.id) || getSelectableInlineCompletionModels(provider)[0] || null
}

function updateInlineCompletionProviderSelection(providerId = '') {
  const provider = aiProviders.value.find(item => item.id === providerId) || aiProviders.value[0] || null
  if (!provider) return null
  const model = getFirstInlineCompletionModel(provider)
  const modelId = model?.id || ''
  updateLocalInlineCompletion({ mode: 'fixed', providerId: provider.id, modelId })
  return { providerId: provider.id, modelId }
}

function updateInlineCompletionModelSelection(providerId = '', modelId = '') {
  const provider = aiProviders.value.find(item => item.id === providerId)
  const model = getSelectableInlineCompletionModels(provider).find(item => item.id === modelId)
  if (!provider || !model) return null
  updateLocalInlineCompletion({ mode: 'fixed', providerId, modelId })
  return { providerId, modelId }
}

function resolveInlineCompletionModelRef() {
  const inlineCompletion = localAiSettings.value.inlineCompletion || {}
  const selectedProvider = aiProviders.value.find(provider => provider.id === inlineCompletion.providerId)
  const selectedModel = selectedProvider?.models?.find(model => model.id === inlineCompletion.modelId && model.enabled !== false)
  if (inlineCompletion.mode === 'fixed' && selectedProvider && selectedModel) {
    return { provider: selectedProvider, model: selectedModel, explicit: true }
  }

  const fallbackProvider = aiProviders.value.find(provider => provider.apiKeys?.some(key => key.hasApiKey)) || aiProviders.value[0] || null
  const fallbackModel = fallbackProvider?.models?.find(model => model.enabled !== false && model.model) || fallbackProvider?.models?.[0] || null
  return fallbackProvider && fallbackModel ? { provider: fallbackProvider, model: fallbackModel, explicit: false } : null
}

function isInlineCompletionProvider(providerId = '') {
  return inlineCompletionModelRef.value?.explicit && inlineCompletionModelRef.value.provider.id === providerId
}

function isInlineCompletionMode(mode = 'auto') {
  const normalizedMode = mode === 'fixed' ? 'fixed' : 'auto'
  return (localAiSettings.value.inlineCompletion?.mode === 'fixed' ? 'fixed' : 'auto') === normalizedMode
}

function isInlineCompletionModel(providerId = '', modelId = '') {
  const inlineCompletion = localAiSettings.value.inlineCompletion || {}
  return inlineCompletion.mode === 'fixed' && inlineCompletion.providerId === providerId && inlineCompletion.modelId === modelId
}

async function setInlineCompletionMode(mode = 'auto') {
  const normalizedMode = mode === 'fixed' ? 'fixed' : 'auto'
  const patch = { mode: normalizedMode }
  if (normalizedMode === 'fixed') {
    const target = inlineCompletionModelRef.value
    if (target) {
      patch.providerId = target.provider.id
      patch.modelId = target.model.id
    }
  }
  updateLocalInlineCompletion(patch)
  await saveAiSettings()
}

async function setInlineCompletionProvider(providerId = '') {
  if (!updateInlineCompletionProviderSelection(providerId)) return
  await saveAiSettings()
}

async function setInlineCompletionModel(providerId = '', modelId = '') {
  if (!modelId) {
    modelId = providerId
    providerId = inlineCompletionProviderSelectValue.value
  }
  const provider = aiProviders.value.find(item => item.id === providerId)
  const model = getSelectableInlineCompletionModels(provider).find(item => item.id === modelId)
  if (!provider || !model) return
  updateLocalInlineCompletion({ mode: 'fixed', providerId, modelId })
  await saveAiSettings()
}

function selectAiProvider(id) {
  const provider = aiProviders.value.find(item => item.id === id)
  editingAiProviderId.value = id
  editingAiModelId.value = provider?.models?.[0]?.id || ''
  aiApiKeyInputState.clearAll()
  aiModelTestResults.value = {}
  setAiTestStatus('', false)
}

function updateAiProviders(nextProviders, patch = {}) {
  localAiSettings.value = normalizeLocalAiSettings({
    ...localAiSettings.value,
    ...patch,
    providers: nextProviders
  })
}

function updateEditingAiProvider(patch = {}) {
  const index = getEditingAiProviderIndex()
  if (index < 0) return
  updateAiProviders(aiProviders.value.map((provider, providerIndex) => (
    providerIndex === index ? normalizeLocalAiProvider({ ...provider, ...patch }, provider, providerIndex) : provider
  )))
}

async function addAiProvider() {
  const id = createAiEntityId('provider')
  const keyId = `${id}-key`
  const modelId = `${id}-model`
  const nextProvider = normalizeLocalAiProvider({
    ...DEFAULT_AI_PROVIDER,
    id,
    name: getNextAiProviderName(),
    activeApiKeyId: keyId,
    apiKeys: [{ ...DEFAULT_AI_API_KEY, id: keyId }],
    models: [{ ...DEFAULT_AI_MODEL, id: modelId, name: getNextAiModelName() }]
  }, DEFAULT_AI_PROVIDER, aiProviders.value.length)
  localAiSettings.value = normalizeLocalAiSettings({
    ...localAiSettings.value,
    providers: [...aiProviders.value, nextProvider]
  })
  editingAiProviderId.value = id
  editingAiModelId.value = modelId
  aiApiKeyInputState.clearAll()
  await saveAiSettings()
}

function toggleAiProviderPresetMenu() {
  showAiProviderPresetMenu.value = !showAiProviderPresetMenu.value
}

function closeAiProviderPresetMenu() {
  showAiProviderPresetMenu.value = false
}

function isAiProviderCreateMenuTarget(target) {
  const menuRefs = Array.isArray(aiProviderCreateMenuRef.value)
    ? aiProviderCreateMenuRef.value
    : [aiProviderCreateMenuRef.value]
  return menuRefs.some(menu => menu?.contains?.(target))
}

function handleAiProviderPresetClickOutside(event) {
  if (!showAiProviderPresetMenu.value) return
  if (isAiProviderCreateMenuTarget(event.target)) return
  closeAiProviderPresetMenu()
}

async function addAiProviderFromPreset(presetId = '') {
  if (!presetId) return
  const id = createAiEntityId('provider')
  const nextProvider = createAiProviderFromPreset(presetId, { id })
  if (!nextProvider) return

  localAiSettings.value = normalizeLocalAiSettings({
    ...localAiSettings.value,
    providers: [...aiProviders.value, nextProvider]
  })
  editingAiProviderId.value = id
  editingAiModelId.value = nextProvider.models?.[0]?.id || ''
  closeAiProviderPresetMenu()
  aiApiKeyInputState.clearAll()
  await saveAiSettings()
}

function canDeleteAiProvider(providerId) {
  return aiProviders.value.length > 1 && aiProviders.value.some(provider => provider.id === providerId)
}

function deleteAiProvider(providerId) {
  if (!canDeleteAiProvider(providerId)) return
  const deletingProvider = aiProviders.value.find(provider => provider.id === providerId)
  const deletingName = deletingProvider?.name || t('settings.aiProviderUnnamed')
  aiProviderDeleteDialog.value = { visible: true, providerId, name: deletingName }
}

function closeAiProviderDeleteDialog() {
  aiProviderDeleteDialog.value = { visible: false, providerId: '', name: '' }
}

async function confirmAiProviderDelete() {
  const deletingId = aiProviderDeleteDialog.value.providerId
  if (!canDeleteAiProvider(deletingId)) {
    closeAiProviderDeleteDialog()
    return
  }

  const currentEditingId = editingAiProviderId.value
  const nextProviders = aiProviders.value.filter(provider => provider.id !== deletingId)
  const fallbackProvider = currentEditingId === deletingId
    ? nextProviders[0] || null
    : nextProviders.find(provider => provider.id === currentEditingId) || nextProviders[0] || null
  localAiSettings.value = normalizeLocalAiSettings({
    ...localAiSettings.value,
    providers: nextProviders
  })
  editingAiProviderId.value = fallbackProvider?.id || ''
  editingAiModelId.value = fallbackProvider?.models?.[0]?.id || ''
  closeAiProviderDeleteDialog()
  aiApiKeyInputState.clearAll()
  await saveAiSettings()
}

async function deleteEditingAiProvider() {
  await deleteAiProvider(editingAiProvider.value?.id || '')
}

function getAiKeyInputKey(keyId) {
  return aiApiKeyInputState.getInputKey(keyId)
}

function getAiKeyInputValue(keyId) {
  return aiApiKeyInputState.getValue(keyId)
}

function setAiKeyInputValue(keyId, value) {
  aiApiKeyInputState.setValue(keyId, value)
}

function focusAiKeyInput(keyId) {
  aiApiKeyInputState.focus(keyId)
}

async function commitAiKeyInput(keyId) {
  if (!getAiKeyInputKey(keyId)) return
  const providerId = editingAiProvider.value?.id || ''
  aiApiKeyInputState.blur(keyId)
  if (!aiApiKeyInputState.hasInput(providerId, keyId)) return
  await saveAiSettings({ clearApiKeyInputs: true })
}

function selectAiModel(modelId) {
  editingAiModelId.value = modelId
}

function startAiModelDrag(modelId, event) {
  if (editingAiProviderModels.value.length <= 1) return
  draggingAiModelId.value = modelId
  dragOverAiModelId.value = ''
  selectAiModel(modelId)
  event?.dataTransfer?.setData('text/plain', modelId)
  if (event?.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function handleAiModelDragOver(modelId) {
  if (!draggingAiModelId.value || draggingAiModelId.value === modelId) return
  dragOverAiModelId.value = modelId
}

function endAiModelDrag() {
  draggingAiModelId.value = ''
  dragOverAiModelId.value = ''
}

function dropAiModel(targetModelId) {
  const sourceModelId = draggingAiModelId.value
  endAiModelDrag()
  if (!sourceModelId || sourceModelId === targetModelId || !editingAiProvider.value) return

  const models = [...editingAiProviderModels.value]
  const sourceIndex = models.findIndex(model => model.id === sourceModelId)
  const targetIndex = models.findIndex(model => model.id === targetModelId)
  if (sourceIndex < 0 || targetIndex < 0) return

  const [movedModel] = models.splice(sourceIndex, 1)
  models.splice(targetIndex, 0, movedModel)
  updateEditingAiProvider({ models })
  editingAiModelId.value = sourceModelId
  saveAiSettings()
}

function clearAiModelTestStatus(modelId) {
  if (!modelId || !aiModelTestResults.value[modelId]) return
  const {
    [modelId]: _removed,
    ...nextResults
  } = aiModelTestResults.value
  aiModelTestResults.value = nextResults
}

function getAiModelTestStatus(modelId) {
  return aiModelTestResults.value[modelId] || 'untested'
}

function getAiModelTestStatusClass(modelId) {
  return {
    'is-success': getAiModelTestStatus(modelId) === 'success',
    'is-error': getAiModelTestStatus(modelId) === 'error'
  }
}

function getAiModelTestStatusLabel(modelId) {
  const status = getAiModelTestStatus(modelId)
  if (status === 'success') return t('settings.aiTestSuccess')
  if (status === 'error') return t('settings.aiTestFailed')
  return t('settings.aiNotTested')
}

function updateAiModelById(modelId, patch = {}) {
  if (!editingAiProvider.value) return
  clearAiModelTestStatus(modelId)
  updateEditingAiProvider({
    models: editingAiProviderModels.value.map(model => (
      model.id === modelId ? normalizeLocalAiModel({ ...model, ...patch }, model) : model
    ))
  })
}

function updateEditingAiModel(patch = {}) {
  if (!editingAiModel.value) return
  updateAiModelById(editingAiModel.value.id, patch)
}

async function addAiModel() {
  if (!editingAiProvider.value) return
  const id = createAiEntityId('model')
  updateEditingAiProvider({
    models: [
      ...editingAiProviderModels.value,
      normalizeLocalAiModel({ ...DEFAULT_AI_MODEL, id, name: getNextAiModelName() })
    ]
  })
  editingAiModelId.value = id
  await saveAiSettings()
}

async function deleteAiModel(modelId) {
  if (!editingAiProvider.value || editingAiProviderModels.value.length <= 1) return
  const nextModels = editingAiProviderModels.value.filter(model => model.id !== modelId)
  updateAiProviders(aiProviders.value.map(provider => (
    provider.id === editingAiProvider.value.id
      ? normalizeLocalAiProvider({ ...provider, models: nextModels }, provider)
      : provider
  )))
  editingAiModelId.value = nextModels.some(model => model.id === editingAiModelId.value) ? editingAiModelId.value : nextModels[0]?.id || ''
  await saveAiSettings()
}

function buildPlainAiKeyPayload(provider) {
  const key = provider.apiKeys?.[0] || { ...DEFAULT_AI_API_KEY, id: `${provider.id}-key` }
  const payloadKey = {
    id: key.id,
    name: key.name,
    enabled: key.enabled
  }
  if (aiApiKeyInputState.hasInput(provider.id, key.id)) {
    payloadKey.apiKey = aiApiKeyInputState.getProviderValue(provider.id, key.id)
  }
  return {
    activeApiKeyId: key.id,
    apiKeys: [payloadKey]
  }
}

function buildPlainAiSettingsPayload() {
  const settings = normalizeLocalAiSettings(localAiSettings.value)
  const manualContext = isPlainObject(settings.manualContext) ? settings.manualContext : {}
  const inlineCompletion = normalizeLocalInlineCompletion(settings.inlineCompletion)
  const payload = {
    responseLanguage: normalizeAiResponseLanguage(settings.responseLanguage),
    contextMode: settings.contextMode === 'manual' ? 'manual' : 'auto',
    manualContext: {
      selection: normalizeAiBoolean(manualContext.selection, DEFAULT_AI_MANUAL_CONTEXT.selection),
      fileInfo: normalizeAiBoolean(manualContext.fileInfo, DEFAULT_AI_MANUAL_CONTEXT.fileInfo),
      nearbyText: normalizeAiBoolean(manualContext.nearbyText, DEFAULT_AI_MANUAL_CONTEXT.nearbyText),
      fullDocument: normalizeAiBoolean(manualContext.fullDocument, DEFAULT_AI_MANUAL_CONTEXT.fullDocument)
    },
    inlineCompletion,
    providers: settings.providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        protocol: provider.protocol,
        baseURL: provider.baseURL,
        inlineCompletionURL: provider.inlineCompletionURL,
        chatEndpointPath: provider.chatEndpointPath || DEFAULT_AI_CHAT_ENDPOINT_PATH,
        chatEndpointURL: provider.chatEndpointURL,
        keyStrategy: 'fixed',
        temperature: provider.temperature,
        maxTokens: provider.maxTokens,
        timeoutMs: provider.timeoutMs,
        ...buildPlainAiKeyPayload(provider),
        models: provider.models.map(model => ({
          id: model.id,
          name: model.name,
          model: model.model,
          temperature: provider.temperature,
          maxTokens: provider.maxTokens,
          timeoutMs: provider.timeoutMs,
          enabled: model.enabled
        }))
      }))
  }
  return payload
}

function setAiTestStatus(message, isError, requestId = 0) {
  if (!requestId && aiTesting.value) return
  if (requestId && requestId !== aiTestRequestId) return
  aiTestMessage.value = message
  aiTestError.value = isError
}

async function handleOpenFileAssociations() {
  const result = await window.electronAPI.openFileAssociationSettings()
  associationStatus.value = result?.ok
    ? t('settings.systemAssociationOpened')
    : (result?.message || t('settings.systemAssociationFailed'))
}

async function saveAiSettings(options = {}) {
  const requestId = isPlainObject(options) ? options.requestId || 0 : 0
  const clearApiKeyInputs = isPlainObject(options) ? options.clearApiKeyInputs !== false : true
  const apiKeyInputKeysToClear = Object.keys(aiApiKeyInputs.value)
  const selectedProviderId = editingAiProvider.value?.id || editingAiProviderId.value
  const selectedModelId = editingAiModel.value?.id || editingAiModelId.value
  const payload = buildPlainAiSettingsPayload()

  return aiSettingsSaveRunner.runLatest(async ({ isLatest }) => {
    const result = await aiStore.saveSettings(payload)
    if (!isLatest()) {
      return localAiSettings.value
    }
    if (!result?.ok) {
      setAiTestStatus(result?.message || t('settings.aiTestFailed'), true, requestId)
      return null
    }
    if (!isPlainObject(result.settings)) {
      setAiTestStatus(result?.message || t('settings.aiTestFailed'), true, requestId)
      return null
    }

    localAiSettings.value = normalizeLocalAiSettings({
      ...result.settings,
      inlineCompletion: normalizeLocalInlineCompletion({
        ...result.settings.inlineCompletion,
        ...payload.inlineCompletion
      })
    }, { responseLanguage: payload.responseLanguage })
    aiStore.settings = localAiSettings.value
    editingAiProviderId.value = localAiSettings.value.providers.some(provider => provider.id === selectedProviderId)
      ? selectedProviderId
      : (localAiSettings.value.providers[0]?.id || '')
    const selectedProvider = localAiSettings.value.providers.find(provider => provider.id === editingAiProviderId.value)
    editingAiModelId.value = selectedProvider?.models?.some(model => model.id === selectedModelId)
      ? selectedModelId
      : (selectedProvider?.models?.[0]?.id || '')
    if (clearApiKeyInputs) aiApiKeyInputState.clear(apiKeyInputKeysToClear, { keepFocused: true })
    return localAiSettings.value
  }, () => localAiSettings.value)
}

async function testAiConnection(providerId = '', modelId = '') {
  if (aiTesting.value) return
  const targetProviderId = providerId || editingAiProvider.value?.id || editingAiProviderId.value
  const targetModelId = modelId || editingAiModel.value?.id || editingAiModelId.value
  if (targetProviderId && targetProviderId !== editingAiProvider.value?.id) selectAiProvider(targetProviderId)
  if (targetModelId && targetModelId !== editingAiModel.value?.id) selectAiModel(targetModelId)
  const requestId = ++aiTestRequestId
  aiTesting.value = true
  aiTestingModelId.value = targetModelId
  setAiTestStatus('', false, requestId)
  try {
    const saved = await saveAiSettings({ requestId })
    if (!saved) return
    const result = await window.electronAPI.testAIConnection({ providerId: editingAiProvider.value?.id || '', modelId: editingAiModel.value?.id || '' })
    aiModelTestResults.value = {
      ...aiModelTestResults.value,
      [targetModelId]: result?.ok ? 'success' : 'error'
    }
    setAiTestStatus(result?.ok ? t('settings.aiTestSuccess') : (result?.message || t('settings.aiTestFailed')), !result?.ok, requestId)
  } catch (error) {
    aiModelTestResults.value = {
      ...aiModelTestResults.value,
      [targetModelId]: 'error'
    }
    setAiTestStatus(error?.message || t('settings.aiTestFailed'), true, requestId)
  } finally {
    if (requestId === aiTestRequestId) aiTesting.value = false
    if (requestId === aiTestRequestId) aiTestingModelId.value = ''
  }
}
</script>

<style scoped>
.settings-page-shell {
  position: fixed;
  z-index: 9997;
  inset: 0;
  display: grid;
  grid-template-columns: 324px minmax(0, 1fr);
  grid-template-rows: var(--titlebar-height) minmax(0, 1fr);
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(232, 248, 255, 0.92), rgba(251, 240, 224, 0.92)),
    var(--bg-gradient, var(--bg-primary));
  color: var(--text-main);
}

.settings-window-titlebar {
  grid-column: 1 / -1;
  grid-row: 1;
}

.settings-page-enter-from,
.settings-page-leave-to {
  opacity: 0;
}

.settings-page-enter-active,
.settings-page-leave-active {
  transition: opacity var(--transition-popover);
}

.settings-page-enter-from .settings-content-panel,
.settings-page-leave-to .settings-content-panel {
  transform: translateX(10px);
}

.settings-page-enter-active .settings-content-panel,
.settings-page-leave-active .settings-content-panel {
  transition: transform var(--transition-popover);
}

.settings-nav {
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-right: none;
  background:
    linear-gradient(180deg, rgba(235, 249, 255, 0.45), rgba(250, 238, 220, 0.42)),
    transparent;
}

.settings-page-sidebar {
  grid-column: 1;
  grid-row: 2;
  padding: 14px 16px 18px 18px;
}

.settings-return-button {
  width: 100%;
  height: 34px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 9px;
  text-align: left;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.35;
  transition: var(--transition-interactive);
}

.settings-return-button:hover,
.settings-return-button:focus-visible {
  background: rgba(255, 255, 255, 0.62);
  border-color: transparent;
  color: var(--text-main);
  box-shadow: none;
}

.settings-return-button:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent-primary) 50%, transparent);
  box-shadow: var(--field-focus-ring);
}

.settings-return-icon {
  width: 16px;
  height: 16px;
  position: relative;
  flex: 0 0 auto;
}

.settings-return-icon::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 7px;
  width: 10px;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.settings-return-icon::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 4px;
  width: 7px;
  height: 7px;
  border-left: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  border-radius: 1px;
  transform: rotate(45deg);
}

.settings-nav-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.settings-nav-item {
  width: 100%;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  text-align: left;
  transition: var(--transition-interactive);
}

.settings-nav-item:hover {
  background: rgba(255, 255, 255, 0.62);
  border-color: transparent;
  box-shadow: none;
}

.settings-nav-item.active {
  background: rgba(255, 255, 255, 0.86);
  border-color: rgba(170, 186, 194, 0.28);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.52),
    0 1px 2px rgba(39, 59, 66, 0.04);
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
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-nav-item.active .settings-nav-item-title {
  color: var(--text-main);
}

.settings-nav-footer {
  padding: 16px 0 0;
  border-top: none;
}

.settings-reset-btn {
  width: 100%;
  height: 34px;
  border-radius: 8px;
}

.settings-content-panel {
  grid-column: 2;
  grid-row: 2;
  min-width: 0;
  min-height: 0;
  margin-top: 0;
  border-top-left-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface-panel-strong);
  box-shadow:
    -1px 0 0 color-mix(in srgb, var(--glass-border) 70%, transparent),
    0 -1px 0 color-mix(in srgb, var(--glass-border) 58%, transparent),
    0 20px 70px color-mix(in srgb, var(--shadow-color, #000) 9%, transparent);
}

.settings-content-topbar {
  flex: 0 0 38px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 72%, transparent);
  background: color-mix(in srgb, var(--surface-panel-strong) 92%, transparent);
}

.settings-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
}

.settings-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  width: min(760px, calc(100% - 96px));
  margin: 0 auto;
  padding: 48px 0 30px;
  border-bottom: none;
  background: var(--surface-panel-strong);
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  gap: 0;
}

.settings-toolbar--ai {
  width: min(1040px, calc(100% - 48px));
}

.settings-search-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  margin: 14px 0 16px;
}

.settings-search-wrap::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 50%;
  width: 12px;
  height: 12px;
  border: 1.7px solid color-mix(in srgb, var(--text-muted) 72%, #72848b);
  border-radius: 50%;
  transform: translateY(-56%);
  pointer-events: none;
  z-index: 1;
}

.settings-search-wrap::after {
  content: '';
  position: absolute;
  left: 23px;
  top: 22px;
  width: 6px;
  height: 1.7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 72%, #72848b);
  transform: rotate(45deg);
  pointer-events: none;
  z-index: 1;
}

.settings-search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px 0 34px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--bg-primary) 72%, var(--surface-panel));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.settings-search-input:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.settings-nav-label {
  margin: 0 0 6px;
  padding: 0 12px;
  color: var(--text-muted);
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.3;
}

.settings-toolbar-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
  font-size: var(--ui-font-size-xl);
  font-weight: var(--ui-font-weight-bold);
  color: var(--text-main);
}

.settings-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 72px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--text-muted) 34%, transparent) transparent;
}

.settings-groups {
  width: min(760px, calc(100% - 96px));
  margin: 0 auto;
  display: grid;
  gap: 30px;
}

.settings-groups--ai {
  width: min(1040px, calc(100% - 48px));
}

.settings-group {
  scroll-margin-top: 12px;
  display: grid;
  gap: 14px;
}

.settings-group-head {
  padding: 0;
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
  gap: 0;
  font-size: var(--ui-font-size-md);
  font-weight: var(--ui-font-weight-bold);
  color: var(--text-main);
  line-height: 1.35;
}

.settings-group-head h5::before {
  content: none;
}

.settings-group--active .settings-group-head h5 {
  color: var(--text-main);
}

.settings-about-panel {
  padding: 0;
}

.settings-content > .settings-group--about {
  width: min(760px, calc(100% - 96px));
  margin: 0 auto;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--glass-border) 82%, rgba(255, 255, 255, 0.08));
  border-radius: 8px;
  background: var(--surface-panel);
}

.settings-section-stack {
  min-width: 0;
  display: grid;
  gap: 22px;
}

.settings-subsection {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.settings-subsection-title {
  margin: 0;
  color: var(--text-main);
  font-size: var(--ui-font-size-md);
  font-weight: var(--ui-font-weight-bold);
  line-height: 1.35;
  letter-spacing: 0;
}

.settings-group > .settings-list,
.settings-group > .settings-section-stack,
.settings-group > .shortcut-tab-bar,
.settings-group > .shortcut-simple-list,
.settings-group > .ai-settings-panel {
  margin-left: 0;
}

.settings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, auto);
  justify-content: stretch;
  gap: 18px;
  align-items: center;
  min-height: 56px;
  padding: 10px 12px;
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 72%, rgba(255, 255, 255, 0.08));
  border-radius: 0;
  background: var(--surface-panel);
}

.settings-row:first-child {
  border-top: none;
}

.settings-row:hover {
  background: color-mix(in srgb, var(--surface-hover) 38%, var(--surface-panel));
}

.settings-row--checkbox {
  min-height: 48px;
}

.settings-row--preview {
  grid-template-columns: minmax(128px, 1fr) minmax(420px, 520px);
  align-items: flex-start;
  gap: 18px;
  min-height: 190px;
  padding: 12px;
}

.settings-row--associations {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
}

.settings-row--action {
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
}

.settings-row-copy {
  min-width: 0;
  display: grid;
  gap: 0;
}

.settings-row-title {
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-bold);
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
  font-size: var(--field-font-size);
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

.settings-toggle {
  --settings-toggle-width: 44px;
  --settings-toggle-height: 26px;
  width: var(--settings-toggle-width);
  height: var(--settings-toggle-height);
  position: relative;
  justify-self: end;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  cursor: pointer;
}

.settings-toggle input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.settings-toggle-track {
  width: var(--settings-toggle-width);
  height: var(--settings-toggle-height);
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 18%, transparent);
  transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.settings-toggle-track::after {
  content: "";
  width: 20px;
  height: 20px;
  position: absolute;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: var(--surface-panel);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
  transition: transform var(--transition-fast);
}

.settings-toggle input:checked + .settings-toggle-track {
  background: var(--accent-primary);
}

.settings-toggle input:checked + .settings-toggle-track::after {
  transform: translateX(18px);
}

.settings-toggle input:focus-visible + .settings-toggle-track {
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.18);
}

.settings-row-control {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.settings-row--preview .settings-row-control {
  align-items: flex-start;
}

.settings-row-control > .ui-field {
  width: 100%;
  max-width: 300px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-primary) 82%, var(--surface-panel));
}

.settings-row-control > .settings-select {
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
  justify-items: flex-end;
  gap: 6px;
}

.settings-status {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
  font-size: var(--ui-font-size-sm);
  text-align: left;
}

.settings-status--error {
  color: var(--danger, #d73a49);
}

.settings-confirm-message {
  line-height: 1.6;
  color: var(--text-main);
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
  font-size: var(--ui-font-size-sm);
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
  font-size: var(--ui-font-size-sm);
  transition: var(--transition-interactive);
}

.shortcut-reset-all-button:hover {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.shortcut-reset-all-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.shortcut-panel-message {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.45;
  font-size: var(--ui-font-size-sm);
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
  font-size: var(--ui-font-size-xs);
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
  font-size: var(--field-font-size);
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
  font-size: var(--ui-font-size-xs);
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
  font-size: var(--ui-font-size-sm);
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
  font-size: var(--ui-font-size-lg);
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
  font-size: var(--ui-font-size-sm);
}

.live-preview {
  width: 100%;
  min-height: 170px;
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
  height: 30px;
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
  padding: 16px 18px;
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

.ai-settings-panel {
  display: grid;
  gap: 24px;
}

.ai-api-list-panel {
  min-width: 0;
  position: relative;
  border: none;
  border-radius: 0;
  background: transparent;
  overflow: visible;
}

.ai-settings-section {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.ai-settings-section-title {
  margin: 0;
  color: var(--text-main);
  font-size: var(--ui-font-size-md);
  font-weight: var(--ui-font-weight-bold);
  line-height: 1.35;
  letter-spacing: 0;
}

.ai-settings-card {
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-panel);
}

.ai-settings-row {
  min-height: 64px;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 420px);
  align-items: center;
  gap: 24px;
  background: var(--surface-panel);
  transition: background-color var(--transition-fast);
}

.ai-settings-row + .ai-settings-row {
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 72%, rgba(255, 255, 255, 0.08));
}

.ai-settings-row:hover {
  background: color-mix(in srgb, var(--surface-hover) 32%, var(--surface-panel));
}

.ai-settings-row-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.ai-settings-row-copy strong {
  color: var(--text-main);
  font-size: var(--ui-font-size-md);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.35;
}

.ai-settings-row-copy span {
  color: var(--text-muted);
  font-size: var(--field-font-size);
  line-height: 1.45;
}

.ai-settings-row-control {
  width: 100%;
  max-width: 360px;
  justify-self: end;
}

.ai-settings-row-control--wide {
  max-width: 420px;
}

.ai-switch {
  width: 44px;
  height: 26px;
  position: relative;
  justify-self: end;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.ai-switch input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.ai-switch span {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-muted) 18%, transparent);
  transition: background-color var(--transition-fast), box-shadow var(--transition-fast);
}

.ai-switch span::after {
  content: "";
  width: 20px;
  height: 20px;
  position: absolute;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: var(--surface-panel);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
  transition: transform var(--transition-fast);
}

.ai-switch input:checked + span {
  background: var(--accent-primary);
}

.ai-switch input:checked + span::after {
  transform: translateX(18px);
}

.ai-switch input:focus-visible + span {
  box-shadow: 0 0 0 3px rgba(var(--accent-primary-rgb), 0.18);
}

.ai-inline-completion-model-control {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.ai-inline-model-selects {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.ai-inline-mode-segmented {
  min-width: 0;
  padding: 2px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  border-radius: 8px;
  display: inline-flex;
  justify-self: end;
  background: color-mix(in srgb, var(--surface-panel) 86%, transparent);
}

.ai-inline-mode-segmented.ai-settings-row-control {
  width: auto;
  max-width: none;
}

.ai-inline-mode-segmented button {
  min-width: 74px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  font-size: var(--ui-font-size-sm);
  font-weight: var(--ui-font-weight-medium);
  white-space: nowrap;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-inline-mode-segmented button.active {
  color: #fff;
  background: var(--accent-primary);
}

.ai-inline-mode-segmented button:hover,
.ai-inline-mode-segmented button:focus-visible {
  color: var(--text-main);
  background: var(--surface-hover);
}

.ai-inline-mode-segmented button.active:hover,
.ai-inline-mode-segmented button.active:focus-visible {
  color: #fff;
  background: var(--accent-primary);
}

.ai-inline-mode-segmented button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.16);
}

.ai-panel-head {
  min-height: 50px;
  padding: 11px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: transparent;
}

.ai-panel-head strong {
  color: var(--text-main);
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.35;
}

.ai-panel-head > span {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  white-space: nowrap;
}

.ai-provider-create-menu {
  position: relative;
  z-index: 20;
}

.ai-provider-icon-actions {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.ai-provider-icon-button {
  width: 32px;
  height: 32px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  border-radius: var(--icon-button-radius, 6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-provider-icon-button:hover,
.ai-provider-icon-button:focus-visible,
.ai-provider-icon-button.active {
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  background: var(--surface-hover);
}

.ai-provider-icon-button--primary {
  border-color: color-mix(in srgb, var(--accent-primary) 70%, var(--glass-border));
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.1);
}

.ai-provider-preset-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 8px);
  left: 0;
  width: min(236px, calc(100vw - 40px));
  max-height: min(520px, calc(100vh - 160px));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  padding: 6px;
  display: grid;
  gap: 4px;
  background: var(--surface-panel);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.16);
  overflow-y: auto;
}

.ai-provider-preset-item {
  width: 100%;
  min-width: 0;
  min-height: 42px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: var(--text-main);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.ai-provider-preset-item:hover,
.ai-provider-preset-item:focus-visible {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.ai-provider-brand-mark {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--provider-accent, var(--accent-primary));
  background: color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 11%, var(--surface-panel));
  border: 1px solid color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 18%, var(--glass-border));
  box-shadow: 0 8px 18px color-mix(in srgb, var(--provider-accent, var(--accent-primary)) 14%, transparent);
  font-size: var(--ui-font-size-2xs);
  font-weight: var(--ui-font-weight-bold);
  letter-spacing: 0;
}

.ai-provider-brand-mark--card {
  width: 30px;
  height: 30px;
}

.ai-provider-brand-svg {
  width: 17px;
  height: 17px;
  display: block;
  fill: currentColor;
}

.ai-provider-brand-mark--card .ai-provider-brand-svg {
  width: 18px;
  height: 18px;
}

.ai-provider-preset-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.ai-provider-preset-copy strong,
.ai-provider-preset-copy span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-provider-preset-copy strong {
  font-size: var(--field-font-size);
}

.ai-provider-preset-copy span {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
}

.ai-config-layout {
  display: grid;
  grid-template-columns: minmax(240px, 260px) minmax(0, 1fr);
  align-items: stretch;
  gap: 0;
  border: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
  border-radius: 8px;
  background: var(--surface-panel);
  overflow: visible;
}

.ai-config-layout > .ai-api-list-panel {
  border-right: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
}

.ai-provider-detail-shell {
  display: grid;
  grid-template-columns: minmax(300px, 0.95fr) minmax(320px, 1.05fr);
  align-items: stretch;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.ai-provider-detail-section {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-content: stretch;
}

.ai-provider-detail-section + .ai-provider-detail-section {
  border-left: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
}

.ai-provider-detail-section-head {
  min-height: 50px;
  padding: 11px 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: transparent;
}

.ai-provider-detail-section-head strong {
  color: var(--text-main);
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1.35;
}

.ai-provider-detail-body {
  min-width: 0;
  flex: 1;
}

.ai-api-list {
  padding: 8px;
  display: grid;
  gap: 6px;
}

.ai-api-card {
  width: 100%;
  min-height: 48px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-interactive);
}

.ai-api-card:hover,
.ai-api-card.active,
.ai-api-card:focus-visible {
  border-color: var(--interactive-hover-border);
  background: var(--surface-hover);
}

.ai-api-card.active {
  box-shadow: inset 2px 0 0 var(--accent-primary);
}

.ai-api-copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.ai-api-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-bold);
}

.ai-api-title > span:first-child {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-api-card-actions {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex: 0 0 auto;
  gap: 4px;
}

.ai-api-card-action {
  width: 24px;
  height: 24px;
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius, 6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-api-card-action:hover:not(:disabled),
.ai-api-card-action:focus-visible {
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  background: var(--icon-button-hover-bg, var(--surface-hover));
}

.ai-api-card-action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-api-card-action--danger:hover:not(:disabled),
.ai-api-card-action--danger:focus-visible {
  color: var(--danger, #d73a49);
  background: color-mix(in srgb, var(--danger, #d73a49) 10%, transparent);
}

.ai-api-badge {
  min-height: 19px;
  padding: 0 7px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  color: var(--accent-primary);
  background: rgba(var(--accent-primary-rgb), 0.12);
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-bold);
  white-space: nowrap;
}

.ai-api-badge--warn {
  color: var(--warning, #a26208);
  background: color-mix(in srgb, var(--warning, #a26208) 12%, transparent);
}

.ai-danger-button {
  color: var(--danger, #d73a49);
}

.ai-detail-form {
  padding: 0;
  display: grid;
  gap: 0;
}

.ai-detail-form .ai-form-row {
  min-height: 48px;
  padding: 10px 14px;
  grid-template-columns: minmax(82px, 94px) minmax(0, 1fr);
  gap: 10px;
}

.ai-detail-form .ai-form-row + .ai-form-row {
  border-top: 1px solid color-mix(in srgb, var(--glass-border) 72%, rgba(255, 255, 255, 0.08));
}

.ai-form-row {
  display: grid;
  grid-template-columns: minmax(110px, 130px) minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.ai-form-row label {
  color: var(--text-main);
  font-size: var(--field-font-size);
  font-weight: var(--ui-font-weight-semibold);
}

.ai-form-row--with-hint {
  align-items: start;
}

.ai-form-field-stack {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.ai-form-field-stack > span {
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
  line-height: 1.35;
}

.ai-inline-color-control {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.ai-inline-color-swatches {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ai-inline-color-swatch {
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  font: inherit;
  font-size: var(--ui-font-size-sm);
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-inline-color-swatch:hover,
.ai-inline-color-swatch:focus-visible {
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  outline: none;
}

.ai-inline-color-swatch.active {
  border-color: color-mix(in srgb, var(--inline-completion-swatch-color) 72%, var(--glass-border));
  color: var(--text-main);
  background: color-mix(in srgb, var(--inline-completion-swatch-color) 12%, var(--surface-panel));
  box-shadow:
    inset 0 0 0 2px var(--surface-panel),
    0 0 0 2px color-mix(in srgb, var(--inline-completion-swatch-color) 28%, transparent);
}

.ai-inline-color-swatch-dot {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--inline-completion-swatch-color);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.ai-inline-opacity-control {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(220px, 1fr);
  align-items: start;
  justify-self: end;
  gap: 12px;
  width: 100%;
}

.ai-inline-opacity-control.ai-settings-row-control {
  max-width: 360px;
}

.ai-inline-opacity-slider {
  min-width: 0;
  position: relative;
  padding-top: 26px;
  display: grid;
  gap: 6px;
}

.ai-inline-opacity-bubble {
  min-width: 38px;
  height: 22px;
  position: absolute;
  top: 0;
  left: var(--inline-opacity-label-left);
  transform: translateX(-50%);
  border: 1px solid color-mix(in srgb, var(--inline-opacity-accent) 36%, var(--glass-border));
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-main);
  background: var(--surface-panel);
  box-shadow: 0 2px 5px rgba(15, 23, 42, 0.1);
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-semibold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.ai-inline-opacity-control input[type="range"] {
  appearance: none;
  width: 100%;
  height: 18px;
  margin: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
}

.ai-inline-opacity-control input[type="range"]:focus,
.ai-inline-opacity-control input[type="range"]:focus-visible {
  outline: none;
  box-shadow: none;
}

.ai-inline-opacity-control input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 74%, transparent);
  background:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--inline-opacity-accent) 86%, var(--accent-primary)) 0 var(--inline-opacity-progress),
      color-mix(in srgb, var(--text-muted) 20%, transparent) var(--inline-opacity-progress) 100%
    );
}

.ai-inline-opacity-control input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 3px solid var(--surface-panel);
  border-radius: 999px;
  background: color-mix(in srgb, var(--inline-opacity-accent) 86%, var(--accent-primary));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--inline-opacity-accent) 46%, var(--glass-border)),
    0 2px 5px rgba(15, 23, 42, 0.14);
}

.ai-inline-opacity-control input[type="range"]::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 74%, transparent);
  background: color-mix(in srgb, var(--text-muted) 20%, transparent);
}

.ai-inline-opacity-control input[type="range"]::-moz-range-progress {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--inline-opacity-accent) 86%, var(--accent-primary));
}

.ai-inline-opacity-control input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 3px solid var(--surface-panel);
  border-radius: 999px;
  background: color-mix(in srgb, var(--inline-opacity-accent) 86%, var(--accent-primary));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--inline-opacity-accent) 46%, var(--glass-border)),
    0 2px 5px rgba(15, 23, 42, 0.14);
}

.ai-inline-opacity-control input[type="range"]::-moz-focus-outer {
  border: 0;
}

.ai-inline-opacity-scale {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: var(--ui-font-size-2xs);
  line-height: 1;
  opacity: 0.76;
  font-variant-numeric: tabular-nums;
}

.ai-form-row > .ui-field,
.ai-form-row > .settings-select {
  width: 100%;
  max-width: none;
}

.ai-form-divider {
  height: 1px;
  margin: 0;
  background: color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
}

.ai-key-input {
  user-select: none;
  caret-color: currentColor;
}

.ai-model-list {
  padding: 8px;
  display: grid;
  align-content: start;
  gap: 7px;
}

.ai-model-list-head,
.ai-model-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(78px, 0.9fr) minmax(96px, 1fr) 88px;
  gap: 8px;
}

.ai-model-list-head {
  padding: 0 8px;
  color: var(--text-muted);
  font-size: var(--ui-font-size-sm);
}

.ai-model-list-head span:nth-child(4) {
  justify-self: end;
  width: 88px;
  text-align: center;
}

.ai-model-row {
  min-height: 42px;
  padding: 7px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  border-radius: var(--radius-sm);
  align-items: center;
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
}

.ai-model-row.active {
  border-color: color-mix(in srgb, var(--accent-primary) 56%, var(--glass-border));
  background: color-mix(in srgb, rgba(var(--accent-primary-rgb), 0.1) 72%, var(--surface-panel));
}

.ai-model-row.is-dragging {
  opacity: 0.58;
}

.ai-model-row.is-drop-target {
  border-color: color-mix(in srgb, var(--accent-primary) 66%, var(--glass-border));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 30%, transparent);
}

.ai-model-drag-handle {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius, 6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: transparent;
  cursor: grab;
  transition: var(--transition-interactive);
}

.ai-model-drag-handle:hover:not(:disabled),
.ai-model-drag-handle:focus-visible {
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  background: var(--surface-hover);
}

.ai-model-drag-handle:active:not(:disabled) {
  cursor: grabbing;
}

.ai-model-drag-handle:disabled {
  cursor: default;
  opacity: 0.42;
}

.ai-model-inline-actions {
  width: 88px;
  min-width: 88px;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  justify-self: end;
  gap: 1px;
}

.ai-model-status-icon {
  width: 24px;
  height: 24px;
  border: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
}

.ai-model-status-icon.is-success {
  border-color: color-mix(in srgb, #16a34a 32%, var(--glass-border));
  color: #16a34a;
  background: color-mix(in srgb, #16a34a 10%, transparent);
}

.ai-model-status-icon.is-error {
  border-color: color-mix(in srgb, var(--danger, #d73a49) 32%, var(--glass-border));
  color: var(--danger, #d73a49);
  background: color-mix(in srgb, var(--danger, #d73a49) 10%, transparent);
}

.ai-model-status-icon.is-testing svg {
  animation: ai-spin 1s linear infinite;
}

.ai-model-test-button,
.ai-model-delete-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--icon-button-radius, 6px);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
  transition: var(--transition-interactive);
}

.ai-model-test-button:hover:not(:disabled),
.ai-model-test-button:focus-visible {
  border-color: var(--interactive-hover-border);
  color: var(--text-main);
  background: var(--icon-button-hover-bg, var(--surface-hover));
}

.ai-model-test-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(var(--accent-primary-rgb), 0.16);
}

.ai-model-test-button:disabled,
.ai-model-delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.34;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}

.ai-model-delete-button:hover:not(:disabled),
.ai-model-delete-button:focus-visible {
  border-color: color-mix(in srgb, var(--danger, #d73a49) 34%, var(--glass-border));
  color: var(--danger, #d73a49);
  background: color-mix(in srgb, var(--danger, #d73a49) 10%, transparent);
}

.ai-model-delete-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger, #d73a49) 18%, transparent);
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
  font-size: var(--ui-font-size-lg);
  font-weight: var(--ui-font-weight-semibold);
}

.settings-empty-desc {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.6;
}

@media (max-width: 960px) {
  .settings-page-shell {
    grid-template-columns: 286px minmax(0, 1fr);
  }

  .settings-nav {
    width: 100%;
    min-width: 0;
    border-right: none;
    border-bottom: none;
  }

  .settings-page-sidebar {
    padding: 14px 14px 18px;
  }

  .settings-nav-list {
    display: flex;
    flex-direction: column;
    grid-template-columns: none;
  }
}

@media (max-width: 1180px) {
  .ai-config-layout {
    grid-template-columns: 1fr;
    align-items: start;
    gap: 12px;
  }

  .ai-config-layout > .ai-api-list-panel {
    width: min(100%, 320px);
    border-right: 1px solid color-mix(in srgb, var(--glass-border) 90%, rgba(255, 255, 255, 0.04));
    border-radius: var(--radius-sm);
  }

  .ai-provider-detail-shell {
    border-radius: var(--radius-sm);
  }
}

@media (max-width: 980px) {
  .ai-provider-detail-shell {
    grid-template-columns: 1fr;
  }

  .ai-provider-detail-section + .ai-provider-detail-section {
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  }
}

@media (max-width: 720px) {
  .settings-page-shell {
    grid-template-columns: 1fr;
    grid-template-rows: var(--titlebar-height) auto minmax(0, 1fr);
  }

  .settings-page-sidebar {
    grid-column: 1;
    grid-row: 2;
    max-height: 270px;
    border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 70%, transparent);
    overflow-y: auto;
  }

  .settings-content-panel {
    grid-column: 1;
    grid-row: 3;
    border-top-left-radius: 0;
  }

  .settings-content-topbar {
    display: none;
  }

  .settings-content,
  .settings-about-panel {
    padding-left: 16px;
    padding-right: 16px;
  }

  .settings-toolbar,
  .settings-toolbar--ai,
  .settings-groups,
  .settings-groups--ai {
    width: 100%;
  }

  .settings-toolbar {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 24px 0 18px;
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

  .settings-row--checkbox {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .settings-row--checkbox .settings-row-control {
    justify-content: flex-end;
  }

  .settings-row-control,
  .settings-action-stack {
    justify-content: flex-start;
    justify-items: flex-start;
  }

  .settings-group > .settings-list,
  .settings-group > .settings-section-stack,
  .settings-group > .shortcut-tab-bar,
  .settings-group > .shortcut-simple-list,
  .settings-group > .ai-settings-panel {
    margin-left: 0;
  }

  .ai-settings-row,
  .ai-config-layout,
  .ai-provider-detail-shell,
  .ai-key-field,
  .ai-model-list-head,
  .ai-model-row,
  .ai-form-row {
    grid-template-columns: 1fr;
  }

  .ai-config-layout > .ai-api-list-panel {
    border-right: none;
    border-bottom: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  }

  .ai-provider-detail-section + .ai-provider-detail-section {
    border-left: none;
    border-top: 1px solid color-mix(in srgb, var(--glass-border) 88%, rgba(255, 255, 255, 0.04));
  }

  .ai-settings-row-control,
  .ai-settings-row-control--wide,
  .ai-switch {
    justify-self: flex-start;
  }

  .ai-provider-create-menu {
    justify-self: flex-start;
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

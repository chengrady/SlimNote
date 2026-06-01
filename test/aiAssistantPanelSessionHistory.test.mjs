import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const panelSource = readFileSync(new URL('../src/renderer/components/AiAssistantPanel.vue', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../src/renderer/stores/ai.js', import.meta.url), 'utf8')
const openSessionHistoryPopoverBody = panelSource.match(/function openSessionHistoryPopover\(\) \{([\s\S]*?)\n\}/)?.[1] || ''
const startNewConversationBody = panelSource.match(/async function startNewConversation\(\) \{([\s\S]*?)\n\}/)?.[1] || ''
const switchConversationSessionBody = panelSource.match(/async function switchConversationSession\(session = \{\}\) \{([\s\S]*?)\n\}/)?.[1] || ''

describe('AI assistant conversation sessions', () => {
  it('exposes header actions for new conversations and conversation history', () => {
    assert.match(panelSource, /ai-panel-new-session-button/)
    assert.match(panelSource, /ai-panel-history-button/)
    assert.match(panelSource, /ai-session-history-popover/)
    assert.match(panelSource, /filteredSessionHistoryItems/)
  })

  it('keeps history controls compact with always-visible search and an overflow action menu', () => {
    assert.match(panelSource, /class="ai-session-history-search-wrap"/)
    assert.doesNotMatch(panelSource, /sessionHistorySearchOpen/)
    assert.doesNotMatch(panelSource, /toggleSessionHistorySearch/)
    assert.match(panelSource, /ai-session-history-icon-button is-primary/)
    assert.match(panelSource, /deleteAllConversationSessions/)
    assert.match(panelSource, /deleteAllConversations/)
    assert.match(panelSource, /ai-session-history-more/)
    assert.match(panelSource, /ai-session-history-action-menu/)
    assert.doesNotMatch(panelSource, /class="ai-session-history-delete"/)
  })

  it('focuses the history search when showing conversation history', () => {
    assert.match(openSessionHistoryPopoverBody, /clearSessionHistorySearch\(\)/)
    assert.match(openSessionHistoryPopoverBody, /sessionHistorySearchRef\.value\?\.focus\?\.\(\)/)
  })

  it('saves the current conversation before starting or switching sessions', () => {
    assert.match(startNewConversationBody, /saveSessionBeforeConversationChange\(\)/)
    assert.match(startNewConversationBody, /aiStore\.resetSessionState\(\)/)
    assert.match(switchConversationSessionBody, /saveSessionBeforeConversationChange\(\)/)
    assert.match(switchConversationSessionBody, /aiStore\.activateSession\(latestSession\)/)
  })

  it('keeps session switching in the AI store instead of mixing histories in prompt assembly', () => {
    assert.match(storeSource, /function activateSession\(session = \{\}\)/)
    assert.match(storeSource, /messages\.value = session\.messages\.map\(normalizeMessage\)/)
    assert.match(storeSource, /function deleteSession\(id\)/)
    assert.match(storeSource, /electronAPI\.deleteAISession\(sessionId\)/)
    assert.match(storeSource, /function clearSessions\(\)/)
    assert.match(storeSource, /electronAPI\.clearAISessions\(\)/)
  })
})

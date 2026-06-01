import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../src/renderer/components/AiAssistantPanel.vue', import.meta.url), 'utf8')
const clearCurrentConversationBody = source.match(/function clearCurrentConversation\(\) \{([\s\S]*?)\n\}/)?.[1] || ''

describe('AI assistant clear conversation action', () => {
  it('exposes a header action that clears only the current conversation messages', () => {
    assert.match(source, /clearCurrentConversation/)
    assert.match(source, /aiStore\.resetSessionState\(\)/)
    assert.match(source, /:disabled="!hasConversationMessages \|\| isBusy"/)
    assert.doesNotMatch(clearCurrentConversationBody, /userInput\.value\s*=/)
    assert.doesNotMatch(clearCurrentConversationBody, /contextAttachments\.value\s*=/)
  })
})

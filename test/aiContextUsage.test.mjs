import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildContextUsageStats,
  estimateTokensFromText,
  inferContextWindowTokens
} from '../src/renderer/utils/aiContextUsage.js'

describe('ai context usage estimates', () => {
  it('estimates text tokens using a stable character ratio', () => {
    assert.equal(estimateTokensFromText(''), 0)
    assert.equal(estimateTokensFromText('abcd'), 1)
    assert.equal(estimateTokensFromText('abcde'), 2)
  })

  it('uses explicit model context window before falling back to model name heuristics', () => {
    assert.equal(inferContextWindowTokens({ contextWindowTokens: 32768, model: 'custom' }), 32768)
    assert.equal(inferContextWindowTokens({ model: 'claude-sonnet-4-6' }), 200000)
    assert.equal(inferContextWindowTokens({ model: 'unknown-model' }), 128000)
  })

  it('breaks usage into summary, history, document and attachment parts', () => {
    const stats = buildContextUsageStats({
      model: { model: 'custom', contextWindowTokens: 100, maxTokens: 20 },
      conversationSummary: 's'.repeat(40),
      messages: [
        { role: 'user', content: 'u'.repeat(20) },
        { role: 'assistant', content: 'a'.repeat(20) },
        { role: 'system', content: 'ignored' }
      ],
      activeTab: { content: 'd'.repeat(80) },
      currentDocumentSelected: true,
      contextAttachments: [
        { type: 'file', selected: true, content: 'f'.repeat(20) },
        { type: 'folder', selected: false, content: 'ignored' }
      ],
      userInput: 'question'
    })

    assert.equal(stats.contextWindowTokens, 100)
    assert.equal(stats.inputBudgetTokens, 80)
    assert.equal(stats.parts.summary.tokens, 10)
    assert.equal(stats.parts.history.tokens, 10)
    assert.equal(stats.parts.currentDocument.tokens, 20)
    assert.equal(stats.parts.attachments.tokens, 5)
    assert.equal(stats.parts.userInput.tokens, 2)
    assert.equal(stats.percent > 0, true)
  })
})

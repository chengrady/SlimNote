import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildAiMessages } from '../src/renderer/utils/aiPrompts.js'

describe('ai prompt conversation history', () => {
  it('sends prior user and assistant messages before the current request', () => {
    const messages = buildAiMessages({
      context: {
        fileName: 'notes.md',
        language: 'markdown',
        isEditable: true,
        contentLength: 0,
        includedParts: ['fileInfo']
      },
      userInput: 'I mean the previous answer',
      conversationMessages: [
        { role: 'user', content: 'Draft a paragraph' },
        { role: 'assistant', content: 'A spring breeze moves through the willows.' },
        { role: 'system', content: 'ignored' },
        { role: 'assistant', content: '   ' }
      ],
      appLocale: 'zh-CN'
    })

    assert.deepEqual(messages.map(message => message.role), ['system', 'user', 'assistant', 'user'])
    assert.equal(messages[1].content, 'Draft a paragraph')
    assert.equal(messages[2].content, 'A spring breeze moves through the willows.')
    assert.match(messages[3].content, /I mean the previous answer/)
  })

  it('includes a conversation summary in the current request body', () => {
    const messages = buildAiMessages({
      context: {
        fileName: 'notes.md',
        language: 'markdown',
        isEditable: true,
        contentLength: 0,
        includedParts: ['fileInfo']
      },
      userInput: 'What did we decide?',
      conversationSummary: 'Earlier: Task 852 passed and Task 840 is untested.',
      appLocale: 'zh-CN'
    })

    assert.deepEqual(messages.map(message => message.role), ['system', 'user'])
    assert.match(messages[1].content, /## Conversation Summary/)
    assert.match(messages[1].content, /Task 852 passed/)
    assert.match(messages[1].content, /## Task/)
  })

  it('adds the selected provider and model to the system identity context', () => {
    const messages = buildAiMessages({
      context: {
        fileName: 'notes.md',
        language: 'markdown',
        isEditable: true,
        contentLength: 0,
        includedParts: ['fileInfo']
      },
      userInput: '你的底层大模型是什么？',
      appLocale: 'zh-CN',
      aiProviderName: '智谱 GLM',
      aiModelName: 'GLM-5.1',
      aiModelValue: 'glm-5.1'
    })

    assert.match(messages[0].content, /Current configured AI provider: 智谱 GLM/)
    assert.match(messages[0].content, /Current configured AI model: GLM-5\.1 \(glm-5\.1\)/)
    assert.match(messages[0].content, /answer from this SlimNote configuration/)
  })

  it('keeps the latest follow-up instruction after document context so conversation topic wins', () => {
    const messages = buildAiMessages({
      context: {
        fileName: 'old-note.md',
        language: 'markdown',
        isEditable: true,
        contentLength: 42,
        includedParts: ['fileInfo', 'fullDocument'],
        fullDocument: 'A cannon sleeps beside the old city wall.'
      },
      userInput: 'Write another seven-character quatrain.',
      conversationMessages: [
        { role: 'user', content: 'Write an essay about Victor Wembanyama.' },
        { role: 'assistant', content: 'Victor Wembanyama stands like a new constellation over the court.' }
      ],
      appLocale: 'en-US'
    })
    const currentRequest = messages[messages.length - 1].content

    assert.match(messages[0].content, /Latest user instruction and conversation history take precedence/)
    assert.ok(currentRequest.indexOf('## User Instruction') > currentRequest.indexOf('## Full Document'))
    assert.ok(currentRequest.indexOf('Write another seven-character quatrain.') > currentRequest.indexOf('A cannon sleeps beside the old city wall.'))
  })
})

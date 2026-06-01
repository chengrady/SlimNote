import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildConversationCompressionPlan,
  buildConversationSummaryMessages,
  CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT
} from '../src/renderer/utils/aiConversationSummary.js'

describe('ai conversation summary helpers', () => {
  it('compresses only unsummarized messages before the recent window', () => {
    const messages = Array.from({ length: CONVERSATION_SUMMARY_RECENT_MESSAGE_LIMIT + 6 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message ${index + 1}`
    }))

    const plan = buildConversationCompressionPlan({
      messages,
      summary: 'previous facts',
      summaryMessageCount: 2
    })

    assert.equal(plan.shouldCompress, true)
    assert.equal(plan.previousSummary, 'previous facts')
    assert.equal(plan.coveredMessageCount, 6)
    assert.deepEqual(plan.messagesToSummarize.map(message => message.content), ['message 3', 'message 4', 'message 5', 'message 6'])
  })

  it('builds a hidden summary request without leaking invalid roles', () => {
    const messages = buildConversationSummaryMessages({
      previousSummary: 'User prefers concise answers.',
      messagesToSummarize: [
        { role: 'user', content: 'Remember Task 852.' },
        { role: 'assistant', content: 'Task 852 passed.' },
        { role: 'system', content: 'ignored' }
      ]
    })

    assert.deepEqual(messages.map(message => message.role), ['system', 'user'])
    assert.match(messages[0].content, /summarize SlimNote AI chat history/i)
    assert.match(messages[1].content, /User prefers concise answers/)
    assert.match(messages[1].content, /User: Remember Task 852\./)
    assert.match(messages[1].content, /Assistant: Task 852 passed\./)
    assert.doesNotMatch(messages[1].content, /ignored/)
  })
})

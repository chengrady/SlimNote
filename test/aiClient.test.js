const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const {
  resolveChatEndpoint,
  buildChatHeaders,
  buildChatPayload,
  extractStreamParts,
  streamChatCompletion
} = require('../electron/aiClient')

describe('ai client protocol adapters', () => {
  it('keeps full chat completion URLs from inline completion provider presets', () => {
    assert.equal(resolveChatEndpoint({
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      chatEndpointPath: '/chat/completions'
    }), 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
  })

  it('builds Anthropic messages payload and headers', () => {
    const settings = {
      protocol: 'anthropic',
      apiKey: 'sk-ant',
      model: 'claude-sonnet-4-20250514',
      temperature: 0.3,
      maxTokens: 2048
    }
    const messages = [
      { role: 'system', content: 'Follow the app language.' },
      { role: 'user', content: 'Hello' }
    ]

    assert.deepEqual(buildChatHeaders(settings), {
      'x-api-key': 'sk-ant',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    })
    assert.deepEqual(buildChatPayload(settings, messages), {
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
      system: 'Follow the app language.'
    })
  })

  it('extracts OpenAI-compatible reasoning deltas separately from answer text', () => {
    const eventData = JSON.stringify({
      choices: [{
        delta: {
          reasoning_content: 'First inspect the request.',
          content: 'Final answer.'
        }
      }]
    })

    assert.deepEqual(extractStreamParts(eventData, { protocol: 'openai-compatible' }), {
      reasoning: 'First inspect the request.',
      text: 'Final answer.'
    })
  })

  it('passes OpenAI-compatible thinking controls when provided', () => {
    const payload = buildChatPayload({
      apiKey: 'sk-test',
      baseURL: 'https://open.bigmodel.cn/api/paas/v4',
      model: 'glm-5.1',
      temperature: 0.2,
      maxTokens: 160,
      thinking: { type: 'disabled' }
    }, [{ role: 'user', content: 'Continue this note.' }])

    assert.equal(payload.thinking.type, 'disabled')
  })

  it('extracts Anthropic thinking deltas separately from answer text', () => {
    const thinkingEvent = JSON.stringify({
      type: 'content_block_delta',
      delta: {
        type: 'thinking_delta',
        thinking: 'Check the active document first.'
      }
    })
    const textEvent = JSON.stringify({
      type: 'content_block_delta',
      delta: {
        type: 'text_delta',
        text: 'Here is the result.'
      }
    })

    assert.deepEqual(extractStreamParts(thinkingEvent, { protocol: 'anthropic' }), {
      reasoning: 'Check the active document first.',
      text: ''
    })
    assert.deepEqual(extractStreamParts(textEvent, { protocol: 'anthropic' }), {
      reasoning: '',
      text: 'Here is the result.'
    })
  })

  it('emits lifecycle status, reasoning, and answer chunks while streaming', async () => {
    const previousFetch = global.fetch
    const encoder = new TextEncoder()
    const statuses = []
    const reasoning = []
    const chunks = []
    let completed = false

    global.fetch = async () => ({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"reasoning_content":"Thinking..."}}]}\n\n'))
          controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Answer."}}]}\n\n'))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        }
      })
    })

    try {
      const request = streamChatCompletion({
        apiKey: 'sk-test',
        baseURL: 'https://example.test/v1',
        model: 'reasoning-model'
      }, [{ role: 'user', content: 'Hello' }], {
        onStatus: phase => statuses.push(phase),
        onReasoning: text => reasoning.push(text),
        onChunk: text => chunks.push(text),
        onComplete: () => {
          completed = true
        }
      })

      await request.done
    } finally {
      global.fetch = previousFetch
    }

    assert.deepEqual(statuses, ['connecting', 'waiting', 'reasoning', 'generating', 'complete'])
    assert.deepEqual(reasoning, ['Thinking...'])
    assert.deepEqual(chunks, ['Answer.'])
    assert.equal(completed, true)
  })
})

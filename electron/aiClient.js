function resolveChatEndpoint(settings) {
  const explicit = String(settings.chatEndpointURL || '').trim()
  if (explicit) return explicit

  const baseURL = String(settings.baseURL || '').trim().replace(/\/+$/, '')
  if (!baseURL) return ''

  try {
    const url = new URL(baseURL)
    if (url.pathname.replace(/\/+$/, '').endsWith('/chat/completions')) {
      return url.toString()
    }
  } catch {
    return ''
  }

  const path = String(settings.chatEndpointPath || '/chat/completions').trim()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseURL}${normalizedPath}`
}

function validateAIRequestSettings(settings) {
  if (!settings.apiKey) return 'API key is missing'
  if (!settings.model) return 'Model is missing'
  if (!hasUsableChatEndpoint(settings)) return 'Chat endpoint is missing'
  return ''
}

function hasUsableChatEndpoint(settings) {
  const endpoint = resolveChatEndpoint(settings)
  if (!endpoint) return false

  try {
    const url = new URL(endpoint)
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.host)
  } catch {
    return false
  }
}

function isAnthropicProtocol(settings = {}) {
  return settings.protocol === 'anthropic'
}

function normalizeMessageContent(message = {}) {
  return typeof message.content === 'string' ? message.content : ''
}

function buildAnthropicMessages(messages = []) {
  return messages
    .filter(message => message?.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: normalizeMessageContent(message)
    }))
    .filter(message => message.content.trim())
}

function buildAnthropicSystem(messages = []) {
  return messages
    .filter(message => message?.role === 'system')
    .map(normalizeMessageContent)
    .filter(Boolean)
    .join('\n\n')
}

function buildChatHeaders(settings) {
  if (isAnthropicProtocol(settings)) {
    return {
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    }
  }

  return {
    Authorization: `Bearer ${settings.apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'text/event-stream'
  }
}

function buildChatPayload(settings, messages) {
  if (isAnthropicProtocol(settings)) {
    const payload = {
      model: settings.model,
      messages: buildAnthropicMessages(messages),
      stream: true,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens
    }
    const system = buildAnthropicSystem(messages)
    if (system) payload.system = system
    return payload
  }

  const payload = {
    model: settings.model,
    messages,
    stream: true,
    temperature: settings.temperature,
    max_tokens: settings.maxTokens
  }
  if (settings.thinking && typeof settings.thinking === 'object' && !Array.isArray(settings.thinking)) {
    payload.thinking = settings.thinking
  }
  return payload
}

function firstStreamString(...values) {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return ''
}

function extractAnthropicStreamParts(payload = {}) {
  const delta = payload?.delta || {}
  const contentBlock = payload?.content_block || {}
  const text = firstStreamString(delta.text, contentBlock.type === 'text' ? contentBlock.text : '')
  const reasoning = firstStreamString(delta.thinking, delta.reasoning_content, delta.reasoning, contentBlock.type === 'thinking' ? contentBlock.thinking : '')
  return { reasoning, text }
}

function extractOpenAICompatibleStreamParts(payload = {}) {
  const choice = payload?.choices?.[0] || {}
  const delta = choice.delta || {}
  const message = choice.message || {}
  return {
    reasoning: firstStreamString(delta.reasoning_content, delta.reasoning, delta.reasoning_text, delta.thinking, message.reasoning_content),
    text: firstStreamString(delta.content, delta.text, choice.text)
  }
}

function extractStreamParts(eventData, settings) {
  try {
    const payload = JSON.parse(eventData)
    if (isAnthropicProtocol(settings)) return extractAnthropicStreamParts(payload)
    return extractOpenAICompatibleStreamParts(payload)
  } catch {
    return { reasoning: '', text: '' }
  }
}

function parseSseChunk(bufferText) {
  const events = []
  const parts = bufferText.split(/(?:\r?\n){2}/)
  const rest = parts.pop() || ''

  for (const part of parts) {
    const dataLines = part.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim())
    if (dataLines.length) events.push(dataLines.join('\n'))
  }

  return { events, rest }
}

async function readResponseError(response, apiKey) {
  let responseText = ''

  try {
    responseText = await response.text()
  } catch {
    responseText = ''
  }

  let message = responseText.trim()
  if (message) {
    try {
      const payload = JSON.parse(message)
      message = payload?.error?.message || payload?.message || message
    } catch {
      // Keep the raw response text when the server did not return JSON.
    }
  }

  if (!message) message = `AI request failed with status ${response.status}`
  if (apiKey) message = message.replaceAll(apiKey, '[REDACTED]')
  return message
}

function streamChatCompletion(settings, messages, handlers = {}) {
  settings = settings || {}
  const validationMessage = validateAIRequestSettings(settings)
  if (validationMessage) throw new Error(validationMessage)

  const endpoint = resolveChatEndpoint(settings)
  const controller = new AbortController()
  const decoder = new TextDecoder()
  const timeoutMs = Number(settings.timeoutMs) || 0
  let stopped = false
  let timedOut = false
  let completed = false
  let timeout = null
  let currentStatus = ''

  const emitStatus = (phase) => {
    if (!phase || currentStatus === phase) return
    currentStatus = phase
    handlers.onStatus?.(phase)
  }

  const completeStream = () => {
    completed = true
    emitStatus('complete')
    handlers.onComplete?.()
  }

  if (timeoutMs > 0) {
    timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)
    timeout.unref?.()
  }

  const done = (async () => {
    let bufferText = ''

    try {
      emitStatus('connecting')
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildChatHeaders(settings),
        body: JSON.stringify(buildChatPayload(settings, messages)),
        signal: controller.signal
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response, settings.apiKey))
      }

      if (!response.body?.getReader) {
        throw new Error('AI response stream is not available')
      }

      emitStatus('waiting')
      const reader = response.body.getReader()

      while (true) {
        const { value, done: readerDone } = await reader.read()
        if (readerDone) break

        bufferText += decoder.decode(value, { stream: true })
        const parsed = parseSseChunk(bufferText)
        bufferText = parsed.rest

        for (const eventData of parsed.events) {
          if (eventData === '[DONE]') {
            completeStream()
            return
          }

          const { reasoning, text } = extractStreamParts(eventData, settings)
          if (reasoning) {
            emitStatus('reasoning')
            handlers.onReasoning?.(reasoning)
          }
          if (text) handlers.onChunk?.(text)
          if (text) emitStatus('generating')
        }
      }

      const finalText = decoder.decode()
      if (finalText) bufferText += finalText
      if (bufferText) {
        const parsed = parseSseChunk(`${bufferText}\n\n`)
        for (const eventData of parsed.events) {
          if (eventData === '[DONE]') {
            completeStream()
            return
          }

          const { reasoning, text } = extractStreamParts(eventData, settings)
          if (reasoning) {
            emitStatus('reasoning')
            handlers.onReasoning?.(reasoning)
          }
          if (text) handlers.onChunk?.(text)
          if (text) emitStatus('generating')
        }
      }

      if (!completed && !stopped) {
        completeStream()
      }
    } catch (error) {
      if (stopped && error?.name === 'AbortError') return
      if (timedOut && error?.name === 'AbortError') throw new Error('AI request timed out')
      throw error
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  })()

  return {
    stop: () => {
      stopped = true
      controller.abort()
    },
    done
  }
}

module.exports = {
  resolveChatEndpoint,
  validateAIRequestSettings,
  buildChatHeaders,
  buildChatPayload,
  extractStreamParts,
  parseSseChunk,
  streamChatCompletion
}

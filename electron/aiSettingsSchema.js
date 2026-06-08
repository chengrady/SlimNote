const DEFAULT_PROVIDER_ID = 'default'
const DEFAULT_MODEL_ID = 'default-model'
const DEFAULT_API_KEY_ID = 'default-key'
const DEFAULT_CHAT_ENDPOINT_PATH = '/chat/completions'
const DEFAULT_PROTOCOL = 'openai-compatible'
const DEFAULT_KEY_STRATEGY = 'fixed'
const LEGACY_API_ID = DEFAULT_PROVIDER_ID

const DEFAULT_MANUAL_CONTEXT = {
  selection: true,
  fileInfo: true,
  nearbyText: true,
  fullDocument: false
}

const DEFAULT_INLINE_COMPLETION_LANGUAGES = [
  'plaintext',
  'markdown',
  'javascript',
  'typescript',
  'json',
  'yaml',
  'toml',
  'ini',
  'sql',
  'html',
  'css',
  'scss',
  'xml',
  'python',
  'java',
  'c',
  'cpp',
  'csharp'
]
const INLINE_COMPLETION_COLOR_PRESETS = ['gray', 'blue', 'cyan', 'green', 'red']
const INLINE_COMPLETION_MODE_VALUES = ['auto', 'fixed']
const INLINE_COMPLETION_ACCEPT_MODE_VALUES = ['line', 'snippet']

const DEFAULT_INLINE_COMPLETION = {
  enabled: true,
  mode: 'auto',
  providerId: '',
  modelId: '',
  delayMs: 500,
  maxChars: 600,
  prefixChars: 6000,
  suffixChars: 2000,
  includeLog: false,
  acceptMode: 'line',
  colorPreset: 'cyan',
  customColor: '#22c7d9',
  opacity: 0.7,
  languages: DEFAULT_INLINE_COMPLETION_LANGUAGES
}

const DEFAULT_API_KEY = {
  id: DEFAULT_API_KEY_ID,
  name: 'API Key',
  enabled: true
}

const DEFAULT_MODEL = {
  id: DEFAULT_MODEL_ID,
  name: 'Model',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  timeoutMs: 180000,
  enabled: true
}

const DEFAULT_PROVIDER = {
  id: DEFAULT_PROVIDER_ID,
  name: 'API Provider',
  protocol: DEFAULT_PROTOCOL,
  baseURL: '',
  inlineCompletionURL: '',
  chatEndpointPath: DEFAULT_CHAT_ENDPOINT_PATH,
  chatEndpointURL: '',
  keyStrategy: DEFAULT_KEY_STRATEGY,
  temperature: DEFAULT_MODEL.temperature,
  maxTokens: DEFAULT_MODEL.maxTokens,
  timeoutMs: DEFAULT_MODEL.timeoutMs,
  activeApiKeyId: DEFAULT_API_KEY_ID,
  apiKeys: [DEFAULT_API_KEY],
  models: [DEFAULT_MODEL]
}

const DEFAULT_API_CONFIG = {
  id: DEFAULT_PROVIDER_ID,
  name: DEFAULT_PROVIDER.name,
  baseURL: DEFAULT_PROVIDER.baseURL,
  inlineCompletionURL: DEFAULT_PROVIDER.inlineCompletionURL,
  chatEndpointPath: DEFAULT_PROVIDER.chatEndpointPath,
  chatEndpointURL: DEFAULT_PROVIDER.chatEndpointURL,
  model: DEFAULT_MODEL.model,
  temperature: DEFAULT_MODEL.temperature,
  maxTokens: DEFAULT_MODEL.maxTokens,
  timeoutMs: DEFAULT_MODEL.timeoutMs
}

const DEFAULT_AI_SETTINGS = {
  responseLanguage: 'app',
  contextMode: 'auto',
  manualContext: DEFAULT_MANUAL_CONTEXT,
  inlineCompletion: DEFAULT_INLINE_COMPLETION,
  providers: [DEFAULT_PROVIDER],
  apiConfigs: [DEFAULT_API_CONFIG]
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeNumber(value, fallback, minValue, maxValue) {
  if (value === '' || value === null || typeof value === 'undefined') return fallback
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return fallback
  return Math.min(maxValue, Math.max(minValue, numericValue))
}

function normalizeResponseLanguage(value) {
  return ['app', 'document', 'zh-CN', 'en-US'].includes(value) ? value : DEFAULT_AI_SETTINGS.responseLanguage
}

function normalizeProtocol(value, fallback = DEFAULT_PROTOCOL) {
  return ['openai-compatible', 'anthropic', 'custom'].includes(value) ? value : fallback
}

function normalizeKeyStrategy(value, fallback = DEFAULT_KEY_STRATEGY) {
  return ['fixed', 'round-robin', 'failover'].includes(value) ? value : fallback
}

function normalizeManualContext(value = {}) {
  const context = isPlainObject(value) ? value : {}
  return {
    selection: normalizeBoolean(context.selection, DEFAULT_MANUAL_CONTEXT.selection),
    fileInfo: normalizeBoolean(context.fileInfo, DEFAULT_MANUAL_CONTEXT.fileInfo),
    nearbyText: normalizeBoolean(context.nearbyText, DEFAULT_MANUAL_CONTEXT.nearbyText),
    fullDocument: normalizeBoolean(context.fullDocument, DEFAULT_MANUAL_CONTEXT.fullDocument)
  }
}

function normalizeLanguages(value, fallback = DEFAULT_INLINE_COMPLETION_LANGUAGES) {
  const source = Array.isArray(value) && value.length ? value : fallback
  return Array.from(new Set(source.map(item => normalizeString(item).toLowerCase()).filter(Boolean)))
}

function normalizeInlineCompletionColorPreset(value, fallback = DEFAULT_INLINE_COMPLETION.colorPreset) {
  const normalized = normalizeString(value, fallback).toLowerCase()
  return INLINE_COMPLETION_COLOR_PRESETS.includes(normalized) ? normalized : fallback
}

function normalizeInlineCompletionMode(value, fallback = DEFAULT_INLINE_COMPLETION.mode) {
  const normalized = normalizeString(value, fallback).toLowerCase()
  return INLINE_COMPLETION_MODE_VALUES.includes(normalized) ? normalized : fallback
}

function normalizeInlineCompletionAcceptMode(value, fallback = DEFAULT_INLINE_COMPLETION.acceptMode) {
  const normalized = normalizeString(value, fallback).toLowerCase()
  return INLINE_COMPLETION_ACCEPT_MODE_VALUES.includes(normalized) ? normalized : fallback
}

function normalizeHexColor(value, fallback = DEFAULT_INLINE_COMPLETION.customColor) {
  const normalized = normalizeString(value, fallback)
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toLowerCase()
  const shortMatch = normalized.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (shortMatch) return `#${shortMatch[1]}${shortMatch[1]}${shortMatch[2]}${shortMatch[2]}${shortMatch[3]}${shortMatch[3]}`.toLowerCase()
  return fallback
}

function normalizeInlineCompletion(value = {}) {
  const settings = isPlainObject(value) ? value : {}
  return {
    enabled: normalizeBoolean(settings.enabled, DEFAULT_INLINE_COMPLETION.enabled),
    mode: normalizeInlineCompletionMode(settings.mode),
    providerId: normalizeString(settings.providerId, DEFAULT_INLINE_COMPLETION.providerId),
    modelId: normalizeString(settings.modelId, DEFAULT_INLINE_COMPLETION.modelId),
    delayMs: Math.round(normalizeNumber(settings.delayMs, DEFAULT_INLINE_COMPLETION.delayMs, 150, 3000)),
    maxChars: Math.round(normalizeNumber(settings.maxChars, DEFAULT_INLINE_COMPLETION.maxChars, 20, 1200)),
    prefixChars: Math.round(normalizeNumber(settings.prefixChars, DEFAULT_INLINE_COMPLETION.prefixChars, 200, 20000)),
    suffixChars: Math.round(normalizeNumber(settings.suffixChars, DEFAULT_INLINE_COMPLETION.suffixChars, 0, 8000)),
    includeLog: normalizeBoolean(settings.includeLog, DEFAULT_INLINE_COMPLETION.includeLog),
    acceptMode: normalizeInlineCompletionAcceptMode(settings.acceptMode),
    colorPreset: normalizeInlineCompletionColorPreset(settings.colorPreset),
    customColor: normalizeHexColor(settings.customColor),
    opacity: normalizeNumber(settings.opacity, DEFAULT_INLINE_COMPLETION.opacity, 0.3, 1),
    languages: normalizeLanguages(settings.languages)
  }
}

function normalizeApiKeyStorage(config) {
  if (normalizeString(config.encryptedApiKey)) return 'encrypted'
  if (normalizeString(config.apiKey)) return 'plain'
  return normalizeString(config.apiKeyStorage)
}

function makeUniqueId(requestedId, fallbackId, seenIds) {
  const baseId = normalizeString(requestedId, fallbackId) || fallbackId
  if (!seenIds.has(baseId)) {
    seenIds.add(baseId)
    return baseId
  }

  let suffix = 2
  let nextId = `${baseId}-${suffix}`
  while (seenIds.has(nextId)) {
    suffix += 1
    nextId = `${baseId}-${suffix}`
  }
  seenIds.add(nextId)
  return nextId
}

function fallbackProvider(index = 0) {
  if (index === 0) return DEFAULT_PROVIDER
  return {
    ...DEFAULT_PROVIDER,
    id: `provider-${index + 1}`,
    name: `Provider ${index + 1}`,
    activeApiKeyId: `provider-${index + 1}-key`,
    apiKeys: [{ ...DEFAULT_API_KEY, id: `provider-${index + 1}-key` }],
    models: [{ ...DEFAULT_MODEL, id: `provider-${index + 1}-model` }]
  }
}

function normalizeApiKey(value = {}, fallback = DEFAULT_API_KEY, index = 0) {
  const key = isPlainObject(value) ? value : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_API_KEY
  const normalized = {
    id: normalizeString(key.id, safeFallback.id || `key-${index + 1}`) || `key-${index + 1}`,
    name: normalizeString(key.name, safeFallback.name || `Key ${index + 1}`) || `Key ${index + 1}`,
    enabled: normalizeBoolean(key.enabled, normalizeBoolean(safeFallback.enabled, true))
  }

  const apiKey = normalizeString(key.apiKey)
  const encryptedApiKey = normalizeString(key.encryptedApiKey)
  if (apiKey) normalized.apiKey = apiKey
  if (encryptedApiKey) normalized.encryptedApiKey = encryptedApiKey

  const apiKeyStorage = normalizeApiKeyStorage({ ...key, apiKey, encryptedApiKey })
  if (apiKeyStorage) normalized.apiKeyStorage = apiKeyStorage

  return normalized
}

function normalizeModel(value = {}, fallback = DEFAULT_MODEL, index = 0) {
  const model = isPlainObject(value) ? value : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_MODEL
  const modelId = normalizeString(model.id, safeFallback.id || `model-${index + 1}`) || `model-${index + 1}`
  const modelValue = normalizeString(model.model, safeFallback.model)
  return {
    id: modelId,
    name: normalizeString(model.name, safeFallback.name || modelValue || `Model ${index + 1}`) || modelValue || `Model ${index + 1}`,
    model: modelValue,
    temperature: normalizeNumber(model.temperature, safeFallback.temperature ?? DEFAULT_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(model.maxTokens, safeFallback.maxTokens ?? DEFAULT_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(model.timeoutMs, safeFallback.timeoutMs ?? DEFAULT_MODEL.timeoutMs, 1000, 600000)),
    enabled: normalizeBoolean(model.enabled, normalizeBoolean(safeFallback.enabled, true))
  }
}

function normalizeApiKeys(keys, fallbackKeys = DEFAULT_PROVIDER.apiKeys) {
  const sourceKeys = Array.isArray(keys) && keys.length ? keys : fallbackKeys
  const seenIds = new Set()
  return sourceKeys.map((key, index) => {
    const fallback = fallbackKeys[index] || { ...DEFAULT_API_KEY, id: `key-${index + 1}`, name: `Key ${index + 1}` }
    const normalized = normalizeApiKey(key, fallback, index)
    return {
      ...normalized,
      id: makeUniqueId(normalized.id, fallback.id || `key-${index + 1}`, seenIds)
    }
  })
}

function normalizeModels(models, fallbackModels = DEFAULT_PROVIDER.models) {
  const sourceModels = Array.isArray(models) && models.length ? models : fallbackModels
  const seenIds = new Set()
  return sourceModels.map((model, index) => {
    const fallback = fallbackModels[index] || { ...DEFAULT_MODEL, id: `model-${index + 1}`, name: `Model ${index + 1}` }
    const normalized = normalizeModel(model, fallback, index)
    return {
      ...normalized,
      id: makeUniqueId(normalized.id, fallback.id || `model-${index + 1}`, seenIds)
    }
  })
}

function pickUsableKey(keys = [], requestedId = '') {
  const requestedKey = keys.find(key => key.id === requestedId && key.enabled !== false)
  if (requestedKey) return requestedKey
  return keys.find(key => key.enabled !== false) || keys[0] || null
}

function pickUsableModel(models = [], requestedId = '') {
  const requestedModel = models.find(model => model.id === requestedId && model.enabled !== false)
  if (requestedModel) return requestedModel
  return models.find(model => model.enabled !== false) || models[0] || null
}

function normalizeProvider(value = {}, fallback = DEFAULT_PROVIDER, index = 0) {
  const provider = isPlainObject(value) ? value : {}
  const safeFallback = isPlainObject(fallback) ? fallback : fallbackProvider(index)
  const id = normalizeString(provider.id, safeFallback.id || `provider-${index + 1}`) || `provider-${index + 1}`
  const fallbackKeys = Array.isArray(safeFallback.apiKeys) && safeFallback.apiKeys.length
    ? safeFallback.apiKeys
    : [{ ...DEFAULT_API_KEY, id: `${id}-key` }]
  const fallbackModels = Array.isArray(safeFallback.models) && safeFallback.models.length
    ? safeFallback.models
    : [{ ...DEFAULT_MODEL, id: `${id}-model` }]
  const normalizedApiKeys = normalizeApiKeys(provider.apiKeys, fallbackKeys)
  const models = normalizeModels(provider.models, fallbackModels)
  const firstModel = models[0] || DEFAULT_MODEL
  const activeApiKey = pickUsableKey(normalizedApiKeys, normalizeString(provider.activeApiKeyId, safeFallback.activeApiKeyId))
  const apiKeys = [activeApiKey || normalizedApiKeys[0] || normalizeApiKey({ ...DEFAULT_API_KEY, id: `${id}-key` })]

  return {
    id,
    name: normalizeString(provider.name, safeFallback.name || `Provider ${index + 1}`) || `Provider ${index + 1}`,
    protocol: normalizeProtocol(provider.protocol, normalizeProtocol(safeFallback.protocol)),
    baseURL: normalizeString(provider.baseURL, safeFallback.baseURL),
    inlineCompletionURL: normalizeString(provider.inlineCompletionURL, safeFallback.inlineCompletionURL),
    chatEndpointPath: normalizeString(provider.chatEndpointPath, safeFallback.chatEndpointPath) || DEFAULT_CHAT_ENDPOINT_PATH,
    chatEndpointURL: normalizeString(provider.chatEndpointURL, safeFallback.chatEndpointURL),
    keyStrategy: DEFAULT_KEY_STRATEGY,
    temperature: normalizeNumber(provider.temperature, firstModel.temperature ?? safeFallback.temperature ?? DEFAULT_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(provider.maxTokens, firstModel.maxTokens ?? safeFallback.maxTokens ?? DEFAULT_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(provider.timeoutMs, firstModel.timeoutMs ?? safeFallback.timeoutMs ?? DEFAULT_MODEL.timeoutMs, 1000, 600000)),
    activeApiKeyId: apiKeys[0]?.id || DEFAULT_API_KEY_ID,
    apiKeys,
    models
  }
}

function normalizeApiConfig(value = {}, fallback = DEFAULT_API_CONFIG) {
  const config = isPlainObject(value) ? value : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_API_CONFIG
  const normalized = {
    id: normalizeString(config.id, safeFallback.id) || DEFAULT_PROVIDER_ID,
    name: normalizeString(config.name, safeFallback.name) || DEFAULT_API_CONFIG.name,
    baseURL: normalizeString(config.baseURL, safeFallback.baseURL),
    inlineCompletionURL: normalizeString(config.inlineCompletionURL, safeFallback.inlineCompletionURL),
    chatEndpointPath: normalizeString(config.chatEndpointPath, safeFallback.chatEndpointPath) || DEFAULT_CHAT_ENDPOINT_PATH,
    chatEndpointURL: normalizeString(config.chatEndpointURL, safeFallback.chatEndpointURL),
    model: normalizeString(config.model, safeFallback.model),
    temperature: normalizeNumber(config.temperature, safeFallback.temperature ?? DEFAULT_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(config.maxTokens, safeFallback.maxTokens ?? DEFAULT_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(config.timeoutMs, safeFallback.timeoutMs ?? DEFAULT_MODEL.timeoutMs, 1000, 600000))
  }

  const apiKey = normalizeString(config.apiKey)
  const encryptedApiKey = normalizeString(config.encryptedApiKey)
  if (apiKey) normalized.apiKey = apiKey
  if (encryptedApiKey) normalized.encryptedApiKey = encryptedApiKey

  const apiKeyStorage = normalizeApiKeyStorage({ ...config, apiKey, encryptedApiKey })
  if (apiKeyStorage) normalized.apiKeyStorage = apiKeyStorage

  return normalized
}

function hasLegacyApiConfig(settings) {
  return ['baseURL', 'chatEndpointURL', 'model', 'apiKey', 'encryptedApiKey'].some(key => typeof settings[key] !== 'undefined')
}

function buildLegacyApiConfig(settings) {
  return normalizeApiConfig({
    id: LEGACY_API_ID,
    name: normalizeString(settings.apiName, DEFAULT_API_CONFIG.name),
    baseURL: settings.baseURL,
    inlineCompletionURL: settings.inlineCompletionURL,
    chatEndpointPath: settings.chatEndpointPath,
    chatEndpointURL: settings.chatEndpointURL,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    timeoutMs: settings.timeoutMs,
    apiKey: settings.apiKey,
    encryptedApiKey: settings.encryptedApiKey,
    apiKeyStorage: settings.apiKeyStorage
  })
}

function buildModelIdFromApiConfig(config, fallbackId) {
  return normalizeString(config.model) || normalizeString(fallbackId, DEFAULT_MODEL_ID)
}

function buildProviderFromApiConfig(config = {}, index = 0) {
  const fallback = index === 0 ? DEFAULT_API_CONFIG : { ...DEFAULT_API_CONFIG, id: `provider-${index + 1}`, name: `Provider ${index + 1}` }
  const normalizedConfig = normalizeApiConfig(config, fallback)
  const modelId = buildModelIdFromApiConfig(normalizedConfig, `${normalizedConfig.id}-model`)
  const keyId = `${normalizedConfig.id}-key`
  const apiKey = {
    id: keyId,
    name: 'API Key',
    enabled: true
  }

  if (normalizedConfig.apiKey) apiKey.apiKey = normalizedConfig.apiKey
  if (normalizedConfig.encryptedApiKey) apiKey.encryptedApiKey = normalizedConfig.encryptedApiKey
  if (normalizedConfig.apiKeyStorage) apiKey.apiKeyStorage = normalizedConfig.apiKeyStorage

  return normalizeProvider({
    id: normalizedConfig.id,
    name: normalizedConfig.name,
    protocol: DEFAULT_PROTOCOL,
    baseURL: normalizedConfig.baseURL,
    inlineCompletionURL: normalizedConfig.inlineCompletionURL,
    chatEndpointPath: normalizedConfig.chatEndpointPath,
    chatEndpointURL: normalizedConfig.chatEndpointURL,
    temperature: normalizedConfig.temperature,
    maxTokens: normalizedConfig.maxTokens,
    timeoutMs: normalizedConfig.timeoutMs,
    keyStrategy: DEFAULT_KEY_STRATEGY,
    activeApiKeyId: keyId,
    apiKeys: [apiKey],
    models: [{
      id: modelId,
      name: normalizedConfig.model || DEFAULT_MODEL.name,
      model: normalizedConfig.model,
      temperature: normalizedConfig.temperature,
      maxTokens: normalizedConfig.maxTokens,
      timeoutMs: normalizedConfig.timeoutMs,
      enabled: true
    }]
  }, fallbackProvider(index), index)
}

function buildProviders(settings) {
  const sourceProviders = Array.isArray(settings.providers) && settings.providers.length
    ? settings.providers
    : (Array.isArray(settings.apiConfigs) && settings.apiConfigs.length
      ? settings.apiConfigs.map(buildProviderFromApiConfig)
      : (hasLegacyApiConfig(settings) ? [buildProviderFromApiConfig(buildLegacyApiConfig(settings))] : [DEFAULT_PROVIDER]))
  const seenIds = new Set()

  return sourceProviders.map((provider, index) => {
    const normalized = normalizeProvider(provider, fallbackProvider(index), index)
    return {
      ...normalized,
      id: makeUniqueId(normalized.id, fallbackProvider(index).id, seenIds)
    }
  })
}

function findModelRef(providers = [], modelId = '', providerId = '') {
  const requestedModelId = normalizeString(modelId)
  const requestedProviderId = normalizeString(providerId)

  if (requestedProviderId) {
    const provider = providers.find(item => item.id === requestedProviderId)
    if (!provider) throw new Error(`AI provider "${requestedProviderId}" was not found.`)

    if (requestedModelId) {
      const model = provider.models.find(item => item.id === requestedModelId && item.enabled !== false)
      if (!model) throw new Error(`AI model "${requestedModelId}" was not found in provider "${provider.name || provider.id}".`)
      return { provider, model }
    }

    const model = pickUsableModel(provider.models)
    if (!model) throw new Error(`AI provider "${provider.name || provider.id}" has no available models.`)
    return { provider, model }
  }

  if (requestedModelId) {
    for (const provider of providers) {
      const model = provider.models.find(item => item.id === requestedModelId && item.enabled !== false)
      if (model) return { provider, model }
    }

    throw new Error(`AI model "${requestedModelId}" was not found.`)
  }

  for (const provider of providers) {
    const model = pickUsableModel(provider.models)
    if (model) return { provider, model }
  }

  return null
}

function buildCompatibilityApiConfig(provider, modelId = '') {
  const model = pickUsableModel(provider.models, modelId) || DEFAULT_MODEL
  const key = pickUsableKey(provider.apiKeys, provider.activeApiKeyId) || {}
  const normalized = {
    id: provider.id,
    name: provider.name,
    baseURL: provider.baseURL,
    inlineCompletionURL: provider.inlineCompletionURL,
    chatEndpointPath: provider.chatEndpointPath,
    chatEndpointURL: provider.chatEndpointURL,
    model: model.model,
    temperature: provider.temperature ?? model.temperature,
    maxTokens: provider.maxTokens ?? model.maxTokens,
    timeoutMs: provider.timeoutMs ?? model.timeoutMs
  }

  if (key.apiKey) normalized.apiKey = key.apiKey
  if (key.encryptedApiKey) normalized.encryptedApiKey = key.encryptedApiKey
  const apiKeyStorage = normalizeApiKeyStorage(key)
  if (apiKeyStorage) normalized.apiKeyStorage = apiKeyStorage

  if (Object.prototype.hasOwnProperty.call(key, 'hasApiKey')) normalized.hasApiKey = Boolean(key.hasApiKey)

  return normalized
}

function buildCompatibilityApiConfigs(settings) {
  return settings.providers.map(provider => buildCompatibilityApiConfig(provider))
}

function normalizeAISettings(settings = {}) {
  const safeSettings = isPlainObject(settings) ? settings : {}
  const providers = buildProviders(safeSettings)
  const normalized = {
    responseLanguage: normalizeResponseLanguage(safeSettings.responseLanguage),
    contextMode: safeSettings.contextMode === 'manual' ? 'manual' : DEFAULT_AI_SETTINGS.contextMode,
    manualContext: normalizeManualContext(safeSettings.manualContext),
    inlineCompletion: normalizeInlineCompletion(safeSettings.inlineCompletion),
    providers
  }

  return {
    ...normalized,
    apiConfigs: buildCompatibilityApiConfigs(normalized)
  }
}

function resolveSelectedRef(settings = {}) {
  const safeSettings = isPlainObject(settings) ? settings : {}
  const normalized = normalizeAISettings(safeSettings)
  const requestedProviderId = normalizeString(safeSettings.providerId, normalizeString(safeSettings.activeProviderId, normalizeString(safeSettings.apiId, normalizeString(safeSettings.activeApiId))))
  const requestedModelId = normalizeString(safeSettings.modelId, normalizeString(safeSettings.activeModelId))
  return findModelRef(normalized.providers, requestedModelId, requestedProviderId) || findModelRef(normalized.providers) || findModelRef([DEFAULT_PROVIDER])
}

function resolveActiveProvider(settings = {}) {
  return resolveSelectedRef(settings)?.provider || DEFAULT_PROVIDER
}

function resolveActiveModel(settings = {}) {
  return resolveSelectedRef(settings)?.model || DEFAULT_MODEL
}

function resolveActiveApiKey(settings = {}) {
  const provider = resolveActiveProvider(settings)
  return pickUsableKey(provider.apiKeys, provider.activeApiKeyId) || DEFAULT_API_KEY
}

function resolveActiveApiConfig(settings = {}) {
  const selected = resolveSelectedRef(settings)
  return buildCompatibilityApiConfig(selected?.provider || DEFAULT_PROVIDER, selected?.model?.id || '')
}

function toPublicApiKey(key) {
  const hasApiKey = Boolean(normalizeString(key.apiKey) || normalizeString(key.encryptedApiKey))
  const {
    apiKey,
    encryptedApiKey,
    ...publicKey
  } = key

  return {
    ...publicKey,
    hasApiKey,
    apiKeyStorage: hasApiKey ? normalizeApiKeyStorage(key) : ''
  }
}

function toPublicProvider(provider) {
  const publicApiKeys = provider.apiKeys.map(toPublicApiKey)
  return {
    ...provider,
    apiKeys: publicApiKeys,
    hasApiKey: publicApiKeys.some(key => key.hasApiKey),
    apiKeyStorage: publicApiKeys.find(key => key.id === provider.activeApiKeyId)?.apiKeyStorage || publicApiKeys.find(key => key.hasApiKey)?.apiKeyStorage || ''
  }
}

function normalizePublicAISettings(settings = {}) {
  const normalized = normalizeAISettings(settings)
  const publicSettings = {
    ...normalized,
    providers: normalized.providers.map(toPublicProvider)
  }

  return {
    ...publicSettings,
    apiConfigs: buildCompatibilityApiConfigs(publicSettings)
  }
}

function normalizePrivateAISettings(settings = {}) {
  const normalized = normalizeAISettings(settings)
  const selected = resolveSelectedRef({
    ...settings,
    providers: normalized.providers
  })
  const activeProvider = selected?.provider || DEFAULT_PROVIDER
  const activeModel = selected?.model || DEFAULT_MODEL
  const activeApiKey = pickUsableKey(activeProvider.apiKeys, activeProvider.activeApiKeyId) || DEFAULT_API_KEY

  return {
    ...normalized,
    enabled: true,
    providerId: activeProvider.id,
    providerName: activeProvider.name,
    modelId: activeModel.id,
    modelName: activeModel.name,
    apiName: activeProvider.name,
    protocol: activeProvider.protocol,
    baseURL: activeProvider.baseURL,
    inlineCompletionURL: activeProvider.inlineCompletionURL,
    chatEndpointPath: activeProvider.chatEndpointPath,
    chatEndpointURL: activeProvider.chatEndpointURL,
    model: activeModel.model,
    temperature: activeProvider.temperature ?? activeModel.temperature,
    maxTokens: activeProvider.maxTokens ?? activeModel.maxTokens,
    timeoutMs: activeProvider.timeoutMs ?? activeModel.timeoutMs,
    apiKey: normalizeString(activeApiKey.apiKey),
    apiKeyStorage: normalizeApiKeyStorage(activeApiKey)
  }
}

module.exports = {
  DEFAULT_AI_SETTINGS,
  DEFAULT_API_CONFIG,
  DEFAULT_API_ID: DEFAULT_PROVIDER_ID,
  DEFAULT_API_KEY,
  DEFAULT_API_KEY_ID,
  DEFAULT_CHAT_ENDPOINT_PATH,
  DEFAULT_MANUAL_CONTEXT,
  DEFAULT_INLINE_COMPLETION,
  DEFAULT_INLINE_COMPLETION_LANGUAGES,
  DEFAULT_MODEL,
  DEFAULT_MODEL_ID,
  DEFAULT_PROVIDER,
  DEFAULT_PROVIDER_ID,
  normalizeAISettings,
  normalizePublicAISettings,
  normalizePrivateAISettings,
  normalizeApiConfig,
  normalizeProvider,
  normalizeModel,
  normalizeApiKey,
  resolveActiveApiConfig,
  resolveActiveProvider,
  resolveActiveModel,
  resolveActiveApiKey
}

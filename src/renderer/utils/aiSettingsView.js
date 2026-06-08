import aiProviderPresetConfig from '../config/aiProviderPresets.json' with { type: 'json' }

export const DEFAULT_AI_RESPONSE_LANGUAGE = 'app'
export const AI_RESPONSE_LANGUAGE_VALUES = ['app', 'document', 'zh-CN', 'en-US']
export const DEFAULT_AI_CHAT_ENDPOINT_PATH = '/chat/completions'
export const DEFAULT_AI_PROVIDER_ID = 'default'
export const DEFAULT_AI_API_ID = DEFAULT_AI_PROVIDER_ID
export const DEFAULT_AI_MODEL_ID = 'default-model'
export const DEFAULT_AI_API_KEY_ID = 'default-key'
export const AI_PROVIDER_PROTOCOL_VALUES = ['openai-compatible', 'anthropic', 'custom']
export const AI_KEY_STRATEGY_VALUES = ['fixed', 'round-robin', 'failover']
export const DEFAULT_INLINE_COMPLETION_LANGUAGES = [
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
export const INLINE_COMPLETION_COLOR_PRESETS = ['gray', 'blue', 'cyan', 'green', 'red']
export const INLINE_COMPLETION_MODE_VALUES = ['auto', 'fixed']
export const INLINE_COMPLETION_ACCEPT_MODE_VALUES = ['line', 'snippet']

export const DEFAULT_INLINE_COMPLETION = {
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

export const AI_PROVIDER_PRESETS = aiProviderPresetConfig.map(preset => ({
  ...preset,
  icon: { ...preset.icon },
  sourceUrls: Array.isArray(preset.sourceUrls) ? [...preset.sourceUrls] : [],
  models: Array.isArray(preset.models) ? preset.models.map(model => ({ ...model })) : []
}))

export const DEFAULT_AI_API_KEY = {
  id: DEFAULT_AI_API_KEY_ID,
  name: 'API Key',
  enabled: true,
  hasApiKey: false,
  apiKeyStorage: ''
}

export const DEFAULT_AI_MODEL = {
  id: DEFAULT_AI_MODEL_ID,
  name: 'Model',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  timeoutMs: 180000,
  enabled: true
}

export const DEFAULT_AI_PROVIDER = {
  id: DEFAULT_AI_PROVIDER_ID,
  name: 'API Provider',
  protocol: 'openai-compatible',
  baseURL: '',
  inlineCompletionURL: '',
  chatEndpointPath: DEFAULT_AI_CHAT_ENDPOINT_PATH,
  chatEndpointURL: '',
  keyStrategy: 'fixed',
  temperature: DEFAULT_AI_MODEL.temperature,
  maxTokens: DEFAULT_AI_MODEL.maxTokens,
  timeoutMs: DEFAULT_AI_MODEL.timeoutMs,
  activeApiKeyId: DEFAULT_AI_API_KEY_ID,
  apiKeys: [DEFAULT_AI_API_KEY],
  models: [DEFAULT_AI_MODEL],
  hasApiKey: false,
  apiKeyStorage: ''
}

export const DEFAULT_AI_API_CONFIG = {
  id: DEFAULT_AI_PROVIDER_ID,
  name: DEFAULT_AI_PROVIDER.name,
  baseURL: DEFAULT_AI_PROVIDER.baseURL,
  inlineCompletionURL: DEFAULT_AI_PROVIDER.inlineCompletionURL,
  chatEndpointPath: DEFAULT_AI_PROVIDER.chatEndpointPath,
  chatEndpointURL: DEFAULT_AI_PROVIDER.chatEndpointURL,
  model: DEFAULT_AI_MODEL.model,
  temperature: DEFAULT_AI_MODEL.temperature,
  maxTokens: DEFAULT_AI_MODEL.maxTokens,
  timeoutMs: DEFAULT_AI_MODEL.timeoutMs,
  hasApiKey: false,
  apiKeyStorage: ''
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeAiResponseLanguage(value, fallback = DEFAULT_AI_RESPONSE_LANGUAGE) {
  if (AI_RESPONSE_LANGUAGE_VALUES.includes(value)) return value
  if (AI_RESPONSE_LANGUAGE_VALUES.includes(fallback)) return fallback
  return DEFAULT_AI_RESPONSE_LANGUAGE
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

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
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

export function normalizeLocalInlineCompletion(value = {}) {
  const safeValue = isPlainObject(value) ? value : {}
  return {
    enabled: normalizeBoolean(safeValue.enabled, DEFAULT_INLINE_COMPLETION.enabled),
    mode: normalizeInlineCompletionMode(safeValue.mode),
    providerId: normalizeString(safeValue.providerId, DEFAULT_INLINE_COMPLETION.providerId),
    modelId: normalizeString(safeValue.modelId, DEFAULT_INLINE_COMPLETION.modelId),
    delayMs: Math.round(normalizeNumber(safeValue.delayMs, DEFAULT_INLINE_COMPLETION.delayMs, 150, 3000)),
    maxChars: Math.round(normalizeNumber(safeValue.maxChars, DEFAULT_INLINE_COMPLETION.maxChars, 20, 1200)),
    prefixChars: Math.round(normalizeNumber(safeValue.prefixChars, DEFAULT_INLINE_COMPLETION.prefixChars, 200, 20000)),
    suffixChars: Math.round(normalizeNumber(safeValue.suffixChars, DEFAULT_INLINE_COMPLETION.suffixChars, 0, 8000)),
    includeLog: normalizeBoolean(safeValue.includeLog, DEFAULT_INLINE_COMPLETION.includeLog),
    acceptMode: normalizeInlineCompletionAcceptMode(safeValue.acceptMode),
    colorPreset: normalizeInlineCompletionColorPreset(safeValue.colorPreset),
    customColor: normalizeHexColor(safeValue.customColor),
    opacity: normalizeNumber(safeValue.opacity, DEFAULT_INLINE_COMPLETION.opacity, 0.3, 1),
    languages: normalizeLanguages(safeValue.languages)
  }
}

function normalizeProtocol(value, fallback = DEFAULT_AI_PROVIDER.protocol) {
  return AI_PROVIDER_PROTOCOL_VALUES.includes(value) ? value : fallback
}

function normalizeKeyStrategy(value, fallback = DEFAULT_AI_PROVIDER.keyStrategy) {
  return AI_KEY_STRATEGY_VALUES.includes(value) ? value : fallback
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

export function normalizeLocalAiApiKey(key = {}, fallback = DEFAULT_AI_API_KEY, index = 0) {
  const safeKey = isPlainObject(key) ? key : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_AI_API_KEY
  return {
    id: normalizeString(safeKey.id, safeFallback.id || `key-${index + 1}`) || `key-${index + 1}`,
    name: normalizeString(safeKey.name, safeFallback.name || `Key ${index + 1}`) || `Key ${index + 1}`,
    enabled: normalizeBoolean(safeKey.enabled, normalizeBoolean(safeFallback.enabled, true)),
    hasApiKey: normalizeBoolean(safeKey.hasApiKey, Boolean(safeFallback.hasApiKey)),
    apiKeyStorage: normalizeString(safeKey.apiKeyStorage, safeFallback.apiKeyStorage)
  }
}

export function normalizeLocalAiModel(model = {}, fallback = DEFAULT_AI_MODEL, index = 0) {
  const safeModel = isPlainObject(model) ? model : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_AI_MODEL
  const modelValue = normalizeString(safeModel.model, safeFallback.model)
  return {
    id: normalizeString(safeModel.id, safeFallback.id || `model-${index + 1}`) || `model-${index + 1}`,
    name: normalizeString(safeModel.name, safeFallback.name || modelValue || `Model ${index + 1}`) || modelValue || `Model ${index + 1}`,
    model: modelValue,
    temperature: normalizeNumber(safeModel.temperature, safeFallback.temperature ?? DEFAULT_AI_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(safeModel.maxTokens, safeFallback.maxTokens ?? DEFAULT_AI_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(safeModel.timeoutMs, safeFallback.timeoutMs ?? DEFAULT_AI_MODEL.timeoutMs, 1000, 600000)),
    enabled: normalizeBoolean(safeModel.enabled, normalizeBoolean(safeFallback.enabled, true))
  }
}

function normalizeLocalAiApiKeys(keys, fallbackKeys = DEFAULT_AI_PROVIDER.apiKeys) {
  const sourceKeys = Array.isArray(keys) && keys.length ? keys : fallbackKeys
  const seenIds = new Set()
  return sourceKeys.map((key, index) => {
    const fallback = fallbackKeys[index] || { ...DEFAULT_AI_API_KEY, id: `key-${index + 1}`, name: `Key ${index + 1}` }
    const normalized = normalizeLocalAiApiKey(key, fallback, index)
    return {
      ...normalized,
      id: makeUniqueId(normalized.id, fallback.id || `key-${index + 1}`, seenIds)
    }
  })
}

function normalizeLocalAiModels(models, fallbackModels = DEFAULT_AI_PROVIDER.models) {
  const sourceModels = Array.isArray(models) && models.length ? models : fallbackModels
  const seenIds = new Set()
  return sourceModels.map((model, index) => {
    const fallback = fallbackModels[index] || { ...DEFAULT_AI_MODEL, id: `model-${index + 1}`, name: `Model ${index + 1}` }
    const normalized = normalizeLocalAiModel(model, fallback, index)
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

function normalizePresetModel(model = {}, index = 0) {
  const modelId = normalizeString(model.id, normalizeString(model.model, `model-${index + 1}`)) || `model-${index + 1}`
  return normalizeLocalAiModel({
    ...DEFAULT_AI_MODEL,
    ...model,
    id: modelId,
    name: normalizeString(model.name, normalizeString(model.model, `Model ${index + 1}`)) || `Model ${index + 1}`,
    model: normalizeString(model.model)
  }, {
    ...DEFAULT_AI_MODEL,
    id: modelId,
    name: normalizeString(model.name, `Model ${index + 1}`) || `Model ${index + 1}`
  }, index)
}

export function createAiProviderFromPreset(presetId, options = {}) {
  const preset = AI_PROVIDER_PRESETS.find(item => item.id === presetId)
  if (!preset) return null

  const id = normalizeString(options.id, preset.id) || preset.id
  const keyId = normalizeString(options.keyId, `${id}-key`) || `${id}-key`
  const models = (Array.isArray(preset.models) && preset.models.length ? preset.models : DEFAULT_AI_PROVIDER.models)
    .map((model, index) => normalizePresetModel(model, index))

  return normalizeLocalAiProvider({
    ...DEFAULT_AI_PROVIDER,
    id,
    name: normalizeString(options.name, preset.name) || preset.name,
    protocol: preset.protocol,
    baseURL: preset.baseURL,
    inlineCompletionURL: preset.inlineCompletionURL || '',
    chatEndpointPath: preset.chatEndpointPath || DEFAULT_AI_CHAT_ENDPOINT_PATH,
    chatEndpointURL: preset.chatEndpointURL || '',
    activeApiKeyId: keyId,
    apiKeys: [{ ...DEFAULT_AI_API_KEY, id: keyId, name: 'API Key' }],
    models
  }, DEFAULT_AI_PROVIDER)
}

export function normalizeLocalAiProvider(provider = {}, fallback = DEFAULT_AI_PROVIDER, index = 0) {
  const safeProvider = isPlainObject(provider) ? provider : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_AI_PROVIDER
  const id = normalizeString(safeProvider.id, safeFallback.id || `provider-${index + 1}`) || `provider-${index + 1}`
  const normalizedApiKeys = normalizeLocalAiApiKeys(safeProvider.apiKeys, safeFallback.apiKeys || DEFAULT_AI_PROVIDER.apiKeys)
  const models = normalizeLocalAiModels(safeProvider.models, safeFallback.models || DEFAULT_AI_PROVIDER.models)
  const firstModel = models[0] || DEFAULT_AI_MODEL
  const activeApiKey = pickUsableKey(normalizedApiKeys, normalizeString(safeProvider.activeApiKeyId, safeFallback.activeApiKeyId))
  const apiKeys = [activeApiKey || normalizedApiKeys[0] || normalizeLocalAiApiKey({ ...DEFAULT_AI_API_KEY, id: `${id}-key` })]

  return {
    id,
    name: normalizeString(safeProvider.name, safeFallback.name || `Provider ${index + 1}`) || `Provider ${index + 1}`,
    protocol: normalizeProtocol(safeProvider.protocol, normalizeProtocol(safeFallback.protocol)),
    baseURL: normalizeString(safeProvider.baseURL, safeFallback.baseURL),
    inlineCompletionURL: normalizeString(safeProvider.inlineCompletionURL, safeFallback.inlineCompletionURL),
    chatEndpointPath: normalizeString(safeProvider.chatEndpointPath, safeFallback.chatEndpointPath) || DEFAULT_AI_CHAT_ENDPOINT_PATH,
    chatEndpointURL: normalizeString(safeProvider.chatEndpointURL, safeFallback.chatEndpointURL),
    keyStrategy: DEFAULT_AI_PROVIDER.keyStrategy,
    temperature: normalizeNumber(safeProvider.temperature, firstModel.temperature ?? safeFallback.temperature ?? DEFAULT_AI_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(safeProvider.maxTokens, firstModel.maxTokens ?? safeFallback.maxTokens ?? DEFAULT_AI_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(safeProvider.timeoutMs, firstModel.timeoutMs ?? safeFallback.timeoutMs ?? DEFAULT_AI_MODEL.timeoutMs, 1000, 600000)),
    activeApiKeyId: apiKeys[0]?.id || DEFAULT_AI_API_KEY_ID,
    apiKeys,
    models,
    hasApiKey: normalizeBoolean(safeProvider.hasApiKey, apiKeys.some(key => key.hasApiKey)),
    apiKeyStorage: normalizeString(safeProvider.apiKeyStorage, apiKeys.find(key => key.hasApiKey)?.apiKeyStorage || '')
  }
}

export function normalizeLocalAiApiConfig(config = {}, fallback = DEFAULT_AI_API_CONFIG) {
  const safeConfig = isPlainObject(config) ? config : {}
  const safeFallback = isPlainObject(fallback) ? fallback : DEFAULT_AI_API_CONFIG
  return {
    id: normalizeString(safeConfig.id, safeFallback.id) || DEFAULT_AI_API_ID,
    name: normalizeString(safeConfig.name, safeFallback.name) || DEFAULT_AI_API_CONFIG.name,
    baseURL: normalizeString(safeConfig.baseURL, safeFallback.baseURL),
    inlineCompletionURL: normalizeString(safeConfig.inlineCompletionURL, safeFallback.inlineCompletionURL),
    chatEndpointPath: normalizeString(safeConfig.chatEndpointPath, safeFallback.chatEndpointPath) || DEFAULT_AI_CHAT_ENDPOINT_PATH,
    chatEndpointURL: normalizeString(safeConfig.chatEndpointURL, safeFallback.chatEndpointURL),
    model: normalizeString(safeConfig.model, safeFallback.model),
    temperature: normalizeNumber(safeConfig.temperature, safeFallback.temperature ?? DEFAULT_AI_MODEL.temperature, 0, 2),
    maxTokens: Math.round(normalizeNumber(safeConfig.maxTokens, safeFallback.maxTokens ?? DEFAULT_AI_MODEL.maxTokens, 1, 200000)),
    timeoutMs: Math.round(normalizeNumber(safeConfig.timeoutMs, safeFallback.timeoutMs ?? DEFAULT_AI_MODEL.timeoutMs, 1000, 600000)),
    hasApiKey: normalizeBoolean(safeConfig.hasApiKey, Boolean(safeFallback.hasApiKey)),
    apiKeyStorage: normalizeString(safeConfig.apiKeyStorage, safeFallback.apiKeyStorage)
  }
}

function buildProviderFromLegacyConfig(config = {}, index = 0) {
  const normalizedConfig = normalizeLocalAiApiConfig(config, index === 0 ? DEFAULT_AI_API_CONFIG : {
    ...DEFAULT_AI_API_CONFIG,
    id: `provider-${index + 1}`,
    name: `Provider ${index + 1}`
  })
  const modelId = normalizedConfig.model || `${normalizedConfig.id}-model`
  return normalizeLocalAiProvider({
    id: normalizedConfig.id,
    name: normalizedConfig.name,
    baseURL: normalizedConfig.baseURL,
    inlineCompletionURL: normalizedConfig.inlineCompletionURL,
    chatEndpointPath: normalizedConfig.chatEndpointPath,
    chatEndpointURL: normalizedConfig.chatEndpointURL,
    temperature: normalizedConfig.temperature,
    maxTokens: normalizedConfig.maxTokens,
    timeoutMs: normalizedConfig.timeoutMs,
    apiKeys: [{
      id: `${normalizedConfig.id}-key`,
      name: 'API Key',
      hasApiKey: normalizedConfig.hasApiKey,
      apiKeyStorage: normalizedConfig.apiKeyStorage
    }],
    models: [{
      id: modelId,
      name: normalizedConfig.model || DEFAULT_AI_MODEL.name,
      model: normalizedConfig.model,
      temperature: normalizedConfig.temperature,
      maxTokens: normalizedConfig.maxTokens,
      timeoutMs: normalizedConfig.timeoutMs
    }]
  }, DEFAULT_AI_PROVIDER, index)
}

function buildLegacyApiConfig(settings) {
  return normalizeLocalAiApiConfig({
    id: DEFAULT_AI_API_ID,
    name: settings.apiName || DEFAULT_AI_API_CONFIG.name,
    baseURL: settings.baseURL,
    inlineCompletionURL: settings.inlineCompletionURL,
    chatEndpointPath: settings.chatEndpointPath,
    chatEndpointURL: settings.chatEndpointURL,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    timeoutMs: settings.timeoutMs,
    hasApiKey: settings.hasApiKey,
    apiKeyStorage: settings.apiKeyStorage
  })
}

function buildProviders(settings) {
  const sourceProviders = Array.isArray(settings.providers) && settings.providers.length
    ? settings.providers
    : (Array.isArray(settings.apiConfigs) && settings.apiConfigs.length
      ? settings.apiConfigs.map(buildProviderFromLegacyConfig)
      : [buildProviderFromLegacyConfig(buildLegacyApiConfig(settings))])
  const seenIds = new Set()

  return sourceProviders.map((provider, index) => {
    const normalized = normalizeLocalAiProvider(provider, index === 0 ? DEFAULT_AI_PROVIDER : {
      ...DEFAULT_AI_PROVIDER,
      id: `provider-${index + 1}`,
      name: `Provider ${index + 1}`
    }, index)
    return {
      ...normalized,
      id: makeUniqueId(normalized.id, `provider-${index + 1}`, seenIds)
    }
  })
}

function findModelRef(providers = [], modelId = '', providerId = '') {
  const requestedModelId = normalizeString(modelId)
  const requestedProviderId = normalizeString(providerId)

  if (requestedModelId) {
    for (const provider of providers) {
      const model = provider.models.find(item => item.id === requestedModelId && item.enabled !== false)
      if (model) return { provider, model }
    }
  }

  if (requestedProviderId) {
    const provider = providers.find(item => item.id === requestedProviderId)
    const model = provider ? pickUsableModel(provider.models) : null
    if (provider && model) return { provider, model }
  }

  for (const provider of providers) {
    const model = pickUsableModel(provider.models)
    if (model) return { provider, model }
  }

  return null
}

function buildCompatibilityApiConfig(provider, modelId = '') {
  const model = pickUsableModel(provider.models, modelId) || DEFAULT_AI_MODEL
  const key = pickUsableKey(provider.apiKeys, provider.activeApiKeyId) || DEFAULT_AI_API_KEY
  return {
    id: provider.id,
    name: provider.name,
    baseURL: provider.baseURL,
    inlineCompletionURL: provider.inlineCompletionURL,
    chatEndpointPath: provider.chatEndpointPath,
    chatEndpointURL: provider.chatEndpointURL,
    model: model.model,
    temperature: provider.temperature ?? model.temperature,
    maxTokens: provider.maxTokens ?? model.maxTokens,
    timeoutMs: provider.timeoutMs ?? model.timeoutMs,
    hasApiKey: Boolean(key.hasApiKey),
    apiKeyStorage: key.apiKeyStorage || ''
  }
}

export function getAiModelOptions(settings = {}) {
  const providers = Array.isArray(settings.providers) ? settings.providers : []
  return providers.flatMap(provider => provider.models.map(model => ({
    value: model.id,
    label: `${provider.name || provider.id} / ${model.name || model.model || model.id}`,
    providerId: provider.id,
    model
  })))
}

export function resolveLocalAiModelSelection(settings = {}, selection = {}) {
  const normalized = normalizeLocalAiSettings(settings)
  const requestedProviderId = normalizeString(selection.providerId)
  const requestedModelId = normalizeString(selection.modelId)
  const provider = normalized.providers.find(item => item.id === requestedProviderId) || normalized.providers[0] || DEFAULT_AI_PROVIDER
  const model = provider.models.find(item => item.id === requestedModelId && item.enabled !== false)
    || provider.models.find(item => item.enabled !== false)
    || provider.models[0]
    || DEFAULT_AI_MODEL
  const key = pickUsableKey(provider.apiKeys, provider.activeApiKeyId) || DEFAULT_AI_API_KEY

  return {
    provider,
    model,
    providerId: provider.id,
    modelId: model.id,
    providerName: provider.name,
    modelName: model.name,
    baseURL: provider.baseURL,
    inlineCompletionURL: provider.inlineCompletionURL,
    chatEndpointPath: provider.chatEndpointPath,
    chatEndpointURL: provider.chatEndpointURL,
    modelValue: model.model,
    hasApiKey: Boolean(key.hasApiKey),
    apiKeyStorage: key.apiKeyStorage || ''
  }
}

export function normalizeLocalAiSettings(settings = {}, fallback = {}) {
  const safeSettings = isPlainObject(settings) ? settings : {}
  const safeFallback = isPlainObject(fallback) ? fallback : {}
  const providers = buildProviders(safeSettings)
  const normalized = {
    ...safeSettings,
    responseLanguage: normalizeAiResponseLanguage(safeSettings.responseLanguage, safeFallback.responseLanguage),
    contextMode: safeSettings.contextMode === 'manual' ? 'manual' : 'auto',
    manualContext: isPlainObject(safeSettings.manualContext) ? safeSettings.manualContext : {},
    inlineCompletion: normalizeLocalInlineCompletion(safeSettings.inlineCompletion),
    providers
  }
  delete normalized.activeProviderId
  delete normalized.activeApiId
  delete normalized.activeModelId

  return {
    ...normalized,
    apiConfigs: providers.map(provider => buildCompatibilityApiConfig(provider))
  }
}

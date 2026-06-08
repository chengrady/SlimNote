const { app, safeStorage } = require('electron')
const { dirname, join } = require('path')
const fs = require('fs')
const {
  DEFAULT_AI_SETTINGS,
  normalizeAISettings,
  normalizePublicAISettings,
  normalizePrivateAISettings,
  resolveActiveProvider,
  resolveActiveModel,
  resolveActiveApiKey
} = require('./aiSettingsSchema')

const AI_SETTINGS_FILE = 'ai-settings.json'
const API_KEY_STORAGE_ENCRYPTED = 'encrypted'
const API_KEY_STORAGE_PLAIN = 'plain'

function getAISettingsPath() {
  return join(app.getPath('userData'), AI_SETTINGS_FILE)
}

function isEncryptionAvailable() {
  try {
    return Boolean(safeStorage?.isEncryptionAvailable?.())
  } catch (error) {
    return false
  }
}

function readStoredAISettings() {
  try {
    const settingsPath = getAISettingsPath()
    if (!fs.existsSync(settingsPath)) return {}
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch (error) {
    console.error('Failed to load AI settings:', error)
    return {}
  }
}

function writeStoredAISettings(settings) {
  const settingsPath = getAISettingsPath()
  fs.mkdirSync(dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
}

function normalizeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function getApiKeyStorage(settings) {
  if (settings?.encryptedApiKey) return API_KEY_STORAGE_ENCRYPTED
  if (typeof settings?.apiKey === 'string' && settings.apiKey.trim()) return API_KEY_STORAGE_PLAIN
  return ''
}

function readApiKey(settings = {}) {
  if (typeof settings.apiKey === 'string') return settings.apiKey
  if (!settings.encryptedApiKey) return ''
  if (!isEncryptionAvailable()) return ''

  try {
    return safeStorage.decryptString(Buffer.from(settings.encryptedApiKey, 'base64'))
  } catch (error) {
    console.error('Failed to decrypt AI API key:', error)
    return ''
  }
}

function buildStoredApiKey(apiKey) {
  const normalizedApiKey = typeof apiKey === 'string' ? apiKey.trim() : ''
  if (!normalizedApiKey) return {}

  if (!isEncryptionAvailable()) {
    return {
      apiKey: normalizedApiKey,
      apiKeyStorage: API_KEY_STORAGE_PLAIN
    }
  }

  try {
    return {
      encryptedApiKey: safeStorage.encryptString(normalizedApiKey).toString('base64'),
      apiKeyStorage: API_KEY_STORAGE_ENCRYPTED
    }
  } catch (error) {
    console.error('Failed to encrypt AI API key:', error)
    return {
      apiKey: normalizedApiKey,
      apiKeyStorage: API_KEY_STORAGE_PLAIN
    }
  }
}

function buildRetainedApiKey(storedKey = {}) {
  const apiKey = readApiKey(storedKey).trim()
  if (apiKey) return buildStoredApiKey(apiKey)

  if (getApiKeyStorage(storedKey) === API_KEY_STORAGE_ENCRYPTED) {
    return {
      encryptedApiKey: storedKey.encryptedApiKey,
      apiKeyStorage: API_KEY_STORAGE_ENCRYPTED
    }
  }

  if (getApiKeyStorage(storedKey) === API_KEY_STORAGE_PLAIN) {
    return {
      apiKey: storedKey.apiKey,
      apiKeyStorage: API_KEY_STORAGE_PLAIN
    }
  }

  return {}
}

function hasLegacyApiPayload(payload) {
  return ['baseURL', 'inlineCompletionURL', 'chatEndpointPath', 'chatEndpointURL', 'model', 'temperature', 'maxTokens', 'timeoutMs', 'apiKey'].some(key => Object.prototype.hasOwnProperty.call(payload, key))
}

function buildLegacyProviderPayload(storedSettings, payload) {
  const scopedSettings = normalizeAISettings({
    ...storedSettings
  })
  const legacyProviderId = normalizeString(payload.providerId, normalizeString(payload.activeProviderId, normalizeString(payload.apiId, normalizeString(payload.activeApiId, storedSettings.activeProviderId))))
  const activeProvider = resolveActiveProvider({ ...scopedSettings, providerId: legacyProviderId })
  const activeModel = resolveActiveModel({ ...scopedSettings, providerId: legacyProviderId })
  const activeApiKey = resolveActiveApiKey({ ...scopedSettings, providerId: legacyProviderId })

  return scopedSettings.providers.map(provider => {
    if (provider.id !== activeProvider.id) return provider

    return {
      ...provider,
      name: Object.prototype.hasOwnProperty.call(payload, 'apiName') ? payload.apiName : provider.name,
      baseURL: Object.prototype.hasOwnProperty.call(payload, 'baseURL') ? payload.baseURL : provider.baseURL,
      inlineCompletionURL: Object.prototype.hasOwnProperty.call(payload, 'inlineCompletionURL') ? payload.inlineCompletionURL : provider.inlineCompletionURL,
      chatEndpointPath: Object.prototype.hasOwnProperty.call(payload, 'chatEndpointPath') ? payload.chatEndpointPath : provider.chatEndpointPath,
      chatEndpointURL: Object.prototype.hasOwnProperty.call(payload, 'chatEndpointURL') ? payload.chatEndpointURL : provider.chatEndpointURL,
      temperature: Object.prototype.hasOwnProperty.call(payload, 'temperature') ? payload.temperature : provider.temperature,
      maxTokens: Object.prototype.hasOwnProperty.call(payload, 'maxTokens') ? payload.maxTokens : provider.maxTokens,
      timeoutMs: Object.prototype.hasOwnProperty.call(payload, 'timeoutMs') ? payload.timeoutMs : provider.timeoutMs,
      apiKeys: provider.apiKeys.map(key => (
        key.id === activeApiKey.id && Object.prototype.hasOwnProperty.call(payload, 'apiKey')
          ? { ...key, apiKey: payload.apiKey }
          : key
      )),
      models: provider.models.map(model => (
        model.id === activeModel.id
          ? {
              ...model,
              model: Object.prototype.hasOwnProperty.call(payload, 'model') ? payload.model : model.model
            }
          : model
      ))
    }
  })
}

function buildIncomingSettings(storedSettings, payload) {
  const storedNormalized = normalizeAISettings(storedSettings)
  const nextManualContext = {
    ...storedNormalized.manualContext,
    ...normalizeObject(payload.manualContext)
  }

  if (Array.isArray(payload.providers)) {
    return normalizeAISettings({
      ...storedNormalized,
      ...payload,
      manualContext: nextManualContext,
      providers: payload.providers
    })
  }

  if (Array.isArray(payload.apiConfigs)) {
    return normalizeAISettings({
      ...storedNormalized,
      ...payload,
      manualContext: nextManualContext,
      providers: payload.apiConfigs.map((config, index) => ({
        id: normalizeString(config?.id, `provider-${index + 1}`),
        name: config?.name,
        baseURL: config?.baseURL,
        inlineCompletionURL: config?.inlineCompletionURL,
        chatEndpointPath: config?.chatEndpointPath,
        chatEndpointURL: config?.chatEndpointURL,
        apiKeys: [{
          id: `${normalizeString(config?.id, `provider-${index + 1}`)}-key`,
          name: 'API Key',
          apiKey: config?.apiKey,
          encryptedApiKey: config?.encryptedApiKey,
          apiKeyStorage: config?.apiKeyStorage
        }],
        models: [{
          id: normalizeString(config?.model, `${normalizeString(config?.id, `provider-${index + 1}`)}-model`),
          name: config?.model,
          model: config?.model,
          temperature: config?.temperature,
          maxTokens: config?.maxTokens,
          timeoutMs: config?.timeoutMs
        }]
      }))
    })
  }

  if (hasLegacyApiPayload(payload)) {
    return normalizeAISettings({
      ...storedNormalized,
      ...payload,
      manualContext: nextManualContext,
      providers: buildLegacyProviderPayload(storedNormalized, payload)
    })
  }

  return normalizeAISettings({
    ...storedNormalized,
    ...payload,
    manualContext: nextManualContext,
    providers: storedNormalized.providers
  })
}

function buildPayloadProviderMap(payload) {
  const providers = Array.isArray(payload.providers) ? payload.providers : []
  return new Map(providers.map(provider => [normalizeString(provider?.id), provider]))
}

function buildPreviousKeyMap(settings) {
  const normalized = normalizeAISettings(settings)
  const map = new Map()
  for (const provider of normalized.providers) {
    for (const key of provider.apiKeys) {
      map.set(`${provider.id}:${key.id}`, key)
    }
  }
  return map
}

function getPayloadKey(payloadProvider, keyId) {
  if (!Array.isArray(payloadProvider?.apiKeys)) return {}
  return payloadProvider.apiKeys.find(key => normalizeString(key?.id) === keyId) || {}
}

function buildStoredApiKeyRecord(nextKey, payloadKey, previousKey) {
  const safePayloadKey = normalizeObject(payloadKey)
  const hasApiKeyPayload = Object.prototype.hasOwnProperty.call(safePayloadKey, 'apiKey')
  const retainedSource = previousKey || safePayloadKey
  const apiKeyPayload = hasApiKeyPayload
    ? buildStoredApiKey(safePayloadKey.apiKey)
    : buildRetainedApiKey(retainedSource)

  const {
    apiKey,
    encryptedApiKey,
    apiKeyStorage,
    ...safeNextKey
  } = nextKey

  return {
    ...safeNextKey,
    ...apiKeyPayload
  }
}

function buildStoredAISettings(storedSettings, payload) {
  const incomingSettings = buildIncomingSettings(storedSettings, payload)
  const previousKeyMap = buildPreviousKeyMap(storedSettings)
  const payloadProviderMap = buildPayloadProviderMap(payload)
  const inlineCompletionSource = Object.prototype.hasOwnProperty.call(payload, 'inlineCompletion') ? payload.inlineCompletion : incomingSettings.inlineCompletion

  return {
    ...incomingSettings,
    inlineCompletion: normalizeAISettings({ inlineCompletion: inlineCompletionSource }).inlineCompletion,
    providers: incomingSettings.providers.map(provider => {
      const payloadProvider = payloadProviderMap.get(provider.id)
      return {
        ...provider,
        apiKeys: provider.apiKeys.map(key => buildStoredApiKeyRecord(
          key,
          getPayloadKey(payloadProvider, key.id),
          previousKeyMap.get(`${provider.id}:${key.id}`)
        ))
      }
    })
  }
}

function getActivePublicParts(settings) {
  const provider = settings.providers[0] || {}
  const model = provider.models?.find(item => item.enabled !== false) || provider.models?.[0] || {}
  const key = provider.apiKeys?.find(item => item.id === provider.activeApiKeyId) || provider.apiKeys?.find(item => item.enabled !== false) || provider.apiKeys?.[0] || {}
  return { provider, model, key }
}

function buildPublicCompatibilityApiConfigs(settings) {
  return settings.providers.map(provider => {
    const model = provider.models?.find(item => item.enabled !== false) || provider.models?.[0] || {}
    const key = provider.apiKeys?.find(item => item.id === provider.activeApiKeyId) || provider.apiKeys?.find(item => item.enabled !== false) || provider.apiKeys?.[0] || {}
    return {
      id: provider.id,
      name: provider.name || '',
      baseURL: provider.baseURL || '',
      inlineCompletionURL: provider.inlineCompletionURL || '',
      chatEndpointPath: provider.chatEndpointPath || '/chat/completions',
      chatEndpointURL: provider.chatEndpointURL || '',
      model: model.model || '',
      temperature: provider.temperature ?? model.temperature ?? 0.7,
      maxTokens: provider.maxTokens ?? model.maxTokens ?? 4096,
      timeoutMs: provider.timeoutMs ?? model.timeoutMs ?? 180000,
      hasApiKey: Boolean(key.hasApiKey),
      apiKeyStorage: key.apiKeyStorage || ''
    }
  })
}

function attachActiveApiCompatibility(publicSettings) {
  const { provider, model, key } = getActivePublicParts(publicSettings)
  return {
    ...publicSettings,
    apiName: provider.name || '',
    providerName: provider.name || '',
    modelName: model.name || '',
    baseURL: provider.baseURL || '',
    inlineCompletionURL: provider.inlineCompletionURL || '',
    chatEndpointPath: provider.chatEndpointPath || '',
    chatEndpointURL: provider.chatEndpointURL || '',
    model: model.model || '',
    temperature: provider.temperature ?? model.temperature ?? 0.7,
    maxTokens: provider.maxTokens ?? model.maxTokens ?? 4096,
    timeoutMs: provider.timeoutMs ?? model.timeoutMs ?? 180000,
    hasApiKey: Boolean(key.hasApiKey),
    apiKeyStorage: key.apiKeyStorage || ''
  }
}

function attachStoredKeyStatus(publicSettings, normalizedSettings) {
  const privateProviderMap = new Map(normalizedSettings.providers.map(provider => [provider.id, provider]))
  const providers = publicSettings.providers.map(provider => {
    const privateProvider = privateProviderMap.get(provider.id) || {}
    const privateKeyMap = new Map((privateProvider.apiKeys || []).map(key => [key.id, key]))
    const apiKeys = provider.apiKeys.map(key => {
      const privateKey = privateKeyMap.get(key.id) || {}
      const apiKey = readApiKey(privateKey).trim()
      return {
        ...key,
        hasApiKey: Boolean(apiKey),
        apiKeyStorage: apiKey ? getApiKeyStorage(privateKey) : ''
      }
    })

    return {
      ...provider,
      apiKeys,
      hasApiKey: apiKeys.some(key => key.hasApiKey),
      apiKeyStorage: apiKeys.find(key => key.id === provider.activeApiKeyId)?.apiKeyStorage || apiKeys.find(key => key.hasApiKey)?.apiKeyStorage || ''
    }
  })

  return {
    ...publicSettings,
    providers,
    apiConfigs: buildPublicCompatibilityApiConfigs({
      ...publicSettings,
      providers
    })
  }
}

function getPublicAISettings() {
  const normalizedSettings = normalizeAISettings(readStoredAISettings())
  const publicSettings = attachStoredKeyStatus(normalizePublicAISettings(normalizedSettings), normalizedSettings)

  return attachActiveApiCompatibility({
    ...publicSettings,
    encryptionAvailable: isEncryptionAvailable()
  })
}

function hasModelId(settings, modelId) {
  return settings.providers.some(provider => provider.models.some(model => model.id === modelId))
}

function buildScopedPrivateSettings(settings, scope = '') {
  if (typeof scope === 'string') {
    const scopeId = normalizeString(scope)
    if (!scopeId) return settings
    return hasModelId(settings, scopeId)
      ? { ...normalizeAISettings(settings), modelId: scopeId }
      : { ...normalizeAISettings(settings), providerId: scopeId }
  }

  const safeScope = normalizeObject(scope)
  const modelId = normalizeString(safeScope.modelId, normalizeString(safeScope.activeModelId))
  const providerId = normalizeString(safeScope.providerId, normalizeString(safeScope.apiId, normalizeString(safeScope.activeProviderId, normalizeString(safeScope.activeApiId))))
  return {
    ...normalizeAISettings(settings),
    providerId,
    modelId
  }
}

function getPrivateAISettings(scope = '') {
  const normalizedSettings = normalizeAISettings(readStoredAISettings())
  const scopedSettings = buildScopedPrivateSettings(normalizedSettings, scope)
  const activeProvider = resolveActiveProvider(scopedSettings)
  const activeApiKey = resolveActiveApiKey(scopedSettings)
  const apiKey = readApiKey(activeApiKey).trim()
  const settingsWithApiKey = {
    ...scopedSettings,
    providers: scopedSettings.providers.map(provider => (
      provider.id === activeProvider.id
        ? {
            ...provider,
            apiKeys: provider.apiKeys.map(key => (
              key.id === activeApiKey.id ? { ...key, apiKey } : key
            ))
          }
        : provider
    ))
  }

  return {
    ...normalizePrivateAISettings(settingsWithApiKey),
    apiKeyStorage: apiKey ? getApiKeyStorage(activeApiKey) : '',
    encryptionAvailable: isEncryptionAvailable()
  }
}

function updateAISettings(payload = {}) {
  payload = normalizeObject(payload)
  const storedSettings = readStoredAISettings()
  const nextSettings = buildStoredAISettings(storedSettings, payload)
  writeStoredAISettings(nextSettings)

  return getPublicAISettings()
}

function clearAISettings() {
  try {
    const settingsPath = getAISettingsPath()
    if (fs.existsSync(settingsPath)) {
      fs.unlinkSync(settingsPath)
    }
  } catch (error) {
    console.error('Failed to clear AI settings:', error)
  }

  return getPublicAISettings()
}

module.exports = {
  DEFAULT_AI_SETTINGS,
  getPublicAISettings,
  getPrivateAISettings,
  updateAISettings,
  clearAISettings,
  normalizeAISettings
}

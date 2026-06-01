const assert = require('node:assert/strict')
const { describe, it } = require('node:test')

const {
  DEFAULT_PROVIDER_ID,
  normalizeAISettings,
  normalizePublicAISettings,
  normalizePrivateAISettings,
  resolveActiveProvider,
  resolveActiveModel,
  resolveActiveApiKey
} = require('../electron/aiSettingsSchema')

describe('ai settings schema', () => {
  it('enables inline completion by default', () => {
    const settings = normalizeAISettings({})

    assert.equal(settings.inlineCompletion.enabled, true)
    assert.equal(settings.inlineCompletion.colorPreset, 'cyan')
    assert.equal(settings.inlineCompletion.opacity, 0.7)
  })

  it('migrates legacy single API settings into the first provider', () => {
    const settings = normalizeAISettings({
      enabled: false,
      baseURL: ' https://api.openai.com/v1 ',
      chatEndpointPath: '/chat/completions',
      chatEndpointURL: '',
      model: ' gpt-4.1 ',
      temperature: 0.4,
      maxTokens: 8192,
      timeoutMs: 45000,
      responseLanguage: 'zh-CN',
      manualContext: {
        selection: false,
        fileInfo: true,
        nearbyText: false,
        fullDocument: true
      },
      encryptedApiKey: 'encrypted-value',
      apiKeyStorage: 'encrypted'
    })

    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeProviderId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeApiId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeModelId'), false)
    assert.equal(settings.responseLanguage, 'zh-CN')
    assert.equal(settings.providers.length, 1)
    assert.deepEqual(settings.manualContext, {
      selection: false,
      fileInfo: true,
      nearbyText: false,
      fullDocument: true
    })

    const provider = settings.providers[0]
    assert.equal(provider.id, DEFAULT_PROVIDER_ID)
    assert.equal(provider.name, 'API Provider')
    assert.equal(provider.baseURL, 'https://api.openai.com/v1')
    assert.equal(provider.chatEndpointPath, '/chat/completions')
    assert.equal(provider.models.length, 1)
    assert.equal(provider.models[0].model, 'gpt-4.1')
    assert.equal(provider.models[0].temperature, 0.4)
    assert.equal(provider.models[0].maxTokens, 8192)
    assert.equal(provider.models[0].timeoutMs, 45000)
    assert.equal(provider.apiKeys.length, 1)
    assert.equal(provider.apiKeys[0].encryptedApiKey, 'encrypted-value')
    assert.equal(provider.apiKeys[0].apiKeyStorage, 'encrypted')
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'enabled'), false)
  })

  it('keeps only the selected API key while preserving multiple models under one provider', () => {
    const settings = normalizeAISettings({
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          protocol: 'openai-compatible',
          baseURL: 'https://api.openai.com/v1',
          keyStrategy: 'fixed',
          activeApiKeyId: 'team',
          apiKeys: [
            { id: 'personal', name: 'Personal', apiKey: 'sk-personal' },
            { id: 'team', name: 'Team', apiKey: 'sk-team' }
          ],
          models: [
            { id: 'gpt-4o-mini', name: 'Fast', model: 'gpt-4o-mini' },
            { id: 'gpt-4.1', name: 'Quality', model: 'gpt-4.1', temperature: 0.2 }
          ]
        }
      ]
    })

    assert.equal(settings.providers[0].apiKeys.length, 1)
    assert.equal(settings.providers[0].activeApiKeyId, 'team')
    assert.equal(settings.providers[0].models.length, 2)
    assert.equal(resolveActiveProvider({ ...settings, providerId: 'openai' }).id, 'openai')
    assert.equal(resolveActiveModel({ ...settings, providerId: 'openai', modelId: 'gpt-4.1' }).id, 'gpt-4.1')
    assert.equal(resolveActiveApiKey(settings).id, 'team')
  })

  it('normalizes inline completion settings', () => {
    const settings = normalizeAISettings({
      inlineCompletion: {
        enabled: true,
        delayMs: 20,
        maxChars: 9999,
        prefixChars: 10,
        suffixChars: 99999,
        includeLog: true,
        colorPreset: 'red',
        customColor: '#0ff',
        opacity: 1,
        languages: ['Markdown', 'markdown', 'SQL']
      }
    })

    assert.deepEqual(settings.inlineCompletion, {
      enabled: true,
      delayMs: 150,
      maxChars: 1200,
      prefixChars: 200,
      suffixChars: 8000,
      includeLog: true,
      colorPreset: 'red',
      customColor: '#00ffff',
      opacity: 0.9,
      languages: ['markdown', 'sql']
    })
  })

  it('keeps one empty API key and all models', () => {
    const settings = normalizeAISettings({
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          apiKeys: [
            { id: 'default-key', name: 'API Key', enabled: true },
            { id: 'backup-key', name: 'Backup Key', enabled: true }
          ],
          models: [
            { id: 'gpt-4o-mini', name: 'GPT 4o mini', model: 'gpt-4o-mini' },
            { id: 'gpt-4.1', name: 'GPT 4.1', model: 'gpt-4.1' }
          ]
        }
      ]
    })

    assert.deepEqual(settings.providers[0].apiKeys.map(key => key.id), ['default-key'])
    assert.deepEqual(settings.providers[0].models.map(model => model.id), ['gpt-4o-mini', 'gpt-4.1'])
  })

  it('drops legacy active model fields from normalized settings', () => {
    const settings = normalizeAISettings({
      activeProviderId: 'missing',
      activeModelId: 'missing-model',
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          baseURL: 'https://api.openai.com/v1',
          models: [
            { id: 'gpt-4o-mini', name: 'Fast', model: 'gpt-4o-mini' }
          ]
        },
        {
          id: 'glm',
          name: '智谱 GLM',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: [
            { id: 'glm-4-plus', name: 'GLM 4 Plus', model: 'glm-4-plus' }
          ]
        }
      ]
    })

    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeProviderId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeModelId'), false)
    assert.equal(resolveActiveProvider(settings).id, 'openai')
    assert.equal(resolveActiveModel(settings).id, 'gpt-4o-mini')
  })

  it('returns public settings without leaking API keys', () => {
    const settings = normalizePublicAISettings({
      activeProviderId: 'openai',
      activeModelId: 'gpt-4.1',
      responseLanguage: 'en-US',
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          baseURL: 'https://api.openai.com/v1',
          activeApiKeyId: 'team',
          apiKeys: [
            { id: 'team', name: 'Team', apiKey: 'sk-secret', apiKeyStorage: 'plain' },
            { id: 'backup', name: 'Backup' }
          ],
          models: [
            { id: 'gpt-4.1', name: 'Quality', model: 'gpt-4.1' }
          ]
        }
      ]
    })

    assert.equal(settings.responseLanguage, 'en-US')
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeProviderId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeModelId'), false)
    assert.equal(settings.providers[0].hasApiKey, true)
    assert.equal(settings.providers[0].apiKeys[0].hasApiKey, true)
    assert.equal(settings.providers[0].apiKeys[0].apiKeyStorage, 'plain')
    assert.equal(settings.providers[0].apiKeys.length, 1)
    assert.equal(Object.prototype.hasOwnProperty.call(settings.providers[0].apiKeys[0], 'apiKey'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings.providers[0].apiKeys[0], 'encryptedApiKey'), false)
  })

  it('flattens the request-scoped model into private request settings', () => {
    const settings = normalizePrivateAISettings({
      providerId: 'glm',
      modelId: 'glm-4-plus',
      responseLanguage: 'document',
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          baseURL: 'https://api.openai.com/v1',
          activeApiKeyId: 'openai-key',
          apiKeys: [{ id: 'openai-key', name: 'OpenAI Key', apiKey: 'sk-openai' }],
          models: [{ id: 'gpt-4.1', name: 'GPT 4.1', model: 'gpt-4.1' }]
        },
        {
          id: 'glm',
          name: '智谱 GLM',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          activeApiKeyId: 'glm-team',
          apiKeys: [
            { id: 'glm-personal', name: 'Personal', apiKey: 'sk-glm-personal' },
            { id: 'glm-team', name: 'Team', apiKey: 'sk-glm-team' }
          ],
          models: [
            { id: 'glm-4-plus', name: 'GLM 4 Plus', model: 'glm-4-plus', temperature: 0.3, maxTokens: 12000, timeoutMs: 90000 }
          ]
        }
      ]
    })

    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeProviderId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeApiId'), false)
    assert.equal(Object.prototype.hasOwnProperty.call(settings, 'activeModelId'), false)
    assert.equal(settings.providerId, 'glm')
    assert.equal(settings.modelId, 'glm-4-plus')
    assert.equal(settings.apiName, '智谱 GLM')
    assert.equal(settings.providerName, '智谱 GLM')
    assert.equal(settings.modelName, 'GLM 4 Plus')
    assert.equal(settings.baseURL, 'https://open.bigmodel.cn/api/paas/v4')
    assert.equal(settings.model, 'glm-4-plus')
    assert.equal(settings.temperature, 0.3)
    assert.equal(settings.maxTokens, 12000)
    assert.equal(settings.timeoutMs, 90000)
    assert.equal(settings.apiKey, 'sk-glm-team')
    assert.equal(settings.responseLanguage, 'document')
    assert.equal(settings.enabled, true)
  })

  it('does not fall back to another provider when the requested provider model is missing', () => {
    const source = {
      providerId: 'glm',
      modelId: 'glm-5.1',
      providers: [
        {
          id: 'default',
          name: 'Default API',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: [{ id: 'glm-5.1', name: 'Default GLM 5.1', model: 'glm-5.1', timeoutMs: 60000 }]
        },
        {
          id: 'glm',
          name: '智谱 GLM',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: [{ id: 'glm-4-plus', name: 'GLM 4 Plus', model: 'glm-4-plus', timeoutMs: 180000 }]
        }
      ]
    }

    assert.throws(
      () => normalizePrivateAISettings(source),
      /AI model "glm-5\.1" was not found in provider "智谱 GLM"\./
    )
  })

  it('uses the requested provider when model ids are duplicated across providers', () => {
    const settings = normalizePrivateAISettings({
      providerId: 'glm',
      modelId: 'glm-5.1',
      providers: [
        {
          id: 'default',
          name: 'Default API',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: [{ id: 'glm-5.1', name: 'Default GLM 5.1', model: 'glm-5.1', timeoutMs: 60000 }]
        },
        {
          id: 'glm',
          name: '智谱 GLM',
          baseURL: 'https://open.bigmodel.cn/api/paas/v4',
          models: [{ id: 'glm-5.1', name: 'GLM 5.1', model: 'glm-5.1', timeoutMs: 180000 }]
        }
      ]
    })

    assert.equal(settings.providerId, 'glm')
    assert.equal(settings.providerName, '智谱 GLM')
    assert.equal(settings.modelId, 'glm-5.1')
    assert.equal(settings.modelName, 'GLM 5.1')
    assert.equal(settings.timeoutMs, 180000)
  })

  it('does not fall back when the requested provider is missing', () => {
    assert.throws(
      () => normalizePrivateAISettings({
        providerId: 'missing-provider',
        modelId: 'glm-5.1',
        providers: [
          {
            id: 'glm',
            name: '智谱 GLM',
            baseURL: 'https://open.bigmodel.cn/api/paas/v4',
            models: [{ id: 'glm-5.1', name: 'GLM 5.1', model: 'glm-5.1', timeoutMs: 180000 }]
          }
        ]
      }),
      /AI provider "missing-provider" was not found\./
    )
  })
})

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import {
  AI_PROVIDER_PRESETS,
  createAiProviderFromPreset,
  resolveLocalAiModelSelection
} from '../src/renderer/utils/aiSettingsView.js'

const presetConfigPath = new URL('../src/renderer/config/aiProviderPresets.json', import.meta.url)

describe('ai provider presets', () => {
  it('stores provider templates in a json config file with icon metadata', () => {
    assert.equal(existsSync(presetConfigPath), true)

    const config = JSON.parse(readFileSync(presetConfigPath, 'utf8'))

    assert.deepEqual(config.map(preset => preset.id), AI_PROVIDER_PRESETS.map(preset => preset.id))
    for (const preset of config) {
      assert.equal(typeof preset.icon?.label, 'string')
      assert.ok(preset.icon.label.length > 0)
      assert.equal(typeof preset.icon?.accent, 'string')
      assert.match(preset.icon.accent, /^#[0-9a-f]{6}$/i)
      assert.equal(typeof preset.icon?.brand, 'string')
      assert.ok(preset.icon.brand.length > 0)
      assert.equal(typeof preset.icon?.path, 'string')
      assert.ok(preset.icon.path.length > 40)
    }
  })

  it('uses the Zhipu GLM icon preset', () => {
    const zhipu = AI_PROVIDER_PRESETS.find(preset => preset.id === 'zhipu')

    assert.equal(zhipu.icon.label, 'GLM')
    assert.equal(zhipu.icon.accent, '#3859ff')
    assert.equal(zhipu.inlineCompletionURL, 'https://open.bigmodel.cn/api/paas/v4/chat/completions')
    assert.equal(typeof zhipu.icon.path, 'string')
    assert.doesNotMatch(zhipu.icon.path, /M24\.51,28\.51/)
  })

  it('includes popular provider templates', () => {
    assert.deepEqual(AI_PROVIDER_PRESETS.map(preset => preset.id), [
      'openai',
      'anthropic',
      'zhipu',
      'minimax',
      'deepseek',
      'qwen',
      'mimo',
      'custom-openai-compatible'
    ])
  })

  it('creates an editable single-key provider with preset models', () => {
    const provider = createAiProviderFromPreset('deepseek', { id: 'deepseek-team' })

    assert.equal(provider.id, 'deepseek-team')
    assert.equal(provider.name, 'DeepSeek')
    assert.equal(provider.protocol, 'openai-compatible')
    assert.equal(provider.baseURL, 'https://api.deepseek.com')
    assert.equal(provider.inlineCompletionURL, 'https://api.deepseek.com')
    assert.equal(provider.chatEndpointPath, '/chat/completions')
    assert.deepEqual(provider.apiKeys.map(key => key.id), ['deepseek-team-key'])
    assert.equal(provider.apiKeys[0].hasApiKey, false)
    assert.deepEqual(provider.models.map(model => model.model), ['deepseek-v4-flash', 'deepseek-v4-pro'])
  })

  it('creates Anthropic presets using the native messages endpoint', () => {
    const provider = createAiProviderFromPreset('anthropic', { id: 'claude' })

    assert.equal(provider.protocol, 'anthropic')
    assert.equal(provider.baseURL, 'https://api.anthropic.com')
    assert.equal(provider.chatEndpointPath, '/v1/messages')
    assert.ok(provider.models.some(model => model.model === 'claude-opus-4-7'))
    assert.ok(provider.models.some(model => model.model === 'claude-sonnet-4-6'))
  })

  it('hydrates regional presets with protocol, url and model defaults', () => {
    const qwen = createAiProviderFromPreset('qwen', { id: 'qwen' })
    const mimo = createAiProviderFromPreset('mimo', { id: 'mimo' })

    assert.equal(qwen.protocol, 'openai-compatible')
    assert.equal(qwen.baseURL, 'https://dashscope.aliyuncs.com/compatible-mode/v1')
    assert.deepEqual(qwen.models.map(model => model.model), ['qwen3.7-max', 'qwen3.6-plus', 'qwen3.6-flash', 'qwen-turbo'])

    assert.equal(mimo.protocol, 'openai-compatible')
    assert.equal(mimo.baseURL, 'https://api.mimo-v2.com/v1')
    assert.deepEqual(mimo.models.map(model => model.model), ['mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro', 'mimo-v2-omni'])
  })

  it('resolves the selected provider and model without mutating defaults', () => {
    const settings = {
      providers: [
        createAiProviderFromPreset('openai', { id: 'openai' }),
        createAiProviderFromPreset('deepseek', { id: 'deepseek' })
      ]
    }

    const selection = resolveLocalAiModelSelection(settings, {
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro'
    })

    assert.equal(selection.provider.id, 'deepseek')
    assert.equal(selection.model.id, 'deepseek-v4-pro')
    assert.equal(selection.hasApiKey, false)
    assert.equal(selection.baseURL, 'https://api.deepseek.com')
  })

})

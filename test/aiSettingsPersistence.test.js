const assert = require('node:assert/strict')
const { describe, it } = require('node:test')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const Module = require('node:module')

function loadAISettingsWithTempUserData() {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'slimnote-ai-settings-'))
  const originalLoad = Module._load

  Module._load = function load(request, parent, isMain) {
    if (request === 'electron') {
      return {
        app: { getPath: () => userDataPath },
        safeStorage: { isEncryptionAvailable: () => false }
      }
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  const modulePath = require.resolve('../electron/aiSettings')
  delete require.cache[modulePath]
  const aiSettings = require(modulePath)
  Module._load = originalLoad

  return { aiSettings, userDataPath }
}

describe('ai settings persistence', () => {
  it('preserves inline completion display and accept settings when saving full provider payloads', () => {
    const { aiSettings, userDataPath } = loadAISettingsWithTempUserData()
    const current = aiSettings.getPublicAISettings()
    const payload = {
      responseLanguage: current.responseLanguage,
      contextMode: current.contextMode,
      manualContext: current.manualContext,
      inlineCompletion: {
        ...current.inlineCompletion,
        acceptMode: 'snippet',
        colorPreset: 'red',
        opacity: 0.75
      },
      providers: current.providers.map(provider => ({
        ...provider,
        apiKeys: provider.apiKeys.map(key => ({
          id: key.id,
          name: key.name,
          enabled: key.enabled
        })),
        models: provider.models
      }))
    }

    const result = aiSettings.updateAISettings(payload)
    const stored = JSON.parse(fs.readFileSync(path.join(userDataPath, 'ai-settings.json'), 'utf8'))

    assert.equal(result.inlineCompletion.acceptMode, 'snippet')
    assert.equal(result.inlineCompletion.colorPreset, 'red')
    assert.equal(result.inlineCompletion.opacity, 0.75)
    assert.equal(stored.inlineCompletion.acceptMode, 'snippet')
    assert.equal(stored.inlineCompletion.colorPreset, 'red')
    assert.equal(stored.inlineCompletion.opacity, 0.75)
  })
})
